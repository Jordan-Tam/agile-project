import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import groupsData from "../data/groups.js";

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
		console.log("Jared's new tests");
		const group_1 = await groupsData.createGroup("group 1", "This is group 1");
		chai.assert.deepEqual(group_1, {
			_id: group_1._id,
			groupName: "group 1",
			groupDescription: "This is group 1"
		});

		console.log("\n=== Groups Test Summary ===");
		console.log("All group tests passed.");
	} catch (err) {
		console.error("Group tests failed:", err);
	}
}
