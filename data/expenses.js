import { ObjectId } from "mongodb";
import { groups } from "../config/mongoCollections.js";
import usersData from "./users.js";
import groupsData from "./groups.js";
import { checkString, checkId, checkCost, checkDate } from "../helpers.js";

const exportedMethods = {
	async addPayment(groupId, expenseId, payerId, amount) {
		groupId = checkId(groupId, "Group", "addPayment");
		expenseId = checkId(expenseId, "Expense", "addPayment");
		payerId = checkId(payerId, "Payer", "addPayment");
		if (typeof amount !== "number" || isNaN(amount) || amount < 0) {
			throw "Invalid payment amount";
		}

		const groupsCollection = await groups();
		const group = await groupsData.getGroupByID(groupId);
		if (!group) throw "Group not found";

		const expense = (group.expenses || []).find(
			(exp) => exp._id.toString() === expenseId
		);
		if (!expense) throw "Expense not found";
		const numPayers = expense.payers.length;
		if (numPayers === 0) throw "Expense has no payers";

		// Calculate amountPerPayer based on distribution type
		let amountPerPayer;
		if (expense.distributionType === "specific" && expense.payerShares) {
			// Find this payer's specific amount
			const payerShare = expense.payerShares.find(
				(p) => (typeof p.payer === "object" ? p.payer.toString() : p.payer) === payerId
			);
			if (!payerShare) {
				throw `Error: Payer ${payerId} not found in expense payerShares.`;
			}
			amountPerPayer = parseFloat(payerShare.owed.toFixed(2));
		} else {
			// Default to evenly split (for backward compatibility)
			amountPerPayer = parseFloat((expense.cost / numPayers).toFixed(2));
		}

		// Find or default existing payments map for payer
		const payments = expense.payments || [];
		let paymentEntry = payments.find(
			(p) =>
				(typeof p.payer === "object" ? p.payer.toString() : p.payer) === payerId
		);
		if (!paymentEntry) {
			// Create a payment entry if missing (backwards compatibility for old expenses)
			paymentEntry = { payer: new ObjectId(payerId), paid: 0 };
			payments.push({
				payer: new ObjectId(payerId),
				paid: 0
			});
		}

		const alreadyPaid = parseFloat(Number(paymentEntry.paid).toFixed(2));
		const remaining = parseFloat((amountPerPayer - alreadyPaid).toFixed(2));

		if (amount > remaining) {
			throw `Payment amount cannot exceed remaining owed amount ${remaining}`;
		}
		// Update the payment entry
		paymentEntry.paid = parseFloat((alreadyPaid + amount).toFixed(2));

		// Write the updated expenses array back to DB (safe approach)
		const updatedExpenses = (group.expenses || []).map((exp) => {
			if (exp._id.toString() === expenseId) {
				// ensure we store payments as simple objects (payer string, paid number)
				return {
					...exp,
					payments: payments
				};
			}
			return exp;
		});

		const updateResult = await groupsCollection.findOneAndUpdate(
			{ _id: new ObjectId(groupId) },
			{ $set: { expenses: updatedExpenses } },
			{ returnDocument: "after", returnOriginal: false }
		);
		if (!updateResult) {
			throw "Failed to record payment";
		}

		// Return the updated expense object from the returned document
		const updatedGroup = updateResult;
		const updatedExpense = (updatedGroup.expenses || []).find(
			(e) => e._id.toString() === expenseId
		);
		return updatedExpense;
	},
	async createExpense(
		group,
		name,
		cost,
		deadline,
		payee,
		payers,
		fileInfo = null,
		distributionType = "evenly",
		payerAmounts = null
	) {
		// Input validation
		group = checkId(group.toString(), "Group", "createExpense");
		name = checkString(name, "Name", "createExpense");
		cost = checkCost(cost, "createExpense");
		deadline = checkDate(deadline, "Deadline", "createExpense");
		payee = checkId(payee.toString(), "Payee", "createExpense");
		for (let payer of payers)
			checkId(payer.toString(), "Payer", "createExpense");

		// Validate distributionType
		if (distributionType !== "evenly" && distributionType !== "specific") {
			throw `Error: distributionType must be "evenly" or "specific".`;
		}

		// Check that the group exists
		const groupDoc = await groupsData.getGroupByID(group);
		if (!groupDoc) throw `Error: Group ${group} not found.`;

		// Ensure the group has members
		if (!groupDoc.groupMembers || groupDoc.groupMembers.length === 0) {
			throw `Error: Group ${groupDoc.groupName} has no members. Cannot add expense.`;
		}

		// Convert stored group member IDs to strings for comparison
		const groupMemberIds = groupDoc.groupMembers.map((m) => m._id.toString());

		// Verify that the payee is in the group
		if (!groupMemberIds.includes(payee.toString())) {
			throw `Error: Payee ${payee} is not a member of group "${groupDoc.groupName}".`;
		}

		// Verify that every payer is in the group
		for (let payer of payers) {
			if (!groupMemberIds.includes(payer.toString())) {
				throw `Error: Payer ${payer} is not a member of group "${groupDoc.groupName}".`;
			}
		}

		// Validate specific distribution
		let payerShares = null;
		if (distributionType === "specific") {
			if (!payerAmounts || typeof payerAmounts !== "object") {
				throw `Error: payerAmounts is required when distributionType is "specific".`;
			}

			// Build payerShares array and validate
			payerShares = payers.map((payerId) => {
				const payerIdStr = typeof payerId === "object" ? payerId.toString() : payerId.toString();
				const amount = payerAmounts[payerIdStr];
				
				if (amount === undefined || amount === null) {
					throw `Error: Amount required for payer ${payerIdStr}.`;
				}

				const amountNum = parseFloat(amount);
				if (isNaN(amountNum) || amountNum < 0) {
					throw `Error: Invalid amount for payer ${payerIdStr}.`;
				}

				return {
					payer: new ObjectId(payerId),
					owed: parseFloat(amountNum.toFixed(2))
				};
			});

			// Validate that sum equals total cost
			const sum = payerShares.reduce((acc, p) => acc + p.owed, 0);
			if (Math.abs(sum - cost) > 0.01) {
				throw `Error: Sum of payer amounts (${sum.toFixed(2)}) must equal total cost (${cost.toFixed(2)}).`;
			}
		}

		// Create the new expense object
		const newExpense = {
			_id: new ObjectId(),
			group: new ObjectId(group),
			name,
			cost,
			deadline,
			payee,
			payers,
			distributionType: distributionType || "evenly",
			payments: payers.map((p) => ({
				payer: new ObjectId(typeof p === "object" ? p.toString() : p),
				paid: 0
			})),
			archived: false // New expenses are not archived by default
		};

		// Add payerShares if specific distribution
		if (distributionType === "specific" && payerShares && payerShares.length > 0) {
			newExpense.payerShares = payerShares;
		}

		// Add file info if provided
		if (fileInfo) {
			newExpense.file = {
				filename: fileInfo.filename,
				originalName: fileInfo.originalName,
				mimetype: fileInfo.mimetype,
				size: fileInfo.size,
				uploadDate: new Date()
			};
		}

		// Ensure distributionType is ALWAYS set
		if (!newExpense.distributionType) {
			newExpense.distributionType = "evenly";
		}
		
		// For specific distribution, ensure payerShares exists
		if (newExpense.distributionType === "specific" && !newExpense.payerShares) {
			throw "ERROR: distributionType is 'specific' but payerShares is missing! Cannot save expense.";
		}

		// Add to the group's expenses array
		const groupsCollection = await groups();
		
		// MongoDB update operation
		const updateResult = await groupsCollection.findOneAndUpdate(
			{ _id: new ObjectId(group) },
			{ $push: { expenses: newExpense } },
			{ returnDocument: "after", returnOriginal: false }
		);
		
		if (!updateResult) throw "Error: Failed to insert expense.";

		// Return the inserted expense document
		return newExpense;
	},

	async getAllExpenses(groupId) {
		// Input validation.
		groupId = checkId(groupId, "Group", "getAllExpenses");

		// Get group associated with groupId.
		const groupsCollection = await groups();
		const group = await groupsCollection.findOne({
			_id: new ObjectId(groupId)
		});

		if (!group) {
			throw "Group not found.";
		}

		return group.expenses;
	},

	async deleteExpense(groupId, expenseId) {
		// Input validation.
		groupId = checkId(groupId, "Group", "deleteExpense");
		expenseId = checkId(expenseId, "Expense", "deleteExpense");

		// Connect to the groups database.
		const groupsCollection = await groups();

		// Get the group associated with the given ID.
		let group = await groupsData.getGroupByID(groupId);

		// Find the expense to get file info before deletion
		const expense = group.expenses?.find(
			(exp) => exp._id.toString() === expenseId
		);

		// Remove the expense from the group.
		const deleteInfo = await groupsCollection.findOneAndUpdate(
			{ _id: new ObjectId(group._id) },
			{ $pull: { expenses: { _id: new ObjectId(expenseId) } } },
			{ returnDocument: "after", returnOriginal: false }
		);

		// Make sure the deletion was successful.
		if (!deleteInfo) {
			throw "Could not delete expense.";
		}

		// Return the expense info (including file info if it exists) along with the group
		return { group: deleteInfo, deletedExpense: expense };
	},

	// Edit Expense
	async editExpense(groupId, expenseId, name, cost, deadline, payee, payers, distributionType = "evenly", payerAmounts = null) {
		// Input validation
		groupId = checkId(groupId, "Group", "editExpense");
		expenseId = checkId(expenseId, "Expense", "editExpense");
		name = checkString(name, "Name", "editExpense");
		cost = checkCost(cost, "editExpense");
		deadline = checkDate(deadline, "Deadline", "editExpense");
		payee = checkId(payee.toString(), "Payee", "editExpense");
		for (let payer of payers) checkId(payer.toString(), "Payer", "editExpense");

		// Validate distributionType
		if (distributionType !== "evenly" && distributionType !== "specific") {
			throw `Error: distributionType must be "evenly" or "specific".`;
		}

		// Verify Group exists
		const groupDoc = await groupsData.getGroupByID(groupId);
		if (!groupDoc) throw `Error: Group ${groupId} not found.`;

		// Verify Payee and all Payers are in the Group
		const groupMemberIds = groupDoc.groupMembers.map((m) => m._id.toString());

		if (!groupMemberIds.includes(payee.toString())) {
			throw `Error: Payee ${payee} is not a member of group "${groupDoc.groupName}".`;
		}
		for (let payer of payers) {
			if (!groupMemberIds.includes(payer.toString())) {
				throw `Error: Payer ${payer} is not a member of group "${groupDoc.groupName}".`;
			}
		}

		// Get Expense to verify it exists
		const expenses = groupDoc.expenses;
		const expenseIndex = expenses.findIndex(
			(exp) => exp._id.toString() === expenseId
		);
		if (expenseIndex === -1) {
			throw `Error: Expense ${expenseId} not found in group "${groupDoc.groupName}".`;
		}

		// Validate and build payerShares for specific distribution
		let payerShares = null;
		let updateFields = {
			"expenses.$.name": name,
			"expenses.$.cost": cost,
			"expenses.$.deadline": deadline,
			"expenses.$.payee": payee,
			"expenses.$.payers": payers,
			"expenses.$.distributionType": distributionType || "evenly"
		};

		if (distributionType === "specific") {
			if (!payerAmounts || typeof payerAmounts !== "object") {
				throw `Error: payerAmounts is required when distributionType is "specific".`;
			}

			// Build payerShares array and validate
			payerShares = payers.map((payerId) => {
				const payerIdStr = typeof payerId === "object" ? payerId.toString() : payerId.toString();
				const amount = payerAmounts[payerIdStr];
				
				if (amount === undefined || amount === null) {
					throw `Error: Amount required for payer ${payerIdStr}.`;
				}

				const amountNum = parseFloat(amount);
				if (isNaN(amountNum) || amountNum < 0) {
					throw `Error: Invalid amount for payer ${payerIdStr}.`;
				}

				return {
					payer: new ObjectId(payerId),
					owed: parseFloat(amountNum.toFixed(2))
				};
			});

			// Validate that sum equals total cost
			const sum = payerShares.reduce((acc, p) => acc + p.owed, 0);
			if (Math.abs(sum - cost) > 0.01) {
				throw `Error: Sum of payer amounts (${sum.toFixed(2)}) must equal total cost (${cost.toFixed(2)}).`;
			}

			updateFields["expenses.$.payerShares"] = payerShares;
		} else {
			// Remove payerShares if switching to evenly
			updateFields["expenses.$.payerShares"] = null;
		}

		// Update the expense fields
		const groupsCollection = await groups();
		const updateResult = await groupsCollection.findOneAndUpdate(
			{ _id: new ObjectId(groupId), "expenses._id": new ObjectId(expenseId) },
			{
				$set: updateFields
			},
			{ returnDocument: "after", returnOriginal: false }
		);

		if (!updateResult) throw "Error: Failed to update expense.";

		// Fetch and return the updated expense, avoid returning whole group every time
		const updatedExpense = updateResult.expenses.find(
			(exp) => exp._id.toString() === expenseId
		);
		return updatedExpense;
	},

	// Get all expenses for a user (where user is a payer - they owe money)
	async getAllExpensesForUser(userId) {
		userId = checkId(userId, "User", "getAllExpensesForUser");
		const userObjectId = new ObjectId(userId);

		// Get all groups the user is a member of
		const userGroups = await groupsData.getGroupsForUser(userId);

		// Get all expenses from all groups where user is a payer
		const allExpenses = [];
		const allUsers = await usersData.getAllUsers();
		const userMap = {};
		allUsers.forEach((user) => {
			userMap[user._id.toString()] = {
				name: `${user.firstName} ${user.lastName}`,
				userId: user.userId
			};
		});

		// Process each group
		for (const group of userGroups) {
			if (group.expenses && group.expenses.length > 0) {
				for (const expense of group.expenses) {
					// Check if user is a payer in this expense
					// Handle both ObjectId and string formats
					const payerIds = expense.payers.map((p) => {
						if (typeof p === "object" && p.toString) {
							return p.toString();
						}
						return p.toString();
					});
					if (payerIds.includes(userId)) {
						// Calculate amount per payer
						const amountPerPayer = expense.cost / expense.payers.length;

						// Get payee name (handle ObjectId format)
						const payeeId =
							typeof expense.payee === "object"
								? expense.payee.toString()
								: expense.payee.toString();
						const payeeInfo = userMap[payeeId] || {
							name: "Unknown",
							userId: "unknown"
						};

						// Get payer names
						const payerNames = expense.payers.map((payerId) => {
							const payerIdStr =
								typeof payerId === "object"
									? payerId.toString()
									: payerId.toString();
							const payerInfo = userMap[payerIdStr] || {
								name: "Unknown",
								userId: "unknown"
							};
							return payerInfo.name;
						});

						allExpenses.push({
							_id: expense._id.toString(),
							group: {
								_id: group._id.toString(),
								groupName: group.groupName,
								groupDescription: group.groupDescription
							},
							name: expense.name,
							cost: Number(expense.cost.toFixed(2)),
							amountPerPayer: Number(amountPerPayer.toFixed(2)),
							deadline: expense.deadline,
							payee: payeeId,
							payeeName: payeeInfo.name,
							payers: expense.payers.map((p) =>
								typeof p === "object" ? p.toString() : p.toString()
							),
							payerNames: payerNames
						});
					}
				}
			}
		}

		return allExpenses;
	},

	// Search and filter expenses
	async searchExpenses(userId, searchTerm, filterType, groupId) {
		userId = checkId(userId, "User", "searchExpenses");

		// Get all expenses for user
		let expenses = await this.getAllExpensesForUser(userId);

		// Apply search term filter (search by name)
		if (searchTerm && searchTerm.trim() !== "") {
			const searchLower = searchTerm.toLowerCase().trim();
			expenses = expenses.filter((expense) =>
				expense.name.toLowerCase().includes(searchLower)
			);
		}

		// Apply group filter
		if (groupId && groupId.trim() !== "") {
			groupId = checkId(groupId, "Group", "searchExpenses");
			expenses = expenses.filter((expense) => expense.group._id === groupId);
		}

		// Helper function to parse MM/DD/YYYY date string
		function parseDate(dateStr) {
			if (!dateStr) return new Date(0);
			// Handle MM/DD/YYYY format
			const parts = dateStr.split("/");
			if (parts.length === 3) {
				// Month is 0-indexed in JavaScript Date
				return new Date(
					parseInt(parts[2]),
					parseInt(parts[0]) - 1,
					parseInt(parts[1])
				);
			}
			// Fallback to standard Date parsing
			return new Date(dateStr);
		}

		// Apply sorting filters
		switch (filterType) {
			case "closestDue":
				// Sort by deadline ascending (closest first)
				expenses.sort((a, b) => {
					const dateA = parseDate(a.deadline);
					const dateB = parseDate(b.deadline);
					return dateA - dateB;
				});
				break;
			case "farthestDue":
				// Sort by deadline descending (farthest first)
				expenses.sort((a, b) => {
					const dateA = parseDate(a.deadline);
					const dateB = parseDate(b.deadline);
					return dateB - dateA;
				});
				break;
			case "lowestAmount":
				// Sort by amount ascending (lowest first)
				expenses.sort((a, b) => a.amountPerPayer - b.amountPerPayer);
				break;
			case "highestAmount":
				// Sort by amount descending (highest first)
				expenses.sort((a, b) => b.amountPerPayer - a.amountPerPayer);
				break;
			default:
				// Default: no special sorting
				break;
		}

		return expenses;
	},

	// Archive an expense
	async archiveExpense(groupId, expenseId) {
		groupId = checkId(groupId, "Group", "archiveExpense");
		expenseId = checkId(expenseId, "Expense", "archiveExpense");

		const groupsCollection = await groups();

		const updateResult = await groupsCollection.findOneAndUpdate(
			{ _id: new ObjectId(groupId), "expenses._id": new ObjectId(expenseId) },
			{ $set: { "expenses.$.archived": true } },
			{ returnDocument: "after", returnOriginal: false }
		);

		if (!updateResult) {
			throw "Could not archive expense.";
		}

		return updateResult;
	},

	// Unarchive an expense
	async unarchiveExpense(groupId, expenseId) {
		groupId = checkId(groupId, "Group", "unarchiveExpense");
		expenseId = checkId(expenseId, "Expense", "unarchiveExpense");

		const groupsCollection = await groups();

		const updateResult = await groupsCollection.findOneAndUpdate(
			{ _id: new ObjectId(groupId), "expenses._id": new ObjectId(expenseId) },
			{ $set: { "expenses.$.archived": false } },
			{ returnDocument: "after", returnOriginal: false }
		);

		if (!updateResult) {
			throw "Could not unarchive expense.";
		}

		return updateResult;
	},

	async getExpenseGraphData(userId) {
		userId = checkId(userId, "User", "getExpenseGraphData");

		const userGroups = await groupsData.getGroupsForUser(userId);
		if (!userGroups || userGroups.length === 0) {
			return {
				byName: { labels: [], data: [], colors: [] },
				byDate: { labels: [], data: [] },
				totalExpenses: 0,
				totalCost: 0
			};
		}

		const expensesByName = {};
		const expensesByMonth = {};
		let totalExpenses = 0;
		let totalCost = 0;

		for (const group of userGroups) {
			const expenses = group.expenses || [];
			const activeExpenses = expenses.filter(exp => !exp.archived);

			for (const expense of activeExpenses) {
				totalExpenses++;
				totalCost += expense.cost;

				// Group by expense name
				if (!expensesByName[expense.name]) {
					expensesByName[expense.name] = 0;
				}
				expensesByName[expense.name] += expense.cost;

				// Group by month
				if (expense.deadline) {
					const date = new Date(expense.deadline);
					if (!isNaN(date.getTime())) {
						const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
						if (!expensesByMonth[monthKey]) {
							expensesByMonth[monthKey] = 0;
						}
						expensesByMonth[monthKey] += expense.cost;
					}
				}
			}
		}

		// Generate colors for pie chart
		const generateColors = (count) => {
			const colors = [
				'#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
				'#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF9F40'
			];
			return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
		};

		// Sort expenses by name (top 10)
		const sortedByName = Object.entries(expensesByName)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);

		// Sort months chronologically
		const sortedByMonth = Object.entries(expensesByMonth)
			.sort((a, b) => a[0].localeCompare(b[0]));

		return {
			byName: {
				labels: sortedByName.map(([name]) => name),
				data: sortedByName.map(([, cost]) => parseFloat(cost.toFixed(2))),
				colors: generateColors(sortedByName.length)
			},
			byDate: {
				labels: sortedByMonth.map(([month]) => {
					const [year, monthNum] = month.split('-');
					const date = new Date(year, parseInt(monthNum) - 1);
					return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
				}),
				data: sortedByMonth.map(([, cost]) => parseFloat(cost.toFixed(2)))
			},
			totalExpenses,
			totalCost: parseFloat(totalCost.toFixed(2))
		};
	},

	// Get payment statistics for a user
	async getUserPaymentStats(userId) {
		userId = checkId(userId, "User", "getUserPaymentStats");

		const userGroups = await groupsData.getGroupsForUser(userId);

		let totalPaid = 0; // Amount user has paid toward expenses
		let totalEarned = 0; // Amount user has received (where user was payee)
		let paymentCount = 0; // Number of payments made by user
		let earningCount = 0; // Number of payments received by user

		for (const group of userGroups) {
			const expenses = group.expenses || [];

			for (const expense of expenses) {
				const payments = expense.payments || [];

				// Calculate amount user has paid
				const userPayment = payments.find(p => {
					const payerId = typeof p.payer === "object" ? p.payer.toString() : p.payer;
					return payerId === userId;
				});

				if (userPayment && userPayment.paid > 0) {
					totalPaid += userPayment.paid;
					paymentCount++;
				}

				// Calculate amount user has earned (if user is the payee)
				const payeeId = typeof expense.payee === "object"
					? expense.payee.toString()
					: expense.payee;

				if (payeeId === userId) {
					// Sum all payments made toward this expense (excluding user's own payment)
					for (const payment of payments) {
						const payerId = typeof payment.payer === "object"
							? payment.payer.toString()
							: payment.payer;

						// Only count payments from others (not from user to themselves)
						if (payerId !== userId && payment.paid > 0) {
							totalEarned += payment.paid;
							earningCount++;
						}
					}
				}
			}
		}

		return {
			totalPaid: parseFloat(totalPaid.toFixed(2)),
			totalEarned: parseFloat(totalEarned.toFixed(2)),
			paymentCount,
			earningCount,
			netBalance: parseFloat((totalEarned - totalPaid).toFixed(2))
		};
	}
};

export default exportedMethods;
