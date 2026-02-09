
const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");

const {
  createExam,
  getAllExams,
  getExamById,
  getExamAnalytics,
  getExamQuestionsByExamId,
} = require("../controllers/examController");


// Create exam (teacher only)
router.post("/", auth(["teacher"]), createExam);

// View all exams
router.get("/", auth(["teacher", "student"]), getAllExams);

// View exam by ID
router.get("/:id", auth(["teacher", "student"]), getExamById);

// Get exam questions by exam ID
router.get("/:id/questions", auth(["teacher", "student"]), getExamQuestionsByExamId);

// Analytics
router.get("/:exam_id/analytics", auth(["admin", "teacher"]), getExamAnalytics);

module.exports = router; // ✅ this line is mandatory
