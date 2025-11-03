import { Router } from "express";
import xss from "xss";
import { users as usersCollectionFn } from "../config/mongoCollections.js";
import bcrypt from "bcryptjs";
import { redirectIfLoggedIn } from "../middleware.js";
import usersData from "../data/users.js";
import {
	checkName,
	checkUserId,
	checkPassword
} from "../helpers.js";

const router = Router();

/* routes */
router.get("/", redirectIfLoggedIn, (req, res) => {
	res.status(200).render("login", { title: "Login" });
});

router.post("/", async (req, res) => {
	try {
		
		const userId = checkUserId(xss(req.body.userId), "User", "POST /register");
		const password = checkPassword(xss(req.body.password), "POST /register");

		const users = await usersCollectionFn();
		const user = await users.findOne({ userId });

		if (!user) {
			throw "Invalid userId or password.";
		}

		// Compare password with stored hash
		const isMatch = await bcrypt.compare(password, user.passwordHash);
		if (!isMatch) {
			throw "Invalid userId or password.";
		}

		// Update last login time
		const nowISO = new Date().toISOString();
		await users.updateOne({ userId }, { $set: { lastLogin: nowISO } });

		// Set session
		req.session.user = {
			firstName: user.firstName,
			lastName: user.lastName,
			userId: user.userId,
			signupDate: user.signupDate,
			lastLogin: new Date().toLocaleString()
		};

		// Redirect to groups page or home
		return res.redirect("/groups");
	} catch (err) {
		return res.status(400).render("login", {
			title: "Login",
			error: typeof err === "string" ? err : "Unable to login.",
			form: {
				userId: req.body?.userId ?? ""
			}
		});
	}
});

export default router;