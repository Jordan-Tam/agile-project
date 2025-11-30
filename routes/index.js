import registerRoutes from "./register.js";
import loginRoutes from "./login.js";
import signoutRoutes from "./signout.js";
import groupRoutes from "./groups.js";
import searchRoutes from "./search.js";
import profileRoutes from "./profile.js";
import logsRoutes from "./logs.js";
import groupsData from "../data/groups.js";
import expensesData from "../data/expenses.js";
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

  app.use("/manual", requireAuth, async (req, res) => {
    res.render("instruction-manual");
  });

  app.get("/expenses/graph", requireAuth, async (req, res) => {
    try {
      const graphData = await expensesData.getExpenseGraphData(req.session.user._id);
      console.log("Expense Graph Data:", JSON.stringify(graphData, null, 2));
      res.render("expenseGraph", {
        user: req.session.user,
        graphData: JSON.stringify(graphData),
        totalExpenses: graphData.totalExpenses,
        totalCost: graphData.totalCost.toFixed(2)
      });
    } catch (e) {
      console.error("Error rendering expense graph:", e);
      res.status(500).render("error", { error: e });
    }
  });

  app.use("/register", registerRoutes);
  app.use("/login", loginRoutes);
  app.use("/profile", rewriteUnsupportedBrowserMethods, profileRoutes)
  app.use("/signout", signoutRoutes);
  app.use("/groups", rewriteUnsupportedBrowserMethods, groupRoutes);
  app.use("/search", searchRoutes);
  app.use("/logs", requireAuth, logsRoutes);

  app.use(/(.*)/, (req, res) => {
    res.status(404).json({ error: "Not found" });
  });

};
export default constructorMethod;