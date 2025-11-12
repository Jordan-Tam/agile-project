import {Router} from "express";
import xss from "xss";
import usersData from "../data/users.js";
import {requireAuth} from "../middleware.js";
import {
    checkId,
    checkUserId,
    checkPassword
} from "../helpers.js";

const router = Router();

// Move the /profile from index.js to here.
router.get("/", requireAuth, (req, res) => {
    res.render("profile", {
        user: req.session.user
    });
});

router.patch("/", requireAuth, async (req, res) => {

    // Get request body parameters.
    let {id, what_to_update, firstName, lastName, userId, oldPassword, newPassword, confirmPassword} = req.body;

    // Input validation for id. This should never fail.
    try {
        id = checkId(id);
    } catch (e) {
        return res.status(400).render("profile", {
            user: req.session.user,
            error: "An unexpected error has occurred."
        });
    }

    // Make sure the ID matches that of the currently logged in user.
    if (req.session.user._id.toString() !== id.toString()) {
        return res.status(403).render("profile", {
            user: req.session.user,
            error: "An unexpected error has occurred."
        });
    }

    if (what_to_update === "firstName") {

        //TODO:

        // Input validation.

        // Update the user.

    } else if (what_to_update === "lastName") {

        //TODO:

        // Input validation.

        // Update the user.
    
    } else if (what_to_update === "userId") {

        // Input validation.
        try {
            userId = checkUserId(userId);
        } catch (e) {
            return res.status(400).render("profile", {
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
            return res.status(500).render("profile", {
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
            return res.status(400).render("profile", {
                user: req.session.user,
                password_error: "Old Password does not match your current password."
            });
        }

        // Input validation for new password.
        try {
            newPassword = checkPassword(newPassword);
        } catch (e) {
            return res.status(400).render("profile", {
                user: req.session.user,
                password_error: e
            });
        }

        // Make sure newPassword and confirmPassword match.
        if (newPassword !== confirmPassword) {
            return res.status(400).render("profile", {
                user: req.session.user,
                password_error: "New Password and Confirm Password do not match."
            });
        }

        // Update the user.
        try {
            await usersData.changePassword(id, newPassword);
        } catch (e) {
            return res.status(500).render("profile", {
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
        console.log(e);
        return res.status(500).render("profile", {
            user: req.session.user,
            error: "An unexpected error has occurred."
        });
    }

    return res.render("profile", {
        user: req.session.user
    });

});

export default router;