import { ObjectId } from "mongodb";
import { groups } from "../config/mongoCollections.js";
import usersData from "./users.js";
import groupsData from "./groups.js";
import {
    checkString,
    checkId
} from "../helpers.js";

const exportedMethods = {

    async createPost(group_ObjectId, user_ObjectId, title, body) {

        // Input validation.
        group_ObjectId = checkId(group_ObjectId);
        user_ObjectId = checkId(user_ObjectId);
        title = checkString(title, "Title");
        body = checkString(body, "Body");

        // Check that the group exists.
        await groupsData.getGroupByID(group_ObjectId);

        // Check that the user exists.
        let poster = await usersData.getUserById(user_ObjectId);

        // Create the post object.
        const newPost = {
            _id: new ObjectId(),
            poster: poster.userId,
            title,
            body,
            date: new Date().toLocaleString()
        };

        const groupsCollection = await groups();

        const updateResult = await groupsCollection.findOneAndUpdate(
            {_id: new ObjectId(group_ObjectId)},
            {$push: { posts: newPost }},
            {returnDocument: "after"}
        );

        if (!updateResult) {
            throw "Post could not be created.";
        }

        return newPost;

    },

    async editPost(post_ObjectId, newTitle, newBody) {

        // Input validation.
        post_ObjectId = checkId(post_ObjectId);
        newTitle = checkString(newTitle, "Title");
        newBody = checkString(newBody, "Body");

        const groupsCollection = await groups();

        const group = await groupsCollection.findOne(
            {"posts._id": new ObjectId(post_ObjectId)}
        );

        if (!group) {
            throw "Post could not be found.";
        }

        // Update the post from the group's posts array.
        const groupPosts = group.posts;
        for (let i = 0; i < groupPosts.length; i++) {
            if (groupPosts[i]._id.toString() === post_ObjectId.toString()) {
                groupPosts[i].title = newTitle;
                groupPosts[i].body = newBody;
            }
        }

        const updateInfo = await groupsCollection.findOneAndUpdate(
            {_id: new ObjectId(group._id)},
            {$set: {posts: groupPosts}},
            {returnDocument: "after"}
        );

        if (!updateInfo) {
            throw "Post could not be updated.";
        }

        return true;

    },

    async deletePost(post_ObjectId) {

        // Input validation.
        post_ObjectId = checkId(post_ObjectId);

        const groupsCollection = await groups();

        const group = await groupsCollection.findOne(
            {"posts._id": new ObjectId(post_ObjectId)}
        );

        if (!group) {
            throw "Post could not be found.";
        }

        //console.log(post_ObjectId.toString());
        //console.log(group.posts);

        // Remove the post from the group's posts array.
        const groupPosts = group.posts.filter((post) => {
            return post._id.toString() !== post_ObjectId.toString()
        });

        const deleteInfo = await groupsCollection.findOneAndUpdate(
            {_id: new ObjectId(group._id)},
            {$set: {posts: groupPosts}},
            {returnDocument: "after"}
        );

        if (!deleteInfo) {
            throw "Post could not be deleted.";
        }

        return true;

    },

    async getAllPosts(group_ObjectId) {

        // Input validation.
        //group_ObjectId = checkId(group_ObjectId);

        //let group = await groupsData.getGroupByID(group_ObjectId);

        // Never mind, just call getGroupbyID and get the posts field.

    },

    async getPostById(post_ObjectId) {

        // Input validation.
        post_ObjectId = checkId(post_ObjectId);

        const groupsCollection = await groups();

        const group = await groupsCollection.findOne(
            {"posts._id": new ObjectId(post_ObjectId)}
        );

        if (!group) {
            throw "Post could not be found.";
        }

        // Return the post.
        const groupPosts = group.posts;
        for (let i = 0; i < group.posts.length; i++) {
            if (groupPosts[i]._id.toString() === post_ObjectId.toString()) {
                return group.posts[i];
            }
        }

    }

};

export default exportedMethods;