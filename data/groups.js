import { groups } from "../config/mongoCollections.js";
import { checkString, checkId, checkUserId } from "../helpers.js";
import { ObjectId } from "mongodb";
import user from "./users.js";
import { convertCurrency } from "./currencyConverter.js";

const exportedMethods = {
	// Get group by ID (accepts string, converts to ObjectId internally)
	async getGroupByID(id) {
		id = checkId(id);
		const groupCollection = await groups();
		const group = await groupCollection.findOne({ _id: new ObjectId(id) });
		if (!group) throw "Error: Group not found";
		if(group.leaderId){
			try {
				const leader = await user.getUserById(group.leaderId.toString());
				group.leader= {
					_id: leader._id,
					firstName: leader.firstName, 
					lastName: leader.lastName
				}
			}catch(e){
				console.error("Error loading leader:", e);
			}
		}
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
	async createGroup(groupName, groupDescription, creatorId) {
		groupName = checkString(groupName, "groupName");
		if (groupName.length < 5 || groupName.length > 50) {
			throw "Invalid group name length";
		}

		groupDescription = checkString(groupDescription, "groupDescription");
		if (groupDescription.length > 1000) {
			throw "Invalid group description length";
		}
		creatorId= checkId(creatorId, "Creator ID");
		const newGroup = {
			groupName,
			groupDescription,
			expenses: [],
			currency: "USD", // Default currency for new groups
			leaderId: new ObjectId(creatorId)
		};

		const groupCollection = await groups();
		const insertInfo = await groupCollection.insertOne(newGroup);
		if (!insertInfo.insertedId) throw "Error: Insert failed!";

		return this.getGroupByID(insertInfo.insertedId.toString());
	},

	// Update an existing group
	async updateGroup(groupId, groupName, groupDescription) {
		groupId = checkId(groupId, "Group", "updateGroup");
		groupName = checkString(groupName, "groupName", "updateGroup");
		if (groupName.length < 5 || groupName.length > 50) {
			throw "Invalid group name length";
		}

		groupDescription = checkString(
			groupDescription,
			"groupDescription",
			"updateGroup"
		);
		if (groupDescription.length > 1000) {
			throw "Invalid group description length";
		}

		const groupCollection = await groups();
		const groupObjectId = new ObjectId(groupId);

		// Check if group exists
		const existingGroup = await groupCollection.findOne({ _id: groupObjectId });
		if (!existingGroup) {
			throw "Error: Group not found";
		}

		// Update the group
		const updateResult = await groupCollection.findOneAndUpdate(
			{ _id: groupObjectId },
			{ $set: { groupName, groupDescription } },
			{ returnDocument: "after", returnOriginal: false}
		);

		if (!updateResult) {
			throw "Error: Failed to update group";
		}

		// Return the updated group using getGroupByID to ensure proper formatting
		return this.getGroupByID(groupId);
	},

	async deleteGroup(groupId) {

		// Input validation.
		groupId = checkId(groupId);

		// User documents do not store the groups they are a member of, so there is no need to update the user documents when removing a group.
		
		// Delete the group document.
		const groupsCollection = await groups();
		const deletionInfo = await groupsCollection.findOneAndDelete({
			_id: new ObjectId(groupId)
		});
		if (!deletionInfo) {
			throw "Group could not be deleted.";
		}

		return true;

	},

	// Add a member to a group
	async addMember(groupId, /*  first_name, last_name, */ user_id) {
		groupId = checkId(groupId);
		user_id = checkUserId(user_id);

		// Find the user from users data
		const userList = await user.getAllUsers(); // returns array
		const theUser = userList.find((u) => u.userId.toString() === user_id);

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
		if (!group) throw "Error: Group not found";

		// === Find the user in the system ===
		const userList = await user.getAllUsers(); // returns array
		const theUser = userList.find((u) => u._id.toString() === user_id);
		if (!theUser) throw "Error: No user found with this user ID";

		// === Check if the user is actually in the group ===
		const isMember = group.groupMembers?.some(
			(m) => m.toString() === theUser._id.toString()
		);
		if (!isMember) throw "Error: This user is not a member of the group";

		// === Remove the user from the group ===
		const updateResult = await groupCollection.updateOne(
			{ _id: groupObjectId },
			{ $pull: { groupMembers: theUser._id } }
		);

		if (updateResult.modifiedCount === 0)
			throw "Error: Could not remove member from the group";

		// === Update expenses to account for removal of member ===
		// TODO: For each expense, if the deleted user's ObjectID is in the "payers" array field, remove it.
		// TODO: For each expense, loop through the "payments" array field, if the deleted user's ObjectID is in the "payer" field, remove it.
		// TODO: For the deleteUser function, just call this function for every group that the user is in.
		console.log(group);
		let groupExpenses = group.expenses;
		let newGroupExpenses = [];
		for (let i = 0; i < groupExpenses.length; i++) {
			let temp = groupExpenses[i];
			if (temp.payee.toString() === user_id.toString()) {
				continue;
			}
			for (let j = 0; j < temp.payers.length; j++) {
				if (temp.payers[j].toString() === user_id.toString()) {
					temp.payers.splice(j, 1);
				}
			}
			for (let j = 0; j < temp.payments.length; j++) {
				if (temp.payments[i].payer.toString() === user_id.toString()) {
					temp.payments.splice(j, 1);
				}
			}
			newGroupExpenses.push(temp);
		}
		const updateGroupObject = {
			expenses: newGroupExpenses
		};
		const updateInfo = await groupCollection.findOneAndUpdate(
			{_id: new ObjectId(groupId)},
			{$set: updateGroupObject},
			{returDocument: "after"}
		);


		// === Return the updated group (with stringified IDs) ===
		const updatedGroup = await groupCollection.findOne({ _id: groupObjectId });
		if (!updatedGroup) throw "Error: Group not found after removing member";

		updatedGroup._id = updatedGroup._id.toString();
		updatedGroup.groupMembers = updatedGroup.groupMembers
			? updatedGroup.groupMembers.map((m) => m.toString())
			: [];

		return updatedGroup;
	},

	// Update currency for a group
	async updateCurrency(groupId, currencyCode) {
		groupId = checkId(groupId, "Group", "updateCurrency");
		currencyCode = checkString(currencyCode, "Currency", "updateCurrency");

		// Valid currency codes
		const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN'];

		if (!validCurrencies.includes(currencyCode)) {
			throw "Invalid currency code";
		}

		const groupCollection = await groups();
		const groupObjectId = new ObjectId(groupId);

		// Check if group exists
		const existingGroup = await groupCollection.findOne({ _id: groupObjectId });
		if (!existingGroup) {
			throw "Error: Group not found";
		}

		const oldCurrency = existingGroup.currency || 'USD';

		// Convert all expense costs to new currency
		if (existingGroup.expenses && existingGroup.expenses.length > 0) {
			const convertedExpenses = existingGroup.expenses.map(expense => {
				const convertedCost = convertCurrency(expense.cost, oldCurrency, currencyCode);
				return {
					...expense,
					cost: convertedCost
				};
			});

			// Update the group with new currency and converted expenses
			const updateResult = await groupCollection.findOneAndUpdate(
				{ _id: groupObjectId },
				{
					$set: {
						currency: currencyCode,
						expenses: convertedExpenses
					}
				},
				{ returnDocument: "after", returnOriginal: false }
			);

			if (!updateResult) {
				throw "Error: Failed to update group currency";
			}
		} else {
			// No expenses, just update currency
			const updateResult = await groupCollection.findOneAndUpdate(
				{ _id: groupObjectId },
				{ $set: { currency: currencyCode } },
				{ returnDocument: "after", returnOriginal: false}
			);

			if (!updateResult) {
				throw "Error: Failed to update group currency";
			}
		}

		// Return the updated group
		return this.getGroupByID(groupId);
	},

	// Calculate who owes whom in a group
	// ...existing code...
    async calculateGroupBalances(groupId) {
        groupId = checkId(groupId, "Group", "calculateGroupBalances");

        // Get the group with all its data
        const group = await this.getGroupByID(groupId);

        //console.log("=== calculateGroupBalances DEBUG ===");
        //console.log("Group ID:", groupId);
        //console.log("Number of expenses:", group.expenses?.length || 0);

        if (!group.expenses || group.expenses.length === 0) {
            // No expenses, no debts
            //console.log("No expenses found, returning empty balances");
            return {};
        }

        // Initialize balance tracking: balances[debtor][creditor] = amount
        const balances = {};

        // Process each expense
        for (const expense of group.expenses) {
            //console.log("\nProcessing expense:", expense.name);
            const payeeId =
                typeof expense.payee === "object"
                    ? expense.payee.toString()
                    : expense.payee.toString();
            const cost = parseFloat(expense.cost);
            const numPayers = expense.payers.length;
            if (numPayers === 0) continue;
            const amountPerPayer = parseFloat((cost / numPayers).toFixed(2));

            // Build a payments lookup for this expense (payerId -> paid amount)
            const paymentsLookup = {};
            (expense.payments || []).forEach(p => {
                const pid = typeof p.payer === "object" ? p.payer.toString() : p.payer.toString();
                paymentsLookup[pid] = parseFloat(Number(p.paid || 0).toFixed(2));
            });

            //console.log("  Payee ID:", payeeId);
            //console.log("  Cost:", cost);
            /* console.log(
                "  Payers:",
                expense.payers.map((p) => (typeof p === "object" ? p.toString() : p.toString()))
            ); */
            //console.log("  Amount per payer:", amountPerPayer);

            // Each payer owes the payee their share minus any payments they've already made
            for (const payer of expense.payers) {
                const payerId = typeof payer === "object" ? payer.toString() : payer.toString();

                // Skip if payer is the same as payee (they don't owe themselves)
                if (payerId === payeeId) {
                    //console.log("    Skipping - payer is payee");
                    continue;
                }

                const paidSoFar = paymentsLookup[payerId] || 0;
                const owedForThisExpense = parseFloat((amountPerPayer - paidSoFar).toFixed(2));
                //console.log(`    Payer ${payerId} already paid ${paidSoFar}, owes ${owedForThisExpense}`);

                // If nothing owed, skip
                if (owedForThisExpense <= 0) {
                    continue;
                }

                // Initialize nested objects if needed
                if (!balances[payerId]) balances[payerId] = {};
                if (!balances[payerId][payeeId]) balances[payerId][payeeId] = 0;

                // Add to the amount this payer owes this payee
                balances[payerId][payeeId] += owedForThisExpense;
            }
        }

        // Simplify balances by netting out mutual debts
        // If A owes B $10 and B owes A $6, simplify to A owes B $4
        const userIds = Object.keys(balances);
        for (const userId1 of userIds) {
            for (const userId2 of Object.keys(balances[userId1])) {
                if (balances[userId2] && balances[userId2][userId1]) {
                    const debt1to2 = balances[userId1][userId2];
                    const debt2to1 = balances[userId2][userId1];

                    if (debt1to2 > debt2to1) {
                        balances[userId1][userId2] = parseFloat((debt1to2 - debt2to1).toFixed(2));
                        delete balances[userId2][userId1];
                    } else if (debt2to1 > debt1to2) {
                        balances[userId2][userId1] = parseFloat((debt2to1 - debt1to2).toFixed(2));
                        delete balances[userId1][userId2];
                    } else {
                        // Equal debts cancel out
                        delete balances[userId1][userId2];
                        delete balances[userId2][userId1];
                    }
                }
            }
        }

        // Clean up empty nested objects
        for (const userId of Object.keys(balances)) {
            if (Object.keys(balances[userId]).length === 0) {
                delete balances[userId];
            }
        }

        // Round all amounts to 2 decimal places
        for (const userId of Object.keys(balances)) {
            for (const creditorId of Object.keys(balances[userId])) {
                balances[userId][creditorId] = parseFloat(
                    balances[userId][creditorId].toFixed(2)
                );
            }
        }

        return balances;
    }

};

export default exportedMethods;