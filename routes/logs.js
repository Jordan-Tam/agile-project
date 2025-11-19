import express from "express";
import changeLogsData from "../data/changeLogs.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
import usersData from "../data/users.js";
import { requireAuth } from "../middleware.js";
import { checkId } from "../helpers.js";

const router = express.Router();

// Helper function to extract unique groups from change logs
function extractUniqueGroups(logs) {
	const groupMap = new Map();

	logs.forEach(log => {
		if (!groupMap.has(log.groupId)) {
			groupMap.set(log.groupId, {
				_id: log.groupId,
				groupName: log.groupName,
				groupStatus: log.groupStatus,
				lastActivity: log.timestamp
			});
		} else {
			const existing = groupMap.get(log.groupId);
			// Update last activity and status if this log is more recent
			if (new Date(log.timestamp) > new Date(existing.lastActivity)) {
				existing.lastActivity = log.timestamp;
				existing.groupStatus = log.groupStatus; // Use most recent log's status
			}
		}
	});

	return Array.from(groupMap.values()).sort((a, b) => 
		new Date(b.lastActivity) - new Date(a.lastActivity)
	);
}


// GET /logs - Show all groups user has logs for
router.get("/", requireAuth, async (req, res) => {
	try {
		const userId = req.session.user._id;
		const { searchTerm, groupStatus } = req.query;

		// Get all change logs for the user
		const filter = {};
		if (groupStatus && groupStatus !== "all") {
			filter.groupStatus = groupStatus;
		}

		const userLogs = await changeLogsData.getUserChangeLogs(userId, filter);

		// Extract unique groups
		let groups = extractUniqueGroups(userLogs);

		// Filter by search term if provided
		if (searchTerm && searchTerm.trim() !== "") {
			const searchLower = searchTerm.toLowerCase().trim();
			groups = groups.filter(group =>
				group.groupName.toLowerCase().includes(searchLower)
			);
		}

		res.render("logs", {
			title: "Change Logs",
			groups: groups,
			hasGroups: groups.length > 0,
			searchTerm: searchTerm || "",
			groupStatus: groupStatus || "all"
		});
	} catch (e) {
		res.status(500).render("error", { error: e.toString() });
	}
});

// POST /logs - Handle search and filter
router.post("/", requireAuth, async (req, res) => {
	try {
		const userId = req.session.user._id;
		const { searchTerm, groupStatus } = req.body;

		// Get all change logs for the user
		const filter = {};
		if (groupStatus && groupStatus !== "all") {
			filter.groupStatus = groupStatus;
		}

		const userLogs = await changeLogsData.getUserChangeLogs(userId, filter);

		// Extract unique groups
		let groups = extractUniqueGroups(userLogs);

		// Filter by search term if provided
		if (searchTerm && searchTerm.trim() !== "") {
			const searchLower = searchTerm.toLowerCase().trim();
			groups = groups.filter(group =>
				group.groupName.toLowerCase().includes(searchLower)
			);
		}

		res.render("logs", {
			title: "Change Logs",
			groups: groups,
			hasGroups: groups.length > 0,
			searchTerm: searchTerm || "",
			groupStatus: groupStatus || "all"
		});
	} catch (e) {
		res.status(500).render("error", { error: e.toString() });
	}
});

