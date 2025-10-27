import express from "express";
import { groups } from "../config/mongoCollections.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
import { requireAuth } from "../middleware.js";
const router = express.Router();

router.route("/new")

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

			const newGroup = await groupsData.createGroup(groupName, groupDescription);

			// redirect or show confirmation page
			res.render("groups/groupCreated", {
				title: "Group Created",
				group: newGroup,
				success: "Group created successfully!"
			});
		} catch (e) {
			res.status(400).render("groups/createGroup", {
				title: "Create a Group",
				error: e.toString()
			});
		}
	});

router.route("/:id")
	.get(requireAuth, async (req, res) => {
		try {
			const id = checkId(req.params.id);
			const group = await groupsData.getGroupByID(id);
			return res.render("groups/group", {
				group_name: group.groupName,
				group_description: group.groupDescription
			});
		} catch (e) {
			return res.status(404).render("error", {
				error: "Group Not Found"
			});
		}
	});


// Expense routes
router.route("/:id/expense/new")
	.get(requireAuth, async (req, res) => {
		return res.render("groups/createExpense");
	})
	.post(requireAuth, async (req, res) => {
		try {
			let group = req.params.id;
			let { name, cost, deadline, payee, payers } = req.body;
			return (await expensesData.createExpense(
				group, name, cost, deadline, payee, payers
			))
		} catch (e) {
			return res.status(500);
		}
	})
	.delete(requireAuth, async (req, res) => {
		try {

		} catch (e) {
			
		}
	})

export default router;
