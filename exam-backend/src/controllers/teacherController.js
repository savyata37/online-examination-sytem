


// // controllers/teacherAnalyticsController.js
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

exports.getExamAnalytics = async (req, res) => {
  try {
    const { examid } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT r.student_id, r.score, r.passed, r.started_at, u.full_name AS student
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
      passed: r.passed,
      started_at: r.started_at  
    }));

    const scores = studentScores.map(s => s.score);
    const totalStudents = scores.length;

    const avgScore =
      totalStudents > 0
        ? scores.reduce((a, b) => a + b, 0) / totalStudents
        : 0;

    const passRatio =
      totalStudents > 0
        ? (scores.filter(s => s >= 40).length / totalStudents) * 100
        : 0;

    const difficulty =
      avgScore >= 75 ? "Easy" : avgScore >= 50 ? "Medium" : "Hard";

    // // ✅ Safe exam date (since only one attempt per student exists)
    // const examDate =
    //   result.rows.length > 0 ? result.rows[0].started_at : null;
    const examDate =
      result.rows.length > 0
        ? new Date(result.rows[0].started_at).toISOString()
        : null;


    res.json({
      avg_score: parseFloat(avgScore.toFixed(2)),
      difficulty,
      pass_ratio: parseFloat(passRatio.toFixed(2)),
      total_students: totalStudents,
      exam_date: examDate,
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
        r.passed,
        r.started_at,
        r.submitted_at
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



// /* ---------------- GET TEACHER PROFILE ---------------- */ 
// exports.getProfile = async (req, res) => {
//   try {
//     const teacherId = req.user.id;

//     // Fetch basic teacher info
//     const userResult = await pool.query(
//       "SELECT id, full_name, email, role FROM users WHERE id=$1 AND role='teacher'",
//       [teacherId]
//     );

//     if (!userResult.rows.length)
//       return res.status(404).json({ message: "Teacher not found" });

//     // Fetch teacher profile picture from user_profiles table
//     const profileResult = await pool.query(
//       "SELECT profile_pic FROM user_profiles WHERE user_id=$1",
//       [teacherId]
//     );

//     let profilePic = profileResult.rows[0]?.profile_pic || null;

//     // 🔥 Prepend full backend URL
//     if (profilePic) {
//       profilePic = `http://localhost:5000/uploads/${profilePic}`;
//     }

//     // Send combined JSON
//     res.json({
//       ...userResult.rows[0],
//       profile_pic: profilePic,
//     });

//   } catch (err) {
//     console.error("Error fetching teacher profile:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };


// // /* ---------------- UPDATE TEACHER PROFILE ---------------- */ 
// // exports.updateProfile = async (req, res) => {
// //   try {
// //     const teacherId = req.user.id;
// //     const { full_name, email } = req.body;
// //     const profile_pic = req.file ? `/uploads/${req.file.filename}` : null;

// //     // Update teacher's basic info
// //     const userResult = await pool.query(
// //       "UPDATE users SET full_name=$1, email=$2 WHERE id=$3 AND role='teacher' RETURNING id, full_name, email, role",
// //       [full_name, email, teacherId]
// //     );

// //     // Update teacher profile picture
// //     if (profile_pic) {
// //       await pool.query(
// //         `INSERT INTO user_profiles(user_id, profile_pic)
// //          VALUES($1, $2)
// //          ON CONFLICT (user_id)
// //          DO UPDATE SET profile_pic = EXCLUDED.profile_pic`,
// //         [teacherId, profile_pic]
// //       );
// //     }

// //     // Fetch the updated profile picture
// //     const profileResult = await pool.query(
// //       "SELECT profile_pic FROM user_profiles WHERE user_id=$1",
// //       [teacherId]
// //     );

// //     let updatedProfilePic = profileResult.rows[0]?.profile_pic || null;
// //     if (updatedProfilePic) {
// //       updatedProfilePic = `http://localhost:5000/uploads/${updatedProfilePic}`;
// //     }

// //     // Send response
// //     res.json({
// //       ...userResult.rows[0],
// //       profile_pic: updatedProfilePic,
// //     });

// //   } catch (err) {
// //     console.error("Error updating teacher profile:", err);
// //     res.status(500).json({ message: "Server error" });
// //   }
// // };


// /* ---------------- UPDATE TEACHER PROFILE ---------------- */ 
// // exports.updateProfile = async (req, res) => {
// //   try {
// //     const teacherId = req.user.id;
// //     const { full_name, email } = req.body;
    
// //     // 1. Only store the filename, NOT the "/uploads/" prefix
// //     const profile_pic_filename = req.file ? req.file.filename : null;

// //     const userResult = await pool.query(
// //       "UPDATE users SET full_name=$1, email=$2 WHERE id=$3 AND role='teacher' RETURNING id, full_name, email, role",
// //       [full_name, email, teacherId]
// //     );

// //     if (profile_pic_filename) {
// //       await pool.query(
// //         `INSERT INTO user_profiles(user_id, profile_pic)
// //          VALUES($1, $2)
// //          ON CONFLICT (user_id) 
// //          DO UPDATE SET profile_pic = EXCLUDED.profile_pic`,
// //         [teacherId, profile_pic_filename]
// //       );
// //     }

// //     const profileResult = await pool.query(
// //       "SELECT profile_pic FROM user_profiles WHERE user_id=$1",
// //       [teacherId]
// //     );

// //     const rawPic = profileResult.rows[0]?.profile_pic;
    
// //     // 2. Ensure the URL is formed correctly with only one "uploads"
// //     const updatedProfilePic = rawPic 
// //       ? `http://localhost:5000/uploads/${rawPic}` 
// //       : null;

// //     res.json({
// //       ...userResult.rows[0],
// //       profile_pic: updatedProfilePic,
// //     });

// //   } catch (err) {
// //     console.error("Error updating teacher profile:", err);
// //     res.status(500).json({ message: "Server error" });
// //   }
// // };


// /* ---------------- UPDATE TEACHER PROFILE ---------------- */ 
// exports.updateProfile = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     const { full_name, email } = req.body;
    
//     // Store ONLY the filename, not the path
//     const filename = req.file ? req.file.filename : null;

//     // Update basic info
//     const userResult = await pool.query(
//       "UPDATE users SET full_name=$1, email=$2 WHERE id=$3 AND role='teacher' RETURNING id, full_name, email, role",
//       [full_name, email, teacherId]
//     );

//     // Update or Insert profile pic
//     if (filename) {
//       await pool.query(
//         `INSERT INTO user_profiles(user_id, profile_pic)
//          VALUES($1, $2)
//          ON CONFLICT (user_id) 
//          DO UPDATE SET profile_pic = EXCLUDED.profile_pic`,
//         [teacherId, filename]
//       );
//     }

//     // Return the clean data
//     const profileResult = await pool.query(
//       "SELECT profile_pic FROM user_profiles WHERE user_id=$1",
//       [teacherId]
//     );

//     const dbPath = profileResult.rows[0]?.profile_pic;
    
//     res.json({
//       ...userResult.rows[0],
//       // Construct clean URL here
//       profile_pic: dbPath ? `http://localhost:5000/uploads/${dbPath}` : null,
//     });

//   } catch (err) {
//     console.error("Error updating teacher profile:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

exports.getMySubjectsAnalytics = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Get subjects that have exams created by this teacher
    const subjectsResult = await pool.query(
      `SELECT DISTINCT s.id, s.name
       FROM subject s
       JOIN exams e ON e.subject_id = s.id
       WHERE e.created_by = $1
       ORDER BY s.name ASC`,
      [teacherId]
    );

    const subjects = subjectsResult.rows;

    // Optional: count exams per subject
    const examsCountResult = await pool.query(
      `SELECT subject_id, COUNT(*) AS exams_count
       FROM exams
       WHERE created_by = $1
       GROUP BY subject_id`,
      [teacherId]
    );

    const examsCountMap = {};
    examsCountResult.rows.forEach((row) => {
      examsCountMap[row.subject_id] = parseInt(row.exams_count);
    });

    const data = subjects.map((sub) => ({
      ...sub,
      exams_count: examsCountMap[sub.id] || 0,
    }));

    res.json(data);

  } catch (err) {
    console.error("Error fetching teacher subjects analytics:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ---------------- REMOVE PROFILE PICTURE ---------------- */
exports.removeProfilePic = async (req, res) => {
  try {
    const teacherId = req.user.id;
    await pool.query(
      "UPDATE user_profiles SET profile_pic = NULL WHERE user_id = $1",
      [teacherId]
    );
    
    // Fetch updated user info to return
    const userResult = await pool.query(
      "SELECT id, full_name, email, role FROM users WHERE id = $1",
      [teacherId]
    );

    res.json({
      ...userResult.rows[0],
      profile_pic: null
    });
  } catch (err) {
    console.error("Error removing profile pic:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getMyPerformanceAnalytics = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Get all exams created by this teacher
    const examsResult = await pool.query(
      `SELECT examid, description
       FROM exams
       WHERE created_by = $1
       ORDER BY created_at DESC`,
      [teacherId]
    );
    const exams = examsResult.rows;

    // For each exam, get average score and pass rate
    const examStatsPromises = exams.map(async (exam) => {
      const statsResult = await pool.query(
        `SELECT 
           AVG(score) AS avg_score,
           SUM(CASE WHEN passed THEN 1 ELSE 0 END)::float / COUNT(*) * 100 AS pass_rate,
           COUNT(*) AS total_students
         FROM results
         WHERE exam_id = $1`,
        [exam.examid]
      );

      const stats = statsResult.rows[0];
      return {
        examid: exam.examid,
        description: exam.description,
        avg_score: parseFloat(stats.avg_score || 0).toFixed(2),
        pass_rate: parseFloat(stats.pass_rate || 0).toFixed(2),
        total_students: parseInt(stats.total_students) || 0,
      };
    });

    const examStats = await Promise.all(examStatsPromises);

    // Send final JSON
    res.json({
      exams: examStats
    });

  } catch (err) {
    console.error("Error fetching teacher performance analytics:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// GET /api/proctoring_violations
exports.getProctoringViolations = async (req, res) => {
  try {
    const query = `
      SELECT id, examid, student_id, violation_type, details, created_at
      FROM proctoring_violations
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows); // returns array of violations
  } catch (error) {
    console.error("Error fetching proctoring violations:", error);
    res.status(500).json({ message: "Server error while fetching violations" });
  }
};

// Analytics per subject
exports.getMySubjectsAnalytics = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const { rows } = await pool.query(
      `SELECT sub.name AS subject_name, r.score, r.percentage, r.passed
       FROM subject sub
       JOIN exams e ON e.subject_id = sub.id
       LEFT JOIN results r ON r.exam_id = e.examid
       WHERE e.created_by = $1
       ORDER BY sub.name, r.student_id`,
      [teacherId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch subject analytics:", err);
    res.status(500).json({ message: "Failed to fetch subject analytics" });
  }
};


exports.getSelfAnalytics = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { startDate, endDate } = req.query;

    let dateFilter = "";
    let queryParams = [teacherId];

    if (startDate && startDate !== "" && endDate && endDate !== "") {
      dateFilter = `AND e.created_at BETWEEN $2 AND $3`;
      queryParams.push(startDate, endDate);
    }

    // 1. Main Stats Query
    // We cast to ::numeric so ROUND(val, 2) works
    const summaryQuery = await pool.query(
      `SELECT 
        COALESCE(ROUND(AVG(r.percentage)::numeric, 2), 0) as teacher_avg,
        COALESCE((SELECT ROUND(AVG(percentage)::numeric, 2) FROM results), 0) as overall_avg,
        CASE 
          WHEN COUNT(r.id) = 0 THEN 0 
          ELSE ROUND((COUNT(CASE WHEN r.passed = true THEN 1 END)::float / COUNT(r.id) * 100)::numeric, 1)
        END as pass_ratio
       FROM results r
       JOIN exams e ON r.exam_id = e.examid
       WHERE e.created_by = $1 ${dateFilter}`,
      queryParams
    );

    // 2. Student Progress Query
    const progressQuery = await pool.query(
      `SELECT e.description as exam, ROUND(AVG(r.percentage)::numeric, 2) as avg_score
       FROM exams e
       JOIN results r ON e.examid = r.exam_id
       WHERE e.created_by = $1 ${dateFilter}
       GROUP BY e.examid, e.description, e.created_at
       ORDER BY e.created_at ASC`,
      queryParams
    );

    // 3. Ranking Query
    // Fixed u.name to u.full_name based on your table schema
    const rankingQuery = await pool.query(
      `SELECT u.full_name as teacher, ROUND(AVG(r.percentage)::numeric, 2) as avg_score
       FROM users u
       JOIN exams e ON u.id = e.created_by
       JOIN results r ON e.examid = r.exam_id
       GROUP BY u.id, u.full_name
       ORDER BY avg_score DESC
       LIMIT 5`
    );

    const violationsQuery = await pool.query(
      `SELECT s.name as subject_name, COUNT(pv.id) as violation_count
       FROM proctoring_violations pv
       JOIN exams e ON pv.examid = e.examid
       JOIN subject s ON e.subject_id = s.id
       WHERE e.created_by = $1 ${dateFilter}
       GROUP BY s.name
       ORDER BY violation_count DESC`,
      queryParams
    );

    res.json({
      teacher_summary: summaryQuery.rows[0],
      student_progress: progressQuery.rows,
      teacher_ranking: rankingQuery.rows,
      violations: violationsQuery.rows
    });

  } catch (err) {
    console.error("DETAILED ERROR:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};



/* ---------------- GET TEACHER PROFILE ---------------- */ 
exports.getProfile = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const userResult = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, p.profile_pic 
       FROM users u 
       LEFT JOIN user_profiles p ON u.id = p.user_id 
       WHERE u.id=$1 AND u.role='teacher'`,
      [teacherId]
    );

    if (!userResult.rows.length)
      return res.status(404).json({ message: "Teacher not found" });

    const user = userResult.rows[0];

    // Always format the URL if the filename exists
    if (user.profile_pic) {
      user.profile_pic = `http://localhost:5000/uploads/${user.profile_pic}`;
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching teacher profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- UPDATE TEACHER PROFILE ---------------- */ 
exports.updateProfile = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { full_name, email } = req.body;
    const filename = req.file ? req.file.filename : null;

    // 1. Update basic info
    const userResult = await pool.query(
      "UPDATE users SET full_name=$1, email=$2 WHERE id=$3 AND role='teacher' RETURNING id, full_name, email, role",
      [full_name, email, teacherId]
    );

    // 2. Update profile pic if a new one was uploaded
    if (filename) {
      await pool.query(
        `INSERT INTO user_profiles(user_id, profile_pic)
         VALUES($1, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET profile_pic = EXCLUDED.profile_pic`,
        [teacherId, filename]
      );
    }

    // 3. Fetch the final filename to return to frontend
    const profileResult = await pool.query(
      "SELECT profile_pic FROM user_profiles WHERE user_id=$1",
      [teacherId]
    );

    const dbPath = profileResult.rows[0]?.profile_pic;
    
    res.json({
      ...userResult.rows[0],
      profile_pic: dbPath ? `http://localhost:5000/uploads/${dbPath}` : null,
    });

  } catch (err) {
    console.error("Error updating teacher profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};