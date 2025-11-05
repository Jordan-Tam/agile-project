import { ObjectId } from "mongodb";
import { groups } from "../config/mongoCollections.js";
import usersData from "./users.js";
import groupsData from "./groups.js";
import { checkString, checkId, checkCost, checkDate } from "../helpers.js";

const exportedMethods = {
	async createExpense(group, name, cost, deadline, payee, payers) {
		// Input validation
		group = checkId(group.toString(), "Group", "createExpense");
		name = checkString(name, "Name", "createExpense");
		cost = checkCost(cost, "createExpense");
		deadline = checkDate(deadline, "Deadline", "createExpense");
		payee = checkId(payee.toString(), "Payee", "createExpense");
		for (let payer of payers)
			checkId(payer.toString(), "Payer", "createExpense");

		// Check that the group exists
		const groupDoc = await groupsData.getGroupByID(group);
		if (!groupDoc) throw `Error: Group ${group} not found.`;

		// Ensure the group has members
		if (!groupDoc.groupMembers || groupDoc.groupMembers.length === 0) {
			throw `Error: Group ${groupDoc.groupName} has no members. Cannot add expense.`;
		}

		// Convert stored group member IDs to strings for comparison
		const groupMemberIds = groupDoc.groupMembers.map((m) => m._id.toString());

		// Verify that the payee is in the group
		if (!groupMemberIds.includes(payee.toString())) {
			throw `Error: Payee ${payee} is not a member of group "${groupDoc.groupName}".`;
		}

		// Verify that every payer is in the group
		for (let payer of payers) {
			if (!groupMemberIds.includes(payer.toString())) {
				throw `Error: Payer ${payer} is not a member of group "${groupDoc.groupName}".`;
			}
		}

		// Create the new expense object
		const newExpense = {
			_id: new ObjectId(),
			group: new ObjectId(group),
			name,
			cost,
			deadline,
			payee,
			payers
		};

		// Add to the group's expenses array
		const groupsCollection = await groups();
		const updateResult = await groupsCollection.findOneAndUpdate(
			{ _id: new ObjectId(group) },
			{ $push: { expenses: newExpense } },
			{ returnDocument: "after" }
		);

		if (!updateResult) throw "Error: Failed to insert expense.";

		// Return the inserted expense document
		return newExpense;
	},

	async getAllExpenses(groupId) {
		// Input validation.
		groupId = checkId(groupId, "Group", "getAllExpenses");

		// Get group associated with groupId.
		const groupsCollection = await groups();
		const group = await groupsCollection.findOne({
			_id: new ObjectId(groupId)
		});

		if (!group) {
			throw "Group not found.";
		}

		return group.expenses;
	},

	async deleteExpense(groupId, expenseId) {
		// Input validation.
		groupId = checkId(groupId, "Group", "deleteExpense");
		expenseId = checkId(expenseId, "Expense", "deleteExpense");

		// Connect to the groups database.
		const groupsCollection = await groups();

		// Get the group associated with the given ID.
		let group = await groupsData.getGroupByID(groupId);

		// Remove the expense from the group.
		const deleteInfo = await groupsCollection.findOneAndUpdate(
			{ _id: new ObjectId(group._id) },
			{ $pull: { expenses: { _id: new ObjectId(expenseId) } } },
			{ returnDocument: "after" }
		);

		// Make sure the deletion was successful.
		if (!deleteInfo) {
			throw "Could not delete expense.";
		}

		// Return the returned document.
		return deleteInfo;
	},

	// Get all expenses for a user (where user is a payer - they owe money)
	async getAllExpensesForUser(userId) {
		userId = checkId(userId, "User", "getAllExpensesForUser");
		const userObjectId = new ObjectId(userId);

		// Get all groups the user is a member of
		const userGroups = await groupsData.getGroupsForUser(userId);
		
		// Get all expenses from all groups where user is a payer
		const allExpenses = [];
		const allUsers = await usersData.getAllUsers();
		const userMap = {};
		allUsers.forEach((user) => {
			userMap[user._id.toString()] = {
				name: `${user.firstName} ${user.lastName}`,
				userId: user.userId
			};
		});

		// Process each group
		for (const group of userGroups) {
			if (group.expenses && group.expenses.length > 0) {
				for (const expense of group.expenses) {
					// Check if user is a payer in this expense
					// Handle both ObjectId and string formats
					const payerIds = expense.payers.map(p => {
						if (typeof p === 'object' && p.toString) {
							return p.toString();
						}
						return p.toString();
					});
					if (payerIds.includes(userId)) {
						// Calculate amount per payer
						const amountPerPayer = expense.cost / expense.payers.length;
						
						// Get payee name (handle ObjectId format)
						const payeeId = typeof expense.payee === 'object' ? expense.payee.toString() : expense.payee.toString();
						const payeeInfo = userMap[payeeId] || { name: "Unknown", userId: "unknown" };
						
						// Get payer names
						const payerNames = expense.payers.map(payerId => {
							const payerIdStr = typeof payerId === 'object' ? payerId.toString() : payerId.toString();
							const payerInfo = userMap[payerIdStr] || { name: "Unknown", userId: "unknown" };
							return payerInfo.name;
						});

						allExpenses.push({
							_id: expense._id.toString(),
							group: {
								_id: group._id.toString(),
								groupName: group.groupName,
								groupDescription: group.groupDescription
							},
							name: expense.name,
							cost: Number(expense.cost.toFixed(2)),
							amountPerPayer: Number(amountPerPayer.toFixed(2)),
							deadline: expense.deadline,
							payee: payeeId,
							payeeName: payeeInfo.name,
							payers: expense.payers.map(p => typeof p === 'object' ? p.toString() : p.toString()),
							payerNames: payerNames
						});
					}
				}
			}
		}

		return allExpenses;
	},

	// Search and filter expenses
	async searchExpenses(userId, searchTerm, filterType, groupId) {
		userId = checkId(userId, "User", "searchExpenses");
		
		// Get all expenses for user
		let expenses = await this.getAllExpensesForUser(userId);

		// Apply search term filter (search by name)
		if (searchTerm && searchTerm.trim() !== "") {
			const searchLower = searchTerm.toLowerCase().trim();
			expenses = expenses.filter(expense => 
				expense.name.toLowerCase().includes(searchLower)
			);
		}

		// Apply group filter
		if (groupId && groupId.trim() !== "") {
			groupId = checkId(groupId, "Group", "searchExpenses");
			expenses = expenses.filter(expense => 
				expense.group._id === groupId
			);
		}

		// Helper function to parse MM/DD/YYYY date string
		function parseDate(dateStr) {
			if (!dateStr) return new Date(0);
			// Handle MM/DD/YYYY format
			const parts = dateStr.split('/');
			if (parts.length === 3) {
				// Month is 0-indexed in JavaScript Date
				return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
			}
			// Fallback to standard Date parsing
			return new Date(dateStr);
		}

		// Apply sorting filters
		switch (filterType) {
			case "closestDue":
				// Sort by deadline ascending (closest first)
				expenses.sort((a, b) => {
					const dateA = parseDate(a.deadline);
					const dateB = parseDate(b.deadline);
					return dateA - dateB;
				});
				break;
			case "farthestDue":
				// Sort by deadline descending (farthest first)
				expenses.sort((a, b) => {
					const dateA = parseDate(a.deadline);
					const dateB = parseDate(b.deadline);
					return dateB - dateA;
				});
				break;
			case "lowestAmount":
				// Sort by amount ascending (lowest first)
				expenses.sort((a, b) => a.amountPerPayer - b.amountPerPayer);
				break;
			case "highestAmount":
				// Sort by amount descending (highest first)
				expenses.sort((a, b) => b.amountPerPayer - a.amountPerPayer);
				break;
			default:
				// Default: no special sorting
				break;
		}

		return expenses;
	}
};

export default exportedMethods;
