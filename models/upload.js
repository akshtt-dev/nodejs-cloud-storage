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
  filepath: {
    type: String,
    required: true,
  },
});

const directorySchema = new mongoose.Schema({
  directoryName: {
    type: String,
    required: true,
  },
  directoryId: {
    type: String,
    required: true
  },
  files: {
    type: [fileSchema],
    default: [],
  },
  dirpath: {
    type: String,
    default: "local",
  },
});

const mongooseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Ensure the username is unique in the collection
  },
  directories: {
    type: [directorySchema],
    default: [],
  },
  files: {
    type: [fileSchema], // Array of file details
    default: [], // Default to an empty array
  },
});

const Upload =
  mongoose.models.Upload || mongoose.model("Upload", mongooseSchema);

export default Upload;
