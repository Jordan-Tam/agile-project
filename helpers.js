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

const checkId = (id, varName, funcName) => {
    if (!id) {
        throw `${varName} ID is required.`;
    }
    if (typeof id !== 'string') {
        throw `${varName} ID must be a string.`;
    }
    id = id.trim();
    if (id.length === 0) {
        throw `${varName} ID cannot be an empty string or just spaces.`;
    }
    if (!ObjectId.isValid(id)) {
        throw `${varName} ID is not a valid ID.`;
    }
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

const checkDate = (date, variableName, functionName, allow_future = true) => {

    // Basic string validation.
    date = checkString(date, variableName, functionName);

    // Split the date by the forward slash.
    let dateList = date.split(`/`);
  
    // If the list doesn't contain exactly 3 elements, the format is incorrect.
    if (dateList.length !== 3) {
        throw `${variableName} must be of the form MM/DD/YYYY`;
    }

    // If the month string isn't of length 2, the format is incorrect.
    if (dateList[0].length !== 2) {
        throw `${variableName} must be of the form MM/DD/YYYY`;
    }

    // If the day string isn't of length 2, the format is incorrect.
    if (dateList[1].length !== 2) {
        throw `${variableName} must be of the form MM/DD/YYYY`;
    }

    // If the year string isn't of length 4, the format is incorrect.
    if (dateList[2].length !== 4) {
        throw `${variableName} must be of the form MM/DD/YYYY`;
    }
  
    // For each string element (month, day, year)...
    for (let i = 0; i < dateList.length; i++) {

        // ...make sure there aren't any whitespaces.
        if (dateList[i].length !== dateList[i].trim().length) {
            throw `${variableName} must be of the form MM/DD/YYYY`;
        }

        // ...make sure every character is a number.
        for (let num of dateList[i]) {
            if (`0123456789`.indexOf(num) < 0) {
                throw `${variableName} must be of the form MM/DD/YYYY`;
            }
        }

        // Now convert the string into a number...
        dateList[i] = Number(dateList[i]);

        // ...and make sure the conversion was successful.
        if (Number.isNaN(dateList[i])) {
            throw `${variableName} must be of the form MM/DD/YYYY`;
        }

        // ...and make sure the converted number is positive and not a decimal.
        if (dateList[i] % 1 !== 0 || dateList[i] < 1) {
            throw `${variableName} must be of the form MM/DD/YYYY`;
        }

    }

    switch (dateList[0]) {

        // If the month is January, March, May, July, August, October, or December...
        case 1: case 3: case 5: case 7: case 8: case 10: case 12:

            // ...make sure the day is between 1 and 31...
            if (dateList[1] >= 1 && dateList[1] <= 31) {

                // ...and make sure the year is between 1900 and today.
                if (!allow_future) {
                    if (dateList[2] >= 1900 && new Date(date) <= new Date()) {
                        break;
                    }
                } else {
                    break;
                }
            }
            throw `${variableName} is an invalid date.`;

        // If the month is April, June, September, or November...
        case 4: case 6: case 9: case 11:

            // ...make sure the day is between 1 and 30...
            if (dateList[1] >= 1 && dateList[1] <= 30) {

                // ...and make sure the year is between 1900 and today.
                if (!allow_future) {
                    if (dateList[2] >= 1900 && new Date(date) <= new Date()) {
                        break;
                    }
                } else {
                    break;
                }
            }
            throw `${variableName} is an invalid date.`;

        // If the month is February...
        case 2:

            // ...make sure the day is between 1 and 29...
            if (dateList[1] >= 1 && dateList[1] <= 29) {

                // ...and make sure the year is between 1900 and today.
                if (!allow_future) {
                    if (dateList[2] >= 1900 && new Date(date) <= new Date()) {

                        // If the day is 29, check if it's a leap year.
                        if (dateList[1] === 29) {
                            if (
                                (dateList[2] % 4 === 0)
                                &&
                                (
                                    (dateList[2] % 100 === 0 && dateList[2] % 400 === 0)
                                    ||
                                    (dateList[2] % 100 !== 0)
                                )
                            ) {
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                } else {
                    // If the day is 29, check if it's a leap year.
                    if (dateList[1] === 29) {
                        if (
                            (dateList[2] % 4 === 0)
                            &&
                            (
                                (dateList[2] % 100 === 0 && dateList[2] % 400 === 0)
                                ||
                                (dateList[2] % 100 !== 0)
                            )
                        ) {
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
            throw `${variableName} is an invalid date.`;
      
        default:
            throw `${variableName} is an invalid date.`;
    }
  
    // If the year is two years in the future...
    if (dateList[2] === new Date().getFullYear() + 2) {

        // ...make sure the month is not greater than the current month...
        if (dateList[0] > new Date().getMonth() + 1) {
            throw `${variableName} is an invalid date.`;
        }
        
        // ...and if the month is the same as the current month...
        else if (dateList[0] === new Date().getMonth() + 1) {

            // ...make sure the day is not greater than the current day.
            if (dateList[1] > new Date().getDate()) {
                throw {
                    function: functionName,
                    error: `${variableName} is an invalid date.`
                };
            }
        }

        // If the month is less than the current month, it is guaranteed to be a valid date.

    }

    return date;

};

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