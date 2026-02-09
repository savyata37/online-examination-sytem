

// // // app.js
// // const express = require("express");
// // const cors = require("cors");

// // // Existing routes
// // const authRoutes = require("./routes/authRoutes");
// // const adminRoutes = require("./routes/adminRoutes");
// // const teacherRoutes = require("./routes/teacherRoutes");
// // const studentRoutes = require("./routes/studentRoutes");
// // const examRoutes = require("./routes/examRoutes");

// // // AI Proctoring route
// // const proctoringRoutes = require("./routes/proctoringRoutes");

// // const app = express();

// // app.use(cors());
// // app.use(express.json());

// // // Register routes
// // app.use("/api/auth", authRoutes);
// // app.use("/api/admin", adminRoutes);
// // app.use("/api/teacher", teacherRoutes);
// // app.use("/api/student", studentRoutes);
// // app.use("/api/exams", examRoutes);
// // app.use("/api/proctoring", proctoringRoutes);

// // app.get("/", (req, res) => {
// //   res.send("Online Exam System Backend Running");
// // });

// // module.exports = app;





// // app.js
// const express = require("express");
// const cors = require("cors");

// // Import routes
// const authRoutes = require("./routes/authRoutes");
// const adminRoutes = require("./routes/adminRoutes");
// const teacherRoutes = require("./routes/teacherRoutes");
// const studentRoutes = require("./routes/studentRoutes");
// const examRoutes = require("./routes/examRoutes");
// const proctoringRoutes = require("./routes/proctoringRoutes");
// const subjectRoutes = require("./routes/subjectRoutes");


// const app = express();

// // Allow frontend to access backend
// app.use(
//   cors({
//     origin: "http://localhost:3000", // React frontend
//     credentials: true,               // allows cookies, authorization headers
//   })
// );

// // Parse JSON bodies
// app.use(express.json());

// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api/teacher", teacherRoutes);
// app.use("/api/student", studentRoutes);
// app.use("/api/exams", examRoutes);
// app.use("/api/proctoring", proctoringRoutes);
// app.use("/api/subjects", subjectRoutes);
// app.use("/api/exams", require("./routes/examRoutes"));
// app.use("/api/teacher", require("./routes/teacherRoutes"));


// // Root route
// app.get("/", (req, res) => {
//   res.send("Online Exam System Backend Running");
// });

// module.exports = app;




// // app.js
// const express = require("express");
// const cors = require("cors");

// // Import routes
// const authRoutes = require("./routes/authRoutes");
// const adminRoutes = require("./routes/adminRoutes");
// // const teacherRoutes = require("./routes/teacherRoutes");
// const studentRoutes = require("./routes/studentRoutes");
// const examRoutes = require("./routes/examRoutes");
// const proctoringRoutes = require("./routes/proctoringRoutes");
// const subjectRoutes = require("./routes/subjectRoutes");

// const app = express();

// // Allow frontend to access backend
// app.use(
//   cors({
//     origin: "http://localhost:3000", // React frontend
//     credentials: true,               // allows cookies, authorization headers
//   })
// );

// // Parse JSON bodies
// app.use(express.json());

// // // Mount routes (once each)
// app.use("/api/auth", authRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api/teacher", teacherRoutes);
// app.use("/api/student", studentRoutes);
// app.use("/api/exams", examRoutes);
// app.use("/api/proctoring", proctoringRoutes);
// app.use("/api/subjects", subjectRoutes);

// // Root route
// app.get("/", (req, res) => {
//   res.send("Online Exam System Backend Running");
// });

// module.exports = app;







// app.js
const express = require("express");
const cors = require("cors");

// Existing routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const examRoutes = require("./routes/examRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const proctoringRoutes = require("./routes/proctoringRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/student/exams", examRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/proctoring", proctoringRoutes);

app.get("/", (req, res) => {
  res.send("Online Exam System Backend Running");
});

module.exports = app;