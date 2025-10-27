import {ObjectId} from 'mongodb';

const UPPERCASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";

const checkString = (str, varName, funcName) => {

    // Check if "str" is undefined or null.
    if (str === undefined || str === null) {
        throw `${varName} is required.`;
    }

    // Check if "str" is of type string.
    if (typeof str !== "string") {
        throw `${varName} must be a string.`;
    }

    str = str.trim();
    
    // Check if the string is composed of only spaces.
    if (str.length === 0) {
        throw `${varName} cannot be empty.`;
    }
    
    return str;
}

const checkId = (id) => {
    if (!id) throw 'Error: You must provide an id to search for';
    if (typeof id !== 'string') throw 'Error: id must be a string';
    id = id.trim();
    if (id.length === 0)
      throw 'Error: id cannot be an empty string or just spaces';
    if (!ObjectId.isValid(id)) throw 'Error: invalid object ID';
    return id;
  }

const checkNumber = (num, varName, funcName) => {
    if (num === undefined || num === null) {
        throw `${varName} is required.`;
    }
    if (typeof num !== "number") {
        throw `${varName} must be a number.`;
    }
    return num;
};

const checkDate = (date, varName, funcName) => {
    if (date === undefined || date === null) {
        throw `${varName} is required.`;
    }
    if (!(date instanceof Date)) {
        throw `${varName} must be a date.`
    }
    return date;
}

const checkName = (name, varName, funcName) => {

    name = checkString(name, varName, funcName);

	if (!/^[a-zA-Z]+$/.test(name)) {
		throw `${fieldName} must contain only letters.`;
	}

	if (name.length < 2 || name.length > 20) {
		throw `${fieldName} must be 2-20 characters.`;
	}

	return name;

}

const checkUserId = (userId, funcName) => {

	userId = checkString(userId, "User ID", funcName);

	userId = userId.toLowerCase();

	if (!/^[a-zA-Z0-9]+$/.test(userId)) {
		throw "userId can only contain letters and numbers.";
	}

	if (userId.length < 5 || userId.length > 10) {
		console.log(userId);
		throw "userId must be 5-10 characters.";
	}

	return userId.toLowerCase();

}

const checkPassword = (password, funcName) => {

	password = checkString(password, "Password", funcName);

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

}

const checkCost = (cost, funcName) => {

    // Basic number validation.
    cost = checkNumber(cost, "Cost", funcName);

    // Cost can have up to 2 decimal places.
    if (!(/^\d+(\.\d{1,2})?$/.test(String(cost)))) {
        throw "Cost should be a number with up to 2 decimal places.";
    }

    return cost;

};

export {
    checkString,
    checkId,
    checkNumber,
    checkDate,
    checkName,
    checkUserId,
    checkPassword,
    checkCost
};