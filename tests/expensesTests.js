// Import testing framework.
import { assert } from "chai";

// Import database connections.
import { users } from "../config/mongoCollections.js";

// Import data functions.
import usersData from "../data/users.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";

export async function runExpenseTests() {
	const usersList = await usersData.getAllUsers();

	const group_1 = await groupsData.createGroup(
		"Test Group",
		"This expense group is for testing expense data functions."
	);

	await groupsData.addMember(
		group_1._id.toString(),
		/* usersList[0].firstName,
		usersList[0].lastName, */
		usersList[0]._id.toString()
	);
	await groupsData.addMember(
		group_1._id.toString(),
		/* usersList[1].firstName,
		usersList[1].lastName, */
		usersList[1]._id.toString()
	);
	await groupsData.addMember(
		group_1._id.toString(),
		/* usersList[2].firstName,
		usersList[2].lastName, */
		usersList[2]._id.toString()
	);

	// TESTS FOR CREATING AN EXPENSE
	try {
		await expensesData.createExpense(group_1._id.toString());
	} catch (e) {
		assert(e === "Name is required.");
	}

	try {
		await expensesData.createExpense(
			group_1._id.toString(),
			"Lunch",
			"not a number"
		);
	} catch (e) {
		assert(e === "Cost must be a number.");
	}

	try {
		await expensesData.createExpense(
			group_1._id.toString(),
			"Lunch",
			12.121212
		);
	} catch (e) {
		assert(e === "Cost should be a number with up to 2 decimal places.");
	}

	try {
		await expensesData.createExpense(
			group_1._id.toString(),
			"Dinner",
			99.99,
			"02/30/2025"
		);
	} catch (e) {
		assert(e === "Deadline is an invalid date.");
	}

	try {
		await expensesData.createExpense(
			group_1._id.toString(),
			"Dinner",
			99.99,
			"10/22/2025",
			"1234567890"
		);
	} catch (e) {
		assert(e === "Payee ID is not a valid ID.");
	}

	const expense_1 = await expensesData.createExpense(
		group_1._id.toString(),
		"Dinner",
		99.99,
		"10/22/2025",
		usersList[0]._id.toString(),
		[usersList[1]._id.toString(), usersList[2]._id.toString()]
	);

	assert.strictEqual(expense_1.name, "Dinner");
	assert.strictEqual(expense_1.cost, 99.99);
	assert.strictEqual(expense_1.deadline, "10/22/2025");
	assert.strictEqual(expense_1.payee, usersList[0]._id.toString());
	assert.deepStrictEqual(expense_1.payers, [
		usersList[1]._id.toString(),
		usersList[2]._id.toString()
	]);
	assert.strictEqual(expense_1.group.toString(), group_1._id.toString());

	const expense_2 = await expensesData.createExpense(
		group_1._id.toString(),
		"Lunch",
		108.55,
		"01/14/2026",
		usersList[0]._id.toString(),
		[usersList[1]._id.toString()]
	);

	assert.strictEqual(expense_2.name, "Lunch");
	assert.strictEqual(expense_2.cost, 108.55);
	assert.strictEqual(expense_2.deadline, "01/14/2026");
	assert.strictEqual(expense_2.payee, usersList[0]._id.toString());
	assert.deepStrictEqual(expense_2.payers, [usersList[1]._id.toString()]);
	assert.strictEqual(expense_2.group.toString(), group_1._id.toString());

	assert(
		(await expensesData.getAllExpenses(group_1._id.toString())).length === 2
	);

	// TESTS FOR DELETING AN EXPENSE
	try {
		await expensesData.deleteExpense();
	} catch (e) {
		assert(e === "Group ID is required.");
	}

	try {
		await expensesData.deleteExpense(group_1._id.toString());
	} catch (e) {
		assert(e === "Expense ID is required.");
	}

	try {
		await expensesData.deleteExpense(
			"69038ebc14a7768bd27fbda0",
			expense_1._id.toString()
		);
	} catch (e) {
		assert(e === "Error: Group not found");
	}

	await expensesData.deleteExpense(
		group_1._id.toString(),
		expense_1._id.toString()
	);

	assert(
		(await expensesData.getAllExpenses(group_1._id.toString())).length === 1
	);

	// TESTS FOR EDITING AN EXPENSE
	// Test missing/invalid parameters
	try {
		await expensesData.editExpense();
	} catch (e) {
		assert(e === "Group ID is required.");
	}

	try {
		await expensesData.editExpense(group_1._id.toString());
	} catch (e) {
		assert(e === "Expense ID is required.");
	}

	try {
		await expensesData.editExpense(
			group_1._id.toString(),
			expense_2._id.toString()
		);
	} catch (e) {
		assert(e === "Name is required.");
	}

	try {
		await expensesData.editExpense(
			group_1._id.toString(),
			expense_2._id.toString(),
			"Updated Lunch",
			"not a number"
		);
	} catch (e) {
		assert(e === "Cost must be a number.");
	}

	try {
		await expensesData.editExpense(
			group_1._id.toString(),
			expense_2._id.toString(),
			"Updated Lunch",
			150.999
		);
	} catch (e) {
		assert(e === "Cost should be a number with up to 2 decimal places.");
	}

	try {
		await expensesData.editExpense(
			group_1._id.toString(),
			expense_2._id.toString(),
			"Updated Lunch",
			150.99,
			"13/45/2025"
		);
	} catch (e) {
		assert(e === "Deadline is an invalid date.");
	}

	try {
		await expensesData.editExpense(
			group_1._id.toString(),
			expense_2._id.toString(),
			"Updated Lunch",
			150.99,
			"02/15/2026",
			"invalidid"
		);
	} catch (e) {
		assert(e === "Payee ID is not a valid ID.");
	}

	// Test non-existent group
	try {
		await expensesData.editExpense(
			"69038ebc14a7768bd27fbda0",
			expense_2._id.toString(),
			"Updated Lunch",
			150.99,
			"02/15/2026",
			usersList[1]._id.toString(),
			[usersList[2]._id.toString()]
		);
	} catch (e) {
		assert(e === "Error: Group not found");
	}

	// Test non-existent expense
	try {
		await expensesData.editExpense(
			group_1._id.toString(),
			"69038ebc14a7768bd27fbda0",
			"Updated Lunch",
			150.99,
			"02/15/2026",
			usersList[1]._id.toString(),
			[usersList[2]._id.toString()]
		);
	} catch (e) {
		assert(
			e.includes("not found in group")
		);
	}

	// Test payee not in group (assuming we have a user not in the group)
	// For this test, we'd need to create a user not in the group
	// Skipping for now as all seeded users are in the group

	// Test successful edit
	const updatedExpense = await expensesData.editExpense(
		group_1._id.toString(),
		expense_2._id.toString(),
		"Updated Lunch",
		150.99,
		"02/15/2026",
		usersList[1]._id.toString(),
		[usersList[0]._id.toString(), usersList[2]._id.toString()]
	);

	assert.strictEqual(updatedExpense.name, "Updated Lunch");
	assert.strictEqual(updatedExpense.cost, 150.99);
	assert.strictEqual(updatedExpense.deadline, "02/15/2026");
	assert.strictEqual(updatedExpense.payee, usersList[1]._id.toString());
	assert.deepStrictEqual(updatedExpense.payers, [
		usersList[0]._id.toString(),
		usersList[2]._id.toString()
	]);

	// Verify the expense was actually updated in the database
	const allExpenses = await expensesData.getAllExpenses(group_1._id.toString());
	const foundExpense = allExpenses.find(
		(exp) => exp._id.toString() === expense_2._id.toString()
	);
	assert.strictEqual(foundExpense.name, "Updated Lunch");
	assert.strictEqual(foundExpense.cost, 150.99);
	assert.strictEqual(foundExpense.deadline, "02/15/2026");

	console.log("All expense tests passed.");

	// TESTS FOR SEARCH EXPENSES
	// Test getAllExpensesForUser and searchExpenses
	try {
		// Create additional test groups and expenses for search testing
		const searchTestGroup1 = await groupsData.createGroup(
			"Search Test Group 1",
			"Group for search expense testing"
		);
		
		const searchTestGroup2 = await groupsData.createGroup(
			"Search Test Group 2",
			"Another group for search testing"
		);

		// Add users to test groups
		await groupsData.addMember(searchTestGroup1._id.toString(), usersList[0]._id.toString());
		await groupsData.addMember(searchTestGroup1._id.toString(), usersList[1]._id.toString());
		await groupsData.addMember(searchTestGroup1._id.toString(), usersList[2]._id.toString());
		
		await groupsData.addMember(searchTestGroup2._id.toString(), usersList[0]._id.toString());
		await groupsData.addMember(searchTestGroup2._id.toString(), usersList[1]._id.toString());

		// Create expenses where user[0] is a payer
		const expense1 = await expensesData.createExpense(
			searchTestGroup1._id.toString(),
			"Dinner Party",
			150.00,
			"12/25/2025",
			usersList[1]._id.toString(),
			[usersList[0]._id.toString(), usersList[2]._id.toString()] // user[0] is payer
		);

		const expense2 = await expensesData.createExpense(
			searchTestGroup1._id.toString(),
			"Lunch Meeting",
			45.50,
			"01/15/2026",
			usersList[2]._id.toString(),
			[usersList[0]._id.toString()] // user[0] is payer
		);

		const expense3 = await expensesData.createExpense(
			searchTestGroup2._id.toString(),
			"Breakfast",
			30.00,
			"02/20/2026",
			usersList[1]._id.toString(),
			[usersList[0]._id.toString()] // user[0] is payer
		);

		// Create expense where user[0] is NOT a payer (should not appear in results)
		const expense4 = await expensesData.createExpense(
			searchTestGroup1._id.toString(),
			"Other Expense",
			100.00,
			"03/01/2026",
			usersList[0]._id.toString(),
			[usersList[1]._id.toString(), usersList[2]._id.toString()] // user[0] is NOT payer
		);

		// --- Tests for getAllExpensesForUser ---
		
		// Invalid input tests
		try {
			await expensesData.getAllExpensesForUser();
			assert.fail("Should have thrown an error");
		} catch (e) {
			assert.strictEqual(e, "User ID is required.");
		}

		try {
			await expensesData.getAllExpensesForUser(123);
		} catch (e) {
			assert(e === "User ID must be a string.");
		}

		try {
			await expensesData.getAllExpensesForUser("   ");
		} catch (e) {
			assert(e === "User ID cannot be an empty string or just spaces.");
		}

		try {
			await expensesData.getAllExpensesForUser("invalidId");
		} catch (e) {
			assert(e === "User ID is not a valid ID.");
		}

		// Valid test - get all expenses for user[0]
		const userExpenses = await expensesData.getAllExpensesForUser(usersList[0]._id.toString());
		
		// Should return 3 expenses (expense1, expense2, expense3) but NOT expense4
		assert.strictEqual(userExpenses.length, 3);
		
		// Verify expense structure
		const firstExpense = userExpenses[0];
		assert.property(firstExpense, '_id');
		assert.property(firstExpense, 'group');
		assert.property(firstExpense, 'name');
		assert.property(firstExpense, 'cost');
		assert.property(firstExpense, 'amountPerPayer');
		assert.property(firstExpense, 'deadline');
		assert.property(firstExpense, 'payee');
		assert.property(firstExpense, 'payeeName');
		assert.property(firstExpense, 'payers');
		assert.property(firstExpense, 'payerNames');
		
		// Verify amountPerPayer calculation
		// expense1: 150.00 / 2 payers = 75.00
		const expense1Result = userExpenses.find(e => e.name === "Dinner Party");
		assert.strictEqual(expense1Result.amountPerPayer, 75.00);
		
		// expense2: 45.50 / 1 payer = 45.50
		const expense2Result = userExpenses.find(e => e.name === "Lunch Meeting");
		assert.strictEqual(expense2Result.amountPerPayer, 45.50);
		
		// expense3: 30.00 / 1 payer = 30.00
		const expense3Result = userExpenses.find(e => e.name === "Breakfast");
		assert.strictEqual(expense3Result.amountPerPayer, 30.00);
		
		// Verify expense4 (where user is NOT payer) is not included
		const expense4Result = userExpenses.find(e => e.name === "Other Expense");
		assert(expense4Result === undefined || expense4Result === null, "expense4 should not be found");

		// --- Tests for searchExpenses ---
		
		// Invalid input tests
		try {
			await expensesData.searchExpenses();
		} catch (e) {
			assert(e === "User ID is required.");
		}

		try {
			await expensesData.searchExpenses("invalidId", "", "", "");
		} catch (e) {
			assert(e === "User ID is not a valid ID.");
		}

		try {
			await expensesData.searchExpenses(usersList[0]._id.toString(), "", "", "invalidGroupId");
		} catch (e) {
			assert(e === "Group ID is not a valid ID.");
		}

		// Test search by name - case insensitive
		const searchResults1 = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"dinner",
			"",
			""
		);
		assert.strictEqual(searchResults1.length, 1);
		assert.strictEqual(searchResults1[0].name, "Dinner Party");

		// Test search by name - partial match
		const searchResults2 = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"Lunch",
			"",
			""
		);
		assert.strictEqual(searchResults2.length, 1);
		assert.strictEqual(searchResults2[0].name, "Lunch Meeting");

		// Test search with no match
		const searchResults3 = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"NonExistent",
			"",
			""
		);
		assert.strictEqual(searchResults3.length, 0);

		// Test filter by group
		const groupFilterResults = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"",
			"",
			searchTestGroup1._id.toString()
		);
		assert.strictEqual(groupFilterResults.length, 2); // expense1 and expense2
		
		const groupFilterResults2 = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"",
			"",
			searchTestGroup2._id.toString()
		);
		assert.strictEqual(groupFilterResults2.length, 1); // expense3

		// Test sort by closest due (ascending date)
		const closestDueResults = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"",
			"closestDue",
			""
		);
		assert.strictEqual(closestDueResults.length, 3);
		// Should be sorted: 12/25/2025, 01/15/2026, 02/20/2026
		assert.strictEqual(closestDueResults[0].deadline, "12/25/2025");
		assert.strictEqual(closestDueResults[1].deadline, "01/15/2026");
		assert.strictEqual(closestDueResults[2].deadline, "02/20/2026");

		// Test sort by farthest due (descending date)
		const farthestDueResults = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"",
			"farthestDue",
			""
		);
		assert.strictEqual(farthestDueResults.length, 3);
		// Should be sorted: 02/20/2026, 01/15/2026, 12/25/2025
		assert.strictEqual(farthestDueResults[0].deadline, "02/20/2026");
		assert.strictEqual(farthestDueResults[1].deadline, "01/15/2026");
		assert.strictEqual(farthestDueResults[2].deadline, "12/25/2025");

		// Test sort by lowest amount
		const lowestAmountResults = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"",
			"lowestAmount",
			""
		);
		assert.strictEqual(lowestAmountResults.length, 3);
		// Should be sorted: 30.00, 45.50, 75.00
		assert.strictEqual(lowestAmountResults[0].amountPerPayer, 30.00);
		assert.strictEqual(lowestAmountResults[1].amountPerPayer, 45.50);
		assert.strictEqual(lowestAmountResults[2].amountPerPayer, 75.00);

		// Test sort by highest amount
		const highestAmountResults = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"",
			"highestAmount",
			""
		);
		assert.strictEqual(highestAmountResults.length, 3);
		// Should be sorted: 75.00, 45.50, 30.00
		assert.strictEqual(highestAmountResults[0].amountPerPayer, 75.00);
		assert.strictEqual(highestAmountResults[1].amountPerPayer, 45.50);
		assert.strictEqual(highestAmountResults[2].amountPerPayer, 30.00);

		// Test combined filters - search + group filter
		const combinedResults = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"Lunch",
			"",
			searchTestGroup1._id.toString()
		);
		assert.strictEqual(combinedResults.length, 1);
		assert.strictEqual(combinedResults[0].name, "Lunch Meeting");

		// Test combined filters - search + sort
		const searchSortResults = await expensesData.searchExpenses(
			usersList[0]._id.toString(),
			"",
			"lowestAmount",
			searchTestGroup1._id.toString()
		);
		assert.strictEqual(searchSortResults.length, 2);
		assert.strictEqual(searchSortResults[0].amountPerPayer, 45.50);
		assert.strictEqual(searchSortResults[1].amountPerPayer, 75.00);

		// Test user with no expenses
		const noExpensesUser = await expensesData.getAllExpensesForUser(usersList[3]._id.toString());
		assert.strictEqual(noExpensesUser.length, 0);

		console.log("\n=== Search Expenses Test Summary ===");
		console.log("All search expense tests passed.");
	} catch (err) {
		console.error("Search expense tests failed:", err);
		throw err;
	}
}
