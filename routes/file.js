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
        fs.unlink(thumbnailPath);
      }
      // Save file info in MongoDB
      await Upload.findOneAndUpdate(
        { username: username },
        {
          $push: {
            files: {
              originalName: file.originalname,
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
      res.status(500).json({ error: "Failed to process file" });
      throw new Error(error);
    }
    // Upload to SFTP and delete the local file afterward
    await uploadFunction(file, file.filename, username);
    await fs.unlink(imagePath);
  } catch (err) {
    console.error("Error during file upload:", err);
  }
});

async function processThumbnail(imagePath, thumbnailPath) {
  try {
    await sharp(imagePath).resize(200, 200).toFile(thumbnailPath);
  } catch (error) {
    console.error("Error processing thumbnail:", error);
  }
}

router.get("/preview/:filename", checkAuth, async (req, res) => {
  try {
    const username = req.session.user.username;
    const filename = req.params.filename;
    // TODO: Validate and sanitize inputs if necessary

    // Find the upload document
    const upload = await Upload.findOne({
      username: username,
      "files.filename": filename,
    });

    if (!upload) {
      return res.status(404).json({ error: "File not found" });
    }

    // Find the specific file within the upload
    const file = upload.files.find((file) => file.filename === filename);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if thumbnailBuffer exists
    if (!file.thumbnailBuffer) {
      return res.status(404).json({ error: "Thumbnail not found" });
    }

    res.set("Content-Type", file.fileType);
    res.send(file.thumbnailBuffer);
  } catch (error) {
    console.log("Error fetching thumbnail:", error);
    res.status(500).json({ error: "Failed to fetch thumbnail" });
  }
});

import { sftp } from "../index.js";

// TODO: works for now but still need to be refactored
router.get("/download/:filename", checkAuth, async (req, res) => {
  try {
    const username = req.session.user.username;
    const filename = req.params.filename;

    // Find the upload record in the database
    const upload = await Upload.findOne({
      username: username,
      "files.filename": filename,
    });
    const originalName = upload.files.find((file) => file.filename === filename).originalName;
    if (!upload) {
      return res.status(404).json({ error: "File not found" });
    }

    // Define the local temporary path where the file will be downloaded
    const localDir = join(__dirname, "../public/src/uploads/tmp");
    const localPath = join(localDir, filename);
    
    try {
      await fs.access(localDir);
    } catch (error) {
      await fs.mkdir(localDir, { recursive: true });
    }

    // Download the file from SFTP server to the local path
    try {
      await sftp.fastGet(`node-file-transfer/user-uploads/${username}/${filename}`, localPath);
    } catch (error) {
      console.error("Error downloading file from SFTP:", error);
      return res.status(500).json({ error: "Failed to download file from SFTP" });
    }
    
    // Verify the file exists before sending
    try {
      await fs.access(localPath);
    } catch (error) {
      console.error("Local file not found:", error);
      return res.status(404).json({ error: "File not found on local server" });
    }

    // Send the file to the client
    res.download(localPath, originalName, (err) => {
      // Cleanup: Delete the local temporary file after sending it to the client
      fs.unlink(localPath).catch(unlinkErr => {
        console.error("Error deleting temporary file:", unlinkErr);
      });

      if (err) {
        console.error("Download error:", err);
        return res.status(500).json({ error: "Failed to download file" });
      }
    });
  } catch (error) {
    console.error("Error in download route:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

export default router;
