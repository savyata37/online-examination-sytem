

const express = require("express");
const { logViolation } = require("../controllers/proctoringController");
const { auth } = require("../middleware/authMiddleware");

const router = express.Router();

// Only STUDENTS can log violations
router.post("/log", auth(["student"]), logViolation);

module.exports = router;
