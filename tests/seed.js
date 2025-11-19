import {dbConnection, closeConnection} from "../config/mongoConnection.js";
import usersData from "../data/users.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";

export async function seed() {
    try{
        const db = await dbConnection();
    await db.dropDatabase();

    //! CREATE USERS
    let JOHN_DOE = await usersData.createUser(
        "John", "Doe", "johndoe", "Password!1"
    );

    let JANE_SMITH = await usersData.createUser(
        "Jane", "Smith", "janesmith", "Password!2"
    );

    let DOUG_THE_DOG = await usersData.createUser(
        "Doug", "Dog", "dougTheDog", "Password!3"
    );

    let DORIS_VANDERBILT = await usersData.createUser(
        "Doris", "Vanderbilt", "doris1970", "Password!4"
    );

    //! CREATE GROUPS
    let ROOMMATES = await groupsData.createGroup(
        "Roommates Group",
        "For coordinates expenses on groceries and apartment repairs."
    );

    let VIDEO_GAME_CLUB = await groupsData.createGroup(
        "Video Game Club",
        "Expense group for eboard members of the Generic University's official video game club."
    );

    //! ADD USERS TO GROUPS
    await groupsData.addMember(
        ROOMMATES._id,
        JOHN_DOE.userId
    );

    await groupsData.addMember(
        VIDEO_GAME_CLUB._id,
        JOHN_DOE.userId
    );

    await groupsData.addMember(
        ROOMMATES._id,
        JANE_SMITH.userId
    );

    await groupsData.addMember(
        ROOMMATES._id,
        DOUG_THE_DOG.userId
    );

    await groupsData.addMember(
        ROOMMATES._id,
        DORIS_VANDERBILT.userId
    );

    //! CREATE EXPENSES
    let ROOMMATES_EXPENSE_1 = await expensesData.createExpense(
        ROOMMATES._id,
        "11/18 Shopping Spree",
        135.99,
        "12/25/2025",
        DORIS_VANDERBILT._id,
        [JOHN_DOE._id, JANE_SMITH._id]
    );

    let ROOMMATES_EXPENSE_2 = await expensesData.createExpense(
        ROOMMATES._id,
        "Pizza party",
        19,
        "01/02/2026",
        DORIS_VANDERBILT._id,
        [JOHN_DOE._id, JANE_SMITH._id, DOUG_THE_DOG._id]
    );

    console.log("Done seeding database.");

    await closeConnection();
    }catch(e){
        console.log(e);
    }
    

}

seed();