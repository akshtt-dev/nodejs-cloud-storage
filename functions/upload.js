import { sftp } from "../index.js";
import fs from "fs";

async function uploadFunction(file, uniqueFilename) {
  try {
    // Define the target directory on the SFTP server
    const targetDir = "node-file-transfer"; 
    // Use a forward slash to construct the remote path
    const remotePath = `${targetDir}/${uniqueFilename}`; 

    // Check if the target directory exists, and create it if it does not
    try {
      const dirExists = await sftp.exists(targetDir);
      if (!dirExists) {
        await sftp.mkdir(targetDir, true); // Create the directory, including parent directories if needed
        console.log(`Directory created: ${targetDir}`);
      }
    } catch (err) {
      console.error("Error ensuring directory exists on SFTP:", err);
      return;
    }

    const localFileSize = fs.statSync(file.path).size; // Get the local file size
    let uploadedBytes = 0;

    // Create a read stream for the local file
    const readStream = fs.createReadStream(file.path);

    // Hook into the 'data' event to track progress
    readStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const progress = (uploadedBytes / localFileSize) * 100;
      console.log(`Upload progress: ${progress.toFixed(2)}%`);
    });

    // Upload the file to the SFTP server with the unique filename
    await sftp.put(readStream, remotePath);

    console.log("File uploaded successfully to SFTP:", remotePath);
  } catch (err) {
    console.error("Error accessing SFTP:", err);
  }
}

export default uploadFunction;
