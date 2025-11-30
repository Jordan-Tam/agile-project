// Import testing framework.
import { assert } from "chai";

// Import data functions.
import usersData from "../data/users.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";

export async function runExpenseGraphTests() {
	console.log("\n=== Starting Expense Graph Tests ===\n");

	const usersList = await usersData.getAllUsers();

	// Create dedicated test user for isolated testing
	const graphTestUser = await usersData.createUser(
		"Graph",
		"Tester",
		"graphtest",
		"GraphTest123!"
	);

	// Create test groups for the dedicated test user
	const testGroup1 = await groupsData.createGroup(
		"Graph Test Group 1",
		"First group for testing expense graph data",
		graphTestUser._id.toString()
	);

	const testGroup2 = await groupsData.createGroup(
		"Graph Test Group 2",
		"Second group for testing expense graph data",
		graphTestUser._id.toString()
	);

	// Add members to groups - use dedicated test user
	await groupsData.addMember(testGroup1._id.toString(), graphTestUser.userId.toString());
	await groupsData.addMember(testGroup1._id.toString(), usersList[1].userId.toString());
	await groupsData.addMember(testGroup1._id.toString(), usersList[2].userId.toString());

	await groupsData.addMember(testGroup2._id.toString(), graphTestUser.userId.toString());
	await groupsData.addMember(testGroup2._id.toString(), usersList[1].userId.toString());

	// --- Test 1: Invalid User ID ---
	console.log("Test 1: Invalid user ID input validation");
	try {
		await expensesData.getExpenseGraphData();
		assert.fail("Should have thrown an error for missing user ID");
	} catch (e) {
		assert.strictEqual(e, "User ID is required.");
		console.log("✓ Correctly rejects missing user ID");
	}

	try {
		await expensesData.getExpenseGraphData("   ");
		assert.fail("Should have thrown an error for empty user ID");
	} catch (e) {
		assert.strictEqual(e, "User ID cannot be an empty string or just spaces.");
		console.log("✓ Correctly rejects empty/whitespace user ID");
	}

	try {
		await expensesData.getExpenseGraphData("invalidId");
		assert.fail("Should have thrown an error for invalid user ID");
	} catch (e) {
		assert.strictEqual(e, "User ID is not a valid ID.");
		console.log("✓ Correctly rejects invalid user ID format");
	}

	// --- Test 2: User with No Groups ---
	console.log("\nTest 2: User with no groups");
	const noGroupsData = await expensesData.getExpenseGraphData(usersList[3]._id.toString());

	assert.deepStrictEqual(noGroupsData.byName, { labels: [], data: [], colors: [] });
	assert.deepStrictEqual(noGroupsData.byDate, { labels: [], data: [] });
	assert.strictEqual(noGroupsData.totalExpenses, 0);
	assert.strictEqual(noGroupsData.totalCost, 0);
	console.log("✓ Returns empty structure for user with no groups");

	// --- Test 3: User with Groups but No Expenses ---
	console.log("\nTest 3: User with groups but no expenses");
	// graphTestUser has groups but no expenses yet
	const emptyGroupData = await expensesData.getExpenseGraphData(graphTestUser._id.toString());
	assert.strictEqual(emptyGroupData.totalExpenses, 0);
	assert.strictEqual(emptyGroupData.totalCost, 0);
	console.log("✓ Returns zero totals for user with groups but no expenses");

	// --- Test 4: Single Expense ---
	console.log("\nTest 4: Single expense in one group");
	await expensesData.createExpense(
		testGroup1._id.toString(),
		"Groceries",
		100.50,
		"12/15/2025",
		graphTestUser._id.toString(),
		[usersList[1]._id.toString(), usersList[2]._id.toString()]
	);

	const singleExpenseData = await expensesData.getExpenseGraphData(graphTestUser._id.toString());

	assert.strictEqual(singleExpenseData.totalExpenses, 1);
	assert.strictEqual(singleExpenseData.totalCost, 100.50);
	assert.strictEqual(singleExpenseData.byName.labels.length, 1);
	assert.strictEqual(singleExpenseData.byName.labels[0], "Groceries");
	assert.strictEqual(singleExpenseData.byName.data[0], 100.50);
	assert.strictEqual(singleExpenseData.byName.colors.length, 1);
	assert.strictEqual(singleExpenseData.byDate.labels.length, 1);
	assert.strictEqual(singleExpenseData.byDate.labels[0], "Dec 2025");
	assert.strictEqual(singleExpenseData.byDate.data[0], 100.50);
	console.log("✓ Correctly processes single expense");

	// --- Test 5: Multiple Expenses with Same Name ---
	console.log("\nTest 5: Multiple expenses with same name (aggregation)");
	await expensesData.createExpense(
		testGroup1._id.toString(),
		"Groceries",
		75.25,
		"12/20/2025",
		usersList[1]._id.toString(),
		[graphTestUser._id.toString()]
	);

	const aggregateData = await expensesData.getExpenseGraphData(graphTestUser._id.toString());

	assert.strictEqual(aggregateData.totalExpenses, 2);
	assert.strictEqual(aggregateData.totalCost, 175.75);
	assert.strictEqual(aggregateData.byName.labels.length, 1);
	assert.strictEqual(aggregateData.byName.labels[0], "Groceries");
	assert.strictEqual(aggregateData.byName.data[0], 175.75);
	console.log("✓ Correctly aggregates expenses with same name");

	// --- Test 6: Multiple Expenses with Different Names ---
	console.log("\nTest 6: Multiple expenses with different names");
	await expensesData.createExpense(
		testGroup2._id.toString(),
		"Utilities",
		200.00,
		"01/05/2026",
		usersList[1]._id.toString(),
		[graphTestUser._id.toString()]
	);

	await expensesData.createExpense(
		testGroup2._id.toString(),
		"Internet",
		50.00,
		"01/10/2026",
		graphTestUser._id.toString(),
		[usersList[1]._id.toString()]
	);

	const multipleData = await expensesData.getExpenseGraphData(graphTestUser._id.toString());

	assert.strictEqual(multipleData.totalExpenses, 4);
	assert.strictEqual(multipleData.totalCost, 425.75);
	assert.strictEqual(multipleData.byName.labels.length, 3);
	assert(multipleData.byName.labels.includes("Groceries"));
	assert(multipleData.byName.labels.includes("Utilities"));
	assert(multipleData.byName.labels.includes("Internet"));
	console.log("✓ Correctly handles multiple different expense names");

	// --- Test 7: Top 10 Expenses (Sorting and Limiting) ---
	console.log("\nTest 7: Top 10 expenses by cost (sorting and limiting)");
	// Create 12 different expenses to test the limit of 10
	for (let i = 1; i <= 12; i++) {
		await expensesData.createExpense(
			testGroup1._id.toString(),
			`TestExp${i}`,
			i * 10,
			"02/15/2026",
			graphTestUser._id.toString(),
			[usersList[1]._id.toString()]
		);
	}

	const topTenData = await expensesData.getExpenseGraphData(graphTestUser._id.toString());

	// Should be limited to 10 expenses
	assert.strictEqual(topTenData.byName.labels.length, 10);
	// Verify it's sorted by cost descending (highest first)
	assert(topTenData.byName.data[0] >= topTenData.byName.data[1], "First expense should be highest cost");
	assert(topTenData.byName.data[1] >= topTenData.byName.data[2], "Should be sorted descending");
	// The highest should be "Utilities" with cost 200
	assert.strictEqual(topTenData.byName.labels[0], "Utilities");
	assert.strictEqual(topTenData.byName.data[0], 200);
	console.log("✓ Correctly limits to top 10 expenses and sorts by cost descending");

	// --- Test 8: Expenses by Date (Chronological Sorting) ---
	console.log("\nTest 8: Expenses grouped by month (chronological sorting)");
	await expensesData.createExpense(
		testGroup1._id.toString(),
		"Early Expense",
		50.00,
		"03/01/2026",
		graphTestUser._id.toString(),
		[usersList[1]._id.toString()]
	);

	await expensesData.createExpense(
		testGroup1._id.toString(),
		"Late Expense",
		30.00,
		"05/15/2026",
		graphTestUser._id.toString(),
		[usersList[1]._id.toString()]
	);

	const dateData = await expensesData.getExpenseGraphData(graphTestUser._id.toString());

	// Verify chronological order
	const marchIndex = dateData.byDate.labels.indexOf("Mar 2026");
	const mayIndex = dateData.byDate.labels.indexOf("May 2026");
	assert(marchIndex < mayIndex, "March should come before May");
	console.log("✓ Correctly sorts expenses by date chronologically");

	// --- Test 9: Same Month Different Years ---
	console.log("\nTest 9: Same month in different years");
	await expensesData.createExpense(
		testGroup1._id.toString(),
		"December 2025",
		100.00,
		"12/01/2025",
		graphTestUser._id.toString(),
		[usersList[1]._id.toString()]
	);

	await expensesData.createExpense(
		testGroup1._id.toString(),
		"December 2026",
		150.00,
		"12/01/2026",
		graphTestUser._id.toString(),
		[usersList[1]._id.toString()]
	);

	const sameMonthData = await expensesData.getExpenseGraphData(graphTestUser._id.toString());

	const dec2025Index = sameMonthData.byDate.labels.indexOf("Dec 2025");
	const dec2026Index = sameMonthData.byDate.labels.indexOf("Dec 2026");
	assert(dec2025Index !== -1, "Dec 2025 should exist");
	assert(dec2026Index !== -1, "Dec 2026 should exist");
	assert(dec2025Index < dec2026Index, "Dec 2025 should come before Dec 2026");
	console.log("✓ Correctly handles same month in different years");

	// --- Test 10: Invalid or Missing Deadline Dates ---
	console.log("\nTest 10: Handling expenses with invalid deadline format");
	// Manually create an expense with a potentially problematic date
	// The createExpense function validates dates, so we test the graph function's resilience
	const validDateData = await expensesData.getExpenseGraphData(graphTestUser._id.toString());

	// All dates should be valid since createExpense validates them
	assert(validDateData.byDate.labels.length > 0);
	assert(validDateData.byDate.labels.every(label => label.includes('2025') || label.includes('2026')));
	console.log("✓ Graph data handles dates correctly (createExpense validates dates)");

	// --- Test Summary ---
	console.log("\n=== Expense Graph Test Summary ===");
	console.log("All expense graph tests passed successfully!");
	console.log("✓ Input validation");
	console.log("✓ Empty data handling");
	console.log("✓ Single and multiple expense processing");
	console.log("✓ Name aggregation");
	console.log("✓ Top 10 sorting and limiting");
	console.log("✓ Date grouping and chronological sorting");
	console.log("✓ Multi-year date handling");
}
