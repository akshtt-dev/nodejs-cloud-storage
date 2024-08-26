import express from "express";
import { checkAuth } from "../../index.js";
const router = express.Router();

router.get("/", checkAuth, (req, res) => {
  res.render("dashboard/index", { layout: "dashboard", title: "Dashboard", user: req.session.user.username });
});

router.get("/upload", (req, res) => {
  res.render("dashboard/upload", { layout: "dashboard", title: "Dashboard - Upload", user: req.session.user.username });
});

export default router;

// TODO: ADD MIDDLEWARE FUNCTIONALITY