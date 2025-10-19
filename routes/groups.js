import express from "express";
import {groups} from '../config/mongoCollections.js';
import  groupsData  from "../data/groups.js";
const router = express.Router();

// GET route - display the "create group" form
router.route("/new").get(async (req, res) => {
  try {
    res.render("groups/createGroup", { title: "Create a Group" });
  } catch (e) {
    res.status(500).render("error", { error: e });
  }
});

// POST route - handle form submission
router.route("/new").post(async (req, res) => {
  try {
    let { groupName, groupDescription } = req.body;

    if (!groupName || !groupDescription) {
      return res.status(400).render("groups/createGroup", {
        title: "Create a Group",
        error: "Both group name and description are required.",
      });
    }

    const newGroup = await groupsData.createGroup(groupName, groupDescription);

    // redirect or show confirmation page
    res.render("groups/groupCreated", {
      title: "Group Created",
      group: newGroup,
      success: "Group created successfully!",
    });
  } catch (e) {
    res.status(400).render("groups/createGroup", {
      title: "Create a Group",
      error: e.toString(),
    });
  }
});

export default router;
