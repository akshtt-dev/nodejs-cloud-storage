import { sftp } from "../index.js";
import fs from "fs";

async function uploadFunction(file, uniqueFilename, username) {
  try {
    // Define the target directory on the SFTP server
    const targetDir = "node-file-transfer";
    // Use a forward slash to construct the remote path
    const remotePath = `${targetDir}/user-uploads/${username}/${uniqueFilename}`;

    // Check if the target directory exists, and create it if it does not
    try {
      const dirExists = await sftp.exists(targetDir);
      if (!dirExists) {
        await sftp.mkdir(targetDir, true);
        console.log(`Directory created: ${targetDir}`);
      }
    } catch (err) {
      console.error("Error ensuring directory exists on SFTP:", err);
      throw err; // Propagate the error
    }

    const localFileSize = fs.statSync(file.path).size; // Get the local file size
    let uploadedBytes = 0;

    // Create a read stream for the local file
    const readStream = fs.createReadStream(file.path);

    // Hook into the 'data' event to track progress
    let progress = 0;
    let lastProgress = 0;
    console.log("Uploading file to SFTP server...");
    readStream.on("data", (chunk) => {
      uploadedBytes += chunk.length;
      progress = (uploadedBytes / localFileSize) * 100;
      if (progress - lastProgress >= 10) {
        console.log(`Upload progress: ${progress.toFixed(2)}%`);
        lastProgress = progress;
      }
    });

    // Upload the file to the SFTP server with the unique filename
    await sftp.put(readStream, remotePath);

    console.log("File uploaded successfully to SFTP:", remotePath);
  } catch (err) {
    console.error("Error accessing SFTP:", err);
  }
}

export default uploadFunction;
