import Upload from "../models/upload.js";

// TODO: Implement the listFilesAndDirectories function to retrieve the files and directories for a given username from the database. The function should return an object with the following properties: 
// - files: an array of objects representing the files uploaded by the user. Each object should have the following properties:
//   - originalName: the original name of the file
//   - filename: the name of the file on the server
//   - date: the date the file was uploaded
//   - size: the size of the file in MB (rounded to 2 decimal places)
//   - thumbnailBuffer: a buffer containing the thumbnail image of the file
//   - fileType: the type of the file (e.g., image, video, audio, document)
// - directories: an array of objects representing the directories created by the user. Each object should have the following properties:
//   - directoryName: the name of the directory
//   - files: an array of objects representing the files in the directory. Each object should have the same properties as the files array above
// - totalDiskUsage: the total disk usage of the user in MB (rounded to 2 decimal places)
// The function should return an empty array if no files or directories are found for the given username. If an error occurs, the function should log the error and return an empty array. 

export async function listFilesAndDirectories(username) {
  try {
    const upload = await Upload.findOne({ username: username });

    if (!upload) {
      return { files: [], directories: [], totalDiskUsage: 0 };
    }

    let totalDiskUsage = 0;
    const files = upload.files.map((file) => {
      const fileSizeMB = file.size / 1024 / 1024;
      totalDiskUsage += fileSizeMB;
      return {
        originalName: file.originalName,
        filename: file.filename,
        date: file.date,
        size: fileSizeMB.toFixed(2),
        thumbnailBuffer: file.thumbnailBuffer,
        fileType: file.fileType,
      };
    });
    const directories = upload.directories.map((directory) => {
      return {
        directoryName: directory.directoryName,
        directoryId: directory.directoryId,
        files: directory.files.map((file) => {
          const fileSizeMB = file.size / 1024 / 1024;
          totalDiskUsage += fileSizeMB;
          return {
            originalName: file.originalName,
            filename: file.filename,
            date: file.date,
            size: fileSizeMB.toFixed(2),
            thumbnailBuffer: file.thumbnailBuffer,
            fileType: file.fileType,
          };
        }),
      };
    });
    return {
      files,
      directories,
      totalDiskUsage: totalDiskUsage.toFixed(2),
    };
  } catch (err) {
    console.error("Error listing files and directories:", err);
    return { files: [], directories: [], totalDiskUsage: 0 };
  }
}