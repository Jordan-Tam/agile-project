import axios from "axios";

const BASE = "http://localhost:3000";

async function testSignoutWithoutSession() {
  console.log("Testing signout without active session...");
  
  try {
    const signoutRes = await axios.get(`${BASE}/signout`, {
      maxRedirects: 0,
      validateStatus: () => true,
    });
    
    console.log(`Status: ${signoutRes.status}`);
    console.log(`Expected: 302 (redirect)`);
    
    if (signoutRes.status === 302) {
      console.log("✓ Test PASSED: Signout without session redirects correctly");
      return true;
    } else {
      console.log(`✗ Test FAILED: Expected 302, got ${signoutRes.status}`);
      return false;
    }
  } catch (error) {
    console.error("Error:", error.message);
    return false;
  }
}

// Note: Run this after starting the server with `node app.js`
testSignoutWithoutSession().then(() => process.exit(0));
