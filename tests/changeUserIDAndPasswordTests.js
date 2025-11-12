import { assert } from "chai";
import usersData from "../data/users.js";

export async function runChangeUserIDAndPasswordTests() {

    const user1 = await usersData.createUser(
        "Benjamin", "Franklin", "ben100", "Password!1"
    );

    const user2 = await usersData.createUser(
        "George", "Washington", "washington", "Password!1"
    );

    try {
        changeUserId(user1._id, user1.userId, "");
    } catch (e) {
        
    }

}