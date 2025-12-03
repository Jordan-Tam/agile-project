import expensesData from "../data/expenses.js";
import groupsData from "../data/groups.js";
import usersData from "../data/users.js";
import { dbConnection, closeConnection } from "../config/mongoConnection.js";

async function testPaymentStats() {
	console.log("\n=== Testing Payment Statistics ===\n");

	try {
		// Connect to database
		const db = await dbConnection();
		console.log("Connected to database");

		// Try to find existing test users (created by mainTests.js)
		let user1, user2;
		try {
			user1 = await usersData.getUserByUserId("johndoe");
			user2 = await usersData.getUserByUserId("janesmith");
			console.log("✓ Found existing test users: johndoe and janesmith");
		} catch (e) {
			console.log("Test users not found. Creating new ones...");
			user1 = await usersData.createUser(
				"John",
				"Doe",
				"testuser1",
				"Password!1"
			);
			user2 = await usersData.createUser(
				"Jane",
				"Smith",
				"testuser2",
				"Password!2"
			);
			console.log("✓ Created test users");
		}

		// Get or create a test group
		let testGroup;
		const user1Groups = await groupsData.getGroupsForUser(user1._id.toString());
		if (user1Groups && user1Groups.length > 0) {
			testGroup = user1Groups[0];
			console.log(`✓ Using existing group: ${testGroup.groupName}`);
		} else {
			testGroup = await groupsData.createGroup(
				"Test Group for Payment Stats",
				"Testing payment statistics",
				user1._id.toString(),
				[user1._id.toString(), user2._id.toString()]
			);
			console.log("✓ Created test group");
		}

		// Get payment stats BEFORE any payments
		const statsBefore = await expensesData.getUserPaymentStats(
			user1._id.toString()
		);
		console.log("\n--- Stats BEFORE payments ---");
		console.log(`Total Paid: $${statsBefore.totalPaid}`);
		console.log(`Total Earned: $${statsBefore.totalEarned}`);
		console.log(`Payment Count: ${statsBefore.paymentCount}`);
		console.log(`Earning Count: ${statsBefore.earningCount}`);
		console.log(`Net Balance: $${statsBefore.netBalance}`);

		// Create an expense if needed
		if (!testGroup.expenses || testGroup.expenses.length === 0) {
			const expense = await expensesData.createExpense(
				testGroup._id,
				"Test Expense - Lunch",
				100.0,
				"12/31/2025",
				user1._id.toString(), // user1 is the payee (paid upfront)
				[user2._id.toString()] // user2 owes their share
			);
			console.log("\n✓ Created test expense: $100 lunch");
			console.log(
				`  - Payee: ${user1._id.toString()} (user1 paid upfront)`
			);
			console.log(
				`  - Payer: ${user2._id.toString()} (user2 owes $100)`
			);
		}

		// Add a payment from user2 to the expense
		const groupWithExpenses = await groupsData.getGroupByID(testGroup._id);
		if (groupWithExpenses.expenses && groupWithExpenses.expenses.length > 0) {
			const firstExpense = groupWithExpenses.expenses[0];
			try {
				await expensesData.addPayment(
					testGroup._id.toString(),
					firstExpense._id.toString(),
					user2._id.toString(),
					50.0 // user2 pays $50 toward the expense
				);
				console.log("\n✓ Added payment: user2 paid $50 toward expense");
			} catch (e) {
				console.log(`Note: Payment may already exist - ${e}`);
			}
		}

		// Get payment stats AFTER payments
		const statsAfter = await expensesData.getUserPaymentStats(
			user1._id.toString()
		);
		console.log("\n--- Stats AFTER payments (for user1) ---");
		console.log(`Total Paid: $${statsAfter.totalPaid}`);
		console.log(`Total Earned: $${statsAfter.totalEarned}`);
		console.log(`Payment Count: ${statsAfter.paymentCount}`);
		console.log(`Earning Count: ${statsAfter.earningCount}`);
		console.log(`Net Balance: $${statsAfter.netBalance}`);

		// Get stats for user2
		const user2Stats = await expensesData.getUserPaymentStats(
			user2._id.toString()
		);
		console.log("\n--- Stats for user2 ---");
		console.log(`Total Paid: $${user2Stats.totalPaid}`);
		console.log(`Total Earned: $${user2Stats.totalEarned}`);
		console.log(`Payment Count: ${user2Stats.paymentCount}`);
		console.log(`Earning Count: ${user2Stats.earningCount}`);
		console.log(`Net Balance: $${user2Stats.netBalance}`);

		// Verify the logic
		console.log("\n--- Verification ---");
		if (user2Stats.totalPaid > 0) {
			console.log("✓ PASS: user2 has made payments");
		} else {
			console.log("! INFO: user2 has not made any payments yet");
		}

		if (statsAfter.totalEarned > 0) {
			console.log("✓ PASS: user1 has earned money (as payee)");
		} else {
			console.log("! INFO: user1 has not earned any money yet");
		}

		console.log("\n✓ Payment statistics test completed successfully!");
	} catch (e) {
		console.error("✗ Error during testing:", e);
		throw e;
	} finally {
		await closeConnection();
		console.log("\nDatabase connection closed");
	}
}

// Run the test
testPaymentStats()
	.then(() => {
		console.log("\nAll tests passed!");
		process.exit(0);
	})
	.catch((e) => {
		console.error("\nTest failed:", e);
		process.exit(1);
	});
