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

app.engine(
	"handlebars",
	exphbs.engine({
		defaultLayout: "main",
		helpers: {
			json: function (context) {
				return JSON.stringify(context);
			},
			eq: function (a, b) {
				return a === b;
			},
			contains: function (array, value) {
				if (!Array.isArray(array)) return false;
				return array.some(item => item.toString() === value.toString());
			},
			formatDateForInput: function (dateString) {
				// Convert MM/DD/YYYY to YYYY-MM-DD for HTML5 date input
				if (!dateString) return "";
				const parts = dateString.split("/");
				if (parts.length === 3) {
					const [month, day, year] = parts;
					return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
				}
				return dateString;
			}
		}
	})
);
app.set("view engine", "handlebars");
configRoutes(app);

// Start the server
app.listen(3000, () => {
	console.log("We've now got a server!");
	console.log("Your routes will be running on http://localhost:3000");
});
