import { sftp } from "../index.js";

export async function listFilesFunction(username) {
  try {
    const targetDir = "node-file-transfer";
    const remotePath = `${targetDir}/user-uploads/${username}`;

    const dirExists = await sftp.exists(remotePath);
    if (!dirExists) {
      console.log(`Directory does not exist: ${remotePath}`);
      return [];
    }

    const files = await sftp.list(remotePath);
    return files;
  } catch (err) {
    console.error("Error accessing SFTP:", err);
    return []; // Return an empty array on error
  }
}
