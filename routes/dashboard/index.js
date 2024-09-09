import express from "express";
import { checkAuth } from "../../index.js";
import { listFilesFunction } from "../../functions/listfiles.js";
import * as svg from "../../components/svg/svg.js";
const router = express.Router();

router.get("/", checkAuth, async (req, res) => {
  try {
    const { files, totalDiskUsage } = await listFilesFunction(
      req.session.user.username
    );
    res.render("dashboard/index", {
      layout: "dashboard",
      title: "Dashboard",
      user: req.session.user.username,
      files,
      filesCount: files.length,
      totalDiskUsage,
      hamburgerSvg: svg.hamburgerSvg,
    });
  } catch (err) {
    console.error("Error retrieving files:", err);
    res.status(500).send("Error retrieving files");
  }
});

router.get("/upload", checkAuth, (req, res) => {
  res.render("dashboard/upload", {
    layout: "dashboard",
    title: "Dashboard - Upload",
    user: req.session.user.username,
    hamburgerSvg: svg.hamburgerSvg,
  });
});

router.get("/files", checkAuth, async (req, res) => {
  try {
    const { files } = await listFilesFunction(req.session.user.username);
    res.render("dashboard/files", {
      layout: "dashboard",
      title: "Dashboard - Files",
      user: req.session.user.username,
      files,
      filesCount: files.length,
      hamburgerSvg: svg.hamburgerSvg,
      optionsSvg: svg.optionsSvg,
    });
  } catch (err) {
    console.error("Error retrieving files:", err);
    res.status(500).send("Error retrieving files");
  }
});

export default router;

// TODO: ADD MIDDLEWARE FUNCTIONALITY
