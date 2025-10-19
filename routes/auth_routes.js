//import express, express router as shown in lecture code
import { Router } from "express";
import { register } from "../data/users.js";
import { login } from "../data/users.js";
const router = Router();

router.route("/").get(async (req, res) => {
  //code here for GET
  // route will render the home handlebar
  try {
    const user = req.session.user;

    const viewData = {
      isLoggedIn: !!user,
      isSuperUser: user?.role === "superuser",
    };

    res.render("home", viewData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router
  .route("/register")
  .get(async (req, res) => {
    //code here for GET
    // route will render a view with a sign-up form
    try {
      res.render("register", {
        themePreference: req.session.user?.themePreference,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })
  .post(async (req, res) => {
    //code here for POST
    try {
      const {
        firstName,
        lastName,
        userId,
        password,
        confirmPassword,
        favoriteQuote,
        backgroundColor,
        fontColor,
        role,
      } = req.body;
      // let firstName = xss(req.body.firstname)

      // trimming the input
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const trimmedUserId = userId.trim();
      const trimmedPassword = password.trim();
      const trimmedFavoriteQuote = favoriteQuote.trim();
      const trimmedRole = role.trim();

      // Validate Input
      if (
        !firstName ||
        !lastName ||
        !userId ||
        !password ||
        !confirmPassword ||
        !favoriteQuote ||
        !backgroundColor ||
        !fontColor ||
        !role
      ) {
        throw Error(`All fields are required`);
      }

      //====================
      // firstName Validation
      //====================
      // String Type Check
      if (typeof trimmedFirstName !== "string") {
        throw Error(`First name must be of type String`);
      }
      // Empty just spaces check
      if (trimmedFirstName.length === 0) {
        throw Error(`First name can't be empty or just spaces`);
      }
      // Regex Check for just letters
      if (!/^[a-zA-Z]+$/.test(trimmedFirstName)) {
        throw Error(`First name must contain only letters`);
      }
      // Length Check
      if (trimmedFirstName.length < 2 || trimmedFirstName.length > 20) {
        throw Error(`First name must be between 2-20 characters`);
      }

      //====================
      // lastName Validation
      //====================
      // String Type Check
      if (typeof trimmedLastName !== "string") {
        throw Error(`Last name must be of type String`);
      }
      // Empty just spaces check
      if (trimmedLastName.length === 0) {
        throw Error(`Last name must not be empty or just spaces`);
      }
      // Regex Check for just letters
      if (!/^[a-zA-Z]+$/.test(trimmedLastName)) {
        throw Error(`Last name must contain only letters`);
      }
      // Length Check
      if (trimmedLastName.length < 2 || trimmedLastName.length > 20) {
        throw Error(`Last name must be between 2-20 characters`);
      }

      //====================
      // userId Validation
      //====================
      // String Type Check
      if (typeof trimmedUserId !== "string") {
        throw Error(`userId must be of type String`);
      }
      // Empty just spaces check
      if (trimmedUserId.length === 0) {
        throw Error(`userId can't be empty or just spaces`);
      }
      // Regex Check for just letters or positive whole numbers
      if (!/^[a-zA-Z0-9]+$/.test(trimmedUserId)) {
        throw Error(`userId can only have letters or positive whole numbers`);
      }
      // Length Check
      if (trimmedUserId.length < 5 || trimmedUserId.length > 10) {
        throw Error(`userId must be between 5-10 characters`);
      }

      //====================
      // password Validation
      //====================
      // String Type Check
      if (typeof trimmedPassword !== "string") {
        throw Error(`password must be of type String`);
      }
      // Empty just spaces check
      if (trimmedPassword.length === 0) {
        throw Error(`password can't be empty or just spaces`);
      }
      // Length Check
      if (trimmedPassword.length < 8) {
        throw Error(`password must be at least 8 characters`);
      }
      // Password Constraints:
      if (!/[A-Z]/.test(trimmedPassword)) {
        throw Error(`password must contain at least one uppercase character`);
      }
      if (!/[0-9]/.test(trimmedPassword)) {
        throw Error(`password must contain at least one number`);
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(trimmedPassword)) {
        throw Error(`password must contain at least one special character`);
      }

      // Check if passwords match
      if (trimmedPassword !== confirmPassword) {
        throw Error(`password and confirmPassword must match`);
      }

      //=========================
      // favoriteQuote Validation
      //=========================
      // String Type Check
      if (typeof trimmedFavoriteQuote !== "string") {
        throw Error(`favoriteQuote must be of type String`);
      }
      // Empty just spaces check
      if (trimmedFavoriteQuote.length === 0) {
        throw Error(`favoriteQuote can't be empty or just spaces`);
      }
      // Length Check
      if (
        trimmedFavoriteQuote.length < 20 ||
        trimmedFavoriteQuote.length > 255
      ) {
        throw Error(`favoriteQuote must be between 20-255 characters`);
      }

      //===========================================
      // backgroundColor and fontColor Validation
      //===========================================
      if (!/^#[0-9A-Fa-f]{6}$/.test(backgroundColor)) {
        throw Error(`Background color must be a valid hex color.`);
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(fontColor)) {
        throw Error(`Font color must be a valid hex color.`);
      }
      if (backgroundColor.toLowerCase() === fontColor.toLowerCase()) {
        throw Error(`Background and font colors must be different.`);
      }

      //=========================
      // role Validation
      //=========================
      // String Type Check
      if (typeof trimmedRole !== "string") {
        throw Error(`role must be of type String`);
      }
      // Empty just spaces check
      if (trimmedRole.length === 0) {
        throw Error(`role can't be empty or just spaces`);
      }
      // valid user roles
      let validRoles = ["superuser", "user"];
      if (!validRoles.includes(trimmedRole.toLowerCase())) {
        throw Error(`Role must be 'superuser' or 'user'`);
      }

      // Register the user
      const newUser = await register(
        trimmedFirstName,
        trimmedLastName,
        trimmedUserId.toLowerCase(),
        trimmedPassword,
        trimmedFavoriteQuote,
        { backgroundColor, fontColor },
        trimmedRole.toLowerCase()
      );

      // registrationCompleted thing
      if (newUser.registrationCompleted === true) {
        return res.redirect("/login");
      } else {
        return res
          .status(500)
          .render("register", { error: "Internal Server Error" });
      }
    } catch (error) {
      console.error(error);
      res.status(400).render("register", { error: error.message });
    }
  });

// route will create a new user and store it in the database
// and redirect the user to the login page

router
  .route("/login")
  .get(async (req, res) => {
    //code here for GET
    // route of the application will render a view with a sign in form
    try {
      res.render("login");
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })
  .post(async (req, res) => {
    //code here for POST
    try {
      const { userId, password } = req.body;

      // trimming the input
      const trimmedUserId = userId.trim();
      const trimmedPassword = password.trim();

      // Validate Input
      if (!userId || !password) {
        throw Error(`All fields are required`);
      }

      //====================
      // userId Validation
      //====================
      if (typeof trimmedUserId !== "string") {
        throw Error("userId must be of type String");
      }
      if (trimmedUserId.length === 0) {
        throw Error("userId can't be empty or just spaces");
      }
      if (!/^[a-zA-Z0-9]+$/.test(trimmedUserId)) {
        throw Error("userId can only contain letters and numbers");
      }
      if (trimmedUserId.length < 5 || trimmedUserId.length > 10) {
        throw Error("userId must be between 5-10 characters");
      }

      //====================
      // password Validation
      //====================
      if (typeof trimmedPassword !== "string") {
        throw Error("password must be of type String");
      }
      if (trimmedPassword.length === 0) {
        throw Error("password can't be empty or just spaces");
      }
      if (trimmedPassword.length < 8) {
        throw Error("password must be at least 8 characters long");
      }
      if (!/[A-Z]/.test(trimmedPassword)) {
        throw Error("password must have at least one uppercase letter");
      }
      if (!/[0-9]/.test(trimmedPassword)) {
        throw Error("password must have at least one number");
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(trimmedPassword)) {
        throw Error("password must have at least one special character");
      }

      // session stuff
      const user = await login(trimmedUserId.toLowerCase(), trimmedPassword);
      // req sessions stuff
      req.session.user = {
        firstName: user.firstName,
        lastName: user.lastName,
        userId: user.userId,
        favoriteQuote: user.favoriteQuote,
        themePreference: user.themePreference,
        role: user.role,
        signupDate: user.signupDate,
        lastLogin: user.lastLogin,
      };

      if (user.role === "superuser") {
        return res.redirect("/superuser");
      } else {
        return res.redirect("/user");
      }
    } catch (error) {
      console.error(error);
      res.status(400).render("login", { error: error.message });
    }
  });

router.route("/user").get(async (req, res) => {
  //code here for GET
  // route will be protected your own authentication
  // middleware to only allow valid, logged in users to see this page.
  try {
    // Grabbing data
    const user = req.session.user;
    const currDateObj = new Date();
    const currTime = currDateObj.toLocaleTimeString();
    const currDate = currDateObj.toLocaleDateString();
    const isSuperUser = user.role === "superuser";

    // Data to pass to view
    const viewData = {
      firstName: user.firstName,
      lastName: user.lastName,
      currentTime: currTime,
      currentDate: currDate,
      role: user.role,
      signupDate: user.signupDate,
      lastLogin: user.lastLogin,
      favoriteQuote: user.favoriteQuote,
      isSuperUser: isSuperUser,
      isLoggedIn: true,
      themePreference: user.themePreference,
    };

    res.render("user", viewData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.route("/superuser").get(async (req, res) => {
  //code here for GET
  // route will be protected your own authentication middleware to only allow valid,
  // logged in users who are super users to see this page
  try {
    const user = req.session.user;

    // Check if user is a superuser
    if (user.role !== "superuser") {
      return res.status(403).render("error");
    }

    const currDateObj = new Date();
    const currTime = currDateObj.toLocaleTimeString();
    const currDate = currDateObj.toLocaleDateString();

    const viewData = {
      firstName: user.firstName,
      lastName: user.lastName,
      currentTime: currTime,
      currentDate: currDate,
      signupDate: user.signupDate,
      lastLogin: user.lastLogin,
      favoriteQuote: user.favoriteQuote,
      isLoggedIn: true,
      themePreference: user.themePreference,
    };

    // Render the superuser view
    res.render("superuser", viewData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.route("/signout").get(async (req, res) => {
  //code here for GET
  //route will expire/delete the AuthenticationState and and inform the user that they have been logged out
  //https://stackoverflow.com/questions/5573256/how-to-end-a-session-in-expressjs
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Error while logging out.");
      }
      res.clearCookie("AuthenticationState");
      res.render("signout", {
        message: "You have been logged out successfully.",
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
