import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { sftp } from "../index.js";
import reportFailUpload from "../models/failUpload.js";

async function uploadFunction(file, uniqueFilename, username) {
  try {
    const targetDir = "node-file-transfer";
    const remotePath = `${targetDir}/user-uploads/${username}/${uniqueFilename}`;

    // Ensure the target directory exists
    try {
      const dirExists = await sftp.exists(targetDir);
      if (!dirExists) {
        await sftp.mkdir(targetDir, true);
        console.log(`Directory created: ${targetDir}`);
      }
    } catch (err) {
      console.error("Error ensuring directory exists on SFTP:", err);
      throw err;
    }

    // Get the local file size
    const stat = await fsPromises.stat(file.path);
    const localFileSize = stat.size;
    let uploadedBytes = 0;

    // Create a read stream for the local file
    const readStream = fs.createReadStream(file.path);
    
    let progress = 0;
    let lastProgress = 0;
    
    console.log("Uploading file to SFTP server...");
    
    // Track progress as the file is being uploaded
    readStream.on("data", (chunk) => {
      uploadedBytes += chunk.length;
      progress = (uploadedBytes / localFileSize) * 100;
      if (progress - lastProgress >= 10) {
        console.log(`Upload progress: ${progress.toFixed(2)}%`);
        lastProgress = progress;
      }
    });

    // Use the stream to upload the file to SFTP
    await sftp.put(readStream, remotePath);

    console.log("File uploaded successfully to SFTP:", remotePath);

    // Close the stream manually once the upload is complete
    readStream.destroy();

    // Delete the local file after the upload is complete
    try {
      await fsPromises.unlink(file.path);
      console.log("File deleted successfully after upload.");
    } catch (err) {
      console.error("Error deleting file after upload:", err);
    }

  } catch (err) {
    // Log failed uploads to the database
    await reportFailUpload.findOneAndUpdate(
      { username: username },
      {
        $push: {
          files: [
            {
              originalName: file.originalname,
              filename: uniqueFilename,
              date: new Date(),
              size: file.size,
              fileType: file.mimetype,
            },
          ],
        },
      },
      { upsert: true, new: true }
    );
    throw err;
  }
}

export default uploadFunction;
