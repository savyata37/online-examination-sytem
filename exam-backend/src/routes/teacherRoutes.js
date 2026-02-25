

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
  // createExam,
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
  removeProfilePic,
  createSubjectiveQuestion,
  getSubjectiveSubmissions,
  gradeSubjectiveAnswer,
  getSubjectiveQuestionBank,
  addSubjectiveQuestionsToExam,
  getSubjectiveQuestionsByExam,
  getSubjectiveGradesByExam,
  getStudentAnalyticsWithSubjective

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
// router.post("/exams", teacherAuth, createExam);
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



/* ---------------- SUBJECTIVE EXAMS ---------------- */

// Subjective question routes
router.post("/subjective-question-bank", teacherAuth, createSubjectiveQuestion);
router.get("/subjective-question-bank", teacherAuth, getSubjectiveQuestionBank);

router.post("/exams/:examid/subjective", teacherAuth, addSubjectiveQuestionsToExam);
router.get("/exams/:examid/subjective", teacherAuth, getSubjectiveQuestionsByExam);

router.get("/exams/:examid/subjective-submissions", teacherAuth, getSubjectiveSubmissions);
router.get("/subjective-submissions", teacherAuth, getSubjectiveSubmissions);
router.post("/subjective/grade", teacherAuth, gradeSubjectiveAnswer);

// Analytics with subjective grades
router.get("/subjective-grades", teacherAuth, getSubjectiveGradesByExam);
router.get("/analytics/students-with-subjective", teacherAuth, getStudentAnalyticsWithSubjective);
router.get("/exam-results", teacherAuth, getExamResults);

module.exports = router;