// GET /logs/:groupId - Show expenses for a specific group
router.get("/:groupId", requireAuth, async (req, res) => {
	try {
		const userId = req.session.user._id;
		const groupId = checkId(req.params.groupId);
		const { searchTerm, filterType } = req.query;

		// Try to get group info (might not exist if deleted)
		let group;
		let groupStatus = "active";
		try {
			group = await groupsData.getGroupByID(groupId);
		} catch (e) {
			// Group deleted - get info from logs
			const logs = await changeLogsData.getGroupChangeLogsForUser(userId, groupId);
			if (logs.length === 0) {
				return res.status(404).render("error", { error: "Group not found" });
			}
			// Try to find group_deleted log for currency and other info
			const groupDeletedLog = logs.find(log => 
				log.action === "group_deleted" && 
				log.type === "group"
			);
			group = {
				_id: groupId,
				groupName: logs[0].groupName,
				groupDescription: "",
				currency: (groupDeletedLog && groupDeletedLog.details && groupDeletedLog.details.currency) ? groupDeletedLog.details.currency : "USD",
				expenses: [],
				groupMembers: []
			};
			groupStatus = logs[0].groupStatus || "deleted";
		}

		// Format expenses for display with user names
		const allUsers = await usersData.getAllUsers();
		const userMap = {};
		allUsers.forEach((user) => {
			userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
		});

		// Get all logs to check for deleted expenses (for both active and deleted groups)
		const allLogs = await changeLogsData.getGroupChangeLogsForUser(userId, groupId);

		// Get expenses from group if active, otherwise reconstruct from change logs
		let expenses = [];
		if (group.expenses && group.expenses.length > 0) {
			// Group is active, use expenses from group but also include deleted expenses from logs
			expenses = group.expenses.map(exp => ({
				...exp,
				isDeleted: false // Active expenses are not deleted
			}));
			
			// Get all expense_created logs to find all expenses that were ever created
			const expenseCreatedLogs = allLogs.filter(log => 
				log.action === "expense_created" && 
				log.type === "expense" && 
				log.expenseId
			);
			
			// Get all expense_deleted logs
			const expenseDeletedLogs = allLogs.filter(log => 
				log.action === "expense_deleted" && 
				log.type === "expense" && 
				log.expenseId
			);
			
			// Track which expenses exist in the current group (active expenses)
			const activeExpenseIds = new Set(
				expenses.map(exp => {
					const id = exp._id;
					return typeof id === "object" ? id.toString() : id.toString();
				})
			);
			
			// Track which expenses were deleted
			const deletedExpenseIds = new Set(
				expenseDeletedLogs.map(log => {
					const id = log.expenseId;
					return typeof id === "object" ? id.toString() : id.toString();
				})
			);
			
			// Build expense name map from all expense logs
			const expenseNameMap = new Map();
			const allExpenseLogs = allLogs.filter(log => 
				log.type === "expense" && 
				log.expenseId
			);
			
			for (const log of allExpenseLogs) {
				const expenseIdStr = typeof log.expenseId === "object" 
					? log.expenseId.toString() 
					: log.expenseId.toString();
				
				if (!expenseNameMap.has(expenseIdStr)) {
					let name = null;
					if (log.expenseName && typeof log.expenseName === "string" && log.expenseName.trim() !== "") {
						name = log.expenseName.trim();
					} else if (log.details && log.details.expenseName && typeof log.details.expenseName === "string" && log.details.expenseName.trim() !== "") {
						name = log.details.expenseName.trim();
					} else if (log.details && log.details.changes && log.details.changes.name) {
						if (log.details.changes.name.new && typeof log.details.changes.name.new === "string") {
							name = log.details.changes.name.new.trim();
						} else if (log.details.changes.name.old && typeof log.details.changes.name.old === "string") {
							name = log.details.changes.name.old.trim();
						}
					}
					
					if (name) {
						expenseNameMap.set(expenseIdStr, name);
					}
				}
			}
			
			// Add deleted expenses that are not in the current group
			for (const log of expenseCreatedLogs) {
				const expenseIdStr = typeof log.expenseId === "object" 
					? log.expenseId.toString() 
					: log.expenseId.toString();
				
				// If this expense is not in active expenses and was deleted, add it
				if (!activeExpenseIds.has(expenseIdStr) && deletedExpenseIds.has(expenseIdStr)) {
					// This is a deleted expense - reconstruct it from logs
					const payeeName = (log.details && log.details.payee) ? log.details.payee : "Unknown";
					let payeeId = null;
					for (const [uid, userName] of Object.entries(userMap)) {
						if (userName === payeeName) {
							payeeId = uid;
							break;
						}
					}
					
					const payerNames = (log.details && Array.isArray(log.details.payers)) ? log.details.payers : [];
					const payerIds = payerNames.map(payerName => {
						for (const [uid, userName] of Object.entries(userMap)) {
							if (userName === payerName) {
								return uid;
							}
						}
						return payerName;
					});
					
					// Get expense name
					let expenseName = "Unknown Expense";
					if (log.details && log.details.expenseName && typeof log.details.expenseName === "string" && log.details.expenseName.trim() !== "") {
						expenseName = log.details.expenseName.trim();
					} else if (log.expenseName && typeof log.expenseName === "string" && log.expenseName.trim() !== "") {
						expenseName = log.expenseName.trim();
					} else if (expenseNameMap.has(expenseIdStr)) {
						expenseName = expenseNameMap.get(expenseIdStr);
					}
					
					// Add deleted expense to the list
					expenses.push({
						_id: expenseIdStr,
						name: expenseName,
						cost: (log.details && log.details.cost) ? parseFloat(log.details.cost) : 0,
						deadline: (log.details && log.details.deadline) ? log.details.deadline : "",
						payee: payeeId || payeeName,
						payers: payerIds.length > 0 ? payerIds : [payeeId || payeeName],
						payments: [],
						isDeleted: true // Mark as deleted
					});
				}
			}
		} else if (groupStatus === "deleted") {
			// Group is deleted - use expense snapshot from deletion log if available
			// Check if group_deleted log has expenses snapshot
			const groupDeletedLog = allLogs.find(log => 
				log.action === "group_deleted" && 
				log.type === "group" && 
				log.groupId === groupId
			);
			
			// If deletion log has expense snapshot, use it (more reliable - saved at deletion time)
			if (groupDeletedLog && groupDeletedLog.details && groupDeletedLog.details.expenses && Array.isArray(groupDeletedLog.details.expenses) && groupDeletedLog.details.expenses.length > 0) {
				// Use expense snapshot from deletion log
				const expenseSnapshot = groupDeletedLog.details.expenses;
				
				// Convert snapshot expenses to our format
				for (const snapshotExpense of expenseSnapshot) {
					// Convert payee name back to ID
					const payeeName = snapshotExpense.payee || "Unknown";
					let payeeId = null;
					for (const [uid, userName] of Object.entries(userMap)) {
						if (userName === payeeName) {
							payeeId = uid;
							break;
						}
					}
					
					// Convert payer names back to IDs
					const payerNames = Array.isArray(snapshotExpense.payers) ? snapshotExpense.payers : [];
					const payerIds = payerNames.map(payerName => {
						for (const [uid, userName] of Object.entries(userMap)) {
							if (userName === payerName) {
								return uid;
							}
						}
						return payerName;
					});
					
					// Check if this expense was deleted before group deletion
					const expenseDeletedLogs = allLogs.filter(log => 
						log.action === "expense_deleted" && 
						log.type === "expense" && 
						log.expenseId && 
						log.expenseId.toString() === snapshotExpense._id.toString()
					);
					const isDeleted = expenseDeletedLogs.length > 0;
					
					expenses.push({
						_id: snapshotExpense._id.toString(),
						name: snapshotExpense.name || "Unknown Expense",
						cost: snapshotExpense.cost || 0,
						deadline: snapshotExpense.deadline || "",
						payee: payeeId || payeeName,
						payers: payerIds.length > 0 ? payerIds : [payeeId || payeeName],
						payments: snapshotExpense.payments || [],
						isDeleted: isDeleted
					});
				}
			} else {
				// Fallback: reconstruct expenses from change logs (for groups deleted before this feature)
				// Build a map of expenseId -> expenseName from ALL expense logs (not just creation)
				// This helps us find the expense name even if creation log has null expenseName
				const expenseNameMap = new Map();
				const allExpenseLogs = allLogs.filter(log => 
					log.type === "expense" && 
					log.expenseId
				);
				
				for (const log of allExpenseLogs) {
					const expenseIdStr = typeof log.expenseId === "object" 
						? log.expenseId.toString() 
						: log.expenseId.toString();
					
					// Only update if we don't already have a name for this expense
					if (!expenseNameMap.has(expenseIdStr)) {
						// Try to get expense name from this log
						// Check multiple possible locations
						let name = null;
						
						// First check top-level expenseName field
						if (log.expenseName && typeof log.expenseName === "string" && log.expenseName.trim() !== "" && log.expenseName.trim() !== "null") {
							name = log.expenseName.trim();
						} 
						// Then check details.expenseName
						else if (log.details && log.details.expenseName && typeof log.details.expenseName === "string" && log.details.expenseName.trim() !== "" && log.details.expenseName.trim() !== "null") {
							name = log.details.expenseName.trim();
						} 
						// For expense_edited logs, check changes.name.new or changes.name.old
						else if (log.details && log.details.changes && log.details.changes.name) {
							if (log.details.changes.name.new && typeof log.details.changes.name.new === "string" && log.details.changes.name.new.trim() !== "") {
								name = log.details.changes.name.new.trim();
							} else if (log.details.changes.name.old && typeof log.details.changes.name.old === "string" && log.details.changes.name.old.trim() !== "") {
								name = log.details.changes.name.old.trim();
							}
						}
						// Also check if expenseName is in details directly (for expense_created logs)
						else if (log.details && typeof log.details === "object") {
							// Check if expenseName exists as a property in details
							if (log.details.expenseName && typeof log.details.expenseName === "string" && log.details.expenseName.trim() !== "" && log.details.expenseName.trim() !== "null") {
								name = log.details.expenseName.trim();
							}
						}
						
						if (name && name !== "null" && name !== "Unknown Expense") {
							expenseNameMap.set(expenseIdStr, name);
						}
					}
				}
				
				// Get all expense_created logs
				// Be lenient - just check for action and expenseId
				const expenseCreatedLogs = allLogs.filter(log => {
					if (log.action !== "expense_created") return false;
					if (log.type !== "expense") return false;
					if (!log.expenseId) return false;
					return true; // Include even if details is missing/null
				});
				
				// Get all expense_deleted logs to know which expenses were deleted
				const expenseDeletedLogs = allLogs.filter(log => 
					log.action === "expense_deleted" && 
					log.type === "expense" && 
					log.expenseId
				);
				
				// Convert expenseIds to strings for comparison
				const deletedExpenseIds = new Set(
					expenseDeletedLogs.map(log => {
						const id = log.expenseId;
						return typeof id === "object" ? id.toString() : id.toString();
					})
				);
				
				// Reconstruct expenses from creation logs (include ALL expenses, even deleted ones)
				for (const log of expenseCreatedLogs) {
					// Convert expenseId to string for comparison
					const expenseIdStr = typeof log.expenseId === "object" 
						? log.expenseId.toString() 
						: log.expenseId.toString();
					
					// Include ALL expenses, even deleted ones - we'll mark them as deleted
					{
						// Extract payee ID from payee name - add null check for log.details
						const payeeName = (log.details && log.details.payee) ? log.details.payee : "Unknown";
						let payeeId = null;
						for (const [userId, userName] of Object.entries(userMap)) {
							if (userName === payeeName) {
								payeeId = userId;
								break;
							}
						}
						
						// Extract payer IDs from payer names - add null check for log.details
						const payerNames = (log.details && Array.isArray(log.details.payers)) ? log.details.payers : [];
						const payerIds = payerNames.map(payerName => {
							for (const [userId, userName] of Object.entries(userMap)) {
								if (userName === payerName) {
									return userId;
								}
							}
							return payerName; // Fallback to name if not found
						});
						
						// Get expense name - check name map first (built from all logs), then creation log
						// The map is more reliable because it checks all logs including edits
						let expenseName = "Unknown Expense";
						
						// First check if we found the name in any log (expenseNameMap)
						if (expenseNameMap.has(expenseIdStr)) {
							expenseName = expenseNameMap.get(expenseIdStr);
						} else if (log.details && log.details.expenseName && typeof log.details.expenseName === "string" && log.details.expenseName.trim() !== "") {
							// Fallback to creation log's details.expenseName
							expenseName = log.details.expenseName.trim();
						} else if (log.expenseName && typeof log.expenseName === "string" && log.expenseName.trim() !== "") {
							// Fallback to creation log's top-level expenseName
							expenseName = log.expenseName.trim();
						}
						
						// Mark expense as deleted if it's in the deleted set
						const isDeleted = deletedExpenseIds.has(expenseIdStr);
						
						expenses.push({
							_id: expenseIdStr,
							name: expenseName,
							cost: (log.details && log.details.cost) ? parseFloat(log.details.cost) : 0,
							deadline: (log.details && log.details.deadline) ? log.details.deadline : "",
							payee: payeeId || payeeName,
							payers: payerIds.length > 0 ? payerIds : [payeeId || payeeName],
							payments: [], // Payments not stored in logs, default to empty
							isDeleted: isDeleted // Track if expense is deleted
						});
					}
				}
			}
		}

		let formattedExpenses = expenses.map((expense) => {
			const payeeId = typeof expense.payee === "object" ? expense.payee.toString() : expense.payee.toString();
			const payeeName = userMap[payeeId] || expense.payee;

			const amountPerPayer = parseFloat((expense.cost / expense.payers.length).toFixed(2));

			// Build payments lookup
			const paymentsLookup = {};
			(expense.payments || []).forEach(p => {
				const pid = typeof p.payer === "object" ? p.payer.toString() : p.payer.toString();
				paymentsLookup[pid] = parseFloat(Number(p.paid || 0).toFixed(2));
			});

			// Build payerShares
			const payerShares = expense.payers.map(payerId => {
				const idStr = typeof payerId === "object" ? payerId.toString() : payerId.toString();
				const name = userMap[idStr] || idStr;
				const paidSoFar = paymentsLookup[idStr] || 0;
				const owed = parseFloat(Math.max(0, amountPerPayer - paidSoFar).toFixed(2));
				return { _id: idStr, name, owed };
			});

			return {
				_id: expense._id.toString(),
				name: expense.name,
				cost: parseFloat(Number(expense.cost).toFixed(2)),
				deadline: expense.deadline,
				payee: payeeId,
				payeeName: payeeName,
				payers: expense.payers.map(p => typeof p === "object" ? p.toString() : p.toString()),
				payerNames: payerShares.map(p => p.name).join(", "),
				amountPerPayer: amountPerPayer,
				numPayers: expense.payers.length,
				payerShares: payerShares,
				isDeleted: expense.isDeleted || false // Preserve isDeleted flag
			};
		});

		// Apply search filter
		if (searchTerm && searchTerm.trim() !== "") {
			const searchLower = searchTerm.toLowerCase().trim();
			formattedExpenses = formattedExpenses.filter(expense =>
				expense.name.toLowerCase().includes(searchLower)
			);
		}

		// Helper function to parse MM/DD/YYYY date string
		function parseDate(dateStr) {
			if (!dateStr) return new Date(0);
			const parts = dateStr.split('/');
			if (parts.length === 3) {
				return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
			}
			return new Date(dateStr);
		}

		// Apply sorting
		switch (filterType) {
			case "closestDue":
				formattedExpenses.sort((a, b) => {
					const dateA = parseDate(a.deadline);
					const dateB = parseDate(b.deadline);
					return dateA - dateB;
				});
				break;
			case "farthestDue":
				formattedExpenses.sort((a, b) => {
					const dateA = parseDate(a.deadline);
					const dateB = parseDate(b.deadline);
					return dateB - dateA;
				});
				break;
			case "lowestAmount":
				formattedExpenses.sort((a, b) => a.cost - b.cost);
				break;
			case "highestAmount":
				formattedExpenses.sort((a, b) => b.cost - a.cost);
				break;
			default:
				// No sort
				break;
		}

		res.render("logs/groupExpenses", {
			title: `Expenses - ${group.groupName}`,
			group: group,
			groupStatus: groupStatus,
			expenses: formattedExpenses,
			hasExpenses: formattedExpenses.length > 0,
			searchTerm: searchTerm || "",
			filterType: filterType || "",
			currency: group.currency || "USD"
		});
	} catch (e) {
		res.status(500).render("error", { error: e.toString() });
	}
});

