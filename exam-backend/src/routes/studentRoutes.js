



const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const {
  startExam,
  submitExam,
  getMyResults,
  logViolation,
  getAvailableExams,
  getSubjectPerformance,
  getWrongQuestions,
  getProfile,
  takeExam,
  updateProfile,
  removestdProfilePic
} = require("../controllers/studentController");



// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, req.user.id + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ---------------- STUDENT EXAM ROUTES ----------------
router.post("/exams/:examId/start", auth(["student"]), startExam);

// router.post("/exams/:examId/submit", auth(["student"]), submitExam);
router.get("/results", auth(["student"]), getMyResults);

// Fetch all available exams
router.get("/exams", auth(["student"]), getAvailableExams);


// // Submit exam
// router.post("/exams/:id/submit", auth(["student"]), submitExam);
router.get("/take-exam/:examId", auth(["student"]), takeExam);
router.post("/:examId/submit", auth(["student"]), submitExam);


// Log violation
router.post("/proctoring/violation", auth(["student"]), logViolation);


  // Get subject-wise performance
  router.get("/subject-performance", auth(["student"]), getSubjectPerformance);

  // Get wrong questions
  router.get("/wrong-questions", auth(["student"]), getWrongQuestions);

  router.get("/profile", auth(["student"]), getProfile);
  router.put("/profile", auth(["student"]), upload.single("profile_pic"), updateProfile);
  router.delete("/profile-pic", auth(["admin"]), removestdProfilePic);

module.exports = router;
