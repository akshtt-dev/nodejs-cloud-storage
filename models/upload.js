import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  size: {
    type: Number,
    required: true,
  },
  thumbnailBuffer: {
    type: Buffer,
    default: null,
  },
  fileType: {
    type: String,
    required: true,
  },
});

const mongooseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Ensure the username is unique in the collection
  },
  files: {
    type: [fileSchema], // Array of file details
    default: [], // Default to an empty array
  },
});

const Upload = mongoose.models.Upload || mongoose.model("Upload", mongooseSchema);

export default Upload;
