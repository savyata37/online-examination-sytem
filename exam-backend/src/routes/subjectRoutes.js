// // routes/subjectRoutes.js
// const express = require("express");
// const router = express.Router();
// const { getAllSubjects } = require("../controllers/subjectController");
// const authMiddleware = require("../middleware/authMiddleware");

// router.get("/", authMiddleware, getAllSubjects);

// module.exports = router;



// const express = require("express");
// const router = express.Router();
// const { getSubjects } = require("../controllers/subjectController");
// const { auth } = require("../middleware/authMiddleware");

// // Use auth with roles (teacher, admin, student can all access)
// router.get("/", auth(["teacher", "admin", "student"]), getSubjects);

// module.exports = router;


const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { getAllSubjects } = require("../controllers/subjectController"); // or subjectController

router.get("/", auth(["teacher", "student"]), getAllSubjects);

module.exports = router;
