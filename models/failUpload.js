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
      fileType: {
        type: String,
        required: true,
      },
});


const failUploadSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    files: {
        type: [fileSchema],
        default: [],
    },
});

const reportFailUpload = mongoose.model("Failed-Uploads", failUploadSchema);

export default reportFailUpload;