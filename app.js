import express from "express";
import session from "express-session";
import configRoutes from "./routes/index.js";
import exphbs from "express-handlebars";
import groupRoutes from "./routes/groups.js";

const app = express();

app.use(
	session({
		name: "AuthenticationState",
		secret: "some secret string!",
		resave: false,
		saveUninitialized: false
	})
);

app.use("/public", express.static("public"));
app.use("/static", express.static("static"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.engine("handlebars", exphbs.engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
app.use("/groups", groupRoutes);
// Default route
app.get("/", (req, res) => {
  res.redirect("/groups/new");
});
configRoutes(app);

// Start the server
app.listen(3000, () => {
	console.log("We've now got a server!");
	console.log("Your routes will be running on http://localhost:3000");
});
