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
}