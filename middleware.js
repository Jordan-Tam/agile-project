// Middleware to support PUT, DELETE, and PATCH requests.
export const rewriteUnsupportedBrowserMethods = (req, res, next) => {
	if (req.body && req.body._method) {
		req.method = req.body._method;
		delete req.body._method;
	}
	next();
}

// Middleware to check if the user is authenticated.
export const requireAuth = (req, res, next) => {
	if (!req.session.user) {
		// User is not logged in, redirect to login page
		return res.redirect("/login");
	}
	// User is authenticated, proceed to the route
	next();
};

// Middleware to redirect logged-in users away from login/register pages.
export const redirectIfLoggedIn = (req, res, next) => {
	if (req.session.user) {
		// User is already logged in, redirect to groups page
		return res.redirect("/groups/new");
	}
	// User is not logged in, proceed to login/register page
	next();
};
