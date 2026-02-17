

const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const multer = require("multer"); // Added
const path = require("path");

const {
  getTeachers,
  getStudents,
  getExams,
  getTeacherAnalytics,
  getStudentAnalytics,
  getExamAnalytics,
  getSubjectAnalytics,
  getAllUsers,
  getAllSubjects,
  removeAdminProfilePic,
  getAdminProfile,
  updateAdminProfile
} = require("../controllers/adminController");

// ------------------ File upload config ------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, req.user.id + path.extname(file.originalname)),
});
const upload = multer({ storage });

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


// router.get("/profile", auth(["admin"]), getAdminProfile);
// router.put("/profile", auth(["admin"]), updateAdminProfile);

router.get("/profile", auth(["admin"]), getAdminProfile);
router.put("/profile", auth(["admin"]), upload.single("profile_pic"), updateAdminProfile);
router.delete("/profile-pic", auth(["admin"]), removeAdminProfilePic);



module.exports = router;
