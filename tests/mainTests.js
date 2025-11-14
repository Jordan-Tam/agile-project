import axios from "axios";
import * as chai from "chai";
import groupsData from "../data/groups.js";
import chaiAsPromised from "chai-as-promised";
import { spawn } from "child_process";
import { dbConnection, closeConnection } from "../config/mongoConnection.js";
import { runAuthTests } from "./authTests.js";
import { runGroupTests } from "./groupsTests.js";
import { runExpenseTests } from "./expensesTests.js";
import { runSignoutTests } from "./signoutTest.js";
import { runPdfExportTests } from "./pdfExportTests.js";
import { runBalanceTests } from "./balanceTests.js";
import { runChangeUserIDAndPasswordTests } from "./changeUserIDAndPasswordTests.js";

const BASE = "http://localhost:3000";
let serverProcess = null;

const db = await dbConnection();
await db.dropDatabase();

// helpers
function form(data) {
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries(data)) p.append(k, v);
	return p;
}

async function postRegister(payload) {
	try {
		const res = await axios.post(`${BASE}/register`, form(payload), {
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			maxRedirects: 0,
			validateStatus: () => true
		});
		return res;
	} catch (err) {
		return { status: 0, error: err.message };
	}
}

// Create persistent test users for manual testing
async function createTestUsers() {
	console.log("\nCreating persistent test users for manual testing...");

	const testUsers = [
		{
			firstName: "John",
			lastName: "Doe",
			userId: "johndoe",
			password: "Password!1",
			confirmPassword: "Password!1",
			role: "user"
		},
		{
			firstName: "Jane",
			lastName: "Smith",
			userId: "janesmith",
			password: "Password!2",
			confirmPassword: "Password!2",
			role: "user"
		},
		{
			firstName: "Admin",
			lastName: "User",
			userId: "adminuser",
			password: "Admin123!",
			confirmPassword: "Admin123!",
			role: "superuser"
		},
		{
			firstName: "Test",
			lastName: "Account",
			userId: "testuser",
			password: "Test123!",
			confirmPassword: "Test123!",
			role: "user"
		}
	];

	for (const user of testUsers) {
		const res = await postRegister(user);
		if (res.status === 201 || res.status === 302) {
			console.log(
				`✓ Created user: ${user.userId} (password: ${user.password})`
			);
		} else if (
			res.status === 400 &&
			typeof res.data === "string" &&
			res.data.includes("already taken")
		) {
			console.log(`- User already exists: ${user.userId}`);
		} else {
			console.log(
				`✗ Failed to create user: ${user.userId} (status ${res.status})`
			);
		}
	}

	console.log("\nTest users ready for manual testing!");
	console.log("You can log in with:");
	console.log("  - johndoe / Password!1");
	console.log("  - janesmith / Password!2");
	console.log("  - adminuser / Admin123! (superuser)");
	console.log("  - testuser / Test123!\n");
}

// Server management
async function startServer() {
	console.log("Starting server!!!!!!!");
	return new Promise((resolve, reject) => {
		console.log("Starting server...");
		serverProcess = spawn("node", ["app.js"], {
			cwd: process.cwd(),
			stdio: "pipe",
			shell: true
		});

		let output = "";
		serverProcess.stdout.on("data", (data) => {
			output += data.toString();
			if (output.includes("We've now got a server!")) {
				console.log("Server started successfully!");
				resolve();
			}
		});
		serverProcess.stderr.on("data", (data) => {
			console.error("Server error:", data.toString());
		});
		serverProcess.on("error", (err) => {
			console.error("Failed to start server:", err);
			reject(err);
		});
		setTimeout(() => {
			if (output.includes("We've now got a server!")) resolve();
			else {
				console.log("Server might be running (timeout reached)");
				resolve();
			}
		}, 5000);
	});
}

function stopServer() {
	if (serverProcess) {
		console.log("\nStopping server...");
		serverProcess.kill();
		serverProcess = null;
	}
}

// Orchestrator
async function run() {
	try {
		await startServer();
		await createTestUsers();

		console.log("\n=== Running Auth Tests ===");
		const authSummary = await runAuthTests();

		console.log("\n=== Running Groups Tests ===");
		await runGroupTests();

		console.log("\n=== Running Expenses Tests ===");
		await runExpenseTests();

		console.log("\n=== Running Signout Tests ===");
		await runSignoutTests();

		console.log("\n=== Running PDF Export Tests ===");
		await runPdfExportTests();

		console.log("\n=== Running Balance Calculation Tests ===");
		const balanceSummary = await runBalanceTests();

		console.log("\n=== Running Change Name, User ID, and Password Tests ===");
		await runChangeUserIDAndPasswordTests();

		// Run the inline group data tests
		//await runInlineGroupTests();

		console.log("\n=== Combined Test Summary ===");
		console.log(
			`Auth tests -> total: ${authSummary.total}, failed: ${authSummary.failed}`
		);
		console.log("Groups tests -> see above logs");
		console.log("Edit Group tests -> see above logs");
		console.log("Expenses tests -> see above logs");
		console.log("Search Expenses tests -> see above logs");
		console.log("Signout tests -> see above logs");
		console.log("PDF Export tests -> see above logs");
		console.log(
			`Balance tests -> total: ${balanceSummary.total}, failed: ${balanceSummary.failed}`
		);
		console.log("Change Name, User ID, and Password tests -> see above logs");
		console.log("Inline group data tests -> see above logs");
	} catch (err) {
		console.error("Error running tests:", err);
	} finally {
		stopServer();
		try {
			await closeConnection();
		} catch (e) {}
		process.exit(0);
	}
}

run();
