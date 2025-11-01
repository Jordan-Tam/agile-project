import { Router } from "express";
import xss from "xss";

import { users as usersCollectionFn } from "../config/mongoCollections.js";
import usersData from "../data/users.js";
import { redirectIfLoggedIn } from "../middleware.js";
import {
	checkName,
	checkUserId,
	checkPassword
} from "../helpers.js";

const router = Router();

/* routes */
router.get("/", redirectIfLoggedIn, (req, res) => {
	res.status(200).render("register", { title: "Create your account" });
});

router.post("/", async (req, res) => {
	try {
		
		const firstName = checkName(xss(req.body.firstName), "First name", "POST /register");
		const lastName = checkName(xss(req.body.lastName), "Last name", "POST /register");
		const userId = checkUserId(xss(req.body.userId), "POST /register");
		const password = checkPassword(xss(req.body.password), "POST /register");
		const confirmPassword = checkPassword(xss(req.body.confirmPassword), "POST /register");
		if (password !== confirmPassword) {
			throw "Passwords do not match.";
		}

		await usersData.createUser(firstName, lastName, userId, password);

		const nowISO = new Date().toISOString();
		req.session.user = {
			firstName,
			lastName,
			userId,
			signupDate: nowISO,
			lastLogin: new Date().toLocaleString()
		};

		return res.status(201).render("register-success", {
			title: "Account created",
			userId
		});
		
	} catch (err) {
		console.log(err);
		return res.status(400).render("register", {
			title: "Create your account",
			error: typeof err === "string" ? err : "Unable to register user.",
			form: {
				firstName: req.body?.firstName ?? "",
				lastName: req.body?.lastName ?? "",
				userId: req.body?.userId ?? ""
			}
		});
	}
});

export default router;