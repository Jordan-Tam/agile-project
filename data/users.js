import { users as usersCollection } from "../config/mongoCollections.js";
import bcrypt from "bcryptjs";
import {
	checkName,
	checkUserId,
	checkPassword
} from "../helpers.js";

const SALT_ROUNDS = 10;

const exportedMethods = {

	async createUser(
		firstName,
		lastName,
		userId,
		password,
	) {
		// Input validation.
		try {
			firstName = checkName(firstName, "First Name", "createUser");
			lastName = checkName(lastName, "Last Name", "createUser");
			userId = checkUserId(userId, "createUser");
			password = checkPassword(password, "createUser");
			
			const users = await usersCollection();
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
				signupDate: nowISO,
				lastLogin: nowISO
			};

			const insert = await users.insertOne(doc);
			if (!insert.acknowledged) throw "Unable to register user.";

			return (await this.getUserByUserId(userId));

		} catch (e) {
			throw e;
		}
	},

	/**
	 * Authenticates a user by userId and password
	 * Returns the user object (without password hash) if successful
	 * Throws an error if authentication fails
	 */
	async authenticateUser(userId, password) {
		userId = checkUserId(userId, "authenticateUser");
		if (
			typeof password !== "string" ||
			!password ||
			password.trim().length === 0
		) {
			throw "Password cannot be empty.";
		}

		const usersCol = await usersCollection();
		const user = await usersCol.findOne({ userId });

		if (!user) {
			throw "Invalid userId or password.";
		}

		const isMatch = await bcrypt.compare(password, user.passwordHash);
		if (!isMatch) {
			throw "Invalid userId or password.";
		}

		// Update last login
		const nowISO = new Date().toISOString();
		await usersCol.updateOne({ userId }, { $set: { lastLogin: nowISO } });

		// Return user without password hash
		return {
			_id: user._id.toString(),
			firstName: user.firstName,
			lastName: user.lastName,
			userId: user.userId,
			role: user.role,
			signupDate: user.signupDate,
			lastLogin: nowISO
		};
	},

	/**
	 * Gets a user by userId (without password hash)
	 */
	async getUserByUserId(userId) {
		userId = checkUserId(userId, "authenticateUser");

		const usersCol = await usersCollection();
		const user = await usersCol.findOne({ userId });

		if (!user) {
			throw "User not found.";
		}

		return {
			_id: user._id.toString(),
			firstName: user.firstName,
			lastName: user.lastName,
			userId: user.userId,
			role: user.role,
			signupDate: user.signupDate,
			lastLogin: user.lastLogin
		};
	},

	async getAllUsers() {
		const users = await usersCollection();
		return (await users.find({}).toArray());
	}

}

export default exportedMethods;