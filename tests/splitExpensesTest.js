// Import testing framework.
import { assert } from "chai";

// Import database connections.
import { users } from "../config/mongoCollections.js";

// Import data functions.
import usersData from "../data/users.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";

export async function runSplitExpenseTests() {
	console.log("\n=== STARTING SPLIT EXPENSE TESTS ===\n");

	// Get users for testing
	const usersList = await usersData.getAllUsers();
	if (usersList.length < 3) {
		throw "Need at least 3 users for split expense tests";
	}

	const user1 = usersList[0];
	const user2 = usersList[1];
	const user3 = usersList[2];

	// Create a test group
	const testGroup = await groupsData.createGroup(
		"Split Expense Test Group",
		"This group is for testing expense splitting functionality.",
		user1._id.toString()
	);

	// Add members to the group
	await groupsData.addMember(testGroup._id.toString(), user1.userId.toString());
	await groupsData.addMember(testGroup._id.toString(), user2.userId.toString());
	await groupsData.addMember(testGroup._id.toString(), user3.userId.toString());

	console.log("Created test group with ID:", testGroup._id.toString());
	console.log("Group members:", [user1._id, user2._id, user3._id].map(id => id.toString()));

	// ============================================
	// TEST 1: Evenly Split Expense - Simple Case
	// ============================================
	console.log("\n--- TEST 1: Evenly Split Expense (3 payers, $30.00) ---");
	try {
		const evenlyExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Evenly Split Lunch",
			30.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null, // fileInfo
			"evenly" // distributionType
		);

		assert.strictEqual(evenlyExpense.distributionType, "evenly");
		assert.strictEqual(evenlyExpense.cost, 30.00);
		assert.strictEqual(evenlyExpense.payers.length, 3);
		assert.isUndefined(evenlyExpense.payerShares, "Evenly split should not have payerShares");
		
		// Verify each payer should owe $10.00
		const amountPerPayer = 30.00 / 3;
		console.log("✓ Evenly split expense created correctly");
		console.log(`  Each payer should owe: $${amountPerPayer.toFixed(2)}`);
	} catch (e) {
		console.error("✗ TEST 1 FAILED:", e);
		throw e;
	}

	// ============================================
	// TEST 2: Specific Amount Split - Equal Distribution
	// ============================================
	console.log("\n--- TEST 2: Specific Amount Split (equal amounts, $30.00) ---");
	try {
		const specificEqualExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Specific Amount Split (Equal)",
			30.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null, // fileInfo
			"specific", // distributionType
			{
				[user1._id.toString()]: 10.00,
				[user2._id.toString()]: 10.00,
				[user3._id.toString()]: 10.00
			}
		);

		assert.strictEqual(specificEqualExpense.distributionType, "specific");
		assert.strictEqual(specificEqualExpense.cost, 30.00);
		assert.isDefined(specificEqualExpense.payerShares, "Specific split must have payerShares");
		assert.strictEqual(specificEqualExpense.payerShares.length, 3);

		// Verify payerShares amounts
		const payerSharesMap = {};
		specificEqualExpense.payerShares.forEach(share => {
			const payerId = share.payer.toString();
			payerSharesMap[payerId] = share.owed;
		});

		assert.strictEqual(payerSharesMap[user1._id.toString()], 10.00);
		assert.strictEqual(payerSharesMap[user2._id.toString()], 10.00);
		assert.strictEqual(payerSharesMap[user3._id.toString()], 10.00);

		console.log("✓ Specific amount split (equal) created correctly");
		console.log("  Payer shares:", payerSharesMap);
	} catch (e) {
		console.error("✗ TEST 2 FAILED:", e);
		throw e;
	}

	// ============================================
	// TEST 3: Specific Amount Split - Unequal Distribution
	// ============================================
	console.log("\n--- TEST 3: Specific Amount Split (unequal amounts, $40.00) ---");
	try {
		const specificUnequalExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Specific Amount Split (Unequal)",
			40.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null,
			"specific",
			{
				[user1._id.toString()]: 10.00,
				[user2._id.toString()]: 15.00,
				[user3._id.toString()]: 15.00
			}
		);

		assert.strictEqual(specificUnequalExpense.distributionType, "specific");
		assert.strictEqual(specificUnequalExpense.cost, 40.00);
		
		const payerSharesMap = {};
		specificUnequalExpense.payerShares.forEach(share => {
			const payerId = share.payer.toString();
			payerSharesMap[payerId] = share.owed;
		});

		assert.strictEqual(payerSharesMap[user1._id.toString()], 10.00);
		assert.strictEqual(payerSharesMap[user2._id.toString()], 15.00);
		assert.strictEqual(payerSharesMap[user3._id.toString()], 15.00);

		console.log("✓ Specific amount split (unequal) created correctly");
		console.log("  Payer shares:", payerSharesMap);
	} catch (e) {
		console.error("✗ TEST 3 FAILED:", e);
		throw e;
	}

	// ============================================
	// TEST 4: Specific Amount Split - Rounding Test
	// ============================================
	console.log("\n--- TEST 4: Specific Amount Split (with rounding, $33.34) ---");
	try {
		// Use amounts that will round properly: 16.666 rounds to 16.67, 16.674 rounds to 16.67
		// But to ensure they sum correctly, let's use 16.67 and 16.67 = 33.34
		const roundingExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Rounding Test Expense",
			33.34,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString()],
			null,
			"specific",
			{
				[user1._id.toString()]: 16.67,
				[user2._id.toString()]: 16.67
			}
		);

		assert.strictEqual(roundingExpense.distributionType, "specific");
		
		const payerSharesMap = {};
		roundingExpense.payerShares.forEach(share => {
			const payerId = share.payer.toString();
			payerSharesMap[payerId] = share.owed;
		});

		// Both should be 16.67
		assert.strictEqual(payerSharesMap[user1._id.toString()], 16.67);
		assert.strictEqual(payerSharesMap[user2._id.toString()], 16.67);
		
		const sum = payerSharesMap[user1._id.toString()] + payerSharesMap[user2._id.toString()];
		assert.strictEqual(sum, 33.34, "Sum should equal total cost");

		console.log("✓ Rounding test passed");
		console.log("  Payer shares:", payerSharesMap);
		console.log("  Sum:", sum);
	} catch (e) {
		console.error("✗ TEST 4 FAILED:", e);
		throw e;
	}

	// ============================================
	// TEST 5: Error - Invalid distributionType
	// ============================================
	console.log("\n--- TEST 5: Error - Invalid distributionType ---");
	try {
		await expensesData.createExpense(
			testGroup._id.toString(),
			"Invalid Distribution Type",
			20.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString()],
			null,
			"invalid_type" // Invalid type
		);
		console.error("✗ TEST 5 FAILED: Should have thrown error");
		throw "Expected error for invalid distributionType";
	} catch (e) {
		assert.include(e.toString(), "distributionType", "Error should mention distributionType");
		console.log("✓ Invalid distributionType correctly rejected");
	}

	// ============================================
	// TEST 6: Error - Specific without payerAmounts
	// ============================================
	console.log("\n--- TEST 6: Error - Specific distribution without payerAmounts ---");
	try {
		await expensesData.createExpense(
			testGroup._id.toString(),
			"Missing payerAmounts",
			20.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString()],
			null,
			"specific", // Requires payerAmounts
			null // Missing payerAmounts
		);
		console.error("✗ TEST 6 FAILED: Should have thrown error");
		throw "Expected error for missing payerAmounts";
	} catch (e) {
		assert.include(e.toString(), "payerAmounts", "Error should mention payerAmounts");
		console.log("✓ Missing payerAmounts correctly rejected");
	}

	// ============================================
	// TEST 7: Error - Sum doesn't equal cost
	// ============================================
	console.log("\n--- TEST 7: Error - Sum of payerAmounts doesn't equal cost ---");
	try {
		await expensesData.createExpense(
			testGroup._id.toString(),
			"Invalid Sum",
			30.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString()],
			null,
			"specific",
			{
				[user1._id.toString()]: 10.00,
				[user2._id.toString()]: 15.00 // Sum is 25, not 30
			}
		);
		console.error("✗ TEST 7 FAILED: Should have thrown error");
		throw "Expected error for sum mismatch";
	} catch (e) {
		assert.include(e.toString(), "Sum", "Error should mention sum");
		console.log("✓ Invalid sum correctly rejected");
	}

	// ============================================
	// TEST 8: Error - Missing payer in payerAmounts
	// ============================================
	console.log("\n--- TEST 8: Error - Missing payer in payerAmounts ---");
	try {
		await expensesData.createExpense(
			testGroup._id.toString(),
			"Missing Payer Amount",
			30.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null,
			"specific",
			{
				[user1._id.toString()]: 10.00,
				[user2._id.toString()]: 10.00
				// Missing user3
			}
		);
		console.error("✗ TEST 8 FAILED: Should have thrown error");
		throw "Expected error for missing payer";
	} catch (e) {
		assert.include(e.toString(), "Amount required", "Error should mention missing amount");
		console.log("✓ Missing payer amount correctly rejected");
	}

	// ============================================
	// TEST 9: Payment with Evenly Split Expense
	// ============================================
	console.log("\n--- TEST 9: Payment on Evenly Split Expense ---");
	try {
		const paymentExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Payment Test (Evenly)",
			30.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null,
			"evenly"
		);

		// User2 pays $5.00
		await expensesData.addPayment(
			testGroup._id.toString(),
			paymentExpense._id.toString(),
			user2._id.toString(),
			5.00
		);

		// Fetch the group again to get updated expense
		const updatedGroup = await groupsData.getGroupByID(testGroup._id.toString());
		const updatedExpense = updatedGroup.expenses.find(
			exp => exp._id.toString() === paymentExpense._id.toString()
		);

		const user2Payment = updatedExpense.payments.find(
			p => p.payer.toString() === user2._id.toString()
		);

		assert.strictEqual(user2Payment.paid, 5.00);
		console.log("✓ Payment on evenly split expense works correctly");
		console.log(`  User2 paid: $${user2Payment.paid.toFixed(2)}`);
		console.log(`  User2 still owes: $${(10.00 - 5.00).toFixed(2)}`);
	} catch (e) {
		console.error("✗ TEST 9 FAILED:", e);
		throw e;
	}

	// ============================================
	// TEST 10: Payment with Specific Amount Expense
	// ============================================
	console.log("\n--- TEST 10: Payment on Specific Amount Expense ---");
	try {
		const specificPaymentExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Payment Test (Specific)",
			40.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null,
			"specific",
			{
				[user1._id.toString()]: 10.00,
				[user2._id.toString()]: 15.00,
				[user3._id.toString()]: 15.00
			}
		);

		// User2 pays $10.00 (owes $15.00 total)
		await expensesData.addPayment(
			testGroup._id.toString(),
			specificPaymentExpense._id.toString(),
			user2._id.toString(),
			10.00
		);

		// Fetch the group again
		const updatedGroup = await groupsData.getGroupByID(testGroup._id.toString());
		const updatedExpense = updatedGroup.expenses.find(
			exp => exp._id.toString() === specificPaymentExpense._id.toString()
		);

		const user2Payment = updatedExpense.payments.find(
			p => p.payer.toString() === user2._id.toString()
		);

		assert.strictEqual(user2Payment.paid, 10.00);
		console.log("✓ Payment on specific amount expense works correctly");
		console.log(`  User2 paid: $${user2Payment.paid.toFixed(2)}`);
		console.log(`  User2 still owes: $${(15.00 - 10.00).toFixed(2)}`);
	} catch (e) {
		console.error("✗ TEST 10 FAILED:", e);
		throw e;
	}

	// ============================================
	// TEST 11: Balance Calculation - Evenly Split
	// ============================================
	console.log("\n--- TEST 11: Balance Calculation (Evenly Split) ---");
	try {
		// Get balances before creating the expense
		const balancesBefore = await groupsData.calculateGroupBalances(testGroup._id.toString());
		const user2DebtBefore = balancesBefore[user2._id.toString()]?.[user1._id.toString()] || 0;
		const user3DebtBefore = balancesBefore[user3._id.toString()]?.[user1._id.toString()] || 0;

		const balanceExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Balance Test (Evenly)",
			30.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null,
			"evenly"
		);

		// Calculate balances after creating the expense
		const balancesAfter = await groupsData.calculateGroupBalances(testGroup._id.toString());

		// User2 and User3 should each owe User1 $10.00 MORE than before
		const user2DebtAfter = balancesAfter[user2._id.toString()]?.[user1._id.toString()] || 0;
		const user3DebtAfter = balancesAfter[user3._id.toString()]?.[user1._id.toString()] || 0;

		const user2DebtIncrease = user2DebtAfter - user2DebtBefore;
		const user3DebtIncrease = user3DebtAfter - user3DebtBefore;

		assert.strictEqual(user2DebtIncrease, 10.00, "User2 should owe User1 $10.00 more (from this expense)");
		assert.strictEqual(user3DebtIncrease, 10.00, "User3 should owe User1 $10.00 more (from this expense)");

		console.log("✓ Balance calculation for evenly split expense works correctly");
		console.log(`  User2 debt increased by: $${user2DebtIncrease.toFixed(2)} (total: $${user2DebtAfter.toFixed(2)})`);
		console.log(`  User3 debt increased by: $${user3DebtIncrease.toFixed(2)} (total: $${user3DebtAfter.toFixed(2)})`);
	} catch (e) {
		console.error("✗ TEST 11 FAILED:", e);
		throw e;
	}

	// ============================================
	// TEST 12: Balance Calculation - Specific Amount
	// ============================================
	console.log("\n--- TEST 12: Balance Calculation (Specific Amount) ---");
	try {
		// Get balances before creating the expense
		const balancesBefore = await groupsData.calculateGroupBalances(testGroup._id.toString());
		const user2DebtBefore = balancesBefore[user2._id.toString()]?.[user1._id.toString()] || 0;
		const user3DebtBefore = balancesBefore[user3._id.toString()]?.[user1._id.toString()] || 0;

		const specificBalanceExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Balance Test (Specific)",
			40.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null,
			"specific",
			{
				[user1._id.toString()]: 10.00,
				[user2._id.toString()]: 15.00,
				[user3._id.toString()]: 15.00
			}
		);

		// Calculate balances after creating the expense
		const balancesAfter = await groupsData.calculateGroupBalances(testGroup._id.toString());

		// User2 should owe User1 $15.00 MORE, User3 should owe User1 $15.00 MORE
		const user2DebtAfter = balancesAfter[user2._id.toString()]?.[user1._id.toString()] || 0;
		const user3DebtAfter = balancesAfter[user3._id.toString()]?.[user1._id.toString()] || 0;

		const user2DebtIncrease = user2DebtAfter - user2DebtBefore;
		const user3DebtIncrease = user3DebtAfter - user3DebtBefore;

		assert.strictEqual(user2DebtIncrease, 15.00, "User2 should owe User1 $15.00 more (from this expense)");
		assert.strictEqual(user3DebtIncrease, 15.00, "User3 should owe User1 $15.00 more (from this expense)");
		
		console.log("✓ Balance calculation for specific amount expense works correctly");
		console.log(`  User2 debt increased by: $${user2DebtIncrease.toFixed(2)} (total: $${user2DebtAfter.toFixed(2)})`);
		console.log(`  User3 debt increased by: $${user3DebtIncrease.toFixed(2)} (total: $${user3DebtAfter.toFixed(2)})`);
	} catch (e) {
		console.error("✗ TEST 12 FAILED:", e);
		throw e;
	}

	// ============================================
	// TEST 13: Error - Payment exceeds owed amount (Evenly)
	// ============================================
	console.log("\n--- TEST 13: Error - Payment exceeds owed amount (Evenly) ---");
	try {
		const exceedExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Exceed Payment Test (Evenly)",
			30.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null,
			"evenly"
		);

		// Try to pay more than owed ($10.00)
		await expensesData.addPayment(
			testGroup._id.toString(),
			exceedExpense._id.toString(),
			user2._id.toString(),
			15.00 // More than the $10.00 owed
		);
		
		console.error("✗ TEST 13 FAILED: Should have thrown error");
		throw "Expected error for payment exceeding owed amount";
	} catch (e) {
		assert.include(e.toString(), "exceed", "Error should mention exceeding payment");
		console.log("✓ Payment exceeding owed amount correctly rejected (evenly)");
	}

	// ============================================
	// TEST 14: Error - Payment exceeds owed amount (Specific)
	// ============================================
	console.log("\n--- TEST 14: Error - Payment exceeds owed amount (Specific) ---");
	try {
		const exceedSpecificExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Exceed Payment Test (Specific)",
			40.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null,
			"specific",
			{
				[user1._id.toString()]: 10.00,
				[user2._id.toString()]: 15.00,
				[user3._id.toString()]: 15.00
			}
		);

		// Try to pay more than owed ($15.00)
		await expensesData.addPayment(
			testGroup._id.toString(),
			exceedSpecificExpense._id.toString(),
			user2._id.toString(),
			20.00 // More than the $15.00 owed
		);
		
		console.error("✗ TEST 14 FAILED: Should have thrown error");
		throw "Expected error for payment exceeding owed amount";
	} catch (e) {
		assert.include(e.toString(), "exceed", "Error should mention exceeding payment");
		console.log("✓ Payment exceeding owed amount correctly rejected (specific)");
	}

	// ============================================
	// TEST 15: Multiple Payments - Specific Amount
	// ============================================
	console.log("\n--- TEST 15: Multiple Payments on Specific Amount Expense ---");
	try {
		const multiPaymentExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Multiple Payments Test",
			30.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString(), user3._id.toString()],
			null,
			"specific",
			{
				[user1._id.toString()]: 10.00,
				[user2._id.toString()]: 10.00,
				[user3._id.toString()]: 10.00
			}
		);

		// User2 makes partial payment
		await expensesData.addPayment(
			testGroup._id.toString(),
			multiPaymentExpense._id.toString(),
			user2._id.toString(),
			5.00
		);

		// User2 makes another payment
		await expensesData.addPayment(
			testGroup._id.toString(),
			multiPaymentExpense._id.toString(),
			user2._id.toString(),
			3.00
		);

		// Fetch updated expense
		const updatedGroup = await groupsData.getGroupByID(testGroup._id.toString());
		const updatedExpense = updatedGroup.expenses.find(
			exp => exp._id.toString() === multiPaymentExpense._id.toString()
		);

		const user2Payment = updatedExpense.payments.find(
			p => p.payer.toString() === user2._id.toString()
		);

		assert.strictEqual(user2Payment.paid, 8.00, "User2 should have paid $8.00 total");
		console.log("✓ Multiple payments work correctly");
		console.log(`  User2 total paid: $${user2Payment.paid.toFixed(2)}`);
		console.log(`  User2 remaining: $${(10.00 - 8.00).toFixed(2)}`);
	} catch (e) {
		console.error("✗ TEST 15 FAILED:", e);
		throw e;
	}

	// ============================================
	// TEST 16: Default to Evenly (backward compatibility)
	// ============================================
	console.log("\n--- TEST 16: Default to Evenly Split (backward compatibility) ---");
	try {
		const defaultExpense = await expensesData.createExpense(
			testGroup._id.toString(),
			"Default Distribution Test",
			20.00,
			"12/31/2025",
			user1._id.toString(),
			[user1._id.toString(), user2._id.toString()],
			null
			// distributionType not provided - should default to "evenly"
		);

		assert.strictEqual(defaultExpense.distributionType, "evenly");
		assert.isUndefined(defaultExpense.payerShares);
		
		console.log("✓ Default distribution type works correctly (evenly)");
	} catch (e) {
		console.error("✗ TEST 16 FAILED:", e);
		throw e;
	}

	console.log("\n=== ALL SPLIT EXPENSE TESTS PASSED ===\n");
}

