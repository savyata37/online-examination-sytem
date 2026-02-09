


// // const express = require("express");
// // const router = express.Router();

// // const { auth } = require("../middleware/authMiddleware");

// // const {
// //   getTeachers, getStudents, getExams, getPassFail,
// //   getTeacherAnalytics, getStudentAnalytics,
// //   getExamAnalytics, getSubjectAnalytics, getAllUsers
// // } = require("../controllers/adminController.js");

// // router.get("/users", auth(["admin"]), getAllUsers);

// // router.get("/teachers", adminController.getTeachers);
// // router.get("/students", adminController.getStudents);
// // router.get("/exams", adminController.getExams);

// // // Teacher analytics
// // router.get("/teacher-analytics", adminController.getTeacherAnalytics);

// // // Student analytics
// // router.get("/student-analytics", adminController.getStudentAnalytics);

// // // Exam analytics
// // router.get("/exam-analytics", adminController.getExamAnalytics);

// // // Subject analytics
// // router.get("/subject-analytics", adminController.getSubjectAnalytics);

// // module.exports = router;



// const express = require("express");
// const router = express.Router();

// const { auth } = require("../middleware/authMiddleware");

// const {
//   getTeachers, getStudents, getExams, getPassFail,
//   getTeacherAnalytics, getStudentAnalytics,
//   getExamAnalytics, getSubjectAnalytics, getAllUsers
// } = require("../controllers/adminController.js");

// // Routes
// router.get("/users", auth(["admin"]), getAllUsers);

// router.get("/teachers", getTeachers);
// router.get("/students", getStudents);
// router.get("/exams", getExams);

// // Teacher analytics
// router.get("/teacher-analytics", getTeacherAnalytics);

// // Student analytics
// router.get("/student-analytics", getStudentAnalytics);

// // Exam analytics
// router.get("/exam-analytics", getExamAnalytics);

// // Subject analytics
// router.get("/subject-analytics", getSubjectAnalytics);

// module.exports = router;




const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");

const {
  getTeachers,
  getStudents,
  getExams,
  getTeacherAnalytics,
  getStudentAnalytics,
  getExamAnalytics,
  getSubjectAnalytics,
  getAllUsers,
  getAllSubjects
} = require("../controllers/adminController");

// USERS
router.get("/users", auth(["admin"]), getAllUsers);

// TEACHERS / STUDENTS / EXAMS
router.get("/teachers", auth(["admin"]), getTeachers);
router.get("/students", auth(["admin"]), getStudents);
router.get("/exams", auth(["admin"]), getExams);
router.get("/subjects", auth(["admin"]), getAllSubjects);

// ANALYTICS
router.get("/teacher-analytics", auth(["admin"]), getTeacherAnalytics);
router.get("/student-analytics", auth(["admin"]), getStudentAnalytics);
router.get("/exam-analytics", auth(["admin"]), getExamAnalytics);
router.get("/subject-analytics", auth(["admin"]), getSubjectAnalytics);

module.exports = router;
