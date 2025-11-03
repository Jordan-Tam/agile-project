import express from "express";
import session from "express-session";
import exphbs from "express-handlebars";
import configRoutes from "./routes/index.js";

const app = express();
app.use(express.json());
app.use("/public", express.static("public"));
app.use("/static", express.static("static"));
app.use(express.urlencoded({ extended: true }));

app.use(
	session({
		name: "AuthenticationState",
		secret: "some secret string!",
		resave: false,
		saveUninitialized: false
	})
);

app.engine("handlebars", exphbs.engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
configRoutes(app);

// Start the server
app.listen(3000, () => {
	console.log("We've now got a server!");
	console.log("Your routes will be running on http://localhost:3000");
});
