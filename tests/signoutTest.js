import axios from "axios";

const BASE = "http://localhost:3000";

function form(data) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) p.append(k, v);
  return p;
}

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ==================== SIGNOUT tests ====================

/**
 * Test user is properly signed out when they signout
 * Verifies session is destroyed and user cannot access protected routes
 */
async function test_user_properly_signed_out() {
  const userId = `so${Date.now().toString().slice(-8)}`;
  const password = "Password!1";

  // Register user
  await axios.post(
    `${BASE}/register`,
    form({
      firstName: "SignOut",
      lastName: "Test",
      userId,
      password,
      confirmPassword: password,
      role: "user",
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      maxRedirects: 0,
      validateStatus: () => true,
    }
  );

  // Login to get session
  const loginRes = await axios.post(
    `${BASE}/login`,
    form({ userId, password }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      maxRedirects: 0,
      validateStatus: () => true,
    }
  );

  const cookies = loginRes.headers["set-cookie"];
  expect(cookies && cookies.length > 0, "Expected session cookie after login");
  const cookie = cookies[0].split(";")[0];

  // Signout
  await axios.get(`${BASE}/signout`, {
    headers: { Cookie: cookie },
    maxRedirects: 0,
    validateStatus: () => true,
  });

  // Verify session is destroyed - accessing protected route should redirect to login
  const protectedRes = await axios.get(`${BASE}/groups/new`, {
    headers: { Cookie: cookie },
    maxRedirects: 0,
    validateStatus: () => true,
  });

  expect(
    protectedRes.status === 302,
    `Expected redirect to login after signout, got ${protectedRes.status}`
  );
}

/**
 * Test signout works without active session
 * Ensures graceful handling when no session exists
 */
async function test_signout_without_session() {
  const signoutRes = await axios.get(`${BASE}/signout`, {
    maxRedirects: 0,
    validateStatus: () => true,
  });
  expect(
    signoutRes.status === 302,
    `Expected 302 for signout without session, got ${signoutRes.status}`
  );
}

export async function runSignoutTests() {
  const tests = [test_user_properly_signed_out, test_signout_without_session];

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
  return { total: tests.length, failed: fails };
}
