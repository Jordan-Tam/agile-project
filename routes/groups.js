import express from "express";
import { groups } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb"
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
import usersData from "../data/users.js";
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

			const newGroup = await groupsData.createGroup(
				groupName,
				groupDescription
			);
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
			return res.json(await expensesData.deleteExpense(groupId, expenseId));
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

			const updatedGroup = await groupsData.updateGroup(
				groupId,
				groupName,
				groupDescription
			);
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

			const amountPerPayer = parseFloat((expense.cost / expense.payers.length).toFixed(2));

			// Build payments lookup
			const paymentsLookup = {};
			(expense.payments || []).forEach(p => {
				const pid = (typeof p.payer === 'object') ? p.payer.toString() : p.payer;
				paymentsLookup[pid] = parseFloat(Number(p.paid || 0).toFixed(2));
			});

			// Build payerShares (array of {_id, name, owed})
			const payerShares = expense.payers.map(payerId => {
				const idStr = (typeof payerId === 'object') ? payerId.toString() : payerId;
				const name = userMap[idStr] || idStr;
				const paidSoFar = paymentsLookup[idStr] || 0;
				const owed = parseFloat(Math.max(0, amountPerPayer - paidSoFar).toFixed(2));
				return { _id: idStr, name, owed };
			});

			// Amount current user owes
			const currentUserId = req.session.user._id.toString();
			let amountOwedForCurrentUser = 0;
			if (expense.payers.map(p => (typeof p === 'object' ? p.toString() : p.toString())).includes(currentUserId)) {
				const paid = paymentsLookup[currentUserId] || 0;
				amountOwedForCurrentUser = parseFloat(Math.max(0, amountPerPayer - paid).toFixed(2));
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
				amountOwedForCurrentUser   
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

router.route("/:id").get(requireAuth, async (req, res) => {
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
		const formattedExpenses = expenses.map((expense) => {
		const payeeName = userMap[expense.payee] || expense.payee;
		const payerNames = expense.payers.map(
			(payerId) => userMap[payerId] || payerId
		);

		const amountPerPayer = parseFloat((expense.cost / expense.payers.length).toFixed(2));

		// Build payments lookup
		const paymentsLookup = {};
		(expense.payments || []).forEach(p => {
			const pid = typeof p.payer === "object" ? p.payer.toString() : p.payer;
			paymentsLookup[pid] = parseFloat(Number(p.paid || 0).toFixed(2));
		});

		// Build payerShares
		const payerShares = expense.payers.map(payerId => {
			const idStr = typeof payerId === "object" ? payerId.toString() : payerId;
			const name = userMap[idStr] || idStr;
			const paidSoFar = paymentsLookup[idStr] || 0;
			const owed = parseFloat(Math.max(0, amountPerPayer - paidSoFar).toFixed(2));
			return { _id: idStr, name, owed };
		});

		// Calculate current user owed
		const currentUserId = req.session.user._id.toString();
		let amountOwedForCurrentUser = 0;
		if (expense.payers.map(p => (typeof p === "object" ? p.toString() : p.toString())).includes(currentUserId)) {
			const paid = paymentsLookup[currentUserId] || 0;
			amountOwedForCurrentUser = parseFloat(Math.max(0, amountPerPayer - paid).toFixed(2));
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
			payerShares,               // REQUIRED for modal display
			amountOwedForCurrentUser   // REQUIRED to enable “Update Balance” button
		};
	});


		// Calculate balances (who owes whom)
		const balances = await groupsData.calculateGroupBalances(id);

		// Debug: Log the raw balances
		console.log("Raw balances:", JSON.stringify(balances, null, 2));

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
		console.log(
			"Formatted balances:",
			JSON.stringify(formattedBalances, null, 2)
		);
		console.log(
			"Group members:",
			group.groupMembers.map((m) => `${m.firstName} ${m.lastName} (${m._id})`)
		);

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

	.post(requireAuth, async (req, res) => {
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

		// Call data function to add the expense.
		try {
			await expensesData.createExpense(
				groupId,
				name,
				cost,
				deadline,
				payee,
				payers
			);
			res.redirect(`/groups/${groupId}/`);
		} catch (e) {
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
			const updatedGroup = await groupsData.removeMember(groupId, user_id);
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
router
  .route("/:id/changeCurrency")
  .post(requireAuth, async (req, res) => {
    try {
      const groupId = checkId(req.params.id);
      const { currency } = req.body;

      if (!currency) {
        return res.status(400).json({ error: "Currency is required" });
      }

      const updatedGroup = await groupsData.updateCurrency(groupId, currency);

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
router
  .route("/:groupId/updateBalance")
  .post(requireAuth, async (req, res) => {
    try {
      const groupId = checkId(req.params.groupId, "Group ID", "POST /:groupId/updateBalance");
      let { expenseId, paymentAmount } = req.body;

      if (!expenseId || paymentAmount === undefined || paymentAmount === null) {
        return res.status(400).json({ error: "Missing expenseId or paymentAmount" });
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
      const expense = (group.expenses || []).find(exp => exp._id.toString() === expenseId);

      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }

      // Ensure payer is actually a payer in this expense
      const payerIds = expense.payers.map(p => (typeof p === 'object' ? p.toString() : p.toString()));
      if (!payerIds.includes(payerId)) {
        return res.status(403).json({ error: "You are not a payer for this expense" });
      }

      const numPayers = expense.payers.length;
      const amountPerPayer = parseFloat((expense.cost / numPayers).toFixed(2));

      // Find already paid for this payer
      const paymentsLookup = {};
      (expense.payments || []).forEach(p => {
        const pid = (typeof p.payer === 'object') ? p.payer.toString() : p.payer;
        paymentsLookup[pid] = parseFloat(Number(p.paid || 0).toFixed(2));
      });
      const alreadyPaid = paymentsLookup[payerId] || 0;
      const remaining = parseFloat((amountPerPayer - alreadyPaid).toFixed(2));
      if (remaining <= 0) {
        return res.status(400).json({ error: "Nothing left to pay for this expense" });
      }
      if (paymentAmount > remaining) {
        return res.status(400).json({ error: `Payment amount cannot exceed remaining owed ${remaining}` });
      }

      // Record the payment via the expenses data module
      const updatedExpense = await expensesData.addPayment(groupId, expenseId, payerId, paymentAmount);

      return res.json({
        success: true,
        message: "Payment recorded",
        updatedExpense
      });
    } catch (e) {
      return res.status(500).json({ error: e.toString() });
    }
  });
export default router;
