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
	}
};

export default exportedMethods;
