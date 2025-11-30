import { assert } from "chai";
import { users } from "../config/mongoCollections.js";
import usersData from "../data/users.js";
import groupsData from "../data/groups.js";

export async function runDeleteUserTests() {

    //console.log(1);
    let testuser = await usersData.createUser(
        "Jared", "Smith", "jaredsmith", "Password!55"
    );
    const group = await groupsData.createGroup(
        "Linux Club",
        "Members of the Linux Club eboard",
        testuser._id.toString()
    );

    //console.log(2);

    const user_1 = await usersData.createUser(
        "Henry", "Smith", "hsmith", "Password!1"
    );

    //console.log(3);

    const user_2 = await usersData.createUser(
        "Albert", "Adams", "aadams", "Password!1"
    );

    //console.log(4);

    await groupsData.addMember(
        group._id.toString(),
        user_1.userId.toString()
    );

    //console.log(5);

    await groupsData.addMember(
        group._id.toString(),
        user_2.userId.toString()
    );

    //console.log(6);

    assert((await (groupsData.getGroupByID(group._id.toString()))).groupMembers.length === 2);

    await usersData.deleteUser(user_1._id);

    //console.log(7);

    assert((await (groupsData.getGroupByID(group._id.toString()))).groupMembers.length === 1);

    await usersData.deleteUser(user_2._id);

    //console.log(8);

    assert((await (groupsData.getGroupByID(group._id.toString()))).groupMembers.length === 0);

    try {
        await usersData.deleteUser(user_1._id);
    } catch (e) {
        assert(e === "User not found.");
    }

    //console.log(9);

    console.log("All tests passed.");

}