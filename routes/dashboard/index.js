import express from "express";
import { checkAuth } from "../../index.js";
import { listFilesFunction } from "../../functions/listfiles.js";
const router = express.Router();

router.get("/", checkAuth, (req, res) => {
  res.render("dashboard/index", {
    layout: "dashboard",
    title: "Dashboard",
    user: req.session.user.username,
  });
});

router.get("/upload", checkAuth, (req, res) => {
  res.render("dashboard/upload", {
    layout: "dashboard",
    title: "Dashboard - Upload",
    user: req.session.user.username,
  });
});

router.get("/gallery", checkAuth, async (req, res) => {
  try {
    const files = await listFilesFunction(req.session.user.username);
    res.render("dashboard/gallery", {
      layout: "dashboard",
      title: "Dashboard - Gallery",
      user: req.session.user.username,
      files: files,
      filesCount: files.length,
    });
  } catch (err) {
    console.error("Error retrieving files:", err);
    res.status(500).send("Error retrieving files");
  }
});

export default router;

// TODO: ADD MIDDLEWARE FUNCTIONALITY
