import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import groupsData from "../data/groups.js";
import usersData from "../data/users.js";
import { ObjectId } from 'mongodb';
import user from '../data/groups.js'
import {dbConnection} from '../config/mongoConnection.js'
chai.use(chaiAsPromised);

export async function runGroupTests() {
	try {
		let bill = await usersData.createUser(
			"Bill", "Nye", "billnye", "Password!88"
		);
		await chai
			.expect(groupsData.createGroup())
			.to.be.rejectedWith("groupName is required.");
		await chai
			.expect(groupsData.createGroup("group 1"))
			.to.be.rejectedWith("groupDescription is required.");
		await chai
			.expect(groupsData.createGroup("group 1", "group description"))
			.to.be.rejectedWith("Creator ID ID is required.");
		await chai
			.expect(groupsData.createGroup(52, "group description", bill._id.toString()))
			.to.be.rejectedWith("groupName must be a string.");
		await chai
			.expect(groupsData.createGroup("group 1", 52, bill._id.toString()))
			.to.be.rejectedWith("groupDescription must be a string.");
		await chai
			.expect(groupsData.createGroup("    ", "group description", bill._id.toString()))
			.to.be.rejectedWith("groupName cannot be empty.");
		await chai
			.expect(groupsData.createGroup("group 1", "    ", bill._id.toString()))
			.to.be.rejectedWith("groupDescription cannot be empty.");
		await chai
			.expect(groupsData.createGroup("g", "This is group 1", bill._id.toString()))
			.to.be.rejectedWith("Invalid group name length");
		await chai
			.expect(
				groupsData.createGroup(
					"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
					"This is group 1",
					bill._id.toString()
				)
			)
			.to.be.rejectedWith("Invalid group name length");
		await chai
			.expect(
				groupsData.createGroup(
					"group 1",
					"This is group 1",
					5
				)
			)
			.to.be.rejectedWith("Creator ID ID must be a string.")
		await chai
			.expect(
				groupsData.createGroup(
					"group 1",
					"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
					bill._id.toString()
				)
			)
			.to.be.rejectedWith("Invalid group description length");
		const group_1 = await groupsData.createGroup("group 1", "This is group 1", bill._id.toString());
		chai.assert.deepEqual(group_1, {
			_id: group_1._id,
			groupName: "group 1",
			groupDescription: "This is group 1",
			expenses: [],
			currency: "USD",
			leaderId: new ObjectId(bill._id),
			leader: {
				_id: bill._id,
				firstName: 'Bill',
				lastName: 'Nye'
			},
			groupMembers: []
		});

		console.log("\n=== Groups Test Summary ===");
		console.log("All group tests passed.");
	} catch (err) {
		console.error("Group tests failed:", err);
	}
	try {
	// --- Invalid argument tests ---
	await chai
		.expect(groupsData.addMember())
		.to.be.rejectedWith("undefined ID is required.");
	await chai
		.expect(groupsData.addMember("   ", "John", "Doe", "123"))
		.to.be.rejectedWith("undefined ID cannot be an empty string or just spaces.");
	await chai
		.expect(groupsData.addMember("123", "   ", "Doe", "123"))
		.to.be.rejectedWith("undefined ID is not a valid ID.");
	await chai
		.expect(groupsData.addMember("123", "John", "   ", "123"))
		.to.be.rejectedWith("undefined ID is not a valid ID.");
	await chai
		.expect(groupsData.addMember("123", "John", "Doe", "   "))
		.to.be.rejectedWith("undefined ID is not a valid ID.");
	await chai
		.expect(groupsData.addMember(123, "John", "Doe", "456"))
		.to.be.rejectedWith("undefined ID must be a string.");
	await chai
		.expect(groupsData.addMember("123", 45, "Doe", "456"))
		.to.be.rejectedWith("undefined ID is not a valid ID.");
	await chai
		.expect(groupsData.addMember("123", "John", 45, "456"))
		.to.be.rejectedWith("undefined ID is not a valid ID.");
	await chai
		.expect(groupsData.addMember("123", "John", "Doe", 123))
		.to.be.rejectedWith("undefined ID is not a valid ID.");

	console.log("\n=== addMember Test Summary ===");
	console.log("All addMember tests passed.");

} catch (err) {
	console.error("addMember tests failed:", err);
}

try {
			// --- Invalid argument tests ---
			await chai
				.expect(groupsData.removeMember())
				.to.be.rejectedWith("undefined ID is required.");
			await chai
				.expect(groupsData.removeMember("   ", "123"))
				.to.be.rejectedWith("undefined ID cannot be an empty string or just spaces.");
			await chai
				.expect(groupsData.removeMember("123", "   "))
				.to.be.rejectedWith("undefined ID is not a valid ID.");
			await chai
				.expect(groupsData.removeMember(123, "456"))
				.to.be.rejectedWith("undefined ID must be a string.");
			await chai
				.expect(groupsData.removeMember("123", 456))
				.to.be.rejectedWith("undefined ID is not a valid ID.");

			console.log("\n=== removeMember Test Summary ===");
			console.log("All removeMember validation tests passed.");
		} catch (err) {
			console.error("removeMember tests failed:", err);
			throw err;
		}

	// TESTS FOR EDIT GROUP (updateGroup)
	try {
		let georgeBush= await usersData.createUser(
			"George", "Bush", "georgebush", "Password!77"
		);
		// Create a test group first
		const testGroup = await groupsData.createGroup(
			"Test Edit Group",
			"Original description for testing edit",
			georgeBush._id.toString()
		);

		// --- Invalid argument tests ---
		await chai
			.expect(groupsData.updateGroup())
			.to.be.rejectedWith("Group ID is required.");
		
		await chai
			.expect(groupsData.updateGroup(testGroup._id))
			.to.be.rejectedWith("groupName is required.");
		
		await chai
			.expect(groupsData.updateGroup(testGroup._id, "Updated Name"))
			.to.be.rejectedWith("groupDescription is required.");
		
		await chai
			.expect(groupsData.updateGroup(123, "Updated Name", "Updated Desc"))
			.to.be.rejectedWith("Group ID must be a string.");
		
		await chai
			.expect(groupsData.updateGroup("   ", "Updated Name", "Updated Desc"))
			.to.be.rejectedWith("Group ID cannot be an empty string or just spaces.");
		
		await chai
			.expect(groupsData.updateGroup("invalidId", "Updated Name", "Updated Desc"))
			.to.be.rejectedWith("Group ID is not a valid ID.");
		
		await chai
			.expect(groupsData.updateGroup(testGroup._id, 123, "Updated Desc"))
			.to.be.rejectedWith("groupName must be a string.");
		
		await chai
			.expect(groupsData.updateGroup(testGroup._id, "Updated Name", 123))
			.to.be.rejectedWith("groupDescription must be a string.");
		
		await chai
			.expect(groupsData.updateGroup(testGroup._id, "    ", "Updated Desc"))
			.to.be.rejectedWith("groupName cannot be empty.");
		
		await chai
			.expect(groupsData.updateGroup(testGroup._id, "Updated Name", "    "))
			.to.be.rejectedWith("groupDescription cannot be empty.");
		
		await chai
			.expect(groupsData.updateGroup(testGroup._id, "g", "Updated Desc"))
			.to.be.rejectedWith("Invalid group name length");
		
		await chai
			.expect(groupsData.updateGroup(testGroup._id, "a".repeat(51), "Updated Desc"))
			.to.be.rejectedWith("Invalid group name length");
		
		await chai
			.expect(groupsData.updateGroup(testGroup._id, "Updated Name", "a".repeat(1001)))
			.to.be.rejectedWith("Invalid group description length");
		
		// Test with non-existent group ID
		const fakeId = "507f1f77bcf86cd799439011"; // Valid ObjectId format but doesn't exist
		await chai
			.expect(groupsData.updateGroup(fakeId, "Updated Name", "Updated Desc"))
			.to.be.rejectedWith("Error: Group not found");

		// --- Valid update tests ---
		const updatedGroup = await groupsData.updateGroup(
			testGroup._id,
			"Updated Group Name",
			"Updated group description"
		);

		chai.assert.strictEqual(updatedGroup.groupName, "Updated Group Name");
		chai.assert.strictEqual(updatedGroup.groupDescription, "Updated group description");
		chai.assert.strictEqual(updatedGroup._id, testGroup._id);

		// Verify the update persisted by fetching the group again
		const fetchedGroup = await groupsData.getGroupByID(testGroup._id);
		chai.assert.strictEqual(fetchedGroup.groupName, "Updated Group Name");
		chai.assert.strictEqual(fetchedGroup.groupDescription, "Updated group description");

		console.log("\n=== updateGroup Test Summary ===");
		console.log("All updateGroup tests passed.");
	} catch (err) {
		console.error("updateGroup tests failed:", err);
		throw err;
	}

}
