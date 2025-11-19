import { ObjectId } from "mongodb";
import { changeLogs } from "../config/mongoCollections.js";
import { checkId, checkString } from "../helpers.js";
import groupsData from "./groups.js";
import usersData from "./users.js";

const exportedMethods = {
	/**
	 * Add a change log entry
	 * @param {string} action - The action performed (e.g., "group_created", "expense_created", "member_added")
	 * @param {string} type - "group" or "expense"
	 * @param {string} groupId - The group ID
	 * @param {string} groupName - The group name (for display even if deleted)
	 * @param {string|null} expenseId - The expense ID if expense-related
	 * @param {string|null} expenseName - The expense name if expense-related
	 * @param {object} performedBy - {userId: string, userName: string} - Who did the action
	 * @param {array} visibleTo - Array of user IDs who can see this log (all group members)
	 * @param {object} details - Action-specific details (oldValue, newValue, etc.)
	 * @param {string|null} groupStatus - Optional group status ("active" or "deleted"), defaults to "active"
	 * @returns {object} The created log entry
	 */
	async addChangeLog(
		action,
		type,
		groupId,
		groupName,
		expenseId,
		expenseName,
		performedBy,
		visibleTo,
		details,
		groupStatus = "active"
	) {
		// Input validation
		action = checkString(action, "Action", "addChangeLog");
		if (!["group", "expense"].includes(type)) {
			throw "Type must be 'group' or 'expense'";
		}
		groupId = checkId(groupId, "Group ID", "addChangeLog");
		groupName = checkString(groupName, "Group Name", "addChangeLog");

		if (!performedBy || !performedBy.userId || !performedBy.userName) {
			throw "performedBy must have userId and userName";
		}

		if (!Array.isArray(visibleTo) || visibleTo.length === 0) {
			throw "visibleTo must be a non-empty array of user IDs";
		}

		// Validate all user IDs in visibleTo
		for (const userId of visibleTo) {
			checkId(userId, "VisibleTo User ID", "addChangeLog");
		}

		// Validate groupStatus
		if (groupStatus !== "active" && groupStatus !== "deleted") {
			groupStatus = "active";
		}

		// Create log entry
		const logEntry = {
			_id: new ObjectId(),
			action: action,
			type: type,
			groupId: new ObjectId(groupId),
			groupName: groupName,
			groupStatus: groupStatus, // "active" or "deleted"
			expenseId: expenseId ? new ObjectId(expenseId) : null,
			expenseName: expenseName || null,
			visibleTo: visibleTo.map((id) => new ObjectId(id)),
			performedBy: {
				userId: new ObjectId(performedBy.userId),
				userName: performedBy.userName,
			},
			timestamp: new Date(),
			details: details || {},
		};

		// Insert into database
		const changeLogsCollection = await changeLogs();
		const insertInfo = await changeLogsCollection.insertOne(logEntry);

		if (!insertInfo.acknowledged) {
			throw "Failed to insert change log entry";
		}

		// Return the log entry with string IDs
		return {
			...logEntry,
			_id: logEntry._id.toString(),
			groupId: logEntry.groupId.toString(),
			expenseId: logEntry.expenseId ? logEntry.expenseId.toString() : null,
			visibleTo: logEntry.visibleTo.map((id) => id.toString()),
			performedBy: {
				userId: logEntry.performedBy.userId.toString(),
				userName: logEntry.performedBy.userName,
			},
		};
	},

	/**
	 * Get change logs for a specific user
	 * @param {string} userId - The user ID
	 * @param {object} filters - {groupStatus: "active"|"deleted"|null, type: "group"|"expense"|null, groupId: string|null}
	 * @returns {array} Array of change log entries
	 */
	async getUserChangeLogs(userId, filters = {}) {
		userId = checkId(userId, "User ID", "getUserChangeLogs");

		const changeLogsCollection = await changeLogs();

		// Build query
		const query = {
			visibleTo: new ObjectId(userId),
		};

		// Apply filters
		if (filters.groupStatus) {
			query.groupStatus = filters.groupStatus;
		}

		if (filters.type) {
			query.type = filters.type;
		}

		if (filters.groupId) {
			query.groupId = new ObjectId(filters.groupId);
		}

		if (filters.expenseId) {
			query.expenseId = new ObjectId(filters.expenseId);
		}

		// Get logs sorted by timestamp (newest first)
		const logs = await changeLogsCollection
			.find(query)
			.sort({ timestamp: -1 })
			.toArray();

		// Convert ObjectIds to strings
		return logs.map((log) => ({
			...log,
			_id: log._id.toString(),
			groupId: log.groupId.toString(),
			expenseId: log.expenseId ? log.expenseId.toString() : null,
			expenseName: log.expenseName || null, // Ensure expenseName is included
			visibleTo: log.visibleTo.map((id) => id.toString()),
			performedBy: {
				userId: log.performedBy.userId.toString(),
				userName: log.performedBy.userName,
			},
		}));
	},

	/**
	 * Get all change logs for a specific group (for a user)
	 * @param {string} userId - The user ID
	 * @param {string} groupId - The group ID
	 * @returns {array} Array of change log entries for this group
	 */
	async getGroupChangeLogsForUser(userId, groupId) {
		userId = checkId(userId, "User ID", "getGroupChangeLogsForUser");
		groupId = checkId(groupId, "Group ID", "getGroupChangeLogsForUser");

		return this.getUserChangeLogs(userId, { groupId: groupId });
	},

	/**
	 * Get change logs for a specific expense (for a user)
	 * @param {string} userId - The user ID
	 * @param {string} groupId - The group ID
	 * @param {string} expenseId - The expense ID
	 * @returns {array} Array of change log entries for this expense
	 */
	async getExpenseChangeLogsForUser(userId, groupId, expenseId) {
		userId = checkId(userId, "User ID", "getExpenseChangeLogsForUser");
		groupId = checkId(groupId, "Group ID", "getExpenseChangeLogsForUser");
		expenseId = checkId(expenseId, "Expense ID", "getExpenseChangeLogsForUser");

		return this.getUserChangeLogs(userId, {
			groupId: groupId,
			expenseId: expenseId,
		});
	},

	/**
	 * Get only group-level change logs (excludes expense logs)
	 * @param {string} userId - The user ID
	 * @param {string} groupId - The group ID
	 * @returns {array} Array of group-level change log entries
	 */
	async getGroupLevelChangeLogsForUser(userId, groupId) {
		userId = checkId(userId, "User ID", "getGroupLevelChangeLogsForUser");
		groupId = checkId(groupId, "Group ID", "getGroupLevelChangeLogsForUser");

		const logs = await this.getUserChangeLogs(userId, {
			groupId: groupId,
			type: "group",
		});

		return logs;
	},

	/**
	 * Mark all logs for a group as deleted (call before deleting the group)
	 * @param {string} groupId - The group ID
	 * @returns {object} Update result
	 */
	async markGroupAsDeleted(groupId) {
		groupId = checkId(groupId, "Group ID", "markGroupAsDeleted");

		const changeLogsCollection = await changeLogs();

		const updateResult = await changeLogsCollection.updateMany(
			{ groupId: new ObjectId(groupId) },
			{ $set: { groupStatus: "deleted" } }
		);

		return {
			matchedCount: updateResult.matchedCount,
			modifiedCount: updateResult.modifiedCount,
		};
	},

	/**
	 * Update visibleTo array when members are added or removed
	 * @param {string} groupId - The group ID
	 * @param {array} newMemberIds - Array of all current member IDs
	 * @returns {object} Update result
	 */
	async updateVisibleToForGroup(groupId, newMemberIds) {
		groupId = checkId(groupId, "Group ID", "updateVisibleToForGroup");

		if (!Array.isArray(newMemberIds)) {
			throw "newMemberIds must be an array";
		}

		// Validate all member IDs
		const validatedMemberIds = newMemberIds.map((id) =>
			new ObjectId(checkId(id, "Member ID", "updateVisibleToForGroup"))
		);

		const changeLogsCollection = await changeLogs();

		const updateResult = await changeLogsCollection.updateMany(
			{ groupId: new ObjectId(groupId) },
			{ $set: { visibleTo: validatedMemberIds } }
		);

		return {
			matchedCount: updateResult.matchedCount,
			modifiedCount: updateResult.modifiedCount,
		};
	},

	/**
	 * Helper function: Get all member IDs for a group (as strings)
	 * @param {string} groupId - The group ID
	 * @returns {array} Array of member IDs as strings
	 */
	async getAllGroupMemberIds(groupId) {
		groupId = checkId(groupId, "Group ID", "getAllGroupMemberIds");

		const group = await groupsData.getGroupByID(groupId);
		if (!group || !group.groupMembers) {
			return [];
		}

		return group.groupMembers.map((member) =>
			typeof member === "object" ? member._id.toString() : member.toString()
		);
	},

	/**
	 * Helper function: Add change log entry visible to all group members
	 * @param {string} action - The action performed
	 * @param {string} type - "group" or "expense"
	 * @param {string} groupId - The group ID
	 * @param {string} groupName - The group name
	 * @param {string|null} expenseId - The expense ID if expense-related
	 * @param {string|null} expenseName - The expense name if expense-related
	 * @param {object} performedBy - {userId: string, userName: string}
	 * @param {object} details - Action-specific details
	 * @returns {object} The created log entry
	 */
	async addChangeLogToAllMembers(
		action,
		type,
		groupId,
		groupName,
		expenseId,
		expenseName,
		performedBy,
		details
	) {
		// Get all group member IDs
		const memberIds = await this.getAllGroupMemberIds(groupId);

		if (memberIds.length === 0) {
			throw "Group has no members";
		}

		// Add log entry visible to all members
		return await this.addChangeLog(
			action,
			type,
			groupId,
			groupName,
			expenseId,
			expenseName,
			performedBy,
			memberIds,
			details
		);
	},
};

export default exportedMethods;

