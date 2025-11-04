import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Error while logging out.");
      }
      res.clearCookie("AuthenticationState");
      res.redirect("/login");
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
