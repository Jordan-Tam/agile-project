import {Router} from "express";
import xss from "xss";
import usersData from "../data/users.js";
import groupsData from "../data/groups.js";
import {requireAuth} from "../middleware.js";
import {
    checkId,
    checkName,
    checkUserId,
    checkPassword
} from "../helpers.js";

const router = Router();

// Profile view page - shows user info and groups
router.get("/", requireAuth, async (req, res) => {
    try {
        const userId = req.session.user._id.toString();
        const userGroups = await groupsData.getGroupsForUser(userId);

        let totalOwes = 0; // total the user owes
        let totalOwedTo = 0; // total owed to the user

        for (const group of userGroups) {
            const balances = await groupsData.calculateGroupBalances(group._id);

            // Sum balance user owes others
            if (balances[userId]) {
                for (const creditorId of Object.keys(balances[userId])) {
                    totalOwes += balances[userId][creditorId];
                }
            }

            // Sum balance others owe the user
            for (const debtorId of Object.keys(balances)) {
                if (balances[debtorId][userId]) {
                    totalOwedTo += balances[debtorId][userId];
                }
            }
        }

        totalOwes = Number(totalOwes.toFixed(2));
        totalOwedTo = Number(totalOwedTo.toFixed(2));

        const success = req.query.success === 'true'
            ? 'Profile updated successfully!'
            : null;

        res.render("profileView", {
            user: req.session.user,
            userGroups: userGroups,
            totalOwes,
            totalOwedTo,
            success
        });
    } catch (e) {
        console.error("Error loading profile:", e);
        res.render("profileView", {
            user: req.session.user,
            userGroups: [],
            totalOwes: 0,
            totalOwedTo: 0
        });
    }
});

// Edit profile page - shows the forms
router.get("/edit", requireAuth, (req, res) => {
    res.render("editProfile", {
        user: req.session.user
    });
});

router.patch("/", requireAuth, async (req, res) => {

    // Get request body parameters.
    let {id, what_to_update, firstName, lastName, userId, oldPassword, newPassword, confirmPassword} = req.body;

    // Input validation for id. This should never fail.
    try {
        id = checkId(id, "User MongoDB ObjectID", "PATCH /profile");
    } catch (e) {
        return res.status(400).render("editProfile", {
            user: req.session.user,
            error: "An unexpected error has occurred."
        });
    }

    // Make sure the ID matches that of the currently logged in user.
    if (req.session.user._id.toString() !== id.toString()) {
        return res.status(403).render("editProfile", {
            user: req.session.user,
            error: "An unexpected error has occurred."
        });
    }

    if (what_to_update === "firstName") {

        // Input validation.
        try {
            firstName = checkName(firstName, "First Name");
        } catch (e) {
            return res.status(400).render("editProfile", {
                user: {
                    _id: req.session.user._id,
                    firstName: firstName, // repopulate with bad user input
                    lastName: req.session.user.lastName,
                    userId: req.session.user.userId
                },
                firstName_error: e
            });
        }

        // Update the user.
        try {
            await usersData.changeFirstName(id, req.session.user.firstName, firstName);
        } catch (e) {
            return res.status(500).render("editProfile", {
                user: {
                    _id: req.session.user._id,
                    firstName: firstName, // repopulate with bad user input
                    lastName: req.session.user.lastName,
                    userId: req.session.user.userId
                },
                lastName_error: e
            });
        }

    } else if (what_to_update === "lastName") {

        // Input validation.
        try {
            lastName = checkName(lastName, "Last Name");
        } catch (e) {
            return res.status(400).render("editProfile", {
                user: {
                    _id: req.session.user._id,
                    firstName: req.session.user.firstName,
                    lastName: lastName, // repopulate with bad user input
                    userId: req.session.user.userId
                },
                lastName_error: e
            });
        }

        // Update the user.
        try {
            await usersData.changeLastName(id, req.session.user.lastName, lastName);
        } catch (e) {
            return res.status(500).render("editProfile", {
                user: {
                    _id: req.session.user._id,
                    firstName: req.session.user.firstName,
                    lastName: lastName, // repopulate with bad user input
                    userId: req.session.user.userId
                },
                lastName_error: e
            });
        }

    } else if (what_to_update === "userId") {

        // Input validation.
        try {
            userId = checkUserId(userId);
        } catch (e) {
            return res.status(400).render("editProfile", {
                user: {
                    _id: req.session.user._id,
                    firstName: req.session.user.firstName,
                    lastName: req.session.user.lastName,
                    userId: userId // repopulate with bad user input
                },
                userId_error: e
            });
        }

        // Update the user.
        try {
            await usersData.changeUserId(id, req.session.user.userId, userId);
        } catch (e) {
            return res.status(500).render("editProfile", {
                user: {
                    _id: req.session.user._id,
                    firstName: req.session.user.firstName,
                    lastName: req.session.user.lastName,
                    userId: userId // repopulate with bad user input
                },
                userId_error: e
            });
        }

    } else {

        // Check if oldPassword matches current password.
        try {
            await usersData.authenticateUser(req.session.user.userId, oldPassword);
        } catch (e) {
            return res.status(400).render("editProfile", {
                user: req.session.user,
                password_error: "Old Password does not match your current password."
            });
        }

        // Input validation for new password.
        try {
            newPassword = checkPassword(newPassword);
        } catch (e) {
            return res.status(400).render("editProfile", {
                user: req.session.user,
                password_error: e
            });
        }

        // Make sure newPassword and confirmPassword match.
        if (newPassword !== confirmPassword) {
            return res.status(400).render("editProfile", {
                user: req.session.user,
                password_error: "New Password and Confirm Password do not match."
            });
        }

        // Update the user.
        try {
            await usersData.changePassword(id, newPassword);
        } catch (e) {
            return res.status(500).render("editProfile", {
                user: req.session.user,
                password_error: e
            });
        }

    }

    // Update req.session.user to reflect new changes.
    try {
        const user = await usersData.getUserById(id);
        req.session.user = user;
    } catch (e) {
        //console.log(e);
        return res.status(500).render("editProfile", {
            user: req.session.user,
            error: "An unexpected error has occurred."
        });
    }

    // Redirect back to profile view with success message
    return res.redirect("/profile?success=true");

});

export default router;