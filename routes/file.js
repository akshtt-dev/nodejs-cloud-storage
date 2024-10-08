import express from "express";
import multer from "multer";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import fs from "fs/promises";
import mime from "mime-types";
import uploadFunction from "../functions/upload.js";
import Upload from "../models/upload.js";
import Account from "../models/accounts.js";
import { checkAuth } from "../index.js";
import { v4 as uuidv4 } from "uuid";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const username = req.session.user.username;
    const localDir = join(__dirname, `../private/uploads/${username}`);
    try {
      await fs.access(localDir);
    } catch (error) {
      await fs.mkdir(localDir, { recursive: true });
    }
    cb(null, localDir);
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
  const imagePath = join(
    __dirname,
    `../private/uploads/${username}`,
    file.filename
  );
  const thumbnailPath = join(
    __dirname,
    `../private/uploads/${username}`,
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
              fileType: mimeType || "other",
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
    const { username } = req.session.user;
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ error: "No filename provided" });
    }

    // Find the upload record in the database
    const upload = await Upload.findOne({
      username,
      "files.filename": filename,
    });

    if (!upload) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = upload.files.find((f) => f.filename === filename);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const originalName = file.originalName;
    const localDir = join(__dirname, "../private/uploads");
    const localTmpDir = join(localDir, "tmp");
    const localFilePath = join(localDir, username, filename);

    // Check if file is stored remotely
    if (file.filepath === "remote") {
      try {
        await fs.mkdir(localTmpDir, { recursive: true });

        const tmpFilePath = join(localTmpDir, filename);
        await sftp.fastGet(
          `node-file-transfer/user-uploads/${username}/${filename}`,
          tmpFilePath
        );

        // Send file and delete temp file after download
        return res.download(tmpFilePath, originalName, async (err) => {
          if (err) {
            console.error("Download error:", err);
            return res.status(500).json({ error: "Failed to download file" });
          }
          await fs
            .unlink(tmpFilePath)
            .catch((err) => console.error("Failed to delete temp file:", err));
        });
      } catch (error) {
        console.error("Error handling remote file:", error);
        return res.status(500).json({ error: "Failed to handle remote file" });
      }
    }

    // Handle local file
    res.download(localFilePath, originalName, (err) => {
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
      const localPath = join(
        __dirname,
        `../private/uploads/${username}`,
        filename
      );
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

router.get("/delete-folder/:foldername", checkAuth, async (req, res) => {
  const folderId = req.params.foldername;
  const username = req.session.user.username;

  if (!folderId) {
    return res.status(400).json({ error: "No folder name provided" });
  }

  try {
    // Find the upload record in the database
    const user = await Account.findOne({ username: username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the folder in the database
    const upload = await Upload.findOne({
      username: username,
      "directories.directoryId": folderId,
    });

    if (!upload) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Find the folder metadata
    const folder = upload.directories.find((f) => f.directoryId === folderId);

    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Check if the folder is stored remotely (on the SFTP server)
    if (folder.filepath === "remote") {
      try {
        // Attempt to delete the folder from the SFTP server
        await sftp.rmdir(
          `node-file-transfer/user-uploads/${username}/${folderId}`
        );
        console.log(`Folder ${folderId} deleted from SFTP server`);
      } catch (error) {
        console.error("Error deleting folder from SFTP:", error);
        return res
          .status(500)
          .json({ error: "Failed to delete folder from SFTP" });
      }
    } else {
      // If the folder is stored locally, delete it from the local storage
      const localPath = join(
        __dirname,
        `../private/uploads/${username}/${folderId}`
      );
      try {
        await fs.rm(localPath, { recursive: true });
        console.log(`Folder ${folderId} deleted from local storage`);
      } catch (error) {
        console.error("Error deleting local folder:", error);
        return res.status(500).json({ error: "Failed to delete local folder" });
      }
    }

    // Remove the folder record from MongoDB
    const result = await Upload.findOneAndUpdate(
      { username: username },
      { $pull: { directories: { directoryId: folderId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Folder not found in database" });
    }

    // Respond with success
    res.status(200).json({ message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

// TODO: fix any potential bugs
router.get("/create-folder/:foldername", checkAuth, async (req, res) => {
  const folderName = req.params.foldername;
  const username = req.session.user.username;

  if (!folderName) {
    return res.status(400).json({ error: "No folder name provided" });
  }

  try {
    // Find the upload record in the database
    const user = await Account.findOne({ username: username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const uuid = uuidv4();
    // Check if the folder already exist if not then create it
    await fs.mkdir(join(__dirname, `../private/uploads/${username}/${uuid}`), {
      recursive: true,
    });
    await Upload.findOneAndUpdate(
      { username: username },
      {
        $push: {
          directories: {
            directoryName: folderName,
            directoryId: uuid,
            filepath: "local", // local file path initially
          },
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Folder created successfully" });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ error: "Failed to create folder" });
  }
});

export default router;
