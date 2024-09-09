import express from "express";
import { checkAuth } from "../../index.js";
import { listFilesAndDirectories } from "../../functions/listfiles.js";
import * as svg from "../../components/svg/svg.js";
import Upload from "../../models/upload.js";
const router = express.Router();

router.get("/", checkAuth, async (req, res) => {
  try {
    const { files, totalDiskUsage } = await listFilesAndDirectories(
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
  const username = req.session.user.username;
  try {
    const { files, directories } = await listFilesAndDirectories(username);
    res.render("dashboard/files", {
      layout: "dashboard",
      title: "Dashboard - Files",
      user: req.session.user.username,
      files,
      filesCount: files.length + directories.length,
      hamburgerSvg: svg.hamburgerSvg,
      optionsSvg: svg.optionsSvg,
      uploadIconSvg: svg.uploadIconSvg,
      createFolderSvg: svg.createFolderSvg,
      closeSvg: svg.closeSvg,
      directories,
      floatingButtonSvg: svg.floatingButtonSvg,
    });
  } catch (err) {
    console.error("Error retrieving files:", err);
    res.status(500).send("Error retrieving files");
  }
});

//function to get files in a directory
// TODO: need to be fixed
router.get("/files/:dirname", checkAuth, async (req, res) => {
  const username = req.session.user.username;
  const dirname = req.params.dirname;

  if (!dirname) {
    res.status(400).send("Invalid directory name");
    return;
  }

  let dir;
  try {
    const file = await Upload.findOne({
      username: username,
      "directories.directoryId": dirname,
    });
    if (!file) {
      res.status(404).send("Directory not found");
      return;
    }
    dir = file.directories.find((dir) => dir.directoryId === dirname);
    if (!dir) {
      res.status(404).send("Directory not found");
      return;
    }
  } catch (err) {
    console.error("Error retrieving files:", err);
    res.status(500).send("Error retrieving files");
  }
  try {
    const { files, directories } = await listFilesAndDirectories(
      username,
      dirname
    );
    res.render("dashboard/files", {
      layout: "dashboard",
      title: "Dashboard - Files",
      user: req.session.user.username,
      files,
      filesCount: files.length + directories.length,
      hamburgerSvg: svg.hamburgerSvg,
      optionsSvg: svg.optionsSvg,
      uploadIconSvg: svg.uploadIconSvg,
      createFolderSvg: svg.createFolderSvg,
      closeSvg: svg.closeSvg,
      directories,
      dirName: dir.directoryName,
      dirId: dir.directoryId,
      floatingButtonSvg: svg.floatingButtonSvg,
    });
  } catch (err) {
    console.error("Error retrieving files:", err);
    res.status(500).send("Error retrieving files");
  }
});

export default router;
