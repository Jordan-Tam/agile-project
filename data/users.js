import {ObjectId} from "mongodb";
import { users as usersCollection } from "../config/mongoCollections.js";
import bcrypt from "bcryptjs";
import {
	checkId,
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

	async getUserById(id) {
		id = checkId(id);

		const users = await usersCollection();

		const user = await users.findOne({ _id: new ObjectId(id) });

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

	/**
	 * Gets a user by userId (without password hash)
	 */
	async getUserByUserId(userId) {
		userId = checkUserId(userId, "getUserByUserId");

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
	},

	async changeFirstName(id, oldFirstName, newFirstName) {

	},

	async changeLastName(id, oldLastName, newLastName) {

	},

	async changeUserId(id, oldUserId, newUserId) {
		
		// Basic input validation.
		id = checkId(id);
		oldUserId = checkUserId(oldUserId); // this is not necessary
		newUserId = checkUserId(newUserId);

		// If the old User ID and the new User ID are the same, don't bother updating the database and return immediately.
		if (oldUserId === newUserId) {
			return {
				message: "You didn't change anything."
			};
		}

		// Make sure this new User ID isn't already taken.
		let users = await this.getAllUsers();
		for (let user of users) {
			if (user.userId.toLowerCase() === newUserId.toLowerCase()) {
				throw "Username already taken.";
			}
		}

		// Update user ID of the user.
		const updatedUser = {
			userId: newUserId
		};
		const usersCol = await usersCollection();
		const updateInfo = await usersCol.findOneAndUpdate(
			{_id: new ObjectId(id)},
			{$set: updatedUser},
			{returnDocument: 'after'}
		);
		if (!updateInfo) {
			throw "User ID could not be changed.";
		}

		updateInfo._id = updateInfo._id.toString();

		return updateInfo;

	},

	async changePassword(id, newPassword) {

		// Basic input validation.
		id = checkId(id);
		newPassword = checkPassword(newPassword);

		// Hash the password.
		const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

		// Update the password of the user.
		const updatedUser = {
			passwordHash
		};
		const usersCol = await usersCollection();
		const updateInfo = await usersCol.findOneAndUpdate(
			{_id: new ObjectId(id)},
			{$set: updatedUser},
			{returnDocument: 'after'}
		);
		if (!updateInfo) {
			throw "Password could not be changed.";
		}

		updateInfo._id = updateInfo._id.toString();

		return updateInfo;

	}

}

export default exportedMethods;