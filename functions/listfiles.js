import Upload from "../models/upload.js";

export async function listFilesFunction(username) {
  try {
    const upload = await Upload.findOne({ username: username });

    if (!upload) {
      return { files: [], totalDiskUsage: 0 };
    }

    let totalDiskUsage = 0;
    const files = upload.files.map((file) => {
      const fileSizeMB = file.size / 1024 / 1024; // Convert size to MB
      totalDiskUsage += fileSizeMB; // total disk usage in MB

      return {
        originalName: file.originalName,
        filename: file.filename,
        date: file.date,
        size: fileSizeMB.toFixed(2),
        thumbnailBuffer: file.thumbnailBuffer,
        fileType: file.fileType,
      };
    });

    return { files, totalDiskUsage: totalDiskUsage.toFixed(2) }; // Return total disk usage
  } catch (err) {
    console.error("Error listing files:", err);
    return { files: [], totalDiskUsage: 0 };
  }
}
