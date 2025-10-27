import registerRoutes from "./register.js";
import loginRoutes from "./login.js";
import signoutRoutes from "./signout.js";
import groupRoutes from "./groups.js";

const constructorMethod = (app) => {
  app.use("/register", registerRoutes);
  app.use("/login", loginRoutes);
  app.use("/signout", signoutRoutes);
  app.use("/groups", groupRoutes);
  app.use(/(.*)/, (req, res) => {
    res.status(404).json({ error: "Not found" });
  });

};
export default constructorMethod;