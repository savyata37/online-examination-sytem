

// backend/src/controllers/teacherController.js

const pool = require("../config/db");
const { getExamStatus } = require("../utils/examStatus");

/* =====================================================
   HELPER FUNCTIONS
===================================================== */
const calculateDifficulty = (avgScore) => {
  if (avgScore < 40) return "Hard";
  if (avgScore < 70) return "Medium";
  return "Easy";
};

const calculatePassRatio = (scores, passMark = 40) => {
  if (!scores || scores.length === 0) return 0;
  const passed = scores.filter((s) => s >= passMark).length;
  return ((passed / scores.length) * 100).toFixed(2);
};

/* =====================================================
   CREATE EXAM
===================================================== */
exports.createExam = async (req, res) => {
  try {
    const { title, description, duration, subject_id, start_time, end_time, status } = req.body;

    if (!title || !duration || !subject_id) {
      return res.status(400).json({ message: "Title, duration, and subject are required" });
    }

    const result = await pool.query(
      `INSERT INTO exams
       (title, description, duration, subject_id, created_by, start_time, end_time, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        title,
        description || "",
        duration,
        subject_id,
        req.user.id,
        start_time || null,
        end_time || null,
        status || "upcoming",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create exam error:", err);
    res.status(500).json({ message: "Failed to create exam" });
  }
};

/* =====================================================
   GET ALL EXAMS
===================================================== */
exports.getAllExams = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         e.examid,
         e.title,
         e.description,
         e.duration,
         e.start_time,
         e.end_time,
         s.name AS subject_name
       FROM exams e
       LEFT JOIN subject s ON e.subject_id = s.id
       WHERE e.created_by = $1
       ORDER BY e.created_at DESC`,
      [req.user.id]
    );

    const exams = result.rows.map((exam) => ({
      ...exam,
      status: getExamStatus(exam.start_time, exam.end_time),
      subject_name: exam.subject_name || "N/A",
    }));

    res.json(exams);
  } catch (err) {
    console.error("Failed to load exams:", err);
    res.status(500).json({ message: "Failed to load exams" });
  }
};

