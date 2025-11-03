import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import groupsData from "../data/groups.js";
import { ObjectId } from 'mongodb';
import user from '../data/groups.js'
chai.use(chaiAsPromised);

export async function runGroupTests() {
	try {
		await chai
			.expect(groupsData.createGroup())
			.to.be.rejectedWith("groupName is required.");
		await chai
			.expect(groupsData.createGroup("group 1"))
			.to.be.rejectedWith("groupDescription is required.");
		await chai
			.expect(groupsData.createGroup(52, "group description"))
			.to.be.rejectedWith("groupName must be a string.");
		await chai
			.expect(groupsData.createGroup("group 1", 52))
			.to.be.rejectedWith("groupDescription must be a string.");
		await chai
			.expect(groupsData.createGroup("    ", "group description"))
			.to.be.rejectedWith("groupName cannot be empty.");
		await chai
			.expect(groupsData.createGroup("group 1", "    "))
			.to.be.rejectedWith("groupDescription cannot be empty.");
		await chai
			.expect(groupsData.createGroup("g", "This is group 1"))
			.to.be.rejectedWith("Invalid group name length");
		await chai
			.expect(
				groupsData.createGroup(
					"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
					"This is group 1"
				)
			)
			.to.be.rejectedWith("Invalid group name length");
		await chai
			.expect(
				groupsData.createGroup(
					"group 1",
					"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
				)
			)
			.to.be.rejectedWith("Invalid group description length");
		const group_1 = await groupsData.createGroup("group 1", "This is group 1");
		chai.assert.deepEqual(group_1, {
			_id: group_1._id,
			groupName: "group 1",
			groupDescription: "This is group 1",
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

}
