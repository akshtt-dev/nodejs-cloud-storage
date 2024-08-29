import fs from "fs";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
const conn = mongoose.createConnection(process.env.MONGO_URI);

let gfsBucket;
let dbConnected = false;

conn.once("open", () => {
  console.log("MongoDB connected successfully.");
  const db = conn.db;
  gfsBucket = new GridFSBucket(db, { bucketName: "thumbnails" });
  dbConnected = true;
});

conn.on("error", (err) => {
  console.error("MongoDB connection error:", err);
  dbConnected = false;
});

export async function uploadThumbnailToMongo(thumbnailPath, filename) {
  if (!dbConnected) {
    throw new Error("Database connection not established.");
  }

  if (!fs.existsSync(thumbnailPath)) {
    throw new Error("Thumbnail file does not exist.");
  }

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(thumbnailPath);
    const uploadStream = gfsBucket.openUploadStream(filename);

    let uploadedBytes = 0;
    const totalBytes = fs.statSync(thumbnailPath).size;

    console.log("Uploading thumbnail...");

    fileStream
      .on("data", (chunk) => {
        uploadedBytes += chunk.length;
        const progress = ((uploadedBytes / totalBytes) * 100).toFixed(2);
        console.log(`Thumbnail Upload Progress: ${progress}%`);
      })
      .on("error", (err) => {
        console.error("Error reading file stream:", err);
        fileStream.destroy();
        uploadStream.abort();
        reject(err);
      })
      .pipe(uploadStream)
      .on("close", () => {
        console.log("Thumbnail uploaded successfully.");
        resolve();
      })
      .on("error", (err) => {
        console.error("Error uploading thumbnail:", err);
        reject(err);
      });
  });
}
