import { Router } from "express";

const router = Router();

router.get("/signout", async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Error while logging out.");
      }
      res.clearCookie("AuthenticationState");
      res.render("signout", {
        title: "Signed Out",
        message: "You have been logged out successfully.",
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
