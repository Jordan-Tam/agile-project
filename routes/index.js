// import auth_routes from "./auth_routes.js";
import registerRoutes from "./register.js";
import signoutRoutes from "./signout.js";
import loginRoutes from "./login.js";
import { requireAuth } from "../middleware.js";
import { static as staticDir } from "express";

const constructorMethod = (app) => {
  // app.use("/", auth_routes);
  app.use("/home", requireAuth, (req, res) => {
    res.render("home");
  })
  app.use("/", registerRoutes);
  app.use("/", loginRoutes);
  app.use("/", signoutRoutes);
  app.use("/public", staticDir("public"));
  // per announcement
  app.use(/(.*)/, (req, res) => {
    res.status(404).json({ error: "Not found" });
  });
};
export default constructorMethod;