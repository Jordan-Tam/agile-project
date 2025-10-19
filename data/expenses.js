import {ObjectId} from "mongodb";
import {expenses} from "../config/mongoCollections.js";
import {checkString} from "../helpers.js";

const exportedMethods = {

    async createExpense(name, cost, deadline, payee, payers) {
        let newExpense = {
            name,
            cost,
            deadline,
            payee,
            payers
        };

        const expensesCollection = await expenses();

        const insertInfo = await expensesCollection.insertOne(newExpense);

        if (!insertInfo.acknowledged || !insertInfo.insertedId) {
            throw "Expense could not be added."
        }

        return newExpense;

    }

}