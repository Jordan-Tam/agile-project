import {groups} from '../config/mongoCollections.js';
import { checkString, checkId} from "../helpers.js";
import {ObjectId} from 'mongodb';
const exportedMethods = {

    async getGroupByID(id){
        id = checkId(id);
        const groupCollection = await groups();
        const group = await groupCollection.findOne({_id: new ObjectId(id)});
        if (!group) throw 'Error: Post not found';
        return group;
    },

    async createGroup(groupName, groupDescription) {
        groupName = checkString(groupName);
        if(groupName.length < 5 || groupName.length > 50){
            throw 'Invalid group name length';
        }
        groupDescription = checkString(groupDescription);
        if(groupDescription.length > 20000){
            throw 'Invalid group description length';
        };
        let newGroup = {
            groupName: groupName,
            groupDescription: groupDescription
        };
        const groupCollection = await groups();
        const newInsertInformation = await groupCollection.insertOne(newGroup);
        if (!newInsertInformation.insertedId) throw 'Error: Insert failed!';
        return this.getGroupByID(newInsertInformation.insertedId.toString());
    },
    
};

export default exportedMethods;
