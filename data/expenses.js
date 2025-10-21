import {ObjectId} from "mongodb";
import {groups} from "../config/mongoCollections.js";
import {getUserByUserId} from './users.js';
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
        //await getUserByUserId(payee.toString());

        // Check if payer ID exists.
        //for (let payer of payers) { await  getUserByUserId(payer.toString()); }

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

    }

}

export default exportedMethods;