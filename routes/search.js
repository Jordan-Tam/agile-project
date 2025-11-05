import express from "express";
import expensesData from "../data/expenses.js";
import groupsData from "../data/groups.js";
import { requireAuth } from "../middleware.js";

const router = express.Router();

// GET route - display search expenses page
router.get("/", requireAuth, async (req, res) => {
	try {
		const userId = req.session.user._id;
		
		// Get all expenses the user owes (default view)
		const allExpenses = await expensesData.getAllExpensesForUser(userId);
		
		// Get all groups for the filter dropdown
		const userGroups = await groupsData.getGroupsForUser(userId);

		res.render("search", {
			title: "Search Expenses",
			expenses: allExpenses,
			groups: userGroups,
			hasExpenses: allExpenses.length > 0,
			searchTerm: "",
			filterType: "",
			selectedGroupId: ""
		});
	} catch (e) {
		res.status(500).render("error", { error: e.toString() });
	}
});

// POST route - handle search and filter
router.post("/", requireAuth, async (req, res) => {
	try {
		const userId = req.session.user._id;
		const { searchTerm, filterType, groupId } = req.body;

		// Get filtered expenses
		const expenses = await expensesData.searchExpenses(
			userId,
			searchTerm || "",
			filterType || "",
			groupId || ""
		);

		// Get all groups for the filter dropdown
		const userGroups = await groupsData.getGroupsForUser(userId);

		res.render("search", {
			title: "Search Expenses",
			expenses: expenses,
			groups: userGroups,
			hasExpenses: expenses.length > 0,
			searchTerm: searchTerm || "",
			filterType: filterType || "",
			selectedGroupId: groupId || ""
		});
	} catch (e) {
		res.status(500).render("error", { error: e.toString() });
	}
});

export default router;

