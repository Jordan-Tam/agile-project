import {ObjectId} from 'mongodb';

const UPPERCASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";

const checkString = (str, varName, funcName) => {
    if (str === undefined || str === null) {
        throw `${varName} is required.`;
    }
    if (typeof str !== "string") {
        throw `${varName} must be a string.`;
    }
    str = str.trim();
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
    checkCost
};