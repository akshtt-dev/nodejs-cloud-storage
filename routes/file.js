import express from "express";
import multer from "multer";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import uploadFunction from "../functions/upload.js";
import fs from "fs";
import { v4 as uuidv4 } from 'uuid'; // Import UUID

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, join(__dirname, "../public/src/uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4(); // Generate a unique identifier
    const extension = file.originalname.split('.').pop(); // Get the file extension
    const uniqueFilename = `${uniqueSuffix}.${extension}`; // Create a unique filename with extension
    cb(null, uniqueFilename); // Save the file with the unique filename
  },
});

const upload = multer({ storage: storage });

router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.get("/", (req, res) => {
  res.render("file");
});

router.post("/upload", upload.single("file"), async function (req, res) {
  res.json({ message: "File uploaded successfully" });
  try {
    const uniqueFilename = req.file.filename; // Get the unique filename
    // Now that the file is saved locally, upload it to the SFTP server with the same unique name
    console.log("File processing started...");
    await uploadFunction(req.file, uniqueFilename);
    console.log("File processing completed.");

    // Delete the file from the local server
    fs.unlinkSync(req.file.path); 
    console.log("Local file deleted successfully.");
  } catch (err) {
    console.error("Error during file processing:", err);
  }
});

export default router;
