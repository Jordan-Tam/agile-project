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

    const group_1 = await groupsData.createGroup("Test Group", "This expense group is for testing expense data functions.");

    // TESTS FOR CREATING AN EXPENSE
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
            "02/30/2025"
        );
    } catch (e) {
        assert(e === "Deadline is an invalid date.");
    }

    try {
        await expensesData.createExpense(
            group_1._id.toString(),
            "Dinner",
            99.99,
            "10/22/2025",
            "1234567890"
        );
    } catch (e) {
        assert(e === "Payee ID is not a valid ID.");
    }

    const expense_1 = await expensesData.createExpense(
        group_1._id.toString(),
        "Dinner",
        99.99,
        "10/22/2025",
        usersList[0]._id.toString(),
        [usersList[1]._id.toString(), usersList[2]._id.toString()]
    );

    assert.deepEqual(expense_1.expenses[0], {
        _id: expense_1.expenses[0]._id,
        group: group_1._id,
        name: "Dinner",
        cost: 99.99,
        deadline: "10/22/2025",
        payee: usersList[0]._id.toString(),
        payers: [
            usersList[1]._id.toString(),
            usersList[2]._id.toString()
        ]
    });

    const expense_2 = await expensesData.createExpense(
        group_1._id.toString(),
        "Lunch",
        108.55,
        "01/14/2026",
        usersList[0]._id.toString(),
        [usersList[1]._id.toString()]
    );

    assert.deepEqual(expense_2.expenses[1], {
        _id: expense_2.expenses[1]._id,
        group: group_1._id,
        name: "Lunch",
        cost: 108.55,
        deadline: "01/14/2026",
        payee: usersList[0]._id.toString(),
        payers: [
            usersList[1]._id.toString()
        ]
    });

    assert((await expensesData.getAllExpenses(group_1._id.toString())).length === 2);

    // TESTS FOR DELETING AN EXPENSE
    try {
        await expensesData.deleteExpense(
            
        );
    } catch (e) {
        assert(e === "Group ID is required.");
    }

    try {
        await expensesData.deleteExpense(
            group_1._id.toString()
        )
    } catch (e) {
        assert(e === "Expense ID is required.");
    }

    try {
        await expensesData.deleteExpense(
            "69038ebc14a7768bd27fbda0",
            expense_1.expenses[0]._id.toString()
        )
    } catch (e) {
        assert(e === "Error: Group not found");
    }

    await expensesData.deleteExpense(
        group_1._id.toString(),
        expense_1.expenses[0]._id.toString()
    );

    assert((await expensesData.getAllExpenses(group_1._id.toString())).length === 1);

    console.log("All expense tests passed.");

}