import express from "express";
import { groups } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
import usersData from "../data/users.js";
import changeLogsData from "../data/changeLogs.js";
import { requireAuth } from "../middleware.js";
import {
	checkString,
	checkId,
	checkNumber,
	checkDate,
	checkName,
	checkUserId,
	checkPassword,
	checkCost
} from "../helpers.js";
import PDFDocument from "pdfkit";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const uploadDir = path.join(__dirname, "../uploads/expenses");
		// Ensure directory exists
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		// Create unique filename with timestamp
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, uniqueSuffix + "-" + file.originalname);
	}
});

// File filter to restrict file types and size
const fileFilter = (req, file, cb) => {
	// Allow common file types: images, PDFs, docs
	const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
	const extname = allowedTypes.test(
		path.extname(file.originalname).toLowerCase()
	);
	const mimetype = allowedTypes.test(file.mimetype);

	if (mimetype && extname) {
		return cb(null, true);
	} else {
		cb(new Error("Only images, PDFs, and office documents are allowed!"));
	}
};

const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024 // 5MB limit
	},
	fileFilter: fileFilter
});

const router = express.Router();

router
	.route("/new")

	// GET route - display the "create group" form
	.get(requireAuth, async (req, res) => {
		try {
			res.render("groups/createGroup", { title: "Create a Group" });
		} catch (e) {
			res.status(500).render("error", { error: e });
		}
	})

	// POST route - handle form submission
	.post(requireAuth, async (req, res) => {
		try {
			let { groupName, groupDescription } = req.body;

			if (!groupName || !groupDescription) {
				return res.status(400).render("groups/createGroup", {
					title: "Create a Group",
					error: "Both group name and description are required."
				});
			}

			// Create the group first
			const newGroup = await groupsData.createGroup(
				groupName,
				groupDescription
			);

			// Add the creator as a member so the group shows up in their groups list
			await groupsData.addMember(newGroup._id, req.session.user.userId);

			// Then log the group creation - now it has at least one member (the creator)
			try {
				await changeLogsData.addChangeLogToAllMembers(
					"group_created",
					"group",
					newGroup._id.toString(),
					newGroup.groupName,
					null, // expenseId
					null, // expenseName
					{
						userId: req.session.user._id,
						userName: `${req.session.user.firstName} ${req.session.user.lastName}`
					},
					{
						groupName: newGroup.groupName,
						groupDescription: newGroup.groupDescription
					}
				);
			} catch (logError) {
				console.error("Error logging group creation:", logError);
			}

			const allGroups = await groupsData.getGroupsForUser(req.session.user._id);

			res.render("groups/group", {
				title: "Group Created",
				group: newGroup,
				group_name: newGroup.groupName,
				group_description: newGroup.groupDescription,
				groups: allGroups,
				success: "Group created successfully!",
				stylesheet: "/public/css/styles.css"
			});
		} catch (e) {
			res.status(400).render("groups/createGroup", {
				title: "Create a Group",
				error: e.toString()
			});
		}
	});

// Delete expense route - MUST come before /:id route to avoid conflicts
router
	.route("/:groupId/:expenseId")

	.delete(requireAuth, async (req, res) => {
		// Get path parameters.
		let groupId = req.params.groupId;
		let expenseId = req.params.expenseId;

		// Input validation.
		try {
			groupId = checkId(groupId, "Group", "DELETE /:groupId/:expenseId");
			expenseId = checkId(expenseId, "Expense", "DELETE /:groupId/:expenseId");
		} catch (e) {
			return res.status(400).json({ error: e });
		}

		// Call data function to delete expense.
		try {
			// Get group and expense info BEFORE deletion
			const group = await groupsData.getGroupByID(groupId);
			const expense = group.expenses?.find(
				(exp) => exp._id.toString() === expenseId
			);

			if (expense) {
				// Get all users for name mapping
				const allUsers = await usersData.getAllUsers();
				const userMap = {};
				allUsers.forEach((user) => {
					userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
				});

				// Log expense deletion
				try {
					await changeLogsData.addChangeLogToAllMembers(
						"expense_deleted",
						"expense",
						groupId,
						group.groupName,
						expenseId,
						expense.name,
						{
							userId: req.session.user._id,
							userName: `${req.session.user.firstName} ${req.session.user.lastName}`
						},
						{
							cost: expense.cost,
							deadline: expense.deadline
						}
					);
				} catch (logError) {
					console.error("Error logging expense deletion:", logError);
				}
			}

			const deleteResult = await expensesData.deleteExpense(groupId, expenseId);

			// If expense had a file, delete it from filesystem
			if (deleteResult.deletedExpense && deleteResult.deletedExpense.file) {
				const filePath = path.join(
					__dirname,
					"../uploads/expenses",
					deleteResult.deletedExpense.file.filename
				);
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			}

			return res.json(deleteResult.group);
		} catch (e) {
			return res.status(500).json({ error: e });
		}
	});

// Edit group route - MUST come before /:id route to avoid conflicts
router
	.route("/:id/edit")

	// GET route - display the "edit group" form
	.get(requireAuth, async (req, res) => {
		try {
			const id = checkId(req.params.id);
			const group = await groupsData.getGroupByID(id);
			res.render("groups/editGroup", {
				title: "Edit Group",
				group: group,
				group_id: id,
				group_name: group.groupName,
				group_description: group.groupDescription
			});
		} catch (e) {
			res.status(404).render("error", { error: e.toString() });
		}
	})

	// POST route - handle form submission
	.post(requireAuth, async (req, res) => {
		try {
			let groupId = req.params.id;
			let { groupName, groupDescription } = req.body;

			if (!groupName || !groupDescription) {
				const group = await groupsData.getGroupByID(groupId);
				return res.status(400).render("groups/editGroup", {
					title: "Edit Group",
					group: group,
					group_id: groupId,
					group_name: group.groupName,
					group_description: group.groupDescription,
					error: "Both group name and description are required."
				});
			}

			// Get old group data for comparison
			const oldGroup = await groupsData.getGroupByID(groupId);

			const updatedGroup = await groupsData.updateGroup(
				groupId,
				groupName,
				groupDescription
			);

			// Determine what changed
			const changes = {};
			if (oldGroup.groupName !== groupName) {
				changes.name = { old: oldGroup.groupName, new: groupName };
			}
			if (oldGroup.groupDescription !== groupDescription) {
				changes.description = {
					old: oldGroup.groupDescription,
					new: groupDescription
				};
			}

			// Log group edit if something changed
			if (Object.keys(changes).length > 0) {
				try {
					await changeLogsData.addChangeLogToAllMembers(
						"group_edited",
						"group",
						groupId,
						groupName,
						null,
						null,
						{
							userId: req.session.user._id,
							userName: `${req.session.user.firstName} ${req.session.user.lastName}`
						},
						{ changes: changes }
					);
				} catch (logError) {
					console.error("Error logging group edit:", logError);
				}
			}

			res.redirect(`/groups/${groupId}/`);
		} catch (e) {
			try {
				const groupId = checkId(req.params.id);
				const group = await groupsData.getGroupByID(groupId);
				return res.status(400).render("groups/editGroup", {
					title: "Edit Group",
					group: group,
					group_id: groupId,
					group_name: group.groupName,
					group_description: group.groupDescription,
					error: e.toString()
				});
			} catch (err) {
				return res.status(400).render("error", { error: e.toString() });
			}
		}
	});

