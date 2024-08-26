import express from 'express';
const router = express.Router();

router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.get("/", (req, res) => {
  res.render("upload");
});

export default router;