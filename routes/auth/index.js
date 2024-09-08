import express from "express";
import bcrypt from "bcrypt";
import Account from "../../models/accounts.js";

const router = express.Router();
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

// Routes for authentication
router.get("/login", (req, res) => {
  res.render("auth/login", { title: "Dashboard - Login" });
});

router.get("/signup", (req, res) => {
  res.render("auth/signup", { title: "Dashboard - Signup" });
});

router.get("/logout", (req, res) => {
  try {
    req.session.destroy(() => {
      res.redirect("/auth/login");
    });
  } catch (error) {
    console.error(error);
    res.redirect("/auth/login");
  }
});

// Signup route
router.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const regex = /^[a-zA-Z0-9]+$/;
  if (!regex.test(username)) {
    return res.redirect("/auth/signup?error=Invalid username");
  }
  if (username && password) {
    if (await Account.exists({ username })) {
      return res.redirect("/auth/signup?error=Username already exists");
    }
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const account = new Account({ username, password: hashedPassword });
      await account.save();
      req.session.user = { username };
      res.redirect("/dashboard");
    } catch (error) {
      console.error(error);
      res.redirect("/auth/signup?error=Server error");
    }
  } else {
    res.redirect("/auth/signup?error=Missing username or password");
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const regex = /^[a-zA-Z0-9]+$/;
  if (!regex.test(username)) {
    return res.redirect("/auth/signup?error=Invalid username");
  }
  try {
    const user = await Account.findOne({ username });
    if (user) {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.session.user = { username };
        return res.redirect("/dashboard");
      }
    }
    res.redirect("/auth/login?error=Invalid credentials");
  } catch (error) {
    console.error(error);
    res.redirect("/auth/login?error=Server error");
  }
});

export default router;
