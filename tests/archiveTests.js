// Import testing framework.
import { assert } from "chai";

// Import data functions.
import usersData from "../data/users.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";

export async function runArchiveTests() {
	console.log("\n=== Starting Archive Tests ===");

	const usersList = await usersData.getAllUsers();

	// Create a test group
	const testGroup = await groupsData.createGroup(
		"Archive Test Group",
		"This group is for testing archive functionality."
	);

	// Add members to the group
	await groupsData.addMember(
		testGroup._id.toString(),
		usersList[0].userId.toString()
	);
	await groupsData.addMember(
		testGroup._id.toString(),
		usersList[1].userId.toString()
	);
	await groupsData.addMember(
		testGroup._id.toString(),
		usersList[2].userId.toString()
	);

	// Create test expenses
	const expense1 = await expensesData.createExpense(
		testGroup._id.toString(),
		"Test Expense 1",
		50.0,
		"12/01/2025",
		usersList[0]._id.toString(),
		[usersList[1]._id.toString(), usersList[2]._id.toString()]
	);

	const expense2 = await expensesData.createExpense(
		testGroup._id.toString(),
		"Test Expense 2",
		75.5,
		"12/15/2025",
		usersList[1]._id.toString(),
		[usersList[0]._id.toString(), usersList[2]._id.toString()]
	);

	const expense3 = await expensesData.createExpense(
		testGroup._id.toString(),
		"Test Expense 3",
		100.0,
		"12/25/2025",
		usersList[2]._id.toString(),
		[usersList[0]._id.toString(), usersList[1]._id.toString()]
	);

	// ===== TEST 1: Verify new expenses have archived field set to false =====
	console.log("Test 1: Verify new expenses have archived field set to false");
	assert.strictEqual(
		expense1.archived,
		false,
		"New expense should have archived=false"
	);
	assert.strictEqual(
		expense2.archived,
		false,
		"New expense should have archived=false"
	);
	assert.strictEqual(
		expense3.archived,
		false,
		"New expense should have archived=false"
	);
	console.log("✓ Test 1 passed");

	// ===== TEST 2: Archive an expense - invalid inputs =====
	console.log("\nTest 2: Archive expense with invalid inputs");

	try {
		await expensesData.archiveExpense();
		assert.fail("Should have thrown an error for missing groupId");
	} catch (e) {
		assert.strictEqual(e, "Group ID is required.");
	}

	try {
		await expensesData.archiveExpense(testGroup._id.toString());
		assert.fail("Should have thrown an error for missing expenseId");
	} catch (e) {
		assert.strictEqual(e, "Expense ID is required.");
	}

	try {
		await expensesData.archiveExpense("invalidId", expense1._id.toString());
		assert.fail("Should have thrown an error for invalid groupId");
	} catch (e) {
		assert.strictEqual(e, "Group ID is not a valid ID.");
	}

	try {
		await expensesData.archiveExpense(testGroup._id.toString(), "invalidId");
		assert.fail("Should have thrown an error for invalid expenseId");
	} catch (e) {
		assert.strictEqual(e, "Expense ID is not a valid ID.");
	}

	console.log("✓ Test 2 passed");

	// ===== TEST 3: Successfully archive an expense =====
	console.log("\nTest 3: Successfully archive an expense");

	const archivedResult = await expensesData.archiveExpense(
		testGroup._id.toString(),
		expense1._id.toString()
	);

	assert(archivedResult !== null, "Archive should return a result");

	// Verify the expense is archived in the database
	const groupAfterArchive = await groupsData.getGroupByID(
		testGroup._id.toString()
	);
	const archivedExpense = groupAfterArchive.expenses.find(
		(exp) => exp._id.toString() === expense1._id.toString()
	);

	assert.strictEqual(
		archivedExpense.archived,
		true,
		"Expense should be archived"
	);
	assert.strictEqual(archivedExpense.name, "Test Expense 1");
	console.log("✓ Test 3 passed");

	// ===== TEST 4: Verify other expenses are not affected =====
	console.log("\nTest 4: Verify other expenses are not affected by archiving");

	const expense2Check = groupAfterArchive.expenses.find(
		(exp) => exp._id.toString() === expense2._id.toString()
	);
	const expense3Check = groupAfterArchive.expenses.find(
		(exp) => exp._id.toString() === expense3._id.toString()
	);

	assert.strictEqual(
		expense2Check.archived,
		false,
		"Expense 2 should not be archived"
	);
	assert.strictEqual(
		expense3Check.archived,
		false,
		"Expense 3 should not be archived"
	);
	console.log("✓ Test 4 passed");

	// ===== TEST 5: Unarchive an expense - invalid inputs =====
	console.log("\nTest 5: Unarchive expense with invalid inputs");

	try {
		await expensesData.unarchiveExpense();
		assert.fail("Should have thrown an error for missing groupId");
	} catch (e) {
		assert.strictEqual(e, "Group ID is required.");
	}

	try {
		await expensesData.unarchiveExpense(testGroup._id.toString());
		assert.fail("Should have thrown an error for missing expenseId");
	} catch (e) {
		assert.strictEqual(e, "Expense ID is required.");
	}

	try {
		await expensesData.unarchiveExpense("invalidId", expense1._id.toString());
		assert.fail("Should have thrown an error for invalid groupId");
	} catch (e) {
		assert.strictEqual(e, "Group ID is not a valid ID.");
	}

	try {
		await expensesData.unarchiveExpense(testGroup._id.toString(), "invalidId");
		assert.fail("Should have thrown an error for invalid expenseId");
	} catch (e) {
		assert.strictEqual(e, "Expense ID is not a valid ID.");
	}

	console.log("✓ Test 5 passed");

	// ===== TEST 6: Successfully unarchive an expense =====
	console.log("\nTest 6: Successfully unarchive an expense");

	const unarchivedResult = await expensesData.unarchiveExpense(
		testGroup._id.toString(),
		expense1._id.toString()
	);

	assert(unarchivedResult !== null, "Unarchive should return a result");

	// Verify the expense is unarchived in the database
	const groupAfterUnarchive = await groupsData.getGroupByID(
		testGroup._id.toString()
	);
	const unarchivedExpense = groupAfterUnarchive.expenses.find(
		(exp) => exp._id.toString() === expense1._id.toString()
	);

	assert.strictEqual(
		unarchivedExpense.archived,
		false,
		"Expense should be unarchived"
	);
	assert.strictEqual(unarchivedExpense.name, "Test Expense 1");
	console.log("✓ Test 6 passed");

	// ===== TEST 7: Archive multiple expenses =====
	console.log("\nTest 7: Archive multiple expenses");

	await expensesData.archiveExpense(
		testGroup._id.toString(),
		expense1._id.toString()
	);
	await expensesData.archiveExpense(
		testGroup._id.toString(),
		expense2._id.toString()
	);

	const groupMultiArchive = await groupsData.getGroupByID(
		testGroup._id.toString()
	);
	const exp1Check = groupMultiArchive.expenses.find(
		(exp) => exp._id.toString() === expense1._id.toString()
	);
	const exp2Check = groupMultiArchive.expenses.find(
		(exp) => exp._id.toString() === expense2._id.toString()
	);
	const exp3Check = groupMultiArchive.expenses.find(
		(exp) => exp._id.toString() === expense3._id.toString()
	);

	assert.strictEqual(exp1Check.archived, true, "Expense 1 should be archived");
	assert.strictEqual(exp2Check.archived, true, "Expense 2 should be archived");
	assert.strictEqual(
		exp3Check.archived,
		false,
		"Expense 3 should not be archived"
	);
	console.log("✓ Test 7 passed");

	// ===== TEST 8: Archive an already archived expense (should not error) =====
	console.log("\nTest 8: Archive an already archived expense");

	const reArchiveResult = await expensesData.archiveExpense(
		testGroup._id.toString(),
		expense1._id.toString()
	);

	assert(reArchiveResult !== null, "Re-archiving should succeed");

	const groupReArchive = await groupsData.getGroupByID(
		testGroup._id.toString()
	);
	const reArchivedExpense = groupReArchive.expenses.find(
		(exp) => exp._id.toString() === expense1._id.toString()
	);

	assert.strictEqual(
		reArchivedExpense.archived,
		true,
		"Expense should still be archived"
	);
	console.log("✓ Test 8 passed");

	// ===== TEST 9: Unarchive all expenses =====
	console.log("\nTest 9: Unarchive all expenses");

	await expensesData.unarchiveExpense(
		testGroup._id.toString(),
		expense1._id.toString()
	);
	await expensesData.unarchiveExpense(
		testGroup._id.toString(),
		expense2._id.toString()
	);

	const groupAllUnarchived = await groupsData.getGroupByID(
		testGroup._id.toString()
	);

	groupAllUnarchived.expenses.forEach((expense) => {
		assert.strictEqual(
			expense.archived,
			false,
			`Expense ${expense.name} should not be archived`
		);
	});

	console.log("✓ Test 9 passed");

	// ===== TEST 10: Verify archived expenses don't affect expense data integrity =====
	console.log("\nTest 10: Verify archived expenses maintain data integrity");

	await expensesData.archiveExpense(
		testGroup._id.toString(),
		expense1._id.toString()
	);

	const groupIntegrity = await groupsData.getGroupByID(
		testGroup._id.toString()
	);
	const archivedExp1 = groupIntegrity.expenses.find(
		(exp) => exp._id.toString() === expense1._id.toString()
	);

	// Verify all original data is intact
	assert.strictEqual(archivedExp1.name, "Test Expense 1");
	assert.strictEqual(archivedExp1.cost, 50.0);
	assert.strictEqual(archivedExp1.deadline, "12/01/2025");
	assert.strictEqual(
		archivedExp1.payee.toString(),
		usersList[0]._id.toString()
	);
	assert.strictEqual(archivedExp1.payers.length, 2);
	assert.strictEqual(archivedExp1.archived, true);

	console.log("✓ Test 10 passed");

	// ===== TEST 11: Test archiving with non-existent expense ID =====
	console.log("\nTest 11: Archive with non-existent expense ID");

	try {
		await expensesData.archiveExpense(
			testGroup._id.toString(),
			"507f1f77bcf86cd799439011" // Valid ObjectId format but doesn't exist
		);
		// If no error is thrown, the operation succeeded but didn't find the expense
		// This is acceptable behavior (MongoDB returns null for findOneAndUpdate if not found)
		console.log("✓ Test 11 passed (no error for non-existent expense)");
	} catch (e) {
		// If it throws "Could not archive expense", that's also acceptable
		assert.strictEqual(e, "Could not archive expense.");
		console.log("✓ Test 11 passed (threw expected error)");
	}

	// ===== TEST 12: Test archiving with non-existent group ID =====
	console.log("\nTest 12: Archive with non-existent group ID");

	try {
		await expensesData.archiveExpense(
			"507f1f77bcf86cd799439011", // Valid ObjectId format but doesn't exist
			expense1._id.toString()
		);
		// Similar to Test 11, acceptable behavior
		console.log("✓ Test 12 passed (no error for non-existent group)");
	} catch (e) {
		assert.strictEqual(e, "Could not archive expense.");
		console.log("✓ Test 12 passed (threw expected error)");
	}

	console.log("\n=== All Archive Tests Passed ===\n");
}
