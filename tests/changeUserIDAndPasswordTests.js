import { assert } from "chai";
import usersData from "../data/users.js";

export async function runChangeUserIDAndPasswordTests() {

    const user1 = await usersData.createUser(
        "Benjamin", "Franklin", "ben100", "Password!1"
    );

    const user2 = await usersData.createUser(
        "George", "Washington", "washington", "Password!1"
    );

    let test_count = 0;

    try {
        await usersData.changeFirstName(user1._id, user1.firstName, "B");
    } catch (e) {
        assert(e === "First Name must be 2-20 characters.");
        test_count++;
    }

    try {
        await usersData.changeLastName(user1._id, user1.lastName, "F");
    } catch (e) {
        assert(e === "Last Name must be 2-20 characters.");
        test_count++;
    }

    try {
        await usersData.changeUserId(user1._id, user1.userId, "Ben");
    } catch (e) {
        assert(e === "userId must be 5-10 characters.");
        test_count++;
    }

    try {
        await usersData.changeUserId(user1._id, user1.userId, "washington");
    } catch (e) {
        assert(e === "User ID already taken.");
        test_count++;
    }

    try {
        await usersData.changePassword(user1._id, "hellothere");
    } catch (e) {
        assert(e === "Password needs an uppercase letter.");
        test_count++;
    }

    await usersData.changeFirstName(user1._id, user1.firstName, "Ben");
    await usersData.changeLastName(user1._id, user1.lastName, "Frank");
    await usersData.changeUserId(user1._id, user1.userId, "ben101");

    const user1_updated = await usersData.getUserById(user1._id);

    assert(user1_updated.firstName === "Ben");
    assert(user1_updated.lastName === "Frank");
    assert(user1_updated.userId === "ben101");

    assert(test_count === 5);

    console.log("All tests passed.");

}