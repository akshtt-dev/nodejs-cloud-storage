import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now, // Automatically set the date to the current time
  },
  size: {
    type: Number,
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

const Upload = mongoose.model("Upload", mongooseSchema);

export default Upload;
