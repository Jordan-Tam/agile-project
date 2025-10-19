import * as chai from 'chai';
import  groupsData  from "../data/groups.js";
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
//Tests for createGroup method

await chai.expect(groupsData.createGroup()).to.be.rejectedWith('groupName is required.');
await chai.expect(groupsData.createGroup("group 1")).to.be.rejectedWith('groupDescription is required.');
await chai.expect(groupsData.createGroup(52, "group description")).to.be.rejectedWith('groupName must be a string.');
await chai.expect(groupsData.createGroup("group 1", 52)).to.be.rejectedWith('groupDescription must be a string.');
await chai.expect(groupsData.createGroup("    ", "group description")).to.be.rejectedWith('groupName cannot be empty.');
await chai.expect(groupsData.createGroup("group 1", "    ")).to.be.rejectedWith('groupDescription cannot be empty.');
await chai.expect(groupsData.createGroup("g", "This is group 1")).to.be.rejectedWith('Invalid group name length');
await chai.expect(groupsData.createGroup("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "This is group 1")).to.be.rejectedWith('Invalid group name length');
await chai.expect(groupsData.createGroup("group 1", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).to.be.rejectedWith('Invalid group description length');
const group_1 = await groupsData.createGroup("group 1", "This is group 1");
chai.assert.deepEqual(group_1, {
    _id: group_1._id,
    groupName: "group 1",
    groupDescription: "This is group 1"

})
console.log("Tests passed!");