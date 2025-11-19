import registerRoutes from "./register.js";
import loginRoutes from "./login.js";
import signoutRoutes from "./signout.js";
import groupRoutes from "./groups.js";
import searchRoutes from "./search.js";
import profileRoutes from "./profile.js";
import groupsData from "../data/groups.js";
import {
  rewriteUnsupportedBrowserMethods,
  requireAuth
} from "../middleware.js";

const constructorMethod = (app) => {

  app.get("/", (req, res) => {
    if (req.session.user) {
      res.redirect("/home");
    } else {
      res.redirect("/login");
    }
  });

  app.use("/home", requireAuth, async (req, res) => {
    let groups = await groupsData.getGroupsForUser(req.session.user._id);
    res.render("home", {
      user: req.session.user,
      groups: groups,
      stylesheet: "/public/css/custom-card.css"
    });
  });

  app.use("/settings", requireAuth, async (req, res) => {
    // Change later
    res.render("settings");
  });

  app.use("/register", registerRoutes);
  app.use("/login", loginRoutes);
  app.use("/profile", rewriteUnsupportedBrowserMethods, profileRoutes)
  app.use("/signout", signoutRoutes);
  app.use("/groups", rewriteUnsupportedBrowserMethods, groupRoutes);
  app.use("/search", searchRoutes);

  app.use(/(.*)/, (req, res) => {
    res.status(404).json({ error: "Not found" });
  });

};
export default constructorMethod;