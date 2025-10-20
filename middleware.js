// Middleware to check if user is authenticated
export const requireAuth = (req, res, next) => {
	if (!req.session.user) {
		// User is not logged in, redirect to login page
		return res.redirect("/login");
	}
	// User is authenticated, proceed to the route
	next();
};

// Middleware to redirect logged-in users away from login/register pages
export const redirectIfLoggedIn = (req, res, next) => {
	if (req.session.user) {
		// User is already logged in, redirect to groups page
		return res.redirect("/groups/new");
	}
	// User is not logged in, proceed to login/register page
	next();
};