/* =====================================================
   GET EXAM BY ID
===================================================== */
exports.getExamById = async (req, res) => {
  try {
    const { examid } = req.params;

    const result = await pool.query(
      `SELECT 
         e.examid,
         e.title,
         e.description,
         e.duration,
         e.subject_id,
         s.name AS subject_name,
         e.start_time,
         e.end_time
       FROM exams e
       LEFT JOIN subject s ON e.subject_id = s.id
       WHERE e.examid = $1`,
      [examid]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const exam = result.rows[0];
    exam.status = getExamStatus(exam.start_time, exam.end_time);
    exam.subject_name = exam.subject_name || "N/A";

    res.json(exam);
  } catch (err) {
    console.error("Failed to fetch exam:", err);
    res.status(500).json({ message: "Failed to fetch exam" });
  }
};

/* =====================================================
   ADD QUESTIONS TO EXAM
===================================================== */
exports.addQuestionsToExam = async (req, res) => {
  const { examid } = req.params;
  const { questionids } = req.body;

  if (!examid || !Array.isArray(questionids) || questionids.length === 0) {
    return res.status(400).json({ message: "examid and questionids array are required" });
  }

  try {
    for (const qid of questionids) {
      await pool.query(
        `INSERT INTO exam_questions (examid, questionid)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [examid, qid]
      );
    }

    res.json({ message: "Questions added successfully" });
  } catch (err) {
    console.error("Failed to add questions:", err);
    res.status(500).json({ message: "Failed to add questions" });
  }
};

/* =====================================================
   GET QUESTIONS BY SUBJECT
===================================================== */
exports.getQuestionsBySubject = async (req, res) => {
  try {
    const { subjectid } = req.query;

    if (!subjectid) {
      return res.status(400).json({ message: "subjectid is required" });
    }

    const result = await pool.query(
      `SELECT *
       FROM questions
       WHERE subject_id = $1
       ORDER BY questionid DESC`,
      [subjectid]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch questions:", err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
};

/* =====================================================
   CREATE QUESTION
===================================================== */
exports.createQuestion = async (req, res) => {
  try {
    const { question, option_a, option_b, option_c, option_d, correct_option, subject_id } =
      req.body;

    if (
      !question ||
      !option_a ||
      !option_b ||
      !option_c ||
      !option_d ||
      !correct_option ||
      !subject_id
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await pool.query(
      `INSERT INTO questions
       (question, option_a, option_b, option_c, option_d, correct_option, subject_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [question, option_a, option_b, option_c, option_d, correct_option, subject_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to create question:", err);
    res.status(500).json({ message: "Failed to create question" });
  }
};

/* =====================================================
   GET QUESTIONS ADDED TO EXAM
===================================================== */
exports.getAddedQuestionsByExam = async (req, res) => {
  try {
    const { examid } = req.params;

    const result = await pool.query(
      `SELECT q.*
       FROM exam_questions eq
       JOIN questions q ON q.questionid = eq.questionid
       WHERE eq.examid = $1`,
      [examid]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to load exam questions:", err);
    res.status(500).json({ message: "Failed to load exam questions" });
  }
};



// // /* =====================================================
// //    TEACHER ANALYTICS
// // ===================================================== */

// // // Get all students who took teacher's exams
// // exports.getMyStudentsAnalytics = async (req, res) => {
// //   try {
// //     const teacherId = req.user.id;

// //     const { rows } = await pool.query(
// //       `SELECT u.full_name, e.title, r.score, r.percentage, r.passed
// //        FROM users u
// //        JOIN results r ON r.student_id = u.id
// //        JOIN exams e ON e.examid = r.exam_id
// //        WHERE e.created_by = $1
// //        ORDER BY e.created_at DESC, r.student_id`,
// //       [teacherId]
// //     );

// //     res.json(rows); // empty if no results
// //   } catch (err) {
// //     console.error("Failed to fetch student analytics:", err);
// //     res.status(500).json({ message: "Failed to fetch student analytics" });
// //   }
// // };

// // // Analytics per exam
// // exports.getMyExamsAnalytics = async (req, res) => {
// //   try {
// //     const teacherId = req.user.id;

// //     const { rows } = await pool.query(
// //       `SELECT e.title, r.score, r.percentage, r.passed
// //        FROM exams e
// //        LEFT JOIN results r ON r.exam_id = e.examid
// //        WHERE e.created_by = $1
// //        ORDER BY e.created_at DESC`,
// //       [teacherId]
// //     );

// //     res.json(rows);
// //   } catch (err) {
// //     console.error("Failed to fetch exam analytics:", err);
// //     res.status(500).json({ message: "Failed to fetch exam analytics" });
// //   }
// // };

// // // Analytics per subject
// // exports.getMySubjectsAnalytics = async (req, res) => {
// //   try {
// //     const teacherId = req.user.id;

// //     const { rows } = await pool.query(
// //       `SELECT sub.name AS subject_name, r.score, r.percentage, r.passed
// //        FROM subject sub
// //        JOIN exams e ON e.subject_id = sub.id
// //        LEFT JOIN results r ON r.exam_id = e.examid
// //        WHERE e.created_by = $1
// //        ORDER BY sub.name, r.student_id`,
// //       [teacherId]
// //     );

// //     res.json(rows);
// //   } catch (err) {
// //     console.error("Failed to fetch subject analytics:", err);
// //     res.status(500).json({ message: "Failed to fetch subject analytics" });
// //   }
// // };

// // // Overall teacher performance
// // exports.getMyPerformanceAnalytics = async (req, res) => {
// //   try {
// //     const teacherId = req.user.id;

// //     const { rows } = await pool.query(
// //       `SELECT e.title, r.score, r.percentage, r.passed
// //        FROM exams e
// //        LEFT JOIN results r ON r.exam_id = e.examid
// //        WHERE e.created_by = $1
// //        ORDER BY e.created_at DESC, r.student_id`,
// //       [teacherId]
// //     );

// //     res.json(rows);
// //   } catch (err) {
// //     console.error("Failed to fetch performance analytics:", err);
// //     res.status(500).json({ message: "Failed to fetch performance analytics" });
// //   }
// // };
// // // /* ---------------- GET EXAM ANALYTICS ---------------- */
// // exports.getExamAnalytics = async (req, res) => {
// //   try {
// //     const { examid } = req.params;
// //     const { startDate, endDate } = req.query;

// //     // 1️⃣ Fetch student results for this exam (optional date filter)
// //     let query = `
// //       SELECT r.student_id, r.score, r.passed, u.full_name AS student
// //       FROM results r
// //       JOIN users u ON r.student_id = u.id
// //       WHERE r.exam_id = $1
// //     `;
// //     const params = [examid];

// //     if (startDate) {
// //       params.push(startDate);
// //       query += ` AND r.submitted_at >= $${params.length}`;
// //     }
// //     if (endDate) {
// //       params.push(endDate);
// //       query += ` AND r.submitted_at <= $${params.length}`;
// //     }

// //     const result = await pool.query(query, params);

// //     const studentScores = result.rows.map((r) => ({
// //       student: r.student,
// //       score: r.score || 0,
// //       passed: r.passed,
// //     }));

// //     const scores = studentScores.map((s) => s.score);
// //     const totalStudents = scores.length;
// //     const avgScore = totalStudents > 0 ? scores.reduce((a, b) => a + b, 0) / totalStudents : 0;

// //     // 2️⃣ Compute summary metrics
// //     const passRatio = totalStudents > 0 ? (scores.filter((s) => s >= 40).length / totalStudents) * 100 : 0;
// //     const difficulty = avgScore >= 75 ? "Easy" : avgScore >= 50 ? "Medium" : "Hard";

// //     // 3️⃣ Send response
// //     res.json({
// //       avg_score: parseFloat(avgScore.toFixed(2)),
// //       difficulty,
// //       pass_ratio: parseFloat(passRatio.toFixed(2)),
// //       total_students: totalStudents,
// //       student_scores: studentScores,
// //     });
// //   } catch (err) {
// //     console.error("Failed to fetch exam analytics:", err);
// //     res.status(500).json({ message: "Failed to fetch exam analytics" });
// //   }
// // };


// // exports.getExamAnalyticsByStudent = async (req, res) => {
// //   try {
// //     const { examid } = req.params;
// //     const { studentId, startDate, endDate } = req.query;

// //     if (!studentId) return res.status(400).json({ message: "studentId is required" });

// //     let query = `
// //       SELECT r.score, r.passed, u.full_name AS student
// //       FROM results r
// //       JOIN users u ON r.student_id = u.id
// //       WHERE r.exam_id = $1 AND r.student_id = $2
// //     `;
// //     const params = [examid, studentId];

// //     if (startDate) {
// //       params.push(startDate);
// //       query += ` AND r.submitted_at >= $${params.length}`;
// //     }
// //     if (endDate) {
// //       params.push(endDate);
// //       query += ` AND r.submitted_at <= $${params.length}`;
// //     }

// //     const result = await pool.query(query, params);
// //     const scores = result.rows.map((r) => r.score || 0);
// //     const totalAttempts = scores.length;
// //     const avgScore = totalAttempts > 0 ? scores.reduce((a, b) => a + b, 0) / totalAttempts : 0;

// //     res.json({
// //       avg_score: parseFloat(avgScore.toFixed(2)),
// //       total_attempts: totalAttempts,
// //       student_scores: result.rows.map((r) => ({ student: r.student, score: r.score, passed: r.passed })),
// //     });
// //   } catch (err) {
// //     console.error("Failed to fetch analytics by student:", err);
// //     res.status(500).json({ message: "Failed to fetch analytics by student" });
// //   }
// // };


// // exports.getMyStudentAnalyticsById = async (req, res) => {
// //   try {
// //     const teacherId = req.user.id;
// //     const { studentId, startDate, endDate } = req.query;

// //     let query = `
// //       SELECT e.title AS exam, r.score, r.percentage::float AS percentage, r.passed, r.submitted_at
// //       FROM results r
// //       JOIN exams e ON r.exam_id = e.examid
// //       WHERE e.created_by = $1
// //     `;

// //     const params = [teacherId];
// //     let paramIndex = 2;

// //     if (studentId) {
// //       query += ` AND r.student_id = $${paramIndex++}`;
// //       params.push(studentId);
// //     }
// //     if (startDate) {
// //       query += ` AND r.submitted_at >= $${paramIndex++}`;
// //       params.push(startDate);
// //     }
// //     if (endDate) {
// //       query += ` AND r.submitted_at <= $${paramIndex++}`;
// //       params.push(endDate);
// //     }

// //     query += ` ORDER BY r.submitted_at DESC`;

// //     const { rows } = await pool.query(query, params);

// //     const studentSummary = rows.length
// //       ? {
// //           student_avg: (rows.reduce((a, r) => a + r.percentage, 0) / rows.length).toFixed(2),
// //           class_avg: "N/A",
// //           pass_ratio: ((rows.filter(r => r.passed).length / rows.length) * 100).toFixed(2),
// //         }
// //       : {};

// //     res.json({
// //       student_summary: studentSummary,
// //       exam_scores: rows,
// //     });
// //   } catch (err) {
// //     console.error("Failed to fetch student analytics:", err);
// //     res.status(500).json({ message: "Failed to fetch student analytics" });
// //   }
// // };


// // // Controller: getMyStudentsAnalytics
// // exports.getMyStudentsAnalytics1 = async (req, res) => {
// //   try {
// //     const teacherId = req.user.id;
// //     const { studentId, startDate, endDate } = req.query;

// //     // Dynamic WHERE conditions
// //     const conditions = ["e.created_by = $1"];
// //     const params = [teacherId];
// //     let idx = 2;

// //     if (studentId) {
// //       conditions.push(`r.student_id = $${idx++}`);
// //       params.push(studentId);
// //     }
// //     if (startDate) {
// //       conditions.push(`r.submitted_at >= $${idx++}`);
// //       params.push(startDate);
// //     }
// //     if (endDate) {
// //       conditions.push(`r.submitted_at <= $${idx++}`);
// //       params.push(endDate);
// //     }

// //     const query = `
// //       SELECT 
// //         u.id AS student_id,
// //         u.full_name,
// //         e.title AS exam,
// //         r.score,
// //         r.percentage::float AS percentage,
// //         r.passed,
// //         r.submitted_at
// //       FROM results r
// //       JOIN exams e ON r.exam_id = e.examid
// //       JOIN users u ON r.student_id = u.id
// //       WHERE ${conditions.join(" AND ")}
// //       ORDER BY r.submitted_at DESC
// //     `;

// //     const { rows } = await pool.query(query, params);

// //     // Calculate summary for selected student
// //     const studentRows = studentId ? rows : [];
// //     const studentSummary = studentRows.length
// //       ? {
// //           student_avg: (
// //             studentRows.reduce((acc, r) => acc + r.percentage, 0) / studentRows.length
// //           ).toFixed(2),
// //           class_avg: "N/A", // optional: calculate class avg
// //           pass_ratio: (
// //             (studentRows.filter((r) => r.passed).length / studentRows.length) *
// //             100
// //           ).toFixed(2),
// //         }
// //       : {};

// //     res.json({
// //       student_summary: studentSummary,
// //       exam_scores: rows,
// //     });
// //   } catch (err) {
// //     console.error("Failed to fetch student analytics:", err);
// //     res.status(500).json({ message: "Failed to fetch student analytics" });
// //   }
// // };



// // exports.getStudentAnalytics = async (req, res) => {
// //   try {

// //     const teacherId = req.user.id;

// //     // Students under teacher
// //     const students = await pool.query(`
// //       SELECT u.id, u.full_name,
// //       COUNT(r.exam_id) as exams_attempted,
// //       AVG(r.score) as avg_score,
// //       AVG(r.percentage) as avg_percentage
// //       FROM users u
// //       JOIN results r ON u.id = r.student_id
// //       JOIN exams e ON r.exam_id = e.examid
// //       WHERE e.created_by = $1
// //       GROUP BY u.id
// //     `, [teacherId]);

// //     // Overview stats
// //     const overview = await pool.query(`
// //       SELECT 
// //       COUNT(DISTINCT student_id) as total_students,
// //       AVG(score) as class_avg,
// //       SUM(CASE WHEN passed = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pass_rate
// //       FROM results r
// //       JOIN exams e ON r.exam_id = e.examid
// //       WHERE e.created_by = $1
// //     `, [teacherId]);

// //     res.json({ students: students.rows, overview: overview.rows[0] });

// //   } catch (err) {
// //     res.status(500).json(err.message);
// //   }
// // };

// // // GET all exams created by teacher
// //  exports.getTeacherExams =  async (req, res) => {
// //   // try {
// //   //   const teacherId = req.user.id; // from teacherAuth middleware
// //   //   const result = await pool.query(
// //   //     "SELECT examid, description FROM exams WHERE created_by = $1 ORDER BY created_at DESC",
// //   //     [teacherId]
// //   //   );
// //   //   res.json(result.rows);
// //   // } catch (err) {
// //   //   console.error(err.message);
// //   //   res.status(500).json({ message: "Server error" });
// //   // }
// //   try {
// //     const teacherId = req.user.id;
// //     const result = await pool.query(
// //       "SELECT examid, description FROM exams WHERE created_by = $1 ORDER BY created_at DESC",
// //       [teacherId]
// //     );
// //     res.json(result.rows);
// //   } catch (err) {
// //     console.error("Error fetching exams:", err.message);
// //     res.status(500).json({ message: "Server error" });
// //   }


// // };


// // GET all subjects
// exports.getSubjects =  async (req, res) => {
//   // try {
//   //   const result = await pool.query(
//   //     "SELECT id, name FROM subject ORDER BY name ASC"
//   //   );
//   //   res.json(result.rows);
//   // } catch (err) {
//   //   console.error(err.message);
//   //   res.status(500).json({ message: "Server error" });
//   // }



//   try {
//     const result = await pool.query("SELECT id, name FROM subject ORDER BY name ASC");
//     res.json(result.rows);
//   } catch (err) {
//     console.error("Error fetching subjects:", err.message);
//     res.status(500).json({ message: "Server error" });
//   }
// };



// // controllers/teacherAnalyticsController.js
// const pool = require("../db"); // your PostgreSQL connection

// ------------------ Get all subjects ------------------
exports.getSubjects = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name FROM subject ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching subjects:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------ Get all exams by teacher ------------------
exports.getTeacherExams = async (req, res) => {
  try {
    const teacherId = req.user.id; // from teacherAuth middleware
    const result = await pool.query(
      "SELECT examid, description FROM exams WHERE created_by = $1 ORDER BY created_at DESC",
      [teacherId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching exams:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// // ------------------ Get all students analytics ------------------
// exports.getStudentAnalytics = async (req, res) => {
//   try {
//     const teacherId = req.user.id;

//     // Students stats
//     const students = await pool.query(
//       `SELECT u.id, u.full_name,
//               COUNT(r.exam_id) AS exams_attempted,
//               AVG(r.score) AS avg_score,
//               AVG(r.percentage) AS avg_percentage
//        FROM users u
//        JOIN results r ON u.id = r.student_id
//        JOIN exams e ON r.exam_id = e.examid
//        WHERE e.created_by = $1
//        GROUP BY u.id, u.full_name`,
//       [teacherId]
//     );

//     // Overview stats
//     const overview = await pool.query(
//       `SELECT 
//          COUNT(DISTINCT r.student_id) AS total_students,
//          AVG(r.score) AS class_avg,
//          SUM(CASE WHEN r.passed = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS pass_rate
//        FROM results r
//        JOIN exams e ON r.exam_id = e.examid
//        WHERE e.created_by = $1`,
//       [teacherId]
//     );

//     res.json({ students: students.rows, overview: overview.rows[0] });
//   } catch (err) {
//     console.error("Error fetching student analytics:", err.message);
//     res.status(500).json({ message: "Server error" });
//   }
// };



// GET all students analytics for teacher
exports.getStudentAnalytics = async (req, res) => {
  try {
    const teacherId = req.user.id; // coming from your auth middleware

    // Query: fetch students + exam + subject + score + percentage + pass/fail
    const { rows } = await pool.query(
      `SELECT 
         u.id AS student_id,
         u.full_name,
         e.description AS exam,
         sub.name AS subject,
         r.score,
         r.percentage::float AS percentage,
         r.passed
       FROM results r
       JOIN exams e ON r.exam_id = e.examid
       JOIN users u ON r.student_id = u.id
       JOIN subject sub ON e.subject_id = sub.id
       WHERE e.created_by = $1
       ORDER BY r.submitted_at DESC`,
      [teacherId]
    );

    // Overview stats: class avg, pass rate, total students
    const overviewResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT r.student_id) AS total_students,
         AVG(r.score) AS class_avg,
         SUM(CASE WHEN r.passed THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS pass_rate
       FROM results r
       JOIN exams e ON r.exam_id = e.examid
       WHERE e.created_by = $1`,
      [teacherId]
    );

    res.json({
      students: rows,
      overview: overviewResult.rows[0],
    });
  } catch (err) {
    console.error("Failed to fetch student analytics:", err);
    res.status(500).json({ message: "Failed to fetch student analytics" });
  }
};



// ------------------ Get analytics for a specific exam ------------------
exports.getExamAnalytics = async (req, res) => {
  try {
    const { examid } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT r.student_id, r.score, r.passed, u.full_name AS student
      FROM results r
      JOIN users u ON r.student_id = u.id
      WHERE r.exam_id = $1
    `;
    const params = [examid];

    if (startDate) {
      params.push(startDate);
      query += ` AND r.submitted_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND r.submitted_at <= $${params.length}`;
    }

    const result = await pool.query(query, params);
    const studentScores = result.rows.map(r => ({
      student: r.student,
      score: r.score || 0,
      passed: r.passed
    }));

    const scores = studentScores.map(s => s.score);
    const totalStudents = scores.length;
    const avgScore = totalStudents > 0 ? scores.reduce((a, b) => a + b, 0) / totalStudents : 0;
    const passRatio = totalStudents > 0 ? (scores.filter(s => s >= 40).length / totalStudents) * 100 : 0;
    const difficulty = avgScore >= 75 ? "Easy" : avgScore >= 50 ? "Medium" : "Hard";

    res.json({
      avg_score: parseFloat(avgScore.toFixed(2)),
      difficulty,
      pass_ratio: parseFloat(passRatio.toFixed(2)),
      total_students: totalStudents,
      student_scores: studentScores
    });
  } catch (err) {
    console.error("Failed to fetch exam analytics:", err.message);
    res.status(500).json({ message: "Failed to fetch exam analytics" });
  }
};


exports.getExamResults = async (req, res) => {
  try {
    const teacherId = req.user.id; // assuming you have auth middleware and teacher id in req.user

    const query = `
      SELECT 
        r.id AS result_id,
        u.id AS student_id,
        u.full_name AS student_name,
        e.examid AS exam_id,
        e.description AS exam,
        s.name AS subject,
        r.score,
        r.percentage::float AS percentage,
        r.passed
      FROM results r
      JOIN exams e ON r.exam_id = e.examid
      JOIN users u ON r.student_id = u.id
      JOIN subject s ON e.subject_id = s.id
      WHERE e.created_by = $1
      ORDER BY r.submitted_at DESC
    `;

    const { rows } = await pool.query(query, [teacherId]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching exam results:", err);
    res.status(500).json({ message: "Server error" });
  }
};