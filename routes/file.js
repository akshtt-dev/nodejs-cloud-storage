import express from "express";
import multer from "multer";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import fs from "fs/promises";
import mime from "mime-types";
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

router.post("/upload", checkAuth, upload.single("file"), async (req, res) => {
  const username = req.session.user.username;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const mimeType = mime.lookup(file.originalname);
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
  const imagePath = join(__dirname, "../public/src/uploads", file.filename);
  const thumbnailPath = join(
    __dirname,
    "../public/src/uploads",
    `thumb_${file.filename}`
  );

  try {
    // Process the thumbnail if the file is an allowed image type
    try {
      let thumbnailBuffer;
      if (allowedMimeTypes.includes(mimeType)) {
        await processThumbnail(imagePath, thumbnailPath);
        thumbnailBuffer = await fs.readFile(thumbnailPath);
      }
      // Save file info in MongoDB
      await Upload.findOneAndUpdate(
        { username: username },
        {
          $push: {
            files: {
              filename: file.filename,
              size: file.size,
              thumbnailBuffer,
              fileType: mimeType,
            },
          },
        },
        { upsert: true, new: true }
      );
      // Respond to the user immediately
      res.json({ message: "File uploaded successfully" });
    } catch (error) {
      throw new Error("An error occurred");
    }
    // Upload to SFTP and delete the local file afterward
    await uploadFunction(file, file.filename, username);
    await fs.unlink(file.path);
  } catch (err) {
    console.error("Error during file upload:", err);
    res.status(500).json({ error: "File upload failed" });
  }
});

async function processThumbnail(imagePath, thumbnailPath) {
  try {
    await sharp(imagePath).resize(200, 200).toFile(thumbnailPath);
  } catch (error) {
    console.error("Error processing thumbnail:", error);
  }
}

export default router;
