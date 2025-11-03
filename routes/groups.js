import express from "express";
import { groups } from "../config/mongoCollections.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
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
		const allGroups = await groupsData.getAllGroups();

		res.render("groups/group", {
		title: "Group Created",
		group: newGroup,
		group_name: newGroup.groupName,
		group_description: newGroup.groupDescription,
		groups: allGroups,
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
      const allGroups = await groupsData.getAllGroups();
      
      return res.render("groups/group", {
        group: group,
        group_name: group.groupName,
        group_description: group.groupDescription,
        groupMembers: group.groupMembers,
        groups: allGroups
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
		
		// Get path and request body parameters.
		let groupId = req.params.id;
		let { name, cost, deadline, payee, payers } = req.body;

		// Input validation.
		try {
			groupId = checkId(groupId, "Group", "POST /:id/expense/new");
			name = checkString(name, "Name", "POST /:id/expense/new");
			cost = checkCost(cost, "POST /:id/expense/new");
			deadline = checkDate(deadline, "Deadline", "POST /:id/expense/new");
			payee = checkId(payee.toString(), "Payee", "POST /:id/expense/new");
			for (let payer of payers) { checkId(payer.toString(), "Payer", "POST /:id/expense/new"); }
		} catch (e) {
			return res.status(400).json({error: e});
		}

		// Call data function to add the expense.
		try {
			return res.json(await expensesData.createExpense(
				groupId, name, cost, deadline, payee, payers
			));
		} catch (e) {
			return res.status(500).json({error: e});
		}
	});

router.route("/:groupId/:expenseId")

	.delete(requireAuth, async (req, res) => {

		// Get path parameters.
		let groupId = req.params.groupId;
		let expenseId = req.params.expenseId;

		// Input validation.
		try {
			groupId = checkId(groupId, "Group", "DELETE /:groupId/:expenseId");
			expenseId = checkId(expenseId, "Expense", "DELETE /:groupId/:expenseId");
		} catch (e) {
			return res.status(400).json({error: e});
		}

		// Call data function to delete expense.
		try {
			return res.json(await expensesData.deleteExpense(
				groupId, expenseId
			));
		} catch (e) {
			return res.status(500).json({error: e});
		}
	});

	router.route("/:id/addMember")

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
    let { first_name, last_name, user_id } = req.body;

    // Input validation
    try {
      groupId = checkId(groupId, "Group ID", "POST /:id/addMember");
      first_name = checkString(first_name, "First Name", "POST /:id/addMember");
      last_name = checkString(last_name, "Last Name", "POST /:id/addMember");
      user_id = checkUserId(user_id, "User ID", "POST /:id/addMember");
    } catch (e) {
      return res.status(400).render("groups/addMember", {
        title: "Add Member",
        error: e.toString()
      });
    }

    // Call data function to add the member
    try {
      const updatedGroup = await groupsData.addMember(groupId, first_name, last_name, user_id);
	  const allGroups = await groupsData.getAllGroups();
      res.render("groups/group", {
        title: "Group Updated",
        group_name: updatedGroup.groupName,
        group_description: updatedGroup.groupDescription,
        groupMembers: updatedGroup.groupMembers,
		groups: allGroups,
        success: "Member added successfully!"
      });
    } catch (e) {
      res.status(400).render("groups/addMember", {
        title: "Add Member",
        error: e.toString()
      });
    }
  });
  router.route("/")
  .get(requireAuth, async (req, res) => {
    try {
      const allGroups = await groupsData.getAllGroups(); // you can adjust this
      res.render("groups/group", {
        title: "Your Groups",
        groups: allGroups,
        user: req.session.user
      });
    } catch (e) {
      res.status(500).render("error", { error: e.toString() });
    }
  });

export default router;
