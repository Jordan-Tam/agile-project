import { assert } from "chai";
import { groups } from "../config/mongoCollections.js";
import groupsData from "../data/groups.js";

export async function runDeleteGroupTests() {

    const group = await groupsData.createGroup(
        "Linux Club",
        "Members of the Linux Club eboard"
    );

    assert((await (groupsData.deleteGroup(group._id))) === true);

    try {
        await groupsData.deleteGroup(group._id);
    } catch (e) {
        assert(e === "Group could not be deleted.");
    }

    console.log("All tests passed.");

}