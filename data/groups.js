import { groups } from "../config/mongoCollections.js";
import { checkString, checkId, checkUserId } from "../helpers.js";
import { ObjectId } from "mongodb";
import user from "./users.js";

const exportedMethods = {
	// Get group by ID (accepts string, converts to ObjectId internally)
	async getGroupByID(id) {
		id = checkId(id);
		const groupCollection = await groups();
		const group = await groupCollection.findOne({ _id: new ObjectId(id) });
		if (!group) throw "Error: Group not found";

		// Convert groupMembers to detailed user objects
		if (group.groupMembers && group.groupMembers.length > 0) {
			const allUsers = await user.getAllUsers();
			group.groupMembers = group.groupMembers.map((memberId) => {
				const matched = allUsers.find(
					(u) => u._id.toString() === memberId.toString()
				);
				if (matched) {
					return {
						firstName: matched.firstName,
						lastName: matched.lastName,
						userId: matched.userId,
						_id: matched._id.toString()
					};
				} else {
					return {
						firstName: "Unknown",
						lastName: "",
						_id: memberId.toString()
					};
				}
			});
		} else {
			group.groupMembers = [];
		}

		group._id = group._id.toString();
		return group;
	},

	// Get all groups
	async getAllGroups() {
		const groupCollection = await groups();
		const allGroups = await groupCollection.find({}).toArray();
		if (!allGroups) throw "Could not get groups";

		return allGroups.map((g) => ({
			...g,
			_id: g._id.toString(),
			groupMembers: g.groupMembers
				? g.groupMembers.map((m) => m.toString())
				: []
		}));
	},

	// Get groups for a specific user (where user is a member)
	async getGroupsForUser(userId) {
		userId = checkId(userId, "User ID", "getGroupsForUser");
		const groupCollection = await groups();
		const userObjectId = new ObjectId(userId);

		const userGroups = await groupCollection
			.find({
				groupMembers: userObjectId
			})
			.toArray();

		return userGroups.map((g) => ({
			...g,
			_id: g._id.toString(),
			groupMembers: g.groupMembers
				? g.groupMembers.map((m) => m.toString())
				: []
		}));
	},

	// Create a new group
	async createGroup(groupName, groupDescription) {
		groupName = checkString(groupName, "groupName");
		if (groupName.length < 5 || groupName.length > 50) {
			throw "Invalid group name length";
		}

		groupDescription = checkString(groupDescription, "groupDescription");
		if (groupDescription.length > 1000) {
			throw "Invalid group description length";
		}

		const newGroup = {
			groupName,
			groupDescription
		};

		const groupCollection = await groups();
		const insertInfo = await groupCollection.insertOne(newGroup);
		if (!insertInfo.insertedId) throw "Error: Insert failed!";

		return this.getGroupByID(insertInfo.insertedId.toString());
	},

	// Add a member to a group
	async addMember(groupId, /*  first_name, last_name, */ user_id) {
		groupId = checkId(groupId);
		//first_name = checkString(first_name);
		//last_name = checkString(last_name);
		user_id = checkUserId(user_id);

		// Find the user from users data
		const userList = await user.getAllUsers(); // returns array
		const theUser = userList.find(
			(u) =>
				/* u.firstName === first_name &&
				u.lastName === last_name && */
				u.userId.toString() === user_id
		);

		if (!theUser) throw "No user found with these credentials";

		const groupCollection = await groups();
		const groupObjectId = new ObjectId(groupId);

		// Prevent duplicate members
		await groupCollection.updateOne(
			{ _id: groupObjectId, groupMembers: { $ne: theUser._id } },
			{ $push: { groupMembers: theUser._id } }
		);

		// Fetch the updated group
		const updatedGroup = await groupCollection.findOne({ _id: groupObjectId });
		if (!updatedGroup) throw "Error: Group not found after adding member";

		// Convert ObjectIds in groupMembers to strings for rendering
		updatedGroup._id = updatedGroup._id.toString();
		if (updatedGroup.groupMembers) {
			updatedGroup.groupMembers = updatedGroup.groupMembers.map((m) =>
				m.toString()
			);
		} else {
			updatedGroup.groupMembers = [];
		}

		return updatedGroup;
	},
    // Remove a member from a group
async removeMember(groupId, user_id) {
    // === Input validation ===
    groupId = checkId(groupId);
    user_id = checkId(user_id);

    // === Check if group exists ===
    const groupCollection = await groups();
    const groupObjectId = new ObjectId(groupId);
    const group = await groupCollection.findOne({ _id: groupObjectId });
    if (!group) throw 'Error: Group not found';

    // === Find the user in the system ===
    const userList = await user.getAllUsers(); // returns array
    const theUser = userList.find(u => u._id.toString() === user_id);
    if (!theUser) throw 'Error: No user found with this user ID';

    // === Check if the user is actually in the group ===
    const isMember = group.groupMembers?.some(
        m => m.toString() === theUser._id.toString()
    );
    if (!isMember) throw 'Error: This user is not a member of the group';

    // === Remove the user from the group ===
    const updateResult = await groupCollection.updateOne(
        { _id: groupObjectId },
        { $pull: { groupMembers: theUser._id } }
    );

    if (updateResult.modifiedCount === 0)
        throw 'Error: Could not remove member from the group';

    // === Return the updated group (with stringified IDs) ===
    const updatedGroup = await groupCollection.findOne({ _id: groupObjectId });
    if (!updatedGroup) throw 'Error: Group not found after removing member';

    updatedGroup._id = updatedGroup._id.toString();
    updatedGroup.groupMembers = updatedGroup.groupMembers
        ? updatedGroup.groupMembers.map(m => m.toString())
        : [];

    return updatedGroup;
}

};

export default exportedMethods;
