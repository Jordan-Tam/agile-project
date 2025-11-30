// Import testing framework.
import { assert } from "chai";

// Import database connections.
import { users } from "../config/mongoCollections.js";
import { groups } from "../config/mongoCollections.js"
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
import usersData from "../data/users.js";
import { dbConnection, closeConnection } from "../config/mongoConnection.js";

// TESTS FOR ADD PAYMENT (UPDATE BALANCE)
console.log("\n=== Testing Add Payment (Update Balance) ===");

export async function runUpdateBalanceTests(){
        // ======================= TESTS FOR ADDING PAYMENT =======================
    try {
        await expensesData.addPayment();
    } catch (e) {
        //console.log(e);
        assert(e === "Group ID is required.");
    }
    const user1 = await usersData.createUser(
        "Benjamin", "Franklind", "ben750", "Password!71"
    );
	const group_1 = await groupsData.createGroup(
		"Test Group",
		"This expense group is for testing expense data functions.",
        user1._id.toString()
	);
    try {
        await expensesData.addPayment(group_1._id.toString());
    } catch (e) {
        console.log(e);
        assert(e === "Expense ID is required.");
    }
    console.log("\n=== Add Payment Test Summary ===");
    console.log("All addPayment tests passed.");

}
