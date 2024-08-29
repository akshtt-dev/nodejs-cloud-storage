import express from "express";
import multer from "multer";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import fs from "fs";
import mime from "mime-types";
import { uploadThumbnailToMongo } from "../functions/uploadThumbnail.js";
import uploadFunction from "../functions/upload.js";
import Upload from "../models/upload.js";
import { checkAuth } from "../index.js";
import { v4 as uuidv4 } from "uuid";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, "../public/src/uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = file.originalname.split(".").pop();
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

// TODO: FIX THIS UPLOAD
router.post("/upload", checkAuth, upload.single("file"), async (req, res) => {
  const username = req.session.user.username;
  const file = req.file;
  try {
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Check file type
    const mimeType = mime.lookup(file.originalname);
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];

    // Save file info in MongoDB
    await Upload.findOneAndUpdate(
      { username: username },
      { $push: { files: { filename: file.filename, size: file.size } } },
      { upsert: true, new: true }
    );
    // Respond to the user immediately
    res.json({ message: "File uploaded successfully" });

    // Define file paths
    const imagePath = join(__dirname, "../public/src/uploads", file.filename);
    const thumbnailPath = join(
      __dirname,
      "../public/src/uploads",
      `thumb_${file.filename}`
    );

    // Create and handle thumbnails and SFTP upload concurrently
    const thumbnailPromise = (async () => {
      if (
        allowedMimeTypes.includes(mimeType) &&
        mimeType.startsWith("image/")
      ) {
        try {
          if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file does not exist: ${imagePath}`);
          }

          await sharp(imagePath).resize(200, 200).toFile(thumbnailPath);

          await uploadThumbnailToMongo(thumbnailPath, `thumb_${file.filename}`);

          fs.unlinkSync(thumbnailPath);
        } catch (error) {
          console.error("Error processing thumbnail:", error);
          throw error;
        }
      }
    })();

    const sftpUploadPromise = uploadFunction(file, file.filename, username);

    // Wait for both operations to complete (optional)
    try {
      await Promise.all([thumbnailPromise, sftpUploadPromise]);
    } catch (error) {
      console.error("Error during concurrent operations:", error);
    }

    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.error(`Error deleting file: ${file.path}`, err);
    }
  } catch (err) {
    console.error("Error during file upload:", err);
    res.status(500).json({ error: "File upload failed" });
  }
});

export default router;
