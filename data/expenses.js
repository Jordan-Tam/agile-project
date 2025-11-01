import {ObjectId} from "mongodb";
import {groups} from "../config/mongoCollections.js";
import usersData from './users.js';
import groupsData from './groups.js';
import {
    checkString,
    checkId,
    checkCost,
    checkDate,
} from "../helpers.js";

const exportedMethods = {

    async createExpense(group, name, cost, deadline, payee, payers) {

        // Input validation.
        group = checkId(group.toString(), "Group", "createExpense");
        name = checkString(name, "Name", "createExpense");
        cost = checkCost(cost, "createExpense");
        deadline = checkDate(deadline, "Deadline", "createExpense");
        payee = checkId(payee.toString(), "Payee", "createExpense");
        for (let payer of payers) { checkId(payer.toString(), "Payer", "createExpense"); }

        // Check if group ID exists.
        await groupsData.getGroupByID(group);

        // Check if payee ID exists.
        //await usersDatagetUserByUserId(payee.toString());

        // Check if payer ID exists.
        //for (let payer of payers) { await usersDatagetUserByUserId(payer.toString()); }

        // Create the new expense object.
        let newExpense = {
            _id: new ObjectId(),
            group: new ObjectId(group),
            name,
            cost,
            deadline,
            payee,
            payers
        };

        const groupsCollection = await groups();

        // Insert expense subdocument into the group's expenses array.
        const insertExpenseToGroup = await groupsCollection.findOneAndUpdate(
            {_id: new ObjectId(group)},
            {$push: {expenses: newExpense}},
            {returnDocument: "after"}
        );

        // Return the expense subdocument.
        return insertExpenseToGroup;

    },

    async getExpenseById(id) {

        // Input validation.
        id = checkId(id);

        const groupsCollection = await groups();

        // Get the group that this expense belongs to.
        let group = await groupsCollection.findOne(
            {"expenses._id": new ObjectId(id)}
        );

        if (!group) {
            throw "Expense not found."
        };

        // Find the expense subdocument and return it.
        for (let expense of group.expenses) {
            if (expense._id.toString() === id) {
                return expense;
            }
        }

        throw "This message should not appear.";

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
            {_id: group._id},
            {$pull: {expenses: {"_id": new ObjectId(expenseId)}}},
            {returnDocument: "after"}
        );

        // Make sure the deletion was successful.
        if (!deleteInfo) {
            throw "Could not delete expense.";
        }

        // Return the returned document.
        return deleteInfo;
        
    }

}

export default exportedMethods;