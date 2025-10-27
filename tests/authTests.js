import axios from "axios";

const BASE = "http://localhost:3000";

function form(data) {
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries(data)) p.append(k, v);
	return p;
}

async function postRegister(payload) {
	return axios.post(`${BASE}/register`, form(payload), {
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		maxRedirects: 0,
		validateStatus: () => true
	});
}

async function postLogin(payload) {
	return axios.post(`${BASE}/login`, form(payload), {
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		maxRedirects: 0,
		validateStatus: () => true
	});
}

function expect(cond, msg) {
	if (!cond) throw new Error(msg);
}

// ==================== SIGNUP tests ====================
async function test_signup_success_then_duplicate() {
	const userId = `u${Date.now().toString().slice(-8)}`;

	const res1 = await postRegister({
		firstName: "Bryan",
		lastName: "John",
		userId,
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(
		res1.status === 201 || res1.status === 302,
		`Expected 201/302, got ${res1.status}`
	);

	const res2 = await postRegister({
		firstName: "Bryan",
		lastName: "John",
		userId,
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(res2.status === 400, `Expected 400 duplicate, got ${res2.status}`);
	if (typeof res2.data === "string") {
		expect(
			res2.data.toLowerCase().includes("already taken"),
			"Expected duplicate error message"
		);
	}
}

async function test_signup_short_userid_400() {
	const res = await postRegister({
		firstName: "Al",
		lastName: "Bee",
		userId: "x",
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(
		res.status === 400,
		`Expected 400 for short userId, got ${res.status}`
	);
}

async function test_signup_weak_password_400() {
	const res = await postRegister({
		firstName: "Al",
		lastName: "Bee",
		userId: `weak${Date.now().toString().slice(-5)}`,
		password: "password",
		confirmPassword: "password",
	});
	expect(
		res.status === 400,
		`Expected 400 for weak password, got ${res.status}`
	);
}

async function test_signup_mismatch_password_400() {
	const res = await postRegister({
		firstName: "Al",
		lastName: "Bee",
		userId: `mis${Date.now().toString().slice(-5)}`,
		password: "Password!1",
		confirmPassword: "Password!2",
	});
	expect(
		res.status === 400,
		`Expected 400 for mismatched password, got ${res.status}`
	);
}

async function test_signup_missing_firstName_400() {
	const res = await postRegister({
		firstName: "",
		lastName: "Smith",
		userId: `missfn${Date.now().toString().slice(-5)}`,
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(
		res.status === 400,
		`Expected 400 for missing firstName, got ${res.status}`
	);
}

async function test_signup_missing_lastName_400() {
	const res = await postRegister({
		firstName: "Alice",
		lastName: "",
		userId: `missln${Date.now().toString().slice(-5)}`,
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(
		res.status === 400,
		`Expected 400 for missing lastName, got ${res.status}`
	);
}

async function test_signup_invalid_firstName_digits_400() {
	const res = await postRegister({
		firstName: "Al1ce",
		lastName: "Brown",
		userId: `badfn${Date.now().toString().slice(-5)}`,
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(
		res.status === 400,
		`Expected 400 for invalid firstName, got ${res.status}`
	);
}

async function test_signup_invalid_lastName_symbols_400() {
	const res = await postRegister({
		firstName: "Bob",
		lastName: "Br@wn",
		userId: `badln${Date.now().toString().slice(-5)}`,
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(
		res.status === 400,
		`Expected 400 for invalid lastName, got ${res.status}`
	);
}

async function test_signup_non_alnum_userid_400() {
	const res = await postRegister({
		firstName: "Cara",
		lastName: "Lane",
		userId: "car@123",
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(
		res.status === 400,
		`Expected 400 for non-alphanumeric userId, got ${res.status}`
	);
}

async function test_signup_firstName_too_long_400() {
	const longName = "A".repeat(21);
	const res = await postRegister({
		firstName: longName,
		lastName: "Short",
		userId: `toolfn${Date.now().toString().slice(-5)}`,
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(
		res.status === 400,
		`Expected 400 for too long firstName, got ${res.status}`
	);
}

async function test_signup_lastName_too_long_400() {
	const longName = "B".repeat(21);
	const res = await postRegister({
		firstName: "Short",
		lastName: longName,
		userId: `toolln${Date.now().toString().slice(-5)}`,
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(
		res.status === 400,
		`Expected 400 for too long lastName, got ${res.status}`
	);
}

async function test_signup_userid_too_long_400() {
	const res = await postRegister({
		firstName: "Dana",
		lastName: "West",
		userId: "danawest0011",
		password: "Password!1",
		confirmPassword: "Password!1",
	});
	expect(
		res.status === 400,
		`Expected 400 for too long userId, got ${res.status}`
	);
}

// ==================== LOGIN tests ====================
async function test_login_success() {
	const userId = `log${Date.now().toString().slice(-5)}`;
	const password = "Password!1";

	const registerRes = await postRegister({
		firstName: "Test",
		lastName: "User",
		userId,
		password,
		confirmPassword: password,
	});
	expect(
		registerRes.status === 201 || registerRes.status === 302,
		`Expected 201/302 for registration, got ${registerRes.status}`
	);

	const loginRes = await postLogin({ userId, password });
	expect(
		loginRes.status === 200 || loginRes.status === 302,
		`Expected 200/302 for successful login, got ${loginRes.status}`
	);
}

async function test_login_invalid_userId_400() {
	const res = await postLogin({ userId: "nouser123", password: "Password!1" });
	expect(
		res.status === 400,
		`Expected 400 for invalid userId, got ${res.status}`
	);
	if (typeof res.data === "string") {
		expect(
			res.data.toLowerCase().includes("invalid"),
			"Expected invalid credentials error message"
		);
	}
}

async function test_login_wrong_password_400() {
	const userId = `pw${Date.now().toString().slice(-6)}`;

	await postRegister({
		firstName: "Pass",
		lastName: "Test",
		userId,
		password: "Password!1",
		confirmPassword: "Password!1",
	});

	const res = await postLogin({ userId, password: "WrongPassword!2" });
	expect(
		res.status === 400,
		`Expected 400 for wrong password, got ${res.status}`
	);
	if (typeof res.data === "string") {
		expect(
			res.data.toLowerCase().includes("invalid"),
			"Expected invalid credentials error message"
		);
	}
}

async function test_login_empty_userId_400() {
	const res = await postLogin({ userId: "", password: "Password!1" });
	expect(
		res.status === 400,
		`Expected 400 for empty userId, got ${res.status}`
	);
}

async function test_login_empty_password_400() {
	const res = await postLogin({ userId: "testuser", password: "" });
	expect(
		res.status === 400,
		`Expected 400 for empty password, got ${res.status}`
	);
}

async function test_login_short_userId_400() {
	const res = await postLogin({ userId: "abc", password: "Password!1" });
	expect(
		res.status === 400,
		`Expected 400 for short userId, got ${res.status}`
	);
}

async function test_login_userId_too_long_400() {
	const res = await postLogin({
		userId: "thisuseriswaytolong",
		password: "Password!1"
	});
	expect(
		res.status === 400,
		`Expected 400 for too long userId, got ${res.status}`
	);
}

async function test_login_non_alnum_userId_400() {
	const res = await postLogin({ userId: "test@user", password: "Password!1" });
	expect(
		res.status === 400,
		`Expected 400 for non-alphanumeric userId, got ${res.status}`
	);
}

async function test_login_spaces_userId_400() {
	const res = await postLogin({ userId: "     ", password: "Password!1" });
	expect(
		res.status === 400,
		`Expected 400 for spaces-only userId, got ${res.status}`
	);
}

async function test_login_spaces_password_400() {
	const res = await postLogin({ userId: "testuser", password: "     " });
	expect(
		res.status === 400,
		`Expected 400 for spaces-only password, got ${res.status}`
	);
}

export async function runAuthTests() {
	const tests = [
		test_signup_success_then_duplicate,
		test_signup_short_userid_400,
		test_signup_weak_password_400,
		test_signup_mismatch_password_400,
		test_signup_missing_firstName_400,
		test_signup_missing_lastName_400,
		test_signup_invalid_firstName_digits_400,
		test_signup_invalid_lastName_symbols_400,
		test_signup_non_alnum_userid_400,
		test_signup_firstName_too_long_400,
		test_signup_lastName_too_long_400,
		test_signup_userid_too_long_400,
		test_login_success,
		test_login_invalid_userId_400,
		test_login_wrong_password_400,
		test_login_empty_userId_400,
		test_login_empty_password_400,
		test_login_short_userId_400,
		test_login_userId_too_long_400,
		test_login_non_alnum_userId_400,
		test_login_spaces_userId_400,
		test_login_spaces_password_400
	];

	let fails = 0;
	for (const t of tests) {
		try {
			await t();
			console.log(`PASS: ${t.name}`);
		} catch (err) {
			fails++;
			console.error(`FAIL: ${t.name} -> ${err}`);
		}
	}
	return { total: tests.length, failed: fails };
}
