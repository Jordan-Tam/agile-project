import { Router } from "express";
import xss from "xss";
import bcrypt from "bcryptjs";

import { users as usersCollectionFn } from "../config/mongoCollections.js";
import usersData from "../data/users.js";
import { redirectIfLoggedIn } from "../middleware.js";
import {
	checkName,
	checkUserId,
	checkPassword
} from "../helpers.js";

const router = Router();
const SALT_ROUNDS = 10;

/* validation helpers */
/* function validateName(value, label) {
	if (typeof value !== "string") throw `${label} must be a string.`;
	const s = value.trim();
	if (!s) throw `${label} cannot be empty.`;
	if (!/^[a-zA-Z]+$/.test(s)) throw `${label} must contain only letters.`;
	if (s.length < 2 || s.length > 20) throw `${label} must be 2–20 characters.`;
	return s;
}
function validateUserId(value) {
	if (typeof value !== "string") throw "userId must be a string.";
	const s = value.trim();
	if (!s) throw "userId cannot be empty.";
	if (!/^[a-zA-Z0-9]+$/.test(s))
		throw "userId can only contain letters and numbers.";
	if (s.length < 5 || s.length > 10) throw "userId must be 5–10 characters.";
	return s.toLowerCase();
}
function validatePassword(pass, confirm) {
	if (typeof pass !== "string") throw "Password must be a string.";
	if (pass.length < 8) throw "Password must be at least 8 characters.";
	if (!/[A-Z]/.test(pass)) throw "Password needs an uppercase letter.";
	if (!/[0-9]/.test(pass)) throw "Password needs a number.";
	if (!/[^\w\s]/.test(pass)) throw "Password needs a special character.";
	if (pass !== confirm) throw "Passwords do not match.";
	return pass;
}
function validateRole(value) {
	const r = (value || "").toString().trim().toLowerCase();
	return ["user", "superuser"].includes(r) ? r : "user"; // default to user
} */

/* routes */
router.get("/", redirectIfLoggedIn, (req, res) => {
	res.status(200).render("register", { title: "Create your account" });
});

router.post("/", async (req, res) => {
	try {

		/* OLD
		const firstName = validateName(xss(req.body.firstName), "First name");
		const lastName = validateName(xss(req.body.lastName), "Last name");
		const userId = validateUserId(xss(req.body.userId));
		const password = validatePassword(
			xss(req.body.password),
			xss(req.body.confirmPassword)
		);
		const role = validateRole(xss(req.body.role));
		*/

		// NEW
		const firstName = checkName(xss(req.body.firstName), "First name", "POST /register");
		const lastName = checkName(xss(req.body.lastName), "Last name", "POST /register");
		const userId = checkUserId(xss(req.body.userId), "POST /register");
		const password = checkPassword(xss(req.body.password), "POST /register");
		const confirmPassword = checkPassword(xss(req.body.confirmPassword), "POST /register");
		if (password !== confirmPassword) {
			throw "Passwords do not match.";
		}

		/* OLD
		const users = await usersCollectionFn();
		await users.createIndex({ userId: 1 }, { unique: true });

		const exists = await users.findOne({ userId });
		if (exists) throw "userId already taken.";

		const passwordHash = await bcrypt.hash(password, SALT_ROUNDS); // ← use 10 rounds

		const nowISO = new Date().toISOString();
		const doc = {
			firstName,
			lastName,
			userId,
			passwordHash,
			role,
			signupDate: nowISO,
			lastLogin: nowISO
		};

		const insert = await users.insertOne(doc);
		if (!insert.acknowledged) throw "Unable to register user."; */

		// NEW
		await usersData.createUser(firstName, lastName, userId, password);

		req.session.user = {
			firstName,
			lastName,
			userId,
			role,
			signupDate: nowISO,
			lastLogin: new Date().toLocaleString()
		};

		return res.status(201).render("register-success", {
			title: "Account created",
			userId
		});
	} catch (err) {
		return res.status(400).render("register", {
			title: "Create your account",
			error: typeof err === "string" ? err : "Unable to register user.",
			form: {
				firstName: req.body?.firstName ?? "",
				lastName: req.body?.lastName ?? "",
				userId: req.body?.userId ?? "",
				role: req.body?.role ?? "user"
			}
		});
	}
});

export default router;