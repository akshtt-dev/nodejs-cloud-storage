import express from "express";
import multer from "multer";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import uploadFunction from "../functions/upload.js";
import fs from "fs";
import { v4 as uuidv4 } from 'uuid';
import { checkAuth } from "../index.js";
import Upload from "../models/upload.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, join(__dirname, "../public/src/uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const extension = file.originalname.split('.').pop();
    const uniqueFilename = `${uniqueSuffix}.${extension}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({ storage: storage });

router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.get("/", (req, res) => {
  res.render("file");
});

router.post("/upload", checkAuth, upload.single("file"), async function (req, res) {
  // TODO: add a function so that only certain file types are uploaded or add functionality to upload al file types
  try {
    const username = req.session.user.username;
    const filename = req.file.filename;

    // Find the user's document and update it with the new filename
    await Upload.findOneAndUpdate(
      { username: username },
      { $push: { files: { filename: req.file.filename, size: req.file.size } } },
      { upsert: true, new: true }
    );    

    console.log("File record updated successfully.", username, filename);
    res.json({ message: "File uploaded successfully" });

    // Proceed with the file processing
    console.log("File processing started...");
    await uploadFunction(req.file, filename);
    console.log("File processing completed.");

    // Delete the file from the local server
    fs.unlinkSync(req.file.path); 
    console.log("Local file deleted successfully.");
  } catch (err) {
    console.error("Error during file upload:", err);
    res.status(500).json({ error: "File upload failed" });
  }
});

export default router;
