import { assert } from "chai";
import groupsData from "../data/groups.js";
import usersData from "../data/users.js";
import postsData from "../data/posts.js";

export async function runPostsTests() {

    const group = await groupsData.createGroup(
        "Linux Club",
        "Members of the Linux Club eboard"
    );

    const user1 = await usersData.createUser(
        "Benjamin", "Franklin", "ben100", "Password!1"
    );

    const post1 = await postsData.createPost(
        group._id.toString(),
        user1._id.toString(),
        "TITLE OF POST",
        "BODY OF POST"
    );

    assert((await (groupsData.getGroupByID(group._id))).posts.length === 1)

    await postsData.deletePost(
        post1._id.toString()
    );

    assert((await (groupsData.getGroupByID(group._id))).posts.length === 0)

    console.log("All tests passed.");

}