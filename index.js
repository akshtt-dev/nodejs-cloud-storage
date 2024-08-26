import express from "express";
import mongoose from "mongoose";
import { engine } from "express-handlebars";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

main()
  .then(() => console.log("Connected to database."))
  .catch((err) => console.log(err));
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
}

// SFTP CLIENT
import Client from 'ssh2-sftp-client';
let sftp; // Declare sftp as a let variable

async function connectSFTP() {
  const sftpConfig = {
    host: process.env.SFTP_HOST,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
    port: process.env.SFTP_PORT,
    retries: 5,
    retry_factor: 2,
    retry_minTimeout: 2000,
  };
  
  sftp = new Client();
  
  try {
    await sftp.connect(sftpConfig);
    console.log("Connected to SFTP server.");
  } catch (err) {
    console.error("SFTP connection error:", err);
    process.exit(1); // Exit the application if the SFTP connection fails
  }
}

await connectSFTP(); // Initialize SFTP before exporting

const app = express();

// Middleware to serve static files
app.use(express.static(join(__dirname, "public")));

// Setting up Handlebars as the view engine
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", join(__dirname, "views"));

// Middleware to remove trailing slashes from URLs
app.use((req, res, next) => {
  if (req.path.substr(-1) === "/" && req.path.length > 1) {
    const query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    next();
  }
});

import indexRouter from "./routes/index.js";
import uploadRouter from "./routes/upload.js";
import fileRouter from "./routes/file.js";
app.use("/", indexRouter);
app.use("/upload", uploadRouter);
app.use("/file", fileRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export { sftp }; // Export after sftp is initialized