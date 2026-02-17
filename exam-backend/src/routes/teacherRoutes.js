

const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const {
  getQuestionsBySubject,
  createQuestion,
  addQuestionsToExam,
  getExamById,
  createExam,
  getAllExams,

  getAddedQuestionsByExam,
  getStudentAnalytics,
  getSubjects,
  getTeacherExams,
  getExamAnalytics,
  getExamResults,
  getProfile,
  updateProfile,
  getMySubjectsAnalytics,
  getSelfAnalytics,
  getProctoringViolations,
  removeProfilePic


  //   getSubjects,
  // getTeacherExams,
   // getExamAnalytics,
  // getMyStudentsAnalytics1,
  // getMyExamsAnalytics,
  // getMySubjectsAnalytics,
  // getMyPerformanceAnalytics,
  // getExamAnalyticsByStudent,
  // getMyStudentAnalyticsById
} = require("../controllers/teacherController");


const teacherAuth = auth(["teacher", "admin"]);
// // All routes require teacher/admin
// router.use(auth(["teacher", "admin"]));

// console.log("createExam =", createExam);


// ------------------ File upload config ------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, req.user.id + path.extname(file.originalname)),
});
const upload = multer({ storage });

/* ---------------- EXAMS ---------------- */
router.post("/exams", teacherAuth, createExam);
router.get("/exams", teacherAuth, getAllExams);
router.get("/exams/:examid", teacherAuth, getExamById);
router.post("/exams/:examid/questions", teacherAuth, addQuestionsToExam);

router.get("/exams/:examid/questions-added", teacherAuth, getAddedQuestionsByExam);

// // TEACHER ANALYTICS

// Subjects
router.get("/subjects", teacherAuth,getSubjects);

// Exams
router.get("/exams", teacherAuth, getTeacherExams);

// Students analytics
router.get("/analytics/students", teacherAuth, getStudentAnalytics);

// Exam analytics
router.get("/analytics/examResults", teacherAuth, getExamResults);

router.get("/analytics/exam/:examid", teacherAuth, getExamAnalytics);

// GET all violations
router.get('/proctoring_violations',teacherAuth, getProctoringViolations);


router.get("/my-subjects", teacherAuth, getMySubjectsAnalytics);
router.get("/self", teacherAuth, getSelfAnalytics);



/* ---------------- QUESTIONS ---------------- */
router.get("/questions",  teacherAuth, getQuestionsBySubject); // ?subjectid=...
router.post("/questions", teacherAuth, createQuestion);

// ------------------ Profile Routes ------------------
router.get("/profile", auth(["teacher"]), getProfile);
router.put("/profile", auth(["teacher"]), upload.single("profile_pic"), updateProfile);
router.delete("/profile", auth(["teacher"]), removeProfilePic);

module.exports = router;