// PDF Export route - MUST come before /:id route to avoid conflicts
router.route("/:id/export-pdf").get(requireAuth, async (req, res) => {
	try {
		const id = checkId(req.params.id);
		const group = await groupsData.getGroupByID(id);

		// Log export report
		try {
			await changeLogsData.addChangeLogToAllMembers(
				"export_report",
				"group",
				id,
				group.groupName,
				null,
				null,
				{
					userId: req.session.user._id,
					userName: `${req.session.user.firstName} ${req.session.user.lastName}`
				},
				{}
			);
		} catch (logError) {
			console.error("Error logging export report:", logError);
		}

		// Get all users to map IDs to names
		const allUsers = await usersData.getAllUsers();
		const userMap = {};
		allUsers.forEach((user) => {
			userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
		});

		// Create a new PDF document
		const doc = new PDFDocument({ margin: 50 });

		// Set response headers for PDF download
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${group.groupName.replace(
				/[^a-z0-9]/gi,
				"_"
			)}_expenses.pdf"`
		);

		// Pipe the PDF to the response
		doc.pipe(res);

		// Add title
		doc
			.fontSize(24)
			.font("Helvetica-Bold")
			.text(group.groupName, { align: "center" });
		doc.moveDown(0.5);

		// Add description
		if (group.groupDescription) {
			doc
				.fontSize(12)
				.font("Helvetica")
				.text(group.groupDescription, { align: "center" });
			doc.moveDown(1);
		}

		// Add generation date
		const now = new Date();
		doc
			.fontSize(10)
			.font("Helvetica-Oblique")
			.text(
				`Report Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
				{ align: "right" }
			);
		doc.moveDown(1);

		// Add group members section
		doc.fontSize(16).font("Helvetica-Bold").text("Group Members");
		doc.moveDown(0.5);

		if (group.groupMembers && group.groupMembers.length > 0) {
			doc.fontSize(11).font("Helvetica");
			group.groupMembers.forEach((member, index) => {
				doc.text(`${index + 1}. ${member.firstName} ${member.lastName}`);
			});
		} else {
			doc
				.fontSize(11)
				.font("Helvetica-Oblique")
				.text("No members in this group");
		}
		doc.moveDown(1.5);

		// Add expenses section
		doc.fontSize(16).font("Helvetica-Bold").text("Expenses Summary");
		doc.moveDown(0.5);

		// inside router.route("/:id").get(...)
		// Format expenses for display with user names
		const expenses = group.expenses || [];

		const formattedExpenses = expenses.map((expense) => {
			const payeeName = userMap[expense.payee] || expense.payee;
			const payerNames = expense.payers.map(
				(payerId) => userMap[payerId] || payerId
			);

			const amountPerPayer = parseFloat(
				(expense.cost / expense.payers.length).toFixed(2)
			);

			// Build payments lookup
			const paymentsLookup = {};
			(expense.payments || []).forEach((p) => {
				const pid = typeof p.payer === "object" ? p.payer.toString() : p.payer;
				paymentsLookup[pid] = parseFloat(Number(p.paid || 0).toFixed(2));
			});

			// Build payerShares (array of {_id, name, owed})
			const payerShares = expense.payers.map((payerId) => {
				const idStr =
					typeof payerId === "object" ? payerId.toString() : payerId;
				const name = userMap[idStr] || idStr;
				const paidSoFar = paymentsLookup[idStr] || 0;
				const owed = parseFloat(
					Math.max(0, amountPerPayer - paidSoFar).toFixed(2)
				);
				return { _id: idStr, name, owed };
			});

			// Amount current user owes
			const currentUserId = req.session.user._id.toString();
			let amountOwedForCurrentUser = 0;
			if (
				expense.payers
					.map((p) => (typeof p === "object" ? p.toString() : p.toString()))
					.includes(currentUserId)
			) {
				const paid = paymentsLookup[currentUserId] || 0;
				amountOwedForCurrentUser = parseFloat(
					Math.max(0, amountPerPayer - paid).toFixed(2)
				);
			}

			return {
				_id: expense._id.toString(),
				name: expense.name,
				cost: parseFloat(Number(expense.cost).toFixed(2)),
				deadline: expense.deadline,
				payee: expense.payee,
				payeeName,
				payers: expense.payers,
				payerNames,
				amountPerPayer,
				numPayers: expense.payers.length,
				payerShares,
				amountOwedForCurrentUser,
				file: expense.file
			};
		});
		if (expenses.length === 0) {
			doc
				.fontSize(11)
				.font("Helvetica-Oblique")
				.text("No expenses recorded for this group");
		} else {
			// Calculate total expenses
			const totalExpenses = expenses.reduce((sum, exp) => sum + exp.cost, 0);

			doc
				.fontSize(12)
				.font("Helvetica-Bold")
				.text(`Total Expenses: $${totalExpenses.toFixed(2)}`);
			doc.fontSize(12).text(`Number of Expenses: ${expenses.length}`);
			doc.moveDown(1);

			// Add each expense
			expenses.forEach((expense, index) => {
				// Draw a line separator
				if (index > 0) {
					doc
						.strokeColor("#cccccc")
						.lineWidth(0.5)
						.moveTo(50, doc.y)
						.lineTo(550, doc.y)
						.stroke();
					doc.moveDown(0.5);
				}

				// Expense name
				doc
					.fontSize(13)
					.font("Helvetica-Bold")
					.fillColor("#000000")
					.text(`${index + 1}. ${expense.name}`);

				// Expense details
				doc.fontSize(11).font("Helvetica");
				doc.text(`Cost: $${expense.cost.toFixed(2)}`);
				doc.text(`Deadline: ${expense.deadline}`);

				// Payee info
				const payeeName = userMap[expense.payee] || expense.payee;
				doc.text(`Payee: ${payeeName}`);

				// Payers info
				const payerNames = expense.payers.map(
					(payerId) => userMap[payerId] || payerId
				);
				doc.text(`Payers: ${payerNames.join(", ")}`);

				// Cost per payer
				const costPerPayer = expense.cost / expense.payers.length;
				doc.text(`Cost per Payer: $${costPerPayer.toFixed(2)}`);

				doc.moveDown(1);
			});
		}

		// Add footer
		doc
			.fontSize(8)
			.font("Helvetica-Oblique")
			.fillColor("#666666")
			.text(
				"This is an automated expense report. For questions, contact your group administrator.",
				50,
				doc.page.height - 50,
				{ align: "center" }
			);

		// Finalize the PDF
		doc.end();
	} catch (e) {
		console.error("PDF Export Error:", e);
		return res.status(500).render("error", {
			error: "Failed to generate PDF: " + e.toString()
		});
	}
});

// Download/view expense file route - MUST come before /:id route to avoid conflicts
router
	.route("/:groupId/expense/:expenseId/file")
	.get(requireAuth, async (req, res) => {
		try {
			const groupId = checkId(
				req.params.groupId,
				"Group ID",
				"GET /:groupId/expense/:expenseId/file"
			);
			const expenseId = checkId(
				req.params.expenseId,
				"Expense ID",
				"GET /:groupId/expense/:expenseId/file"
			);

			const group = await groupsData.getGroupByID(groupId);
			const expense = group.expenses?.find(
				(exp) => exp._id.toString() === expenseId
			);

			if (!expense) {
				return res.status(404).render("error", { error: "Expense not found." });
			}

			if (!expense.file) {
				return res
					.status(404)
					.render("error", { error: "No file attached to this expense." });
			}

			const filePath = path.join(
				__dirname,
				"../uploads/expenses",
				expense.file.filename
			);

			if (!fs.existsSync(filePath)) {
				return res
					.status(404)
					.render("error", { error: "File not found on server." });
			}

			// Set headers for download
			res.setHeader("Content-Type", expense.file.mimetype);
			res.setHeader(
				"Content-Disposition",
				`attachment; filename="${expense.file.originalName}"`
			);

			// Send the file
			res.sendFile(filePath);
		} catch (e) {
			console.error("File download error:", e);
			return res.status(500).render("error", {
				error: "Failed to download file: " + e.toString()
			});
		}
	});

router
	.route("/:id")

	.get(requireAuth, async (req, res) => {
		try {
			const id = checkId(req.params.id);
			const group = await groupsData.getGroupByID(id);
			const allGroups = await groupsData.getGroupsForUser(req.session.user._id);

			// Get all users to map IDs to names
			const allUsers = await usersData.getAllUsers();
			const userMap = {};
			allUsers.forEach((user) => {
				userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
			});

			// Format expenses for display with user names
			const expenses = group.expenses || [];
			const formattedExpenses = expenses
				.filter((expense) => expense.archived !== true) // Exclude archived expenses from main view
				.map((expense) => {
					const payeeName = userMap[expense.payee] || expense.payee;
					const payerNames = expense.payers.map(
						(payerId) => userMap[payerId] || payerId
					);

					const amountPerPayer = parseFloat(
						(expense.cost / expense.payers.length).toFixed(2)
					);

					// Build payments lookup
					const paymentsLookup = {};
					(expense.payments || []).forEach((p) => {
						const pid =
							typeof p.payer === "object" ? p.payer.toString() : p.payer;
						paymentsLookup[pid] = parseFloat(Number(p.paid || 0).toFixed(2));
					});

					// Build payerShares
					const payerShares = expense.payers.map((payerId) => {
						const idStr =
							typeof payerId === "object" ? payerId.toString() : payerId;
						const name = userMap[idStr] || idStr;
						const paidSoFar = paymentsLookup[idStr] || 0;
						const owed = parseFloat(
							Math.max(0, amountPerPayer - paidSoFar).toFixed(2)
						);
						return { _id: idStr, name, owed };
					});

					// Calculate current user owed
					const currentUserId = req.session.user._id.toString();
					let amountOwedForCurrentUser = 0;
					if (
						expense.payers
							.map((p) => (typeof p === "object" ? p.toString() : p.toString()))
							.includes(currentUserId)
					) {
						const paid = paymentsLookup[currentUserId] || 0;
						amountOwedForCurrentUser = parseFloat(
							Math.max(0, amountPerPayer - paid).toFixed(2)
						);
					}

					return {
						_id: expense._id.toString(),
						name: expense.name,
						cost: parseFloat(Number(expense.cost).toFixed(2)),
						deadline: expense.deadline,
						payee: expense.payee,
						payeeName,
						payers: expense.payers,
						payerNames,
						amountPerPayer,
						numPayers: expense.payers.length,
						payerShares, // REQUIRED for modal display
						amountOwedForCurrentUser, // REQUIRED to enable "Update Balance" button
						file: expense.file
					};
				}); // Calculate balances (who owes whom)
			const balances = await groupsData.calculateGroupBalances(id);

			// Debug: Log the raw balances
			// console.log("Raw balances:", JSON.stringify(balances, null, 2));

			// Format balances with names for display
			const formattedBalances = {};
			for (const debtorId of Object.keys(balances)) {
				const debtorName = userMap[debtorId] || debtorId;
				formattedBalances[debtorId] = {
					debtorName: debtorName,
					owes: []
				};

				for (const creditorId of Object.keys(balances[debtorId])) {
					const creditorName = userMap[creditorId] || creditorId;
					const amount = balances[debtorId][creditorId];
					formattedBalances[debtorId].owes.push({
						creditorId: creditorId,
						creditorName: creditorName,
						amount: amount
					});
				}
			}

			// Debug: Log formatted balances
			/* console.log(
				"Formatted balances:",
				JSON.stringify(formattedBalances, null, 2)
			);
			console.log(
				"Group members:",
				group.groupMembers.map((m) => `${m.firstName} ${m.lastName} (${m._id})`)
			); */

			return res.render("groups/group", {
				group: group,
				group_id: id,
				group_name: group.groupName,
				group_description: group.groupDescription,
				groupMembers: group.groupMembers,
				groups: allGroups,
				expenses: formattedExpenses,
				hasExpenses: formattedExpenses.length > 0,
				balances: formattedBalances,
				currentUserId: req.session.user._id,
				stylesheet: "/public/css/styles.css"
			});
		} catch (e) {
			return res.status(404).render("error", {
				error: "Group Not Found"
			});
		}
	})

	.delete(requireAuth, async (req, res) => {
		try {
			const id = checkId(req.params.id);

			// Get group info BEFORE deletion
			const group = await groupsData.getGroupByID(id);

			// Mark all logs for this group as deleted
			try {
				await changeLogsData.markGroupAsDeleted(id);
			} catch (logError) {
				console.error("Error marking group logs as deleted:", logError);
			}

			// Log group deletion for all members
			try {
				const allMemberIds = await changeLogsData.getAllGroupMemberIds(id);
				const allUsers = await usersData.getAllUsers();
				const userMap = {};
				allUsers.forEach((user) => {
					userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
				});

				// Prepare expense snapshot - include BOTH active AND deleted expenses
				// First, get all change logs to find deleted expenses
				const allLogs = await changeLogsData.getGroupChangeLogsForUser(
					req.session.user._id,
					id
				);

				// Get all expense_created logs (all expenses ever created)
				const expenseCreatedLogs = allLogs.filter(
					(log) =>
						log.action === "expense_created" &&
						log.type === "expense" &&
						log.expenseId
				);

				// Get all expense_deleted logs (to identify deleted expenses)
				const expenseDeletedLogs = allLogs.filter(
					(log) =>
						log.action === "expense_deleted" &&
						log.type === "expense" &&
						log.expenseId
				);

				// Create a set of deleted expense IDs
				const deletedExpenseIds = new Set(
					expenseDeletedLogs.map((log) => {
						const id = log.expenseId;
						return typeof id === "object" ? id.toString() : id.toString();
					})
				);

				// Create a set of active expense IDs (from current group)
				const activeExpenseIds = new Set(
					(group.expenses || []).map((exp) => {
						const id = exp._id;
						return typeof id === "object" ? id.toString() : id.toString();
					})
				);

				// Build expense name map from all expense logs
				const expenseNameMap = new Map();
				const allExpenseLogs = allLogs.filter(
					(log) => log.type === "expense" && log.expenseId
				);

				for (const log of allExpenseLogs) {
					const expenseIdStr =
						typeof log.expenseId === "object"
							? log.expenseId.toString()
							: log.expenseId.toString();

					if (!expenseNameMap.has(expenseIdStr)) {
						let name = null;
						if (
							log.expenseName &&
							typeof log.expenseName === "string" &&
							log.expenseName.trim() !== ""
						) {
							name = log.expenseName.trim();
						} else if (
							log.details &&
							log.details.expenseName &&
							typeof log.details.expenseName === "string" &&
							log.details.expenseName.trim() !== ""
						) {
							name = log.details.expenseName.trim();
						} else if (
							log.details &&
							log.details.changes &&
							log.details.changes.name
						) {
							if (
								log.details.changes.name.new &&
								typeof log.details.changes.name.new === "string"
							) {
								name = log.details.changes.name.new.trim();
							} else if (
								log.details.changes.name.old &&
								typeof log.details.changes.name.old === "string"
							) {
								name = log.details.changes.name.old.trim();
							}
						}

						if (name) {
							expenseNameMap.set(expenseIdStr, name);
						}
					}
				}

				// Start with active expenses from group
				const expenseSnapshot = (group.expenses || []).map((expense) => {
					// Convert payee to name if it's an ObjectId
					let payeeName = expense.payee;
					if (expense.payee) {
						const payeeId =
							typeof expense.payee === "object"
								? expense.payee.toString()
								: expense.payee.toString();
						payeeName = userMap[payeeId] || payeeId;
					}

					// Convert payers to names
					const payerNames = (expense.payers || []).map((payerId) => {
						const pid =
							typeof payerId === "object"
								? payerId.toString()
								: payerId.toString();
						return userMap[pid] || pid;
					});

					return {
						_id: expense._id.toString(),
						name: expense.name || "Unknown Expense",
						cost: expense.cost || 0,
						deadline: expense.deadline || "",
						payee: payeeName,
						payers: payerNames,
						payments: (expense.payments || []).map((p) => ({
							payer:
								typeof p.payer === "object"
									? p.payer.toString()
									: p.payer.toString(),
							paid: p.paid || 0
						})),
						isDeleted: false
					};
				});

				// Add deleted expenses that are not in the active group
				for (const log of expenseCreatedLogs) {
					const expenseIdStr =
						typeof log.expenseId === "object"
							? log.expenseId.toString()
							: log.expenseId.toString();

					// If this expense was deleted and not in active expenses, add it to snapshot
					if (
						deletedExpenseIds.has(expenseIdStr) &&
						!activeExpenseIds.has(expenseIdStr)
					) {
						// Reconstruct deleted expense from logs
						const payeeName =
							log.details && log.details.payee ? log.details.payee : "Unknown";
						const payerNames =
							log.details && Array.isArray(log.details.payers)
								? log.details.payers
								: [];

						// Get expense name from map or log
						let expenseName = "Unknown Expense";
						if (expenseNameMap.has(expenseIdStr)) {
							expenseName = expenseNameMap.get(expenseIdStr);
						} else if (
							log.details &&
							log.details.expenseName &&
							typeof log.details.expenseName === "string" &&
							log.details.expenseName.trim() !== ""
						) {
							expenseName = log.details.expenseName.trim();
						} else if (
							log.expenseName &&
							typeof log.expenseName === "string" &&
							log.expenseName.trim() !== ""
						) {
							expenseName = log.expenseName.trim();
						}

						expenseSnapshot.push({
							_id: expenseIdStr,
							name: expenseName,
							cost:
								log.details && log.details.cost
									? parseFloat(log.details.cost)
									: 0,
							deadline:
								log.details && log.details.deadline ? log.details.deadline : "",
							payee: payeeName,
							payers: payerNames,
							payments: [], // Payments not stored in deleted expense logs
							isDeleted: true
						});
					}
				}

				if (allMemberIds.length > 0) {
					await changeLogsData.addChangeLog(
						"group_deleted",
						"group",
						id,
						group.groupName,
						null,
						null,
						{
							userId: req.session.user._id,
							userName: `${req.session.user.firstName} ${req.session.user.lastName}`
						},
						allMemberIds,
						{
							expenses: expenseSnapshot, // Store snapshot of all expenses at time of deletion
							currency: group.currency || "USD"
						},
						"deleted" // Set groupStatus to "deleted" for deletion log
					);
				}
			} catch (logError) {
				console.error("Error logging group deletion:", logError);
			}

			// NOW delete the group
			await groupsData.deleteGroup(id);

			res.redirect("/home");
		} catch (e) {
			return res.status(500).json({ error: e.toString() });
		}
	});

// Expense routes
router
	.route("/:id/expense/new")

	.get(requireAuth, async (req, res) => {
		try {
			let group = await groupsData.getGroupByID(req.params.id);
			return res.render("groups/createExpense", {
				title: "Create Expense",
				groupId: req.params.id,
				group: group
			});
		} catch (e) {
			return res.status(500).render("error", { error: e.toString() });
		}
	})

	.post(requireAuth, upload.single("expenseFile"), async (req, res) => {
		// Get path and request body parameters.
		let groupId = req.params.id;
		let { name, cost, deadline, payee, payers } = req.body;

		// Input validation.
		try {
			groupId = checkId(groupId, "Group", "POST /:id/expense/new");
			name = checkString(name, "Name", "POST /:id/expense/new");
			cost = checkCost(Number(cost), "POST /:id/expense/new");

			// Handle date format conversion if needed
			if (deadline.includes("-")) {
				let splitDeadline = deadline.split("-");
				deadline = `${splitDeadline[1]}/${splitDeadline[2]}/${splitDeadline[0]}`;
			}

			deadline = checkDate(deadline, "Deadline", "POST /:id/expense/new");
			payee = checkId(payee.toString(), "Payee", "POST /:id/expense/new");
			for (let payer of payers) {
				checkId(payer.toString(), "Payer", "POST /:id/expense/new");
			}
		} catch (e) {
			// If validation fails and a file was uploaded, delete it
			if (req.file) {
				fs.unlinkSync(req.file.path);
			}

			let group;
			try {
				group = await groupsData.getGroupByID(groupId);
			} catch (groupError) {
				group = null;
			}

			return res.status(500).render("groups/createExpense", {
				title: "Create Expense",
				groupId: groupId,
				group: group,
				error: typeof e === "string" ? e : "Unable to add expense",
				form: {
					name: req.body?.name ?? "",
					cost: req.body?.cost ?? "",
					deadline: req.body?.deadline ?? ""
				}
			});
		}

		// Prepare file info if a file was uploaded
		let fileInfo = null;
		if (req.file) {
			fileInfo = {
				filename: req.file.filename,
				originalName: req.file.originalname,
				mimetype: req.file.mimetype,
				size: req.file.size
			};
		}

		// Call data function to add the expense.
		try {
			await expensesData.createExpense(
				groupId,
				name,
				cost,
				deadline,
				payee,
				payers,
				fileInfo
			);

			// Get the created expense from the group
			const group = await groupsData.getGroupByID(groupId);
			const newExpense = group.expenses.find(
				(exp) =>
					exp.name === name && exp.cost === cost && exp.deadline === deadline
			);

			// Get all users for name mapping
			const allUsers = await usersData.getAllUsers();
			const userMap = {};
			allUsers.forEach((user) => {
				userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
			});

			// Get payee name
			const payeeId =
				typeof payee === "object" ? payee.toString() : payee.toString();
			const payeeName = userMap[payeeId] || payee;

			// Log expense creation
			if (newExpense) {
				try {
					await changeLogsData.addChangeLogToAllMembers(
						"expense_created",
						"expense",
						groupId,
						group.groupName,
						newExpense._id.toString(),
						name,
						{
							userId: req.session.user._id,
							userName: `${req.session.user.firstName} ${req.session.user.lastName}`
						},
						{
							expenseName: name, // Also store in details for consistency with seed.js
							cost: cost,
							deadline: deadline,
							payee: payeeName,
							payers: payers.map((p) => {
								const pid = typeof p === "object" ? p.toString() : p.toString();
								return userMap[pid] || p;
							}),
							hasFile: fileInfo !== null
						}
					);
				} catch (logError) {
					console.error("Error logging expense creation:", logError);
				}
			}

			res.redirect(`/groups/${groupId}/`);
		} catch (e) {
			// If expense creation fails and a file was uploaded, delete it
			if (req.file) {
				fs.unlinkSync(req.file.path);
			}

			let group;
			try {
				group = await groupsData.getGroupByID(groupId);
			} catch (groupError) {
				group = null;
			}

			return res.status(500).render("groups/createExpense", {
				title: "Create Expense",
				groupId: groupId,
				group: group,
				error: typeof e === "string" ? e : "Unable to add expense",
				form: {
					name: req.body?.name ?? "",
					cost: req.body?.cost ?? "",
					deadline: req.body?.deadline ?? ""
				}
			});
		}
	});

// Edit Expense route
router
	.route("/:groupId/expense/:expenseId/edit")
	.get(requireAuth, async (req, res) => {
		try {
			const groupId = checkId(
				req.params.groupId,
				"Group ID",
				"GET /:groupId/expense/:expenseId/edit"
			);
			const expenseId = checkId(
				req.params.expenseId,
				"Expense ID",
				"GET /:groupId/expense/:expenseId/edit"
			);

			const group = await groupsData.getGroupByID(groupId);

			// Authorization check: verify user is a member of the group
			const userIsMember = group.groupMembers.some(
				(member) => member._id.toString() === req.session.user._id.toString()
			);
			if (!userIsMember) {
				return res.status(403).render("error", {
					error: "You do not have permission to edit expenses in this group."
				});
			}

			const expense = group.expenses?.find(
				(exp) => exp._id.toString() === expenseId
			);

			if (!expense) {
				return res.status(404).render("error", { error: "Expense not found." });
			}

			const allUsers = await usersData.getAllUsers();
			// use hashmap for easy look up :)
			const userMap = {};
			allUsers.forEach((user) => {
				userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
			});

			return res.render("groups/editExpense", {
				title: "Edit Expense",
				group: group,
				groupId: groupId,
				expense: {
					_id: expense._id.toString(),
					name: expense.name,
					cost: expense.cost,
					deadline: expense.deadline,
					payee: expense.payee,
					payers: expense.payers
				},
				groupMembers: group.groupMembers
			});
		} catch (e) {
			return res.status(400).render("error", {
				error: e.toString()
			});
		}
	})
	.put(requireAuth, async (req, res) => {
		// Get path and request body parameters.
		let groupId = req.params.groupId;
		let expenseId = req.params.expenseId;
		let { name, cost, deadline, payee, payers } = req.body;

		// Input validation.
		try {
			groupId = checkId(
				groupId,
				"Group",
				"PUT /:groupId/expense/:expenseId/edit"
			);
			expenseId = checkId(
				expenseId,
				"Expense",
				"PUT /:groupId/expense/:expenseId/edit"
			);
			name = checkString(name, "Name", "PUT /:groupId/expense/:expenseId/edit");
			cost = checkCost(cost, "PUT /:groupId/expense/:expenseId/edit");

			// Handle date format conversion if needed
			if (deadline.includes("-")) {
				let splitDeadline = deadline.split("-");
				deadline = `${splitDeadline[1]}/${splitDeadline[2]}/${splitDeadline[0]}`;
			}

			deadline = checkDate(
				deadline,
				"Deadline",
				"PUT /:groupId/expense/:expenseId/edit"
			);
			payee = checkId(
				payee.toString(),
				"Payee",
				"PUT /:groupId/expense/:expenseId/edit"
			);
			// Ensure payers is provided and is an array
			if (!payers || (Array.isArray(payers) && payers.length === 0)) {
				throw "At least one payer is required";
			}
			if (!Array.isArray(payers)) {
				payers = [payers];
			}
			for (let payer of payers) {
				checkId(
					payer.toString(),
					"Payer",
					"PUT /:groupId/expense/:expenseId/edit"
				);
			}
		} catch (e) {
			return res.status(400).json({ error: e });
		}

		// Authorization check: verify user is a member of the group
		try {
			const group = await groupsData.getGroupByID(groupId);
			const userIsMember = group.groupMembers.some(
				(member) => member._id.toString() === req.session.user._id.toString()
			);
			if (!userIsMember) {
				return res.status(403).json({
					error: "You do not have permission to edit expenses in this group."
				});
			}
		} catch (e) {
			return res.status(500).json({ error: e.toString() });
		}

		// Get group and expense for comparison BEFORE editing
		const group = await groupsData.getGroupByID(groupId);
		const oldExpense = group.expenses.find(
			(exp) => exp._id.toString() === expenseId
		);

		// Get all users for name mapping
		const allUsers = await usersData.getAllUsers();
		const userMap = {};
		allUsers.forEach((user) => {
			userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
		});

		// Call data function to edit the expense.
		try {
			const updatedExpense = await expensesData.editExpense(
				groupId,
				expenseId,
				name,
				cost,
				deadline,
				payee,
				payers
			);

			// Determine what changed
			const changes = {};
			if (oldExpense.name !== name) {
				changes.name = { old: oldExpense.name, new: name };
			}
			if (oldExpense.cost !== cost) {
				changes.cost = { old: oldExpense.cost, new: cost };
			}
			if (oldExpense.deadline !== deadline) {
				changes.deadline = { old: oldExpense.deadline, new: deadline };
			}

			const oldPayeeId =
				typeof oldExpense.payee === "object"
					? oldExpense.payee.toString()
					: oldExpense.payee.toString();
			const newPayeeId =
				typeof payee === "object" ? payee.toString() : payee.toString();
			if (oldPayeeId !== newPayeeId) {
				changes.payee = {
					old: userMap[oldPayeeId] || oldPayeeId,
					new: userMap[newPayeeId] || newPayeeId
				};
			}

			// Check if payers changed
			const oldPayers = oldExpense.payers
				.map((p) => (typeof p === "object" ? p.toString() : p.toString()))
				.sort();
			const newPayers = payers
				.map((p) => (typeof p === "object" ? p.toString() : p.toString()))
				.sort();
			if (JSON.stringify(oldPayers) !== JSON.stringify(newPayers)) {
				changes.payers = {
					old: oldPayers.map((p) => userMap[p] || p),
					new: newPayers.map((p) => userMap[p] || p)
				};
			}

			// Log expense edit if something changed
			if (Object.keys(changes).length > 0) {
				try {
					await changeLogsData.addChangeLogToAllMembers(
						"expense_edited",
						"expense",
						groupId,
						group.groupName,
						expenseId,
						name,
						{
							userId: req.session.user._id,
							userName: `${req.session.user.firstName} ${req.session.user.lastName}`
						},
						{ changes: changes }
					);
				} catch (logError) {
					console.error("Error logging expense edit:", logError);
				}
			}

			return res.json(updatedExpense);
		} catch (e) {
			return res.status(500).json({ error: e });
		}
	});

router
	.route("/:id/addMember")

	// GET route - render "add member" form
	.get(requireAuth, async (req, res) => {
		try {
			const groupId = checkId(req.params.id);
			const group = await groupsData.getGroupByID(groupId);

			res.render("groups/addMember", {
				title: "Add Member",
				group: group
			});
		} catch (e) {
			res.status(400).render("error", { error: e.toString() });
		}
	})

	// POST route - handle form submission
	.post(requireAuth, async (req, res) => {
		let groupId = req.params.id;
		let { user_id } = req.body;

		// Input validation
		try {
			groupId = checkId(groupId, "Group ID", "POST /:id/addMember");
			user_id = checkUserId(user_id, "User ID", "POST /:id/addMember");
		} catch (e) {
			const group = await groupsData.getGroupByID(groupId);
			return res.status(400).render("groups/addMember", {
				title: "Add Member",
				group: group,
				error: e.toString()
			});
		}

		// Call data function to add the member
		try {
			const updatedGroup = await groupsData.addMember(groupId, user_id);

			// Get all users for name mapping
			const allUsers = await usersData.getAllUsers();
			const userMap = {};
			allUsers.forEach((user) => {
				userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
			});

			// Find the added user
			const addedUser = allUsers.find(
				(u) => u.userId.toString() === user_id.toString()
			);
			const addedUserName = addedUser
				? `${addedUser.firstName} ${addedUser.lastName}`
				: user_id;

			// Get group info
			const group = await groupsData.getGroupByID(groupId);

			// Log member added
			try {
				await changeLogsData.addChangeLogToAllMembers(
					"member_added",
					"group",
					groupId,
					group.groupName,
					null,
					null,
					{
						userId: req.session.user._id,
						userName: `${req.session.user.firstName} ${req.session.user.lastName}`
					},
					{
						memberId: addedUser ? addedUser._id.toString() : user_id,
						memberName: addedUserName
					}
				);

				// Update visibleTo for all existing logs of this group (add new member)
				const allMemberIds = await changeLogsData.getAllGroupMemberIds(groupId);
				await changeLogsData.updateVisibleToForGroup(groupId, allMemberIds);
			} catch (logError) {
				console.error("Error logging member added:", logError);
			}

			res.redirect(`/groups/${groupId}/`);
		} catch (e) {
			const group = await groupsData.getGroupByID(groupId);
			res.status(400).render("groups/addMember", {
				title: "Add Member",
				group: group,
				error: e.toString()
			});
		}
	});

router
	.route("/:id/removeMember")

	// GET route - show remove member form
	.get(requireAuth, async (req, res) => {
		try {
			const groupId = checkId(
				req.params.id,
				"Group ID",
				"GET /:id/removeMember"
			);
			const group = await groupsData.getGroupByID(groupId);

			if (!group.groupMembers || group.groupMembers.length === 0) {
				return res
					.status(400)
					.render("error", { error: "No members to remove in this group." });
			}

			res.render("groups/removeMember", {
				title: "Remove Member",
				group: group,
				members: group.groupMembers
			});
		} catch (e) {
			res.status(400).render("error", { error: e.toString() });
		}
	})

	// POST route - handle member removal
	.post(requireAuth, async (req, res) => {
		let groupId = req.params.id;
		let { user_id } = req.body;

		let group;
		try {
			groupId = checkId(groupId, "Group ID", "POST /:id/removeMember");

			// Fetch the group so we can use it in case of validation errors
			group = await groupsData.getGroupByID(groupId);

			user_id = checkId(user_id, "User ID", "POST /:id/removeMember");
		} catch (e) {
			return res.status(400).render("groups/removeMember", {
				title: "Remove Member",
				group: group, // now defined
				members: group ? group.groupMembers : [],
				error: e.toString()
			});
		}

		// Call data function to remove member
		try {
			// Get all users for name mapping BEFORE removal
			const allUsers = await usersData.getAllUsers();
			const userMap = {};
			allUsers.forEach((user) => {
				userMap[user._id.toString()] = `${user.firstName} ${user.lastName}`;
			});

			// Find the removed user
			const removedUser = allUsers.find(
				(u) => u._id.toString() === user_id.toString()
			);
			const removedUserName = removedUser
				? `${removedUser.firstName} ${removedUser.lastName}`
				: user_id;

			const updatedGroup = await groupsData.removeMember(groupId, user_id);

			// Get group info
			const updatedGroupData = await groupsData.getGroupByID(groupId);

			// Log member removed
			try {
				await changeLogsData.addChangeLogToAllMembers(
					"member_removed",
					"group",
					groupId,
					updatedGroupData.groupName,
					null,
					null,
					{
						userId: req.session.user._id,
						userName: `${req.session.user.firstName} ${req.session.user.lastName}`
					},
					{
						memberId: removedUser ? removedUser._id.toString() : user_id,
						memberName: removedUserName
					}
				);

				// Update visibleTo for all existing logs of this group (remove deleted member)
				const allMemberIds = await changeLogsData.getAllGroupMemberIds(groupId);
				await changeLogsData.updateVisibleToForGroup(groupId, allMemberIds);
			} catch (logError) {
				console.error("Error logging member removed:", logError);
			}

			res.redirect(`/groups/${groupId}/`);
		} catch (e) {
			return res.status(400).render("groups/removeMember", {
				title: "Remove Member",
				group: group,
				members: group.groupMembers,
				error: e.toString()
			});
		}
	});

// Change currency route
router.route("/:id/changeCurrency").post(requireAuth, async (req, res) => {
	try {
		const groupId = checkId(req.params.id);
		const { currency } = req.body;

		if (!currency) {
			return res.status(400).json({ error: "Currency is required" });
		}

		// Get old group data for comparison
		const group = await groupsData.getGroupByID(groupId);
		const oldCurrency = group.currency || "USD";

		const updatedGroup = await groupsData.updateCurrency(groupId, currency);

		// Log currency change
		try {
			await changeLogsData.addChangeLogToAllMembers(
				"currency_changed",
				"group",
				groupId,
				group.groupName,
				null,
				null,
				{
					userId: req.session.user._id,
					userName: `${req.session.user.firstName} ${req.session.user.lastName}`
				},
				{
					oldCurrency: oldCurrency,
					newCurrency: currency
				}
			);
		} catch (logError) {
			console.error("Error logging currency change:", logError);
		}

		res.json({
			success: true,
			message: "Currency updated successfully",
			currency: updatedGroup.currency
		});
	} catch (e) {
		res.status(400).json({ error: e.toString() });
	}
});

router.route("/").get(requireAuth, async (req, res) => {
	try {
		const allGroups = await groupsData.getGroupsForUser(req.session.user._id);
		res.render("groups/group", {
			title: "Your Groups",
			groups: allGroups,
			user: req.session.user,
			stylesheet: "/public/css/styles.css"
		});
	} catch (e) {
		res.status(500).render("error", { error: e.toString() });
	}
});
// Update balance route
router.route("/:groupId/updateBalance").post(requireAuth, async (req, res) => {
	try {
		const groupId = checkId(
			req.params.groupId,
			"Group ID",
			"POST /:groupId/updateBalance"
		);
		let { expenseId, paymentAmount } = req.body;

		if (!expenseId || paymentAmount === undefined || paymentAmount === null) {
			return res
				.status(400)
				.json({ error: "Missing expenseId or paymentAmount" });
		}

		// Coerce types
		paymentAmount = parseFloat(paymentAmount);
		if (isNaN(paymentAmount) || paymentAmount < 0) {
			return res.status(400).json({ error: "Invalid payment amount" });
		}

		// Use the logged-in user as the payer
		const payerId = req.session.user._id.toString();

		// Fetch group and expense to validate bounds
		const group = await groupsData.getGroupByID(groupId);
		const expense = (group.expenses || []).find(
			(exp) => exp._id.toString() === expenseId
		);

		if (!expense) {
			return res.status(404).json({ error: "Expense not found" });
		}

		// Ensure payer is actually a payer in this expense
		const payerIds = expense.payers.map((p) =>
			typeof p === "object" ? p.toString() : p.toString()
		);
		if (!payerIds.includes(payerId)) {
			return res
				.status(403)
				.json({ error: "You are not a payer for this expense" });
		}

		const numPayers = expense.payers.length;
		const amountPerPayer = parseFloat((expense.cost / numPayers).toFixed(2));

		// Find already paid for this payer
		const paymentsLookup = {};
		(expense.payments || []).forEach((p) => {
			const pid = typeof p.payer === "object" ? p.payer.toString() : p.payer;
			paymentsLookup[pid] = parseFloat(Number(p.paid || 0).toFixed(2));
		});
		const alreadyPaid = paymentsLookup[payerId] || 0;
		const remaining = parseFloat((amountPerPayer - alreadyPaid).toFixed(2));
		if (remaining <= 0) {
			return res
				.status(400)
				.json({ error: "Nothing left to pay for this expense" });
		}
		if (paymentAmount > remaining) {
			return res.status(400).json({
				error: `Payment amount cannot exceed remaining owed ${remaining}`
			});
		}

		// Record the payment via the expenses data module
		const updatedExpense = await expensesData.addPayment(
			groupId,
			expenseId,
			payerId,
			paymentAmount
		);

		// Log payment recorded
		if (updatedExpense && expense) {
			try {
				// Get payment info
				const payments = updatedExpense.payments || [];
				const paymentEntry = payments.find((p) => {
					const pid =
						typeof p.payer === "object"
							? p.payer.toString()
							: p.payer.toString();
					return pid === payerId;
				});

				const totalPaid = paymentEntry ? paymentEntry.paid : 0;
				const amountPerPayer = expense.cost / expense.payers.length;
				const remainingOwed = Math.max(0, amountPerPayer - totalPaid);

				await changeLogsData.addChangeLogToAllMembers(
					"payment_recorded",
					"expense",
					groupId,
					group.groupName,
					expenseId,
					expense.name,
					{
						userId: req.session.user._id,
						userName: `${req.session.user.firstName} ${req.session.user.lastName}`
					},
					{
						paymentAmount: paymentAmount,
						totalPaid: totalPaid,
						remainingOwed: remainingOwed,
						amountPerPayer: amountPerPayer
					}
				);
			} catch (logError) {
				console.error("Error logging payment recorded:", logError);
			}
		}

		return res.json({
			success: true,
			message: "Payment recorded",
			updatedExpense
		});
	} catch (e) {
		return res.status(500).json({ error: e.toString() });
	}
});

// Archive expense route
router
	.route("/:groupId/:expenseId/archive")
	.post(requireAuth, async (req, res) => {
		try {
			const groupId = checkId(
				req.params.groupId,
				"Group ID",
				"POST /:groupId/:expenseId/archive"
			);
			const expenseId = checkId(
				req.params.expenseId,
				"Expense ID",
				"POST /:groupId/:expenseId/archive"
			);

			// Get group and expense info before archiving
			const group = await groupsData.getGroupByID(groupId);
			const expense = group.expenses?.find(
				(exp) => exp._id.toString() === expenseId
			);

			if (!expense) {
				return res.status(404).json({ error: "Expense not found" });
			}

			// Archive the expense
			await expensesData.archiveExpense(groupId, expenseId);

			// Log the archive action
			try {
				await changeLogsData.addChangeLogToAllMembers(
					"expense_archived",
					"expense",
					groupId,
					group.groupName,
					expenseId,
					expense.name,
					{
						userId: req.session.user._id,
						userName: `${req.session.user.firstName} ${req.session.user.lastName}`
					},
					{
						cost: expense.cost,
						deadline: expense.deadline
					}
				);
			} catch (logError) {
				console.error("Error logging expense archive:", logError);
			}

			res.json({ success: true, message: "Expense archived successfully" });
		} catch (e) {
			console.error("Archive expense error:", e);
			res.status(500).json({ error: e.toString() });
		}
	});

// Unarchive expense route
router
	.route("/:groupId/:expenseId/unarchive")
	.post(requireAuth, async (req, res) => {
		try {
			const groupId = checkId(
				req.params.groupId,
				"Group ID",
				"POST /:groupId/:expenseId/unarchive"
			);
			const expenseId = checkId(
				req.params.expenseId,
				"Expense ID",
				"POST /:groupId/:expenseId/unarchive"
			);

			// Get group and expense info before unarchiving
			const group = await groupsData.getGroupByID(groupId);
			const expense = group.expenses?.find(
				(exp) => exp._id.toString() === expenseId
			);

			if (!expense) {
				return res.status(404).json({ error: "Expense not found" });
			}

			// Unarchive the expense
			await expensesData.unarchiveExpense(groupId, expenseId);

			// Log the unarchive action
			try {
				await changeLogsData.addChangeLogToAllMembers(
					"expense_unarchived",
					"expense",
					groupId,
					group.groupName,
					expenseId,
					expense.name,
					{
						userId: req.session.user._id,
						userName: `${req.session.user.firstName} ${req.session.user.lastName}`
					},
					{
						cost: expense.cost,
						deadline: expense.deadline
					}
				);
			} catch (logError) {
				console.error("Error logging expense unarchive:", logError);
			}

			res.json({ success: true, message: "Expense unarchived successfully" });
		} catch (e) {
			console.error("Unarchive expense error:", e);
			res.status(500).json({ error: e.toString() });
		}
	});

export default router;
