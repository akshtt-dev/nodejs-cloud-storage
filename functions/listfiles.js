import Upload from "../models/upload.js";

export async function listFilesFunction(username) {
  try {
    // Retrieve the document for the specified username
    const upload = await Upload.findOne({ username: username });

    // Check if the document was found
    if (!upload) {
      return [];
    }
    const files = upload.files.map((file) => ({
      originalName: file.originalName,
      filename: file.filename,
      date: file.date,
      size: (file.size / 1024 / 1024).toFixed(2),
      thumbnailBuffer: file.thumbnailBuffer,
      fileType: file.fileType,
    }));

    return files;
  } catch (err) {
    console.error("Error listing files:", err);
    return [];
  }
}
