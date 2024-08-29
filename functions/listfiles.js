import Upload from "../models/Upload.js";

export async function listFilesFunction(username) {
  try {
    // Retrieve the document for the specified username
    const upload = await Upload.findOne({ username: username });

    // Check if the document was found
    if (!upload) {
      return [];
    }

    // Directly map the filenames from the files array
    const files = upload.files.map(file => file.filename);
    
    return files;
  } catch (err) {
    console.error("Error listing files:", err);
    return [];
  }
}
