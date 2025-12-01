// Import testing framework.
import { assert } from "chai";

// Import database connections.
import { users } from "../config/mongoCollections.js";

// Import data functions.
import usersData from "../data/users.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
export async function runPinTests() {
    // ======================= TESTS FOR PIN/UNPIN GROUP =======================
    console.log("\n=== Testing pinGroup and unpinGroup ===");

    // 1️⃣ Create sample users specifically for pin/unpin testing
    const pinTestUser1 = await usersData.createUser(
        "Alice",
        "Anderson",
        "alicepin",
        "Password!123"
    );

    const pinTestUser2 = await usersData.createUser(
        "Bob",
        "Baker",
        "bobpin",
        "Password!123"
    );

    // 2️⃣ Create group with pinTestUser1 as creator
    const pinTestGroup = await groupsData.createGroup(
        "Pin Test Group",
        "Group used for pin/unpin tests",
        pinTestUser1._id.toString()
    );

    // 3️⃣ Add member explicitly (since some implementations don't auto-add creator)
    await groupsData.addMember(pinTestGroup._id.toString(), pinTestUser1.userId.toString());
    await groupsData.addMember(pinTestGroup._id.toString(), pinTestUser2.userId.toString());

    // ---------- PIN TESTS ----------

    try {
        await usersData.pinGroup();
    } catch (e) {
        assert.strictEqual(e, "User ID ID is required.");
    }

    try {
        await usersData.pinGroup("notAnObjectId", pinTestGroup._id.toString());
    } catch (e) {
        assert.strictEqual(e, "User ID ID is not a valid ID.");
    }

    try {
        await usersData.pinGroup(pinTestUser1._id.toString(), "notAnObjectId");
    } catch (e) {
        assert.strictEqual(e, "Group ID ID is not a valid ID.");
    }


    // ---------- UNPIN TESTS ----------
    try {
        await usersData.unpinGroup();
    } catch (e) {
        assert.strictEqual(e, 'User ID ID is required.');
    }

    try {
        await usersData.unpinGroup("invalidId", pinTestGroup._id.toString());
    } catch (e) {
        assert.strictEqual(e, "User ID ID is not a valid ID.");
    }

    try {
        await usersData.unpinGroup(pinTestUser1._id.toString(), "invalidGroupId");
    } catch (e) {
        assert.strictEqual(e, "Group ID ID is not a valid ID.");
    }

    // Successful unpin
    const unpinResult1 = await usersData.unpinGroup(
        pinTestUser1._id.toString(),
        pinTestGroup._id.toString()
    );
    assert(
        !unpinResult1.pinnedGroups.some(g => g.toString() === pinTestGroup._id.toString()),
        "Group should be removed from pinned list"
    );

    // Second unpin (should not crash)
    const unpinResult2 = await usersData.unpinGroup(
        pinTestUser1._id.toString(),
        pinTestGroup._id.toString()
    );
    assert(
        !unpinResult2.pinnedGroups.includes(pinTestGroup._id.toString()),
        "Repeated unpin should not throw"
    );

    console.log("All pinGroup and unpinGroup tests passed successfully.");
}