import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.render("index", { title: "Mongo File Upload"});
});

export default router;
