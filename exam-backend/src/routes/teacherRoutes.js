

const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
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

// router.get("/teacher/subjects", teacherAuth, getSubjects);
// router.get("/teacher/exams", teacherAuth, getTeacherExams);
// router.get("/exams/:examid/analytics", teacherAuth, getExamAnalytics);
// router.get("/my-students-analytics", teacherAuth, getMyStudentsAnalytics1);
// router.get("/my-exams-analytics", teacherAuth, getMyExamsAnalytics);
// router.get("/my-subjects-analytics", teacherAuth, getMySubjectsAnalytics);
// router.get("/my-performance-analytics", teacherAuth, getMyPerformanceAnalytics);
// router.get("/my-exam-analytics-by-student/:examid", teacherAuth, getExamAnalyticsByStudent);
// router.get("/my-student-analytics/:studentid", teacherAuth, getMyStudentAnalyticsById);



// // Filters (date / exam / subject)
// router.get("/my-students", teacherAuth, getMyStudentsAnalytics);
// router.get("/my-exams", teacherAuth, getMyExamsAnalytics);
// router.get("/my-subjects", teacherAuth, getMySubjectsAnalytics);
// router.get("/self", teacherAuth, getMyPerformanceAnalytics);

// router.get("/analytics/students", teacherAuth, getStudentAnalytics);



/* ---------------- QUESTIONS ---------------- */
router.get("/questions",  teacherAuth, getQuestionsBySubject); // ?subjectid=...
router.post("/questions", teacherAuth, createQuestion);

module.exports = router;
