import {dbConnection, closeConnection} from "../config/mongoConnection.js";
import usersData from "../data/users.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
import changeLogsData from "../data/changeLogs.js";

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

    //! LOG GROUP CREATION (after all members are added)
    try {
        // Log Roommates Group creation
        await changeLogsData.addChangeLogToAllMembers(
            "group_created",
            "group",
            ROOMMATES._id,
            ROOMMATES.groupName,
            null, // expenseId
            null, // expenseName
            {
                userId: JOHN_DOE._id,
                userName: `${JOHN_DOE.firstName} ${JOHN_DOE.lastName}`
            },
            {
                groupName: ROOMMATES.groupName,
                groupDescription: ROOMMATES.groupDescription
            }
        );

        // Log Video Game Club creation
        await changeLogsData.addChangeLogToAllMembers(
            "group_created",
            "group",
            VIDEO_GAME_CLUB._id,
            VIDEO_GAME_CLUB.groupName,
            null, // expenseId
            null, // expenseName
            {
                userId: JOHN_DOE._id,
                userName: `${JOHN_DOE.firstName} ${JOHN_DOE.lastName}`
            },
            {
                groupName: VIDEO_GAME_CLUB.groupName,
                groupDescription: VIDEO_GAME_CLUB.groupDescription
            }
        );

        // Log member additions for Roommates Group
        // Get the group to see current members
        const roommatesGroup = await groupsData.getGroupByID(ROOMMATES._id);
        
        // Log John Doe addition (first member, but we'll log as if system added all)
        await changeLogsData.addChangeLogToAllMembers(
            "member_added",
            "group",
            ROOMMATES._id,
            ROOMMATES.groupName,
            null, // expenseId
            null, // expenseName
            {
                userId: JOHN_DOE._id,
                userName: `${JOHN_DOE.firstName} ${JOHN_DOE.lastName}`
            },
            {
                addedMember: `${JOHN_DOE.firstName} ${JOHN_DOE.lastName}`,
                addedMemberId: JOHN_DOE._id
            }
        );

        // Log Jane Smith addition
        await changeLogsData.addChangeLogToAllMembers(
            "member_added",
            "group",
            ROOMMATES._id,
            ROOMMATES.groupName,
            null, // expenseId
            null, // expenseName
            {
                userId: JOHN_DOE._id,
                userName: `${JOHN_DOE.firstName} ${JOHN_DOE.lastName}`
            },
            {
                addedMember: `${JANE_SMITH.firstName} ${JANE_SMITH.lastName}`,
                addedMemberId: JANE_SMITH._id
            }
        );

        // Log Doug The Dog addition
        await changeLogsData.addChangeLogToAllMembers(
            "member_added",
            "group",
            ROOMMATES._id,
            ROOMMATES.groupName,
            null, // expenseId
            null, // expenseName
            {
                userId: JOHN_DOE._id,
                userName: `${JOHN_DOE.firstName} ${JOHN_DOE.lastName}`
            },
            {
                addedMember: `${DOUG_THE_DOG.firstName} ${DOUG_THE_DOG.lastName}`,
                addedMemberId: DOUG_THE_DOG._id
            }
        );

        // Log Doris Vanderbilt addition
        await changeLogsData.addChangeLogToAllMembers(
            "member_added",
            "group",
            ROOMMATES._id,
            ROOMMATES.groupName,
            null, // expenseId
            null, // expenseName
            {
                userId: JOHN_DOE._id,
                userName: `${JOHN_DOE.firstName} ${JOHN_DOE.lastName}`
            },
            {
                addedMember: `${DORIS_VANDERBILT.firstName} ${DORIS_VANDERBILT.lastName}`,
                addedMemberId: DORIS_VANDERBILT._id
            }
        );

        // Log John Doe addition to Video Game Club
        await changeLogsData.addChangeLogToAllMembers(
            "member_added",
            "group",
            VIDEO_GAME_CLUB._id,
            VIDEO_GAME_CLUB.groupName,
            null, // expenseId
            null, // expenseName
            {
                userId: JOHN_DOE._id,
                userName: `${JOHN_DOE.firstName} ${JOHN_DOE.lastName}`
            },
            {
                addedMember: `${JOHN_DOE.firstName} ${JOHN_DOE.lastName}`,
                addedMemberId: JOHN_DOE._id
            }
        );
    } catch (logError) {
        console.error("Error logging group creation and member additions:", logError);
    }

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

    //! LOG EXPENSE CREATION
    try {
        // Get group info for logging
        const roommatesGroupForLog = await groupsData.getGroupByID(ROOMMATES._id);
        
        // Get payee and payer info for expense 1
        const payee1 = await usersData.getUserById(DORIS_VANDERBILT._id);
        const payer1Names = [];
        for (const payerId of [JOHN_DOE._id, JANE_SMITH._id]) {
            const payer = await usersData.getUserById(payerId);
            payer1Names.push(`${payer.firstName} ${payer.lastName}`);
        }

        // Log expense 1 creation
        await changeLogsData.addChangeLogToAllMembers(
            "expense_created",
            "expense",
            ROOMMATES._id,
            ROOMMATES.groupName,
            ROOMMATES_EXPENSE_1._id,
            ROOMMATES_EXPENSE_1.expenseName,
            {
                userId: DORIS_VANDERBILT._id,
                userName: `${payee1.firstName} ${payee1.lastName}`
            },
            {
                expenseName: ROOMMATES_EXPENSE_1.expenseName,
                cost: ROOMMATES_EXPENSE_1.cost,
                deadline: ROOMMATES_EXPENSE_1.deadline,
                payee: `${payee1.firstName} ${payee1.lastName}`,
                payers: payer1Names.join(", ")
            }
        );

        // Get payer info for expense 2
        const payer2Names = [];
        for (const payerId of [JOHN_DOE._id, JANE_SMITH._id, DOUG_THE_DOG._id]) {
            const payer = await usersData.getUserById(payerId);
            payer2Names.push(`${payer.firstName} ${payer.lastName}`);
        }

        // Log expense 2 creation
        await changeLogsData.addChangeLogToAllMembers(
            "expense_created",
            "expense",
            ROOMMATES._id,
            ROOMMATES.groupName,
            ROOMMATES_EXPENSE_2._id,
            ROOMMATES_EXPENSE_2.expenseName,
            {
                userId: DORIS_VANDERBILT._id,
                userName: `${payee1.firstName} ${payee1.lastName}`
            },
            {
                expenseName: ROOMMATES_EXPENSE_2.expenseName,
                cost: ROOMMATES_EXPENSE_2.cost,
                deadline: ROOMMATES_EXPENSE_2.deadline,
                payee: `${payee1.firstName} ${payee1.lastName}`,
                payers: payer2Names.join(", ")
            }
        );
    } catch (logError) {
        console.error("Error logging expense creation:", logError);
    }

    console.log("Done seeding database.");

    await closeConnection();
    }catch(e){
        console.log(e);
    }
    

}

seed();