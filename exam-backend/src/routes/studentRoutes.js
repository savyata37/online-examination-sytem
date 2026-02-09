



const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const {
  startExam,
  submitExam,
  getMyResults,
  logViolation,
  getAvailableExams,
  getSubjectPerformance,
  getWrongQuestions,
} = require("../controllers/studentController");

// ---------------- STUDENT EXAM ROUTES ----------------
router.post("/exams/:examId/start", auth(["student"]), startExam);
// router.post("/exams/:examId/submit", auth(["student"]), submitExam);
router.get("/results", auth(["student"]), getMyResults);

// Fetch all available exams
router.get("/exams", auth(["student"]), getAvailableExams);


// Submit exam
router.post("/exams/:id/submit", auth(["student"]), submitExam);

// Log violation
router.post("/proctoring/violation", auth(["student"]), logViolation);


  // Get subject-wise performance
  router.get("/subject-performance", auth(["student"]), getSubjectPerformance);

  // Get wrong questions
  router.get("/wrong-questions", auth(["student"]), getWrongQuestions);

module.exports = router;
