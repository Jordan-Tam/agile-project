import axios from "axios";

const BASE = "http://localhost:3000"; 

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

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

// signup tests

async function test_signup_success_then_duplicate() {
  const userId = `u${Date.now().toString().slice(-8)}`;

  const res1 = await postRegister({
    firstName: "Bryan",
    lastName: "John",
    userId,
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res1.status === 201 || res1.status === 302, `Expected 201/302, got ${res1.status}`);

  const res2 = await postRegister({
    firstName: "Bryan",
    lastName: "John",
    userId,
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res2.status === 400, `Expected 400 duplicate, got ${res2.status}`);
  expect(
    typeof res2.data === "string" && res2.data.toLowerCase().includes("already taken"),
    "Expected duplicate error message"
  );
}

async function test_signup_short_userid_400() {
  const res = await postRegister({
    firstName: "Al",
    lastName: "Bee",
    userId: "x",
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for short userId, got ${res.status}`);
}

async function test_signup_weak_password_400() {
  const res = await postRegister({
    firstName: "Al",
    lastName: "Bee",
    userId: `weak${Date.now().toString().slice(-5)}`,
    password: "password",
    confirmPassword: "password",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for weak password, got ${res.status}`);
}

async function test_signup_mismatch_password_400() {
  const res = await postRegister({
    firstName: "Al",
    lastName: "Bee",
    userId: `mis${Date.now().toString().slice(-5)}`,
    password: "Password!1",
    confirmPassword: "Password!2",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for mismatched password, got ${res.status}`);
}


// missing firstName
async function test_signup_missing_firstName_400() {
  const res = await postRegister({
    firstName: "",
    lastName: "Smith",
    userId: `missfn${Date.now().toString().slice(-5)}`,
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for missing firstName, got ${res.status}`);
}

// missing lastName
async function test_signup_missing_lastName_400() {
  const res = await postRegister({
    firstName: "Alice",
    lastName: "",
    userId: `missln${Date.now().toString().slice(-5)}`,
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for missing lastName, got ${res.status}`);
}

// invalid firstName (has digits)
async function test_signup_invalid_firstName_digits_400() {
  const res = await postRegister({
    firstName: "Al1ce",
    lastName: "Brown",
    userId: `badfn${Date.now().toString().slice(-5)}`,
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for invalid firstName, got ${res.status}`);
}

// invalid lastName (has symbols)
async function test_signup_invalid_lastName_symbols_400() {
  const res = await postRegister({
    firstName: "Bob",
    lastName: "Br@wn",
    userId: `badln${Date.now().toString().slice(-5)}`,
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for invalid lastName, got ${res.status}`);
}

// non-alphanumeric userId
async function test_signup_non_alnum_userid_400() {
  const res = await postRegister({
    firstName: "Cara",
    lastName: "Lane",
    userId: "car@123",
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for non-alphanumeric userId, got ${res.status}`);
}

// firstName too long (>20)
async function test_signup_firstName_too_long_400() {
  const longName = "A".repeat(21);
  const res = await postRegister({
    firstName: longName,
    lastName: "Short",
    userId: `toolfn${Date.now().toString().slice(-5)}`,
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for too long firstName, got ${res.status}`);
}

// lastName too long (>20)
async function test_signup_lastName_too_long_400() {
  const longName = "B".repeat(21);
  const res = await postRegister({
    firstName: "Short",
    lastName: longName,
    userId: `toolln${Date.now().toString().slice(-5)}`,
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for too long lastName, got ${res.status}`);
}

// userId too long (>10)
async function test_signup_userid_too_long_400() {
  const res = await postRegister({
    firstName: "Dana",
    lastName: "West",
    userId: "danawest0011", // 11 chars
    password: "Password!1",
    confirmPassword: "Password!1",
    role: "user"
  });
  expect(res.status === 400, `Expected 400 for too long userId, got ${res.status}`);
}


async function run() {
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
    test_signup_userid_too_long_400
  ];

  let fails = 0;
  for (const t of tests) {
    try {
      await t();
      console.log(`PASS: ${t.name}`);
    } catch (err) {
      fails++;
      console.error(`FAIL: ${t.name} -> ${err.message}`);
    }
  }

  if (fails) {
    process.exitCode = 1;
  } else {
    console.log("Tests passed!");
  }
}

run();
