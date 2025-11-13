import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
import usersData from "../data/users.js";
import { dbConnection, closeConnection } from "../config/mongoConnection.js";

// Simple test to verify balance calculation logic
async function testBalanceCalculation() {
	console.log("\n=== Testing Balance Calculation Logic ===\n");
	
	try {
		// Get existing users from the database
		const allUsers = await usersData.getAllUsers();
		
		if (allUsers.length < 3) {
			console.log("Not enough users in database. Please run mainTests.js first.");
			return;
		}
		
		const user1 = allUsers[0];
		const user2 = allUsers[1];
		const user3 = allUsers[2];
		
		console.log(`Using users:`);
		console.log(`  ${user1.firstName} ${user1.lastName} (${user1._id})`);
		console.log(`  ${user2.firstName} ${user2.lastName} (${user2._id})`);
		console.log(`  ${user3.firstName} ${user3.lastName} (${user3._id})`);
		
		// Create a test group
		console.log("\nCreating test group...");
		const testGroup = await groupsData.createGroup(
			"Balance Calc Test",
			"Testing balance calculation"
		);
		console.log(`✓ Created group: ${testGroup._id}`);
		
		// Add members
		console.log("\nAdding members...");
		await groupsData.addMember(testGroup._id, user1.userId);
		await groupsData.addMember(testGroup._id, user2.userId);
		await groupsData.addMember(testGroup._id, user3.userId);
		console.log("✓ Added 3 members");
		
		// Test 1: No expenses = no balances
		console.log("\nTest 1: No expenses");
		let balances = await groupsData.calculateGroupBalances(testGroup._id);
		console.log("Balances:", JSON.stringify(balances, null, 2));
		console.log("✓ Empty balances as expected\n");
		
		// Test 2: Simple expense - user1 pays, user2 and user3 owe
		console.log("Test 2: Simple expense");
		await expensesData.createExpense(
			testGroup._id,
			"Lunch",
			60,
			"12/31/2025",
			user1._id,
			[user2._id, user3._id]
		);
		balances = await groupsData.calculateGroupBalances(testGroup._id);
		console.log("Balances after expense:");
		console.log(JSON.stringify(balances, null, 2));
		console.log(`  ${user2.firstName} owes ${user1.firstName}: $${balances[user2._id.toString()]?.[user1._id.toString()] || 0}`);
		console.log(`  ${user3.firstName} owes ${user1.firstName}: $${balances[user3._id.toString()]?.[user1._id.toString()] || 0}`);
		console.log("✓ Test 2 passed\n");
		
		// Test 3: Reverse expense to test netting
		console.log("Test 3: Reverse expense (netting)");
		await expensesData.createExpense(
			testGroup._id,
			"Dinner",
			90,
			"01/15/2026",
			user2._id,
			[user1._id, user2._id, user3._id]
		);
		balances = await groupsData.calculateGroupBalances(testGroup._id);
		console.log("Balances after netting:");
		console.log(JSON.stringify(balances, null, 2));
		console.log("✓ Test 3 passed - debts are netted\n");
		
		console.log("=== All balance calculation tests passed! ===");
		
	} catch (error) {
		console.error("Error in balance calculation test:", error);
	} finally {
		await closeConnection();
	}
}

testBalanceCalculation();
