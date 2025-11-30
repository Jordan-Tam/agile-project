import { assert } from "chai";
import { groups } from "../config/mongoCollections.js";
import groupsData from "../data/groups.js";
import usersData from "../data/users.js";

export async function runDeleteGroupTests() {
    let test_user = await usersData.createUser(
        "test", "user", "gwe29fn", "Password!9"
    );
    const group = await groupsData.createGroup(
        "Linux Club",
        "Members of the Linux Club eboard",
        test_user._id.toString()
    );

    assert((await (groupsData.deleteGroup(group._id))) === true);

    try {
        await groupsData.deleteGroup(group._id);
    } catch (e) {
        assert(e === "Group could not be deleted.");
    }

    console.log("All tests passed.");

}