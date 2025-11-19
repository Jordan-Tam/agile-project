import { dbConnection, closeConnection } from "../config/mongoConnection.js";

async function addCurrencyToGroups() {
	const db = await dbConnection();
	const groupsCollection = db.collection("groups");

	try {
		// Update all groups that don't have a currency field
		const result = await groupsCollection.updateMany(
			{ currency: { $exists: false } },
			{ $set: { currency: "USD" } }
		);

		// console.log(`✓ Migration complete!`);
		// console.log(`  Updated ${result.modifiedCount} group(s) with default USD currency`);
		// console.log(`  Matched ${result.matchedCount} group(s) without currency field`);
	} catch (error) {
		// console.error("Error during migration:", error);
		throw error;
	} finally {
		await closeConnection();
	}
}

// Run the migration
addCurrencyToGroups()
	.then(() => {
		// console.log("Migration successful!");
		process.exit(0);
	})
	.catch((error) => {
		// console.error("Migration failed:", error);
		process.exit(1);
	});
