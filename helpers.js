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

export {
    checkString, checkId
};
