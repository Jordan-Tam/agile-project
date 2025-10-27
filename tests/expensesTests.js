// Import testing framework.
import {assert} from "chai";

// Import database connections.
import {users} from "../config/mongoCollections.js";

// Import data functions.
import usersData from "../data/users.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";

export async function runExpenseTests() {

    const usersList = await usersData.getAllUsers();

    const group_1 = await groupsData.createGroup("Test Group", "This expense group is for testing.");

    try {
        await expensesData.createExpense(
            group_1._id.toString()
        );
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
            "10/22/2025"
        );
    } catch (e) {
        assert(e === "Deadline must be a date.");
    }

    try {
        await expensesData.createExpense(
            group_1._id.toString(),
            "Dinner",
            99.99,
            new Date("10/22/2025"),
            "1234567890"
        );
    } catch (e) {
        assert(e === "Error: invalid object ID");
    }

    const expense_1 = await expensesData.createExpense(
        group_1._id.toString(),
        "Dinner",
        99.99,
        new Date("10/22/2025"),
        usersList[0]._id.toString(),
        [usersList[1]._id.toString(), usersList[2]._id.toString()]
    );

    assert.deepEqual(expense_1.expenses[0], {
        _id: expense_1.expenses[0]._id,
        group: group_1._id,
        name: "Dinner",
        cost: 99.99,
        deadline: new Date("10/22/2025"),
        payee: usersList[0]._id.toString(),
        payers: [usersList[1]._id.toString(), usersList[2]._id.toString()]
    });

    try {
        await expensesData.createExpense(
            group_1._id.toString()
        );
    } catch (e) {
        assert(e === "Name is required.");
    }

    console.log("All expense tests passed.");

}