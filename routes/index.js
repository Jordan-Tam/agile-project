// import auth_routes from "./auth_routes.js";
import registerRoutes from "./register.js";
import loginRoutes from "./login.js";
import { static as staticDir } from "express";

const constructorMethod = (app) => {
	// app.use("/", auth_routes);
	app.use("/", registerRoutes);
	app.use("/", loginRoutes);
	app.use("/public", staticDir("public"));
	// per announcement
	app.use(/(.*)/, (req, res) => {
		res.status(404).json({ error: "Not found" });
	});
};

export default constructorMethod;
