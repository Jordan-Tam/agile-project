import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
	try {
		// Check if there's an active session
		if (!req.session || !req.session.user) {
			// No active session, redirect to login
			return res.redirect("/login");
		}

		// Clear the session
		req.session.destroy((err) => {
			if (err) {
				console.error("Error destroying session:", err);
				return res.status(500).send("Error while logging out.");
			}

			// Clear the session cookie
			res.clearCookie("AuthenticationState");

			// Clear any other potential cookies
			res.clearCookie("connect.sid");

			// Render the sign-out page instead of redirecting to login
			res.render("signout", {
				title: "You've been signed out",
				message: "You have successfully signed out of your account."
			});
		});
	} catch (error) {
		console.error("Signout error:", error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
