
const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { getAllSubjects } = require("../controllers/subjectController");
router.get("/", auth(["teacher", "student"]), getAllSubjects);

module.exports = router;