// POST /logs/:groupId - Handle search and sort for expenses
router.post("/:groupId", requireAuth, async (req, res) => {
	try {
		const userId = req.session.user._id;
		const groupId = checkId(req.params.groupId);
		const { searchTerm, filterType } = req.body;

		// Try to get group info (might not exist if deleted)
		let group;
		let groupStatus = "active";
		try {
			group = await groupsData.getGroupByID(groupId);
		} catch (e) {
			// Group deleted - get info from logs
			const logs = await changeLogsData.getGroupChangeLogsForUser(userId, groupId);
			if (logs.length === 0) {
				return res.status(404).render("error", { error: "Group not found" });
			}
			// Try to find group_deleted log for currency and other info
			const groupDeletedLog = logs.find(log => 
				log.action === "group_deleted" && 
				log.type === "group"
			);
			group = {
				_id: groupId,
				groupName: logs[0].groupName,
				groupDescription: "",
				currency: (groupDeletedLog && groupDeletedLog.details && groupDeletedLog.details.currency) ? groupDeletedLog.details.currency : "USD",
				expenses: [],
				groupMembers: []
			};
			groupStatus = logs[0].groupStatus || "deleted";
		}

		// Format expenses for display with user names
		const allUsers = await usersData.getAllUsers();
		const userMap = {};
		allUsers.forEach((user) => {
			userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
		});

		// Get all logs to check for deleted expenses (for both active and deleted groups)
		const allLogs = await changeLogsData.getGroupChangeLogsForUser(userId, groupId);

		// Get expenses from group if active, otherwise reconstruct from change logs
		let expenses = [];
		if (group.expenses && group.expenses.length > 0) {
			// Group is active, use expenses from group but also include deleted expenses from logs
			expenses = group.expenses.map(exp => ({
				...exp,
				isDeleted: false // Active expenses are not deleted
			}));
			
			// Get all expense_created logs to find all expenses that were ever created
			const expenseCreatedLogs = allLogs.filter(log => 
				log.action === "expense_created" && 
				log.type === "expense" && 
				log.expenseId
			);
			
			// Get all expense_deleted logs
			const expenseDeletedLogs = allLogs.filter(log => 
				log.action === "expense_deleted" && 
				log.type === "expense" && 
				log.expenseId
			);
			
			// Track which expenses exist in the current group (active expenses)
			const activeExpenseIds = new Set(
				expenses.map(exp => {
					const id = exp._id;
					return typeof id === "object" ? id.toString() : id.toString();
				})
			);
			
			// Track which expenses were deleted
			const deletedExpenseIds = new Set(
				expenseDeletedLogs.map(log => {
					const id = log.expenseId;
					return typeof id === "object" ? id.toString() : id.toString();
				})
			);
			
			// Build expense name map from all expense logs
			const expenseNameMap = new Map();
			const allExpenseLogs = allLogs.filter(log => 
				log.type === "expense" && 
				log.expenseId
			);
			
			for (const log of allExpenseLogs) {
				const expenseIdStr = typeof log.expenseId === "object" 
					? log.expenseId.toString() 
					: log.expenseId.toString();
				
				if (!expenseNameMap.has(expenseIdStr)) {
					let name = null;
					if (log.expenseName && typeof log.expenseName === "string" && log.expenseName.trim() !== "") {
						name = log.expenseName.trim();
					} else if (log.details && log.details.expenseName && typeof log.details.expenseName === "string" && log.details.expenseName.trim() !== "") {
						name = log.details.expenseName.trim();
					} else if (log.details && log.details.changes && log.details.changes.name) {
						if (log.details.changes.name.new && typeof log.details.changes.name.new === "string") {
							name = log.details.changes.name.new.trim();
						} else if (log.details.changes.name.old && typeof log.details.changes.name.old === "string") {
							name = log.details.changes.name.old.trim();
						}
					}
					
					if (name) {
						expenseNameMap.set(expenseIdStr, name);
					}
				}
			}
			
			// Add deleted expenses that are not in the current group
			for (const log of expenseCreatedLogs) {
				const expenseIdStr = typeof log.expenseId === "object" 
					? log.expenseId.toString() 
					: log.expenseId.toString();
				
				// If this expense is not in active expenses and was deleted, add it
				if (!activeExpenseIds.has(expenseIdStr) && deletedExpenseIds.has(expenseIdStr)) {
					// This is a deleted expense - reconstruct it from logs
					const payeeName = (log.details && log.details.payee) ? log.details.payee : "Unknown";
					let payeeId = null;
					for (const [uid, userName] of Object.entries(userMap)) {
						if (userName === payeeName) {
							payeeId = uid;
							break;
						}
					}
					
					const payerNames = (log.details && Array.isArray(log.details.payers)) ? log.details.payers : [];
					const payerIds = payerNames.map(payerName => {
						for (const [uid, userName] of Object.entries(userMap)) {
							if (userName === payerName) {
								return uid;
							}
						}
						return payerName;
					});
					
					// Get expense name
					let expenseName = "Unknown Expense";
					if (log.details && log.details.expenseName && typeof log.details.expenseName === "string" && log.details.expenseName.trim() !== "") {
						expenseName = log.details.expenseName.trim();
					} else if (log.expenseName && typeof log.expenseName === "string" && log.expenseName.trim() !== "") {
						expenseName = log.expenseName.trim();
					} else if (expenseNameMap.has(expenseIdStr)) {
						expenseName = expenseNameMap.get(expenseIdStr);
					}
					
					// Add deleted expense to the list
					expenses.push({
						_id: expenseIdStr,
						name: expenseName,
						cost: (log.details && log.details.cost) ? parseFloat(log.details.cost) : 0,
						deadline: (log.details && log.details.deadline) ? log.details.deadline : "",
						payee: payeeId || payeeName,
						payers: payerIds.length > 0 ? payerIds : [payeeId || payeeName],
						payments: [],
						isDeleted: true // Mark as deleted
					});
				}
			}
		} else if (groupStatus === "deleted") {
			// Group is deleted - use expense snapshot from deletion log if available
			// Check if group_deleted log has expenses snapshot
			const groupDeletedLog = allLogs.find(log => 
				log.action === "group_deleted" && 
				log.type === "group" && 
				log.groupId === groupId
			);
			
			// If deletion log has expense snapshot, use it (more reliable - saved at deletion time)
			if (groupDeletedLog && groupDeletedLog.details && groupDeletedLog.details.expenses && Array.isArray(groupDeletedLog.details.expenses) && groupDeletedLog.details.expenses.length > 0) {
				// Use expense snapshot from deletion log
				const expenseSnapshot = groupDeletedLog.details.expenses;
				
				// Convert snapshot expenses to our format
				for (const snapshotExpense of expenseSnapshot) {
					// Convert payee name back to ID
					const payeeName = snapshotExpense.payee || "Unknown";
					let payeeId = null;
					for (const [uid, userName] of Object.entries(userMap)) {
						if (userName === payeeName) {
							payeeId = uid;
							break;
						}
					}
					
					// Convert payer names back to IDs
					const payerNames = Array.isArray(snapshotExpense.payers) ? snapshotExpense.payers : [];
					const payerIds = payerNames.map(payerName => {
						for (const [uid, userName] of Object.entries(userMap)) {
							if (userName === payerName) {
								return uid;
							}
						}
						return payerName;
					});
					
					// Check if this expense was deleted before group deletion
					const expenseDeletedLogs = allLogs.filter(log => 
						log.action === "expense_deleted" && 
						log.type === "expense" && 
						log.expenseId && 
						log.expenseId.toString() === snapshotExpense._id.toString()
					);
					const isDeleted = expenseDeletedLogs.length > 0;
					
					expenses.push({
						_id: snapshotExpense._id.toString(),
						name: snapshotExpense.name || "Unknown Expense",
						cost: snapshotExpense.cost || 0,
						deadline: snapshotExpense.deadline || "",
						payee: payeeId || payeeName,
						payers: payerIds.length > 0 ? payerIds : [payeeId || payeeName],
						payments: snapshotExpense.payments || [],
						isDeleted: isDeleted
					});
				}
			} else {
				// Fallback: reconstruct expenses from change logs (for groups deleted before this feature)
				// Build a map of expenseId -> expenseName from ALL expense logs (not just creation)
				// This helps us find the expense name even if creation log has null expenseName
				const expenseNameMap = new Map();
				const allExpenseLogs = allLogs.filter(log => 
					log.type === "expense" && 
					log.expenseId
				);
				
				for (const log of allExpenseLogs) {
					const expenseIdStr = typeof log.expenseId === "object" 
						? log.expenseId.toString() 
						: log.expenseId.toString();
					
					// Only update if we don't already have a name for this expense
					if (!expenseNameMap.has(expenseIdStr)) {
						// Try to get expense name from this log
						// Check multiple possible locations
						let name = null;
						
						// First check top-level expenseName field
						if (log.expenseName && typeof log.expenseName === "string" && log.expenseName.trim() !== "" && log.expenseName.trim() !== "null") {
							name = log.expenseName.trim();
						} 
						// Then check details.expenseName
						else if (log.details && log.details.expenseName && typeof log.details.expenseName === "string" && log.details.expenseName.trim() !== "" && log.details.expenseName.trim() !== "null") {
							name = log.details.expenseName.trim();
						} 
						// For expense_edited logs, check changes.name.new or changes.name.old
						else if (log.details && log.details.changes && log.details.changes.name) {
							if (log.details.changes.name.new && typeof log.details.changes.name.new === "string" && log.details.changes.name.new.trim() !== "") {
								name = log.details.changes.name.new.trim();
							} else if (log.details.changes.name.old && typeof log.details.changes.name.old === "string" && log.details.changes.name.old.trim() !== "") {
								name = log.details.changes.name.old.trim();
							}
						}
						// Also check if expenseName is in details directly (for expense_created logs)
						else if (log.details && typeof log.details === "object") {
							// Check if expenseName exists as a property in details
							if (log.details.expenseName && typeof log.details.expenseName === "string" && log.details.expenseName.trim() !== "" && log.details.expenseName.trim() !== "null") {
								name = log.details.expenseName.trim();
							}
						}
						
						if (name && name !== "null" && name !== "Unknown Expense") {
							expenseNameMap.set(expenseIdStr, name);
						}
					}
				}
				
				// Get all expense_created logs
				// Be lenient - just check for action and expenseId
				const expenseCreatedLogs = allLogs.filter(log => {
					if (log.action !== "expense_created") return false;
					if (log.type !== "expense") return false;
					if (!log.expenseId) return false;
					return true; // Include even if details is missing/null
				});
				
				// Get all expense_deleted logs to know which expenses were deleted
				const expenseDeletedLogs = allLogs.filter(log => 
					log.action === "expense_deleted" && 
					log.type === "expense" && 
					log.expenseId
				);
				
				// Convert expenseIds to strings for comparison
				const deletedExpenseIds = new Set(
					expenseDeletedLogs.map(log => {
						const id = log.expenseId;
						return typeof id === "object" ? id.toString() : id.toString();
					})
				);
				
				// Reconstruct expenses from creation logs (include ALL expenses, even deleted ones)
				for (const log of expenseCreatedLogs) {
					// Convert expenseId to string for comparison
					const expenseIdStr = typeof log.expenseId === "object" 
						? log.expenseId.toString() 
						: log.expenseId.toString();
					
					// Include ALL expenses, even deleted ones - we'll mark them as deleted
					{
						// Extract payee ID from payee name - add null check for log.details
						const payeeName = (log.details && log.details.payee) ? log.details.payee : "Unknown";
						let payeeId = null;
						for (const [userId, userName] of Object.entries(userMap)) {
							if (userName === payeeName) {
								payeeId = userId;
								break;
							}
						}
						
						// Extract payer IDs from payer names - add null check for log.details
						const payerNames = (log.details && Array.isArray(log.details.payers)) ? log.details.payers : [];
						const payerIds = payerNames.map(payerName => {
							for (const [userId, userName] of Object.entries(userMap)) {
								if (userName === payerName) {
									return userId;
								}
							}
							return payerName; // Fallback to name if not found
						});
						
						// Get expense name - check name map first (built from all logs), then creation log
						// The map is more reliable because it checks all logs including edits
						let expenseName = "Unknown Expense";
						
						// First check if we found the name in any log (expenseNameMap)
						if (expenseNameMap.has(expenseIdStr)) {
							expenseName = expenseNameMap.get(expenseIdStr);
						} else if (log.details && log.details.expenseName && typeof log.details.expenseName === "string" && log.details.expenseName.trim() !== "") {
							// Fallback to creation log's details.expenseName
							expenseName = log.details.expenseName.trim();
						} else if (log.expenseName && typeof log.expenseName === "string" && log.expenseName.trim() !== "") {
							// Fallback to creation log's top-level expenseName
							expenseName = log.expenseName.trim();
						}
						
						// Mark expense as deleted if it's in the deleted set
						const isDeleted = deletedExpenseIds.has(expenseIdStr);
						
						expenses.push({
							_id: expenseIdStr,
							name: expenseName,
							cost: (log.details && log.details.cost) ? parseFloat(log.details.cost) : 0,
							deadline: (log.details && log.details.deadline) ? log.details.deadline : "",
							payee: payeeId || payeeName,
							payers: payerIds.length > 0 ? payerIds : [payeeId || payeeName],
							payments: [], // Payments not stored in logs, default to empty
							isDeleted: isDeleted // Track if expense is deleted
						});
					}
				}
			}
		}

		let formattedExpenses = expenses.map((expense) => {
			const payeeId = typeof expense.payee === "object" ? expense.payee.toString() : expense.payee.toString();
			const payeeName = userMap[payeeId] || expense.payee;

			const amountPerPayer = parseFloat((expense.cost / expense.payers.length).toFixed(2));

			// Build payments lookup
			const paymentsLookup = {};
			(expense.payments || []).forEach(p => {
				const pid = typeof p.payer === "object" ? p.payer.toString() : p.payer.toString();
				paymentsLookup[pid] = parseFloat(Number(p.paid || 0).toFixed(2));
			});

			// Build payerShares
			const payerShares = expense.payers.map(payerId => {
				const idStr = typeof payerId === "object" ? payerId.toString() : payerId.toString();
				const name = userMap[idStr] || idStr;
				const paidSoFar = paymentsLookup[idStr] || 0;
				const owed = parseFloat(Math.max(0, amountPerPayer - paidSoFar).toFixed(2));
				return { _id: idStr, name, owed };
			});

			return {
				_id: expense._id.toString(),
				name: expense.name,
				cost: parseFloat(Number(expense.cost).toFixed(2)),
				deadline: expense.deadline,
				payee: payeeId,
				payeeName: payeeName,
				payers: expense.payers.map(p => typeof p === "object" ? p.toString() : p.toString()),
				payerNames: payerShares.map(p => p.name).join(", "),
				amountPerPayer: amountPerPayer,
				numPayers: expense.payers.length,
				payerShares: payerShares,
				isDeleted: expense.isDeleted || false // Preserve isDeleted flag
			};
		});

		// Apply search filter
		if (searchTerm && searchTerm.trim() !== "") {
			const searchLower = searchTerm.toLowerCase().trim();
			formattedExpenses = formattedExpenses.filter(expense =>
				expense.name.toLowerCase().includes(searchLower)
			);
		}

		// Helper function to parse MM/DD/YYYY date string
		function parseDate(dateStr) {
			if (!dateStr) return new Date(0);
			const parts = dateStr.split('/');
			if (parts.length === 3) {
				return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
			}
			return new Date(dateStr);
		}

		// Apply sorting
		switch (filterType) {
			case "closestDue":
				formattedExpenses.sort((a, b) => {
					const dateA = parseDate(a.deadline);
					const dateB = parseDate(b.deadline);
					return dateA - dateB;
				});
				break;
			case "farthestDue":
				formattedExpenses.sort((a, b) => {
					const dateA = parseDate(a.deadline);
					const dateB = parseDate(b.deadline);
					return dateB - dateA;
				});
				break;
			case "lowestAmount":
				formattedExpenses.sort((a, b) => a.cost - b.cost);
				break;
			case "highestAmount":
				formattedExpenses.sort((a, b) => b.cost - a.cost);
				break;
			default:
				// No sort
				break;
		}

		res.render("logs/groupExpenses", {
			title: `Expenses - ${group.groupName}`,
			group: group,
			groupStatus: groupStatus,
			expenses: formattedExpenses,
			hasExpenses: formattedExpenses.length > 0,
			searchTerm: searchTerm || "",
			filterType: filterType || "",
			currency: group.currency || "USD"
		});
	} catch (e) {
		res.status(500).render("error", { error: e.toString() });
	}
});

// GET /logs/:groupId/change-logs - Show group-level change logs
router.get("/:groupId/change-logs", requireAuth, async (req, res) => {
	try {
		const userId = req.session.user._id;
		const groupId = checkId(req.params.groupId);

		// Get group-level change logs
		const logs = await changeLogsData.getGroupLevelChangeLogsForUser(userId, groupId);

		// Get group info if it exists
		let group;
		let groupStatus = "active";
		try {
			group = await groupsData.getGroupByID(groupId);
		} catch (e) {
			if (logs.length > 0) {
				group = {
					_id: groupId,
					groupName: logs[0].groupName,
					groupDescription: ""
				};
				groupStatus = logs[0].groupStatus || "deleted";
			} else {
				return res.status(404).render("error", { error: "Group not found" });
			}
		}

		res.render("logs/groupChangeLogs", {
			title: `Group Change Logs - ${group.groupName}`,
			group: group,
			groupStatus: groupStatus,
			logs: logs,
			hasLogs: logs.length > 0
		});
	} catch (e) {
		res.status(500).render("error", { error: e.toString() });
	}
});

// GET /logs/:groupId/expenses/:expenseId/change-logs - Show expense change logs
router.get("/:groupId/expenses/:expenseId/change-logs", requireAuth, async (req, res) => {
	try {
		const userId = req.session.user._id;
		const groupId = checkId(req.params.groupId);
		const expenseId = checkId(req.params.expenseId);

		// Get expense change logs
		const logs = await changeLogsData.getExpenseChangeLogsForUser(userId, groupId, expenseId);

		// Get group info if it exists
		let group;
		let groupStatus = "active";
		try {
			group = await groupsData.getGroupByID(groupId);
		} catch (e) {
			if (logs.length > 0) {
				group = {
					_id: groupId,
					groupName: logs[0].groupName,
					groupDescription: ""
				};
				groupStatus = logs[0].groupStatus || "deleted";
			} else {
				return res.status(404).render("error", { error: "Group not found" });
			}
		}

		// Get expense info if group exists and is active
		let expense = null;
		if (groupStatus === "active" && group.expenses) {
			expense = group.expenses.find(exp => exp._id.toString() === expenseId);
		}

		const expenseName = logs.length > 0 ? logs[0].expenseName : (expense ? expense.name : "Unknown Expense");

		res.render("logs/expenseChangeLogs", {
			title: `Expense Change Logs - ${expenseName}`,
			group: group,
			groupStatus: groupStatus,
			expenseId: expenseId,
			expenseName: expenseName,
			expense: expense,
			logs: logs,
			hasLogs: logs.length > 0
		});
	} catch (e) {
		res.status(500).render("error", { error: e.toString() });
	}
});

export default router;

