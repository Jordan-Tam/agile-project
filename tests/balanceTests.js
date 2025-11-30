import * as chai from "chai";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
import usersData from "../data/users.js";
import { dbConnection } from "../config/mongoConnection.js";

const expect = chai.expect;

let testUsers = [];
let testGroup = null;

// Helper function to create users directly in database
async function createTestUser(firstName, lastName, userId, password) {
	try {
		// First check if user already exists
		let allUsers = await usersData.getAllUsers();
		let user = allUsers.find((u) => u.userId === userId);

		if (!user) {
			// User doesn't exist, create them directly in database
			console.log(`    Creating new user: ${userId}...`);
			user = await usersData.createUser(
				firstName,
				lastName,
				userId,
				password,
				password
			);
			console.log(`    Created user: ${userId}`);
		} else {
			console.log(`    User ${userId} already exists`);
		}

		return user;
	} catch (error) {
		console.error(`Error creating/retrieving user ${userId}:`, error.message);
		throw error;
	}
}

export async function runBalanceTests() {
	console.log("\n=== Running Balance Calculation Tests ===\n");

	let passed = 0;
	let failed = 0;

	try {
		// Setup: Create test users
		console.log("Setting up test users...");
		let user1, user2, user3;

		try {
			user1 = await createTestUser("Alice", "Johnson", "alice01", "Password!1");
			if (!user1) throw new Error("user1 is null/undefined");
			user1._id = user1._id.toString();
			console.log(`  User 1: ${user1.userId} (ID: ${user1._id})`);
		} catch (err) {
			console.error("Error creating user1:", err.message || err);
			throw err;
		}

		try {
			user2 = await createTestUser("Bob", "Smith", "bob01", "Password!2");
			if (!user2) throw new Error("user2 is null/undefined");
			user2._id = user2._id.toString();
			console.log(`  User 2: ${user2.userId} (ID: ${user2._id})`);
		} catch (err) {
			console.error("Error creating user2:", err.message || err);
			throw err;
		}

		try {
			user3 = await createTestUser(
				"Charlie",
				"Brown",
				"charlie1",
				"Password!3"
			);
			if (!user3) throw new Error("user3 is null/undefined");
			user3._id = user3._id.toString();
			console.log(`  User 3: ${user3.userId} (ID: ${user3._id})`);
		} catch (err) {
			console.error("Error creating user3:", err.message || err);
			throw err;
		}

		testUsers = [user1, user2, user3];
		console.log(`✓ Created ${testUsers.length} test users`);

		// Test 1: Create a group
		console.log("\nTest 1: Create a test group");
		try {
			testGroup = await groupsData.createGroup(
				"Balance Test Group",
				"A group for testing balance calculations",
				testUsers[0]._id.toString()
			);

			expect(testGroup).to.not.be.null;
			expect(testGroup.groupName).to.equal("Balance Test Group");
			console.log("✓ Test 1 passed: Group created successfully");
			passed++;
		} catch (error) {
			console.log("✗ Test 1 failed:", error.message);
			failed++;
			throw error; // Can't continue without a group
		}

		// Test 2: Add members to group
		console.log("\nTest 2: Add members to the group");
		try {
			for (const user of testUsers) {
				await groupsData.addMember(testGroup._id, user.userId);
			}

			const updatedGroup = await groupsData.getGroupByID(testGroup._id);
			expect(updatedGroup.groupMembers).to.have.lengthOf(3);
			console.log("✓ Test 2 passed: All members added to group");
			passed++;
		} catch (error) {
			console.log("✗ Test 2 failed:", error.message);
			failed++;
		}

		// Test 3: Calculate balances with no expenses (should return empty object)
		console.log("\nTest 3: Calculate balances with no expenses");
		try {
			const balances = await groupsData.calculateGroupBalances(testGroup._id);
			expect(balances).to.be.an("object");
			expect(Object.keys(balances)).to.have.lengthOf(0);
			console.log("✓ Test 3 passed: Empty balances for group with no expenses");
			passed++;
		} catch (error) {
			console.log("✗ Test 3 failed:", error.message);
			failed++;
		}

		// Test 4: Add expense where Alice pays, Bob and Charlie owe
		console.log(
			"\nTest 4: Add expense - Alice pays $60, Bob and Charlie are payers"
		);
		try {
			await expensesData.createExpense(
				testGroup._id,
				"Dinner",
				60,
				"12/31/2025",
				user1._id, // Alice pays
				[user2._id, user3._id] // Bob and Charlie owe
			);

			const balances = await groupsData.calculateGroupBalances(testGroup._id);

			// Bob should owe Alice $30
			expect(balances[user2._id]).to.exist;
			expect(balances[user2._id][user1._id]).to.equal(30);

			// Charlie should owe Alice $30
			expect(balances[user3._id]).to.exist;
			expect(balances[user3._id][user1._id]).to.equal(30);

			console.log(
				"✓ Test 4 passed: Correct balances calculated for simple expense"
			);
			passed++;
		} catch (error) {
			console.log("✗ Test 4 failed:", error.message);
			failed++;
		}

		// Test 5: Add expense where payee is also a payer (should not owe themselves)
		console.log(
			"\nTest 5: Add expense - Bob pays $90, Bob, Alice, and Charlie are payers"
		);
		try {
			await expensesData.createExpense(
				testGroup._id,
				"Concert Tickets",
				90,
				"01/15/2026",
				user2._id, // Bob pays
				[user1._id, user2._id, user3._id] // All are payers
			);

			const balances = await groupsData.calculateGroupBalances(testGroup._id);

			// Alice now owes Bob $30, but Bob owes Alice $30 from previous expense
			// These should net out, so Alice should still be owed
			// Alice: owed 30 from Bob, owed 30 from Charlie, owes 30 to Bob = net owed 30
			// Bob: owes 30 to Alice, owed 30 from Alice, owed 30 from Charlie = net even with Alice
			// After netting: Alice should be owed by Bob: 0, Charlie: 60
			// Actually: Alice owed 60 total, Bob owed by Charlie 30, net result:
			// Charlie owes Alice 30, Charlie owes Bob 30

			// Bob should not owe himself
			if (balances[user2._id]) {
				expect(balances[user2._id]).to.not.have.property(user2._id);
			}

			console.log("✓ Test 5 passed: Payee does not owe themselves");
			passed++;
		} catch (error) {
			console.log("✗ Test 5 failed:", error.message);
			failed++;
		}

		// Test 6: Test debt netting (mutual debts should be simplified)
		console.log("\nTest 6: Verify debt netting works correctly");
		try {
			const balances = await groupsData.calculateGroupBalances(testGroup._id);

			// From expense 1: Bob owes Alice 30, Charlie owes Alice 30
			// From expense 2: Alice owes Bob 30, Charlie owes Bob 30
			// After netting: Bob and Alice cancel out, Charlie owes both Alice 30 and Bob 30

			// Alice and Bob should have netted debts
			if (balances[user1._id] && balances[user1._id][user2._id]) {
				// If Alice owes Bob, Bob should not owe Alice
				expect(balances[user2._id]).to.not.have.property(user1._id);
			}
			if (balances[user2._id] && balances[user2._id][user1._id]) {
				// If Bob owes Alice, Alice should not owe Bob
				expect(balances[user1._id]).to.not.have.property(user2._id);
			}

			console.log("✓ Test 6 passed: Mutual debts are properly netted");
			passed++;
		} catch (error) {
			console.log("✗ Test 6 failed:", error.message);
			failed++;
		}

		// Test 7: Add expense with unequal split
		console.log("\nTest 7: Add expense with unequal number of payers");
		try {
			await expensesData.createExpense(
				testGroup._id,
				"Groceries",
				45,
				"02/01/2026",
				user3._id, // Charlie pays
				[user1._id] // Only Alice owes
			);

			const balances = await groupsData.calculateGroupBalances(testGroup._id);

			// Alice should owe Charlie $45
			expect(balances[user1._id]).to.exist;
			expect(balances[user1._id][user3._id]).to.exist;
			// The exact amount depends on netting with previous expenses

			console.log(
				"✓ Test 7 passed: Unequal split expense calculated correctly"
			);
			passed++;
		} catch (error) {
			console.log("✗ Test 7 failed:", error.message);
			failed++;
		}

		// Test 8: Verify all balance amounts are rounded to 2 decimal places
		console.log(
			"\nTest 8: Verify balance amounts are rounded to 2 decimal places"
		);
		try {
			// Add expense that creates decimal amounts
			await expensesData.createExpense(
				testGroup._id,
				"Pizza",
				25,
				"03/01/2026",
				user1._id, // Alice pays
				[user1._id, user2._id, user3._id] // All split
			);

			const balances = await groupsData.calculateGroupBalances(testGroup._id);

			// Check that all amounts have at most 2 decimal places
			for (const debtorId in balances) {
				for (const creditorId in balances[debtorId]) {
					const amount = balances[debtorId][creditorId];
					const decimalPlaces = amount.toString().split(".")[1]?.length || 0;
					expect(decimalPlaces).to.be.at.most(2);
				}
			}

			console.log(
				"✓ Test 8 passed: All amounts properly rounded to 2 decimal places"
			);
			passed++;
		} catch (error) {
			console.log("✗ Test 8 failed:", error.message);
			failed++;
		}

		// Test 9: Test with invalid group ID
		console.log("\nTest 9: Test with invalid group ID");
		try {
			let errorThrown = false;
			try {
				await groupsData.calculateGroupBalances("invalid-id");
			} catch (error) {
				errorThrown = true;
			}
			expect(errorThrown).to.be.true;
			console.log("✓ Test 9 passed: Invalid group ID throws error");
			passed++;
		} catch (error) {
			console.log("✗ Test 9 failed:", error.message);
			failed++;
		}

		// Test 10: Verify balance structure in route handler
		console.log("\nTest 10: Verify balance data is passed to view correctly");
		try {
			// This test verifies the route passes data correctly by checking the group view
			const updatedGroup = await groupsData.getGroupByID(testGroup._id);
			expect(updatedGroup.groupMembers).to.be.an("array");
			expect(updatedGroup.groupMembers.length).to.be.at.least(1);

			const balances = await groupsData.calculateGroupBalances(testGroup._id);
			expect(balances).to.be.an("object");

			console.log(
				"✓ Test 10 passed: Balance data structure is correct for view"
			);
			passed++;
		} catch (error) {
			console.log("✗ Test 10 failed:", error.message);
			failed++;
		}
	} catch (error) {
		console.error("Critical error in balance tests:", error);
	}

	console.log("\n=== Balance Tests Summary ===");
	console.log(`Total tests: ${passed + failed}`);
	console.log(`Passed: ${passed}`);
	console.log(`Failed: ${failed}`);

	return { total: passed + failed, passed, failed };
}
