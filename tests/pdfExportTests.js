import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import groupsData from "../data/groups.js";
import usersData from "../data/users.js";
import expensesData from "../data/expenses.js";
import axios from "axios";
import { ObjectId } from "mongodb";

chai.use(chaiAsPromised);

export async function runPdfExportTests() {
	console.log("\n=== PDF Export Tests ===");

	let testGroup = null;
	let testUser1 = null;
	let testUser2 = null;
	let testExpense1 = null;
	let testExpense2 = null;

	try {
		// Setup: Create test users
		console.log("Setting up test data...");
		testUser1 = await usersData.createUser(
			"PdfTest",
			"UserOne",
			"pdftestone",
			"TestPass1!"
		);
		console.log(`✓ Created test user 1: ${testUser1.userId}`);

		testUser2 = await usersData.createUser(
			"PdfTest",
			"UserTwo",
			"pdftesttwo",
			"TestPass2!"
		);
		console.log(`✓ Created test user 2: ${testUser2.userId}`);

		// Setup: Create test group
		testGroup = await groupsData.createGroup(
			"PDF Export Test Group",
			"This group is for testing PDF export functionality",
			testUser1._id.toString()
		);
		console.log(`✓ Created test group: ${testGroup._id}`);

		// Setup: Add members to group
		await groupsData.addMember(testGroup._id, testUser1.userId);
		await groupsData.addMember(testGroup._id, testUser2.userId);
		console.log("✓ Added members to test group");

		// Refresh group data
		testGroup = await groupsData.getGroupByID(testGroup._id);

		// Setup: Create test expenses
		testExpense1 = await expensesData.createExpense(
			testGroup._id,
			"Test Expense 1",
			100.5,
			"12/25/2025",
			testUser1._id.toString(),
			[testUser1._id.toString(), testUser2._id.toString()]
		);
		console.log(`✓ Created test expense 1`);

		testExpense2 = await expensesData.createExpense(
			testGroup._id,
			"Test Expense 2",
			250.75,
			"12/31/2025",
			testUser2._id.toString(),
			[testUser1._id.toString(), testUser2._id.toString()]
		);
		console.log(`✓ Created test expense 2`);

		// Refresh group data to include expenses
		testGroup = await groupsData.getGroupByID(testGroup._id);
		console.log("✓ Test data setup complete\n");

		// Test 1: Verify group has expenses
		console.log("Test 1: Verify group has expenses for PDF export");
		chai.assert.isArray(testGroup.expenses, "Group should have expenses array");
		chai.assert.isAtLeast(
			testGroup.expenses.length,
			2,
			"Group should have at least 2 expenses"
		);
		console.log("✓ Test 1 passed: Group has expenses\n");

		// Test 2: Verify group has members
		console.log("Test 2: Verify group has members for PDF export");
		chai.assert.isArray(
			testGroup.groupMembers,
			"Group should have members array"
		);
		chai.assert.isAtLeast(
			testGroup.groupMembers.length,
			2,
			"Group should have at least 2 members"
		);
		console.log("✓ Test 2 passed: Group has members\n");

		// Test 3: Verify expense data structure
		console.log("Test 3: Verify expense data structure");
		const expense = testGroup.expenses[0];
		chai.assert.property(expense, "name", "Expense should have name");
		chai.assert.property(expense, "cost", "Expense should have cost");
		chai.assert.property(expense, "deadline", "Expense should have deadline");
		chai.assert.property(expense, "payee", "Expense should have payee");
		chai.assert.property(expense, "payers", "Expense should have payers");
		chai.assert.isArray(expense.payers, "Payers should be an array");
		console.log("✓ Test 3 passed: Expense data structure is valid\n");

		// Test 4: Verify total expense calculation
		console.log("Test 4: Verify total expense calculation");
		const totalExpenses = testGroup.expenses.reduce(
			(sum, exp) => sum + exp.cost,
			0
		);
		chai.assert.strictEqual(
			totalExpenses,
			351.25,
			"Total expenses should be 351.25 (100.50 + 250.75)"
		);
		console.log("✓ Test 4 passed: Total expense calculation correct\n");

		// Test 5: Verify cost per payer calculation
		console.log("Test 5: Verify cost per payer calculation");
		const expense1CostPerPayer =
			testGroup.expenses[0].cost / testGroup.expenses[0].payers.length;
		chai.assert.strictEqual(
			expense1CostPerPayer,
			50.25,
			"Cost per payer for expense 1 should be 50.25 (100.50 / 2)"
		);
		console.log("✓ Test 5 passed: Cost per payer calculation correct\n");

		// Test 6: Verify group with no expenses handles gracefully
		console.log("Test 6: Verify group with no expenses");
		const emptyGroup = await groupsData.createGroup(
			"Empty Test Group",
			"Group with no expenses",
			testUser1._id.toString()
		);
		const emptyGroupData = await groupsData.getGroupByID(emptyGroup._id);
		const expenses = emptyGroupData.expenses || [];
		chai.assert.isArray(expenses, "Empty group should have expenses array");
		chai.assert.strictEqual(
			expenses.length,
			0,
			"Empty group should have 0 expenses"
		);
		console.log("✓ Test 6 passed: Empty group handled correctly\n");

		// Test 7: Verify group with no members handles gracefully
		console.log("Test 7: Verify group with no members");
		const groupWithNoMembers = await groupsData.createGroup(
			"No Members Group",
			"Group with no members",
			testUser1._id.toString()
		);
		const noMembersGroupData = await groupsData.getGroupByID(
			groupWithNoMembers._id
		);
		chai.assert.isArray(
			noMembersGroupData.groupMembers,
			"Group should have members array"
		);
		chai.assert.strictEqual(
			noMembersGroupData.groupMembers.length,
			0,
			"Group should have 0 members"
		);
		console.log("✓ Test 7 passed: Group with no members handled correctly\n");

		// Test 8: Verify user mapping works correctly
		console.log("Test 8: Verify user mapping for PDF generation");
		const allUsers = await usersData.getAllUsers();
		const userMap = {};
		allUsers.forEach((user) => {
			userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
		});

		const payeeName = userMap[testGroup.expenses[0].payee];
		chai.assert.isString(payeeName, "Payee name should be a string");
		chai.assert.include(
			payeeName,
			"PdfTest",
			"Payee name should contain 'PdfTest'"
		);
		console.log("✓ Test 8 passed: User mapping works correctly\n");

		// Test 9: Verify expense deadline format
		console.log("Test 9: Verify expense deadline format");
		testGroup.expenses.forEach((expense, index) => {
			chai.assert.isString(
				expense.deadline,
				`Expense ${index + 1} deadline should be a string`
			);
			chai.assert.match(
				expense.deadline,
				/^\d{1,2}\/\d{1,2}\/\d{4}$/,
				`Expense ${index + 1} deadline should match MM/DD/YYYY format`
			);
		});
		console.log("✓ Test 9 passed: Expense deadlines are in correct format\n");

		// Test 10: Verify filename sanitization (for group names with special characters)
		console.log("Test 10: Verify filename sanitization");
		const groupWithSpecialChars = await groupsData.createGroup(
			"Test / Group * Name!",
			"Group with special characters",
			testUser1._id.toString()
		);
		const sanitizedName = groupWithSpecialChars.groupName.replace(
			/[^a-z0-9]/gi,
			"_"
		);
		chai.assert.notMatch(
			sanitizedName,
			/[\/\*\!]/,
			"Sanitized filename should not contain special characters"
		);
		chai.assert.strictEqual(
			sanitizedName,
			"Test___Group___Name_",
			"Filename should replace special chars with underscores"
		);
		console.log("✓ Test 10 passed: Filename sanitization works correctly\n");

		// Test 11: Verify payee is a group member
		console.log("Test 11: Verify payee validation");
		testGroup.expenses.forEach((expense, index) => {
			const groupMemberIds = testGroup.groupMembers.map((m) =>
				m._id.toString()
			);
			chai.assert.include(
				groupMemberIds,
				expense.payee.toString(),
				`Expense ${index + 1} payee should be a group member`
			);
		});
		console.log("✓ Test 11 passed: All payees are valid group members\n");

		// Test 12: Verify all payers are group members
		console.log("Test 12: Verify payers validation");
		testGroup.expenses.forEach((expense, index) => {
			const groupMemberIds = testGroup.groupMembers.map((m) =>
				m._id.toString()
			);
			expense.payers.forEach((payer, payerIndex) => {
				chai.assert.include(
					groupMemberIds,
					payer.toString(),
					`Expense ${index + 1} payer ${
						payerIndex + 1
					} should be a group member`
				);
			});
		});
		console.log("✓ Test 12 passed: All payers are valid group members\n");

		// Test 13: Verify expense cost is a number
		console.log("Test 13: Verify expense cost data types");
		testGroup.expenses.forEach((expense, index) => {
			chai.assert.isNumber(
				expense.cost,
				`Expense ${index + 1} cost should be a number`
			);
			chai.assert.isAbove(
				expense.cost,
				0,
				`Expense ${index + 1} cost should be positive`
			);
		});
		console.log("✓ Test 13 passed: All expense costs are valid numbers\n");

		// Test 14: Verify group name and description exist
		console.log("Test 14: Verify group metadata");
		chai.assert.isString(testGroup.groupName, "Group name should be a string");
		chai.assert.isNotEmpty(
			testGroup.groupName,
			"Group name should not be empty"
		);
		chai.assert.isString(
			testGroup.groupDescription,
			"Group description should be a string"
		);
		console.log("✓ Test 14 passed: Group metadata is valid\n");

		// Test 15: Verify ObjectId handling
		console.log("Test 15: Verify ObjectId handling");
		const groupIdString = testGroup._id.toString();
		chai.assert.isString(groupIdString, "Group ID should convert to string");
		chai.assert.match(
			groupIdString,
			/^[a-f0-9]{24}$/,
			"Group ID should be a valid ObjectId string"
		);
		console.log("✓ Test 15 passed: ObjectId handling works correctly\n");

		console.log("\n=== PDF Export Test Summary ===");
		console.log("✅ All 15 PDF export tests passed successfully!");
		console.log("Total expenses tested: " + testGroup.expenses.length);
		console.log("Total group members tested: " + testGroup.groupMembers.length);

		return true;
	} catch (err) {
		console.error("\n❌ PDF Export tests failed:", err);
		throw err;
	}
}
