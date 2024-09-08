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
  res.redirect("/dashboard/files");
});

router.post("/upload", checkAuth, upload.single("file"), async (req, res) => {
  const username = req.session.user.username;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const mimeType = mime.lookup(file.originalname);
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
  ];
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
        await fs.unlink(thumbnailPath);
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
              filepath: "local", // local file path initially
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
    // Attempt to upload the file to the SFTP server
    try {
      await uploadFunction(file, file.filename, username);
      await Upload.updateOne(
        { username: username, "files.filename": file.filename },
        { $set: { "files.$.filepath": "remote" } }
      );
    } catch (sftpError) {
      console.error("SFTP upload failed:", sftpError);
      return;
    }
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
    if (!filename) {
      return res.status(400).json({ error: "No filename provided" });
    }
    // Find the upload record in the database
    const upload = await Upload.findOne({
      username: username,
      "files.filename": filename,
    });
    const originalName = upload.files.find(
      (file) => file.filename === filename
    ).originalName;
    if (!upload) {
      return res.status(404).json({ error: "File not found" });
    }

    // Define the local temporary path where the file will be downloaded
    const localDir = join(__dirname, "../public/src/uploads/tmp");
    const localPath = join(localDir, filename);

    if (upload.files.filepath === "remote") {
      try {
        await fs.access(localDir);
      } catch (error) {
        await fs.mkdir(localDir, { recursive: true });
      }

      // Download the file from SFTP server to the local path
      try {
        await sftp.fastGet(
          `node-file-transfer/user-uploads/${username}/${filename}`,
          localPath
        );
      } catch (error) {
        console.error("Error downloading file from SFTP:", error);
        return res
          .status(500)
          .json({ error: "Failed to download file from SFTP" });
      }

      // Verify the file exists before sending
      try {
        await fs.access(localPath);
      } catch (error) {
        console.error("Local file not found:", error);
        return res
          .status(404)
          .json({ error: "File not found on local server" });
      }

      // Send the file to the client
      res.download(localPath, originalName, (err) => {
        // Cleanup: Delete the local temporary file after sending it to the client
        fs.unlink(localPath).catch((unlinkErr) => {
          console.error("Error deleting temporary file:", unlinkErr);
        });

        if (err) {
          console.error("Download error:", err);
          return res.status(500).json({ error: "Failed to download file" });
        }
      });
    } else {
      const localPath = join(__dirname, "../public/src/uploads", filename);
      res.download(localPath, originalName, (err) => {
        if (err) {
          console.error("Download error:", err);
          return res.status(500).json({ error: "Failed to download file" });
        }
      });
    }
  } catch (error) {
    console.error("Error in download route:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

router.get("/delete/:filename", checkAuth, async (req, res) => {
  const username = req.session.user.username;
  const filename = req.params.filename;

  if (!filename) {
    return res.status(400).json({ error: "No filename provided" });
  }

  try {
    // Find the file document in the database
    const upload = await Upload.findOne({
      username: username,
      "files.filename": filename,
    });

    if (!upload) {
      return res.status(404).json({ error: "File not found" });
    }

    // Find the file metadata
    const file = upload.files.find((f) => f.filename === filename);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if the file is stored remotely (on the SFTP server)
    if (file.filepath === "remote") {
      try {
        // Attempt to delete the file from the SFTP server
        await sftp.delete(
          `node-file-transfer/user-uploads/${username}/${filename}`
        );
        console.log(`File ${filename} deleted from SFTP server`);
      } catch (error) {
        console.error("Error deleting file from SFTP:", error);
        return res
          .status(500)
          .json({ error: "Failed to delete file from SFTP" });
      }
    } else {
      // If the file is stored locally, delete it from the local storage
      const localPath = join(__dirname, "../public/src/uploads", filename);
      try {
        await fs.unlink(localPath);
        console.log(`File ${filename} deleted from local storage`);
      } catch (error) {
        console.error("Error deleting local file:", error);
        return res.status(500).json({ error: "Failed to delete local file" });
      }
    }

    // Remove the file record from MongoDB
    const result = await Upload.updateOne(
      { username: username },
      { $pull: { files: { filename: filename } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "File not found in database" });
    }

    // Respond with success
    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
