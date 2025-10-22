import { users as usersCollection } from "../config/mongoCollections.js";
import bcrypt from "bcryptjs";
import { checkString } from "../helpers.js";

const SALT_ROUNDS = 10;

/**
 * Validates a name (firstName or lastName)
 */
const validateName = (name, fieldName) => {
	name = checkString(name, fieldName, "validateName");
	if (!/^[a-zA-Z]+$/.test(name)) {
		throw `${fieldName} must contain only letters.`;
	}
	if (name.length < 2 || name.length > 20) {
		throw `${fieldName} must be 2-20 characters.`;
	}
	return name;
};

/**
 * Validates a userId
 */
const validateUserId = (userId) => {
	userId = checkString(userId, "userId", "validateUserId");
	userId = userId.toLowerCase();
	if (!/^[a-zA-Z0-9]+$/.test(userId)) {
		throw "userId can only contain letters and numbers.";
	}
	if (userId.length < 5 || userId.length > 10) {
		console.log(userId);
		throw "userId must be 5-10 characters.";
	}
	return userId;
};

/**
 * Validates a password
 */
const validatePassword = (password) => {
	if (typeof password !== "string") {
		throw "Password must be a string.";
	}
	if (password.length < 8) {
		throw "Password must be at least 8 characters.";
	}
	if (!/[A-Z]/.test(password)) {
		throw "Password needs an uppercase letter.";
	}
	if (!/[0-9]/.test(password)) {
		throw "Password needs a number.";
	}
	if (!/[^\w\s]/.test(password)) {
		throw "Password needs a special character.";
	}
	return password;
};

/**
 * Authenticates a user by userId and password
 * Returns the user object (without password hash) if successful
 * Throws an error if authentication fails
 */
const authenticateUser = async (userId, password) => {
	userId = validateUserId(userId);
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
};

/**
 * Gets a user by userId (without password hash)
 */
const getUserByUserId = async (userId) => {
	userId = validateUserId(userId);

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
};

const getAllUsers = async () => {
	const users = await usersCollection();
	return (await users.find({}).toArray());
}

export { authenticateUser, getUserByUserId, getAllUsers };
