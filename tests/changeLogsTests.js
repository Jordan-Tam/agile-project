import { assert } from "chai";
import changeLogsData from "../data/changeLogs.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
import usersData from "../data/users.js";

export async function runChangeLogsTests() {
	// Setup: Create test data
	const user1 = await usersData.createUser(
		"Test",
		"UserOne",
		"testuser1",
		"Password!1"
	);
	const user2 = await usersData.createUser(
		"Test",
		"UserTwo",
		"testuser2",
		"Password!2"
	);
	const user3 = await usersData.createUser(
		"Test",
		"UserThree",
		"testuser3",
		"Password!3"
	);

	const testGroup = await groupsData.createGroup(
		"Test Group for Logs",
		"This group is for testing change logs"
	);

	await groupsData.addMember(testGroup._id, user1.userId);
	await groupsData.addMember(testGroup._id, user2.userId);

	// TESTS FOR addChangeLog

	// Test invalid action (empty string)
	try {
		await changeLogsData.addChangeLog(
			"",
			"group",
			testGroup._id,
			"Test Group",
			null,
			null,
			{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
			[user1._id]
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Action") && e.includes("empty"));
	}
	console.log("PASS: test_addChangeLog_invalid_action_empty");

	// Test invalid action (not a string)
	try {
		await changeLogsData.addChangeLog(
			123,
			"group",
			testGroup._id,
			"Test Group",
			null,
			null,
			{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
			[user1._id]
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Action") || e.includes("string"));
	}
	console.log("PASS: test_addChangeLog_invalid_action_not_string");

	// Test invalid type (not "group" or "expense")
	try {
		await changeLogsData.addChangeLog(
			"group_created",
			"invalid",
			testGroup._id,
			"Test Group",
			null,
			null,
			{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
			[user1._id]
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e === "Type must be 'group' or 'expense'");
	}
	console.log("PASS: test_addChangeLog_invalid_type");

	// Test invalid groupId (empty string)
	try {
		await changeLogsData.addChangeLog(
			"group_created",
			"group",
			"",
			"Test Group",
			null,
			null,
			{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
			[user1._id]
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Group ID"));
	}
	console.log("PASS: test_addChangeLog_invalid_groupId_empty");

	// Test invalid groupId (invalid format)
	try {
		await changeLogsData.addChangeLog(
			"group_created",
			"group",
			"invalid-id",
			"Test Group",
			null,
			null,
			{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
			[user1._id]
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Group ID") || e.includes("valid"));
	}
	console.log("PASS: test_addChangeLog_invalid_groupId_format");

	// Test invalid groupName (empty string)
	try {
		await changeLogsData.addChangeLog(
			"group_created",
			"group",
			testGroup._id,
			"",
			null,
			null,
			{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
			[user1._id]
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Group Name") && e.includes("empty"));
	}
	console.log("PASS: test_addChangeLog_invalid_groupName_empty");

	// Test invalid performedBy (missing userId)
	try {
		await changeLogsData.addChangeLog(
			"group_created",
			"group",
			testGroup._id,
			"Test Group",
			null,
			null,
			{ userName: `${user1.firstName} ${user1.lastName}` },
			[user1._id]
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("performedBy") || e.includes("userId"));
	}
	console.log("PASS: test_addChangeLog_invalid_performedBy_missing_userId");

	// Test invalid performedBy (missing userName)
	try {
		await changeLogsData.addChangeLog(
			"group_created",
			"group",
			testGroup._id,
			"Test Group",
			null,
			null,
			{ userId: user1._id },
			[user1._id]
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("performedBy") || e.includes("userName"));
	}
	console.log("PASS: test_addChangeLog_invalid_performedBy_missing_userName");

	// Test invalid visibleTo (not an array)
	try {
		await changeLogsData.addChangeLog(
			"group_created",
			"group",
			testGroup._id,
			"Test Group",
			null,
			null,
			{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
			"not-an-array"
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("visibleTo") || e.includes("array"));
	}
	console.log("PASS: test_addChangeLog_invalid_visibleTo_not_array");

	// Test invalid visibleTo (empty array)
	try {
		await changeLogsData.addChangeLog(
			"group_created",
			"group",
			testGroup._id,
			"Test Group",
			null,
			null,
			{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
			[]
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("visibleTo") && (e.includes("empty") || e.includes("non-empty")));
	}
	console.log("PASS: test_addChangeLog_invalid_visibleTo_empty_array");

	// Test invalid visibleTo (invalid user ID)
	try {
		await changeLogsData.addChangeLog(
			"group_created",
			"group",
			testGroup._id,
			"Test Group",
			null,
			null,
			{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
			["invalid-id"]
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("VisibleTo User ID") || e.includes("valid"));
	}
	console.log("PASS: test_addChangeLog_invalid_visibleTo_invalid_userId");

	// Test successful log creation
	const log1 = await changeLogsData.addChangeLog(
		"group_created",
		"group",
		testGroup._id,
		"Test Group",
		null,
		null,
		{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
		[user1._id, user2._id],
		{ groupName: "Test Group", groupDescription: "Test description" }
	);

	assert.isString(log1._id);
	assert.strictEqual(log1.action, "group_created");
	assert.strictEqual(log1.type, "group");
	assert.strictEqual(log1.groupId, testGroup._id);
	assert.strictEqual(log1.groupName, "Test Group");
	assert.isNull(log1.expenseId);
	assert.isNull(log1.expenseName);
	assert.strictEqual(log1.performedBy.userId, user1._id);
	assert.strictEqual(log1.performedBy.userName, `${user1.firstName} ${user1.lastName}`);
	assert.isArray(log1.visibleTo);
	assert.include(log1.visibleTo, user1._id);
	assert.include(log1.visibleTo, user2._id);
	assert.strictEqual(log1.groupStatus, "active");
	assert.isObject(log1.details);
	console.log("PASS: test_addChangeLog_successful_creation");

	// Test log creation with deleted status
	const log2 = await changeLogsData.addChangeLog(
		"group_deleted",
		"group",
		testGroup._id,
		"Test Group",
		null,
		null,
		{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
		[user1._id, user2._id],
		{},
		"deleted"
	);

	assert.strictEqual(log2.groupStatus, "deleted");
	console.log("PASS: test_addChangeLog_with_deleted_status");

	// Test log creation with expense
	const expense = await expensesData.createExpense(
		testGroup._id,
		"Test Expense",
		50.00,
		"12/31/2025",
		user1._id,
		[user2._id]
	);

	const log3 = await changeLogsData.addChangeLog(
		"expense_created",
		"expense",
		testGroup._id,
		"Test Group",
		expense._id.toString(),
		"Test Expense",
		{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
		[user1._id, user2._id],
		{ cost: 50.00, deadline: "12/31/2025" }
	);

	assert.strictEqual(log3.action, "expense_created");
	assert.strictEqual(log3.type, "expense");
	assert.strictEqual(log3.expenseId, expense._id.toString());
	assert.strictEqual(log3.expenseName, "Test Expense");
	console.log("PASS: test_addChangeLog_with_expense");

	// TESTS FOR getUserChangeLogs

	// Test invalid userId
	try {
		await changeLogsData.getUserChangeLogs("");
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("User ID"));
	}

	try {
		await changeLogsData.getUserChangeLogs("invalid-id");
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("User ID") || e.includes("valid"));
	}
	console.log("PASS: test_getUserChangeLogs_invalid_userId");

	// Test getting logs for user1 (should see logs where user1 is in visibleTo)
	const user1Logs = await changeLogsData.getUserChangeLogs(user1._id);
	assert.isArray(user1Logs);
	assert.isAtLeast(user1Logs.length, 3); // Should have at least log1, log2, log3
	assert.include(user1Logs.map(l => l._id), log1._id);
	assert.include(user1Logs.map(l => l._id), log2._id);
	assert.include(user1Logs.map(l => l._id), log3._id);
	console.log("PASS: test_getUserChangeLogs_get_all_logs");

	// Test filter by groupStatus
	const activeLogs = await changeLogsData.getUserChangeLogs(user1._id, { groupStatus: "active" });
	assert.isArray(activeLogs);
	assert.isTrue(activeLogs.every(log => log.groupStatus === "active"));
	console.log("PASS: test_getUserChangeLogs_filter_by_active_status");

	const deletedLogs = await changeLogsData.getUserChangeLogs(user1._id, { groupStatus: "deleted" });
	assert.isArray(deletedLogs);
	assert.isTrue(deletedLogs.every(log => log.groupStatus === "deleted"));
	assert.include(deletedLogs.map(l => l._id), log2._id);
	console.log("PASS: test_getUserChangeLogs_filter_by_deleted_status");

	// Test filter by type
	const groupLogs = await changeLogsData.getUserChangeLogs(user1._id, { type: "group" });
	assert.isArray(groupLogs);
	assert.isTrue(groupLogs.every(log => log.type === "group"));
	console.log("PASS: test_getUserChangeLogs_filter_by_group_type");

	const expenseLogs = await changeLogsData.getUserChangeLogs(user1._id, { type: "expense" });
	assert.isArray(expenseLogs);
	assert.isTrue(expenseLogs.every(log => log.type === "expense"));
	assert.include(expenseLogs.map(l => l._id), log3._id);
	console.log("PASS: test_getUserChangeLogs_filter_by_expense_type");

	// Test filter by groupId
	const groupFilteredLogs = await changeLogsData.getUserChangeLogs(user1._id, { groupId: testGroup._id });
	assert.isArray(groupFilteredLogs);
	assert.isTrue(groupFilteredLogs.every(log => log.groupId === testGroup._id));
	console.log("PASS: test_getUserChangeLogs_filter_by_groupId");

	// Test filter by expenseId
	const expenseFilteredLogs = await changeLogsData.getUserChangeLogs(user1._id, { expenseId: expense._id.toString() });
	assert.isArray(expenseFilteredLogs);
	assert.isTrue(expenseFilteredLogs.every(log => log.expenseId === expense._id.toString()));
	assert.include(expenseFilteredLogs.map(l => l._id), log3._id);
	console.log("PASS: test_getUserChangeLogs_filter_by_expenseId");

	// Test that user3 doesn't see logs (not in visibleTo)
	const user3Logs = await changeLogsData.getUserChangeLogs(user3._id);
	const hasTestGroupLogs = user3Logs.some(log => log.groupId === testGroup._id);
	assert.isFalse(hasTestGroupLogs, "User3 should not see logs from testGroup");
	console.log("PASS: test_getUserChangeLogs_user_not_in_visibleTo");

	// TESTS FOR getGroupChangeLogsForUser

	// Test invalid userId
	try {
		await changeLogsData.getGroupChangeLogsForUser("", testGroup._id);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("User ID"));
	}

	// Test invalid groupId
	try {
		await changeLogsData.getGroupChangeLogsForUser(user1._id, "");
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Group ID"));
	}
	console.log("PASS: test_getGroupChangeLogsForUser_invalid_groupId");

	// Test getting group logs
	const groupChangeLogs = await changeLogsData.getGroupChangeLogsForUser(user1._id, testGroup._id);
	assert.isArray(groupChangeLogs);
	assert.isTrue(groupChangeLogs.every(log => log.groupId === testGroup._id));
	assert.isAtLeast(groupChangeLogs.length, 3);
	console.log("PASS: test_getGroupChangeLogsForUser_get_logs");

	// TESTS FOR getExpenseChangeLogsForUser

	// Test invalid userId
	try {
		await changeLogsData.getExpenseChangeLogsForUser("", testGroup._id, expense._id.toString());
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("User ID"));
	}

	// Test invalid groupId
	try {
		await changeLogsData.getExpenseChangeLogsForUser(user1._id, "", expense._id.toString());
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Group ID"));
	}
	console.log("PASS: test_getExpenseChangeLogsForUser_invalid_groupId");

	// Test invalid expenseId
	try {
		await changeLogsData.getExpenseChangeLogsForUser(user1._id, testGroup._id, "");
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Expense ID"));
	}
	console.log("PASS: test_getExpenseChangeLogsForUser_invalid_expenseId");

	// Test getting expense logs
	const expenseChangeLogs = await changeLogsData.getExpenseChangeLogsForUser(
		user1._id,
		testGroup._id,
		expense._id.toString()
	);
	assert.isArray(expenseChangeLogs);
	assert.isTrue(expenseChangeLogs.every(log => log.groupId === testGroup._id));
	assert.isTrue(expenseChangeLogs.every(log => log.expenseId === expense._id.toString()));
	assert.include(expenseChangeLogs.map(l => l._id), log3._id);
	console.log("PASS: test_getExpenseChangeLogsForUser_get_logs");

	// TESTS FOR getGroupLevelChangeLogsForUser

	// Test invalid userId
	try {
		await changeLogsData.getGroupLevelChangeLogsForUser("", testGroup._id);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("User ID"));
	}
	console.log("PASS: test_getGroupLevelChangeLogsForUser_invalid_userId");

	// Test invalid groupId
	try {
		await changeLogsData.getGroupLevelChangeLogsForUser(user1._id, "");
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Group ID"));
	}
	console.log("PASS: test_getGroupLevelChangeLogsForUser_invalid_groupId");

	// Test getting group-level logs only
	const groupLevelLogs = await changeLogsData.getGroupLevelChangeLogsForUser(user1._id, testGroup._id);
	assert.isArray(groupLevelLogs);
	assert.isTrue(groupLevelLogs.every(log => log.type === "group"));
	assert.isTrue(groupLevelLogs.every(log => log.groupId === testGroup._id));
	// Should not include expense logs
	assert.isFalse(groupLevelLogs.some(log => log.expenseId));
	console.log("PASS: test_getGroupLevelChangeLogsForUser_get_logs");

	// TESTS FOR markGroupAsDeleted

	// Test invalid groupId
	try {
		await changeLogsData.markGroupAsDeleted("");
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Group ID"));
	}
	console.log("PASS: test_markGroupAsDeleted_invalid_groupId");

	// Create another group and add logs for testing markGroupAsDeleted
	const testGroup2 = await groupsData.createGroup(
		"Test Group 2 for Deletion",
		"Testing markGroupAsDeleted"
	);
	await groupsData.addMember(testGroup2._id, user1.userId);
	await groupsData.addMember(testGroup2._id, user2.userId);

	const log4 = await changeLogsData.addChangeLog(
		"group_created",
		"group",
		testGroup2._id,
		"Test Group 2 for Deletion",
		null,
		null,
		{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
		[user1._id, user2._id],
		{}
	);

	// Mark all logs as deleted
	const updateResult = await changeLogsData.markGroupAsDeleted(testGroup2._id);
	assert.isObject(updateResult);
	assert.isAtLeast(updateResult.matchedCount, 1);
	assert.isAtLeast(updateResult.modifiedCount, 1);

	// Verify logs are marked as deleted
	const logsAfterMarking = await changeLogsData.getGroupChangeLogsForUser(user1._id, testGroup2._id);
	assert.isTrue(logsAfterMarking.every(log => log.groupStatus === "deleted"));
	console.log("PASS: test_markGroupAsDeleted_mark_logs");

	// TESTS FOR updateVisibleToForGroup

	// Test invalid groupId
	try {
		await changeLogsData.updateVisibleToForGroup("", [user1._id]);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Group ID"));
	}
	console.log("PASS: test_updateVisibleToForGroup_invalid_groupId");

	// Test invalid newMemberIds (not an array)
	try {
		await changeLogsData.updateVisibleToForGroup(testGroup._id, "not-an-array");
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e === "newMemberIds must be an array");
	}
	console.log("PASS: test_updateVisibleToForGroup_invalid_newMemberIds_not_array");

	// Test invalid member ID in array
	try {
		await changeLogsData.updateVisibleToForGroup(testGroup._id, ["invalid-id"]);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Member ID") || e.includes("valid"));
	}
	console.log("PASS: test_updateVisibleToForGroup_invalid_memberId");

	// Create a new group for testing updateVisibleToForGroup
	const testGroup3 = await groupsData.createGroup(
		"Test Group 3 for VisibleTo",
		"Testing updateVisibleToForGroup"
	);
	await groupsData.addMember(testGroup3._id, user1.userId);

	const log5 = await changeLogsData.addChangeLog(
		"group_created",
		"group",
		testGroup3._id,
		"Test Group 3 for VisibleTo",
		null,
		null,
		{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
		[user1._id],
		{}
	);

	// Verify user2 doesn't see the log initially
	const user2LogsBefore = await changeLogsData.getGroupChangeLogsForUser(user2._id, testGroup3._id);
	assert.isFalse(user2LogsBefore.some(log => log._id === log5._id));

	// Add user2 as member
	await groupsData.addMember(testGroup3._id, user2.userId);

	// Update visibleTo to include user2
	const visibleToUpdateResult = await changeLogsData.updateVisibleToForGroup(
		testGroup3._id,
		[user1._id, user2._id]
	);
	assert.isObject(visibleToUpdateResult);
	assert.isAtLeast(visibleToUpdateResult.modifiedCount, 1);

	// Verify user2 can now see the log
	const user2LogsAfter = await changeLogsData.getGroupChangeLogsForUser(user2._id, testGroup3._id);
	assert.isTrue(user2LogsAfter.some(log => log._id === log5._id));
	console.log("PASS: test_updateVisibleToForGroup_update_visibleTo");

	// TESTS FOR getAllGroupMemberIds

	// Test invalid groupId
	try {
		await changeLogsData.getAllGroupMemberIds("");
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e.includes("Group ID"));
	}
	console.log("PASS: test_getAllGroupMemberIds_invalid_groupId");

	// Test getting member IDs
	const memberIds = await changeLogsData.getAllGroupMemberIds(testGroup._id);
	assert.isArray(memberIds);
	assert.include(memberIds, user1._id);
	assert.include(memberIds, user2._id);
	assert.notInclude(memberIds, user3._id);
	console.log("PASS: test_getAllGroupMemberIds_get_members");

	// Test group with no members (create a new group without adding members)
	const emptyGroup = await groupsData.createGroup(
		"Empty Group",
		"A group with no members"
	);
	const emptyMemberIds = await changeLogsData.getAllGroupMemberIds(emptyGroup._id);
	assert.isArray(emptyMemberIds);
	assert.strictEqual(emptyMemberIds.length, 0);
	console.log("PASS: test_getAllGroupMemberIds_empty_group");

	// TESTS FOR addChangeLogToAllMembers

	// Test with group that has no members
	try {
		await changeLogsData.addChangeLogToAllMembers(
			"group_created",
			"group",
			emptyGroup._id,
			"Empty Group",
			null,
			null,
			{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
			{}
		);
		assert.fail("Should have thrown an error");
	} catch (e) {
		assert(e === "Group has no members");
	}
	console.log("PASS: test_addChangeLogToAllMembers_group_with_no_members");

	// Test successful addition to all members
	const log6 = await changeLogsData.addChangeLogToAllMembers(
		"member_added",
		"group",
		testGroup._id,
		"Test Group",
		null,
		null,
		{ userId: user1._id, userName: `${user1.firstName} ${user1.lastName}` },
		{ addedMember: `${user3.firstName} ${user3.lastName}`, addedMemberId: user3._id }
	);

	assert.isString(log6._id);
	assert.strictEqual(log6.action, "member_added");
	// Should be visible to all members (user1 and user2)
	assert.isTrue(log6.visibleTo.includes(user1._id));
	assert.isTrue(log6.visibleTo.includes(user2._id));

	// Verify both members can see the log
	const user1MemberLog = await changeLogsData.getGroupChangeLogsForUser(user1._id, testGroup._id);
	assert.isTrue(user1MemberLog.some(log => log._id === log6._id && log.action === "member_added"));

	const user2MemberLog = await changeLogsData.getGroupChangeLogsForUser(user2._id, testGroup._id);
	assert.isTrue(user2MemberLog.some(log => log._id === log6._id && log.action === "member_added"));
	console.log("PASS: test_addChangeLogToAllMembers_successful_addition");

	console.log("\n=== Change Logs Test Summary ===");
	console.log("All change logs tests passed.");
}

