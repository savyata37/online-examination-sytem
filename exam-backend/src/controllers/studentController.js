


const pool = require("../config/db");
const calculateScore = require("../utils/calculateScore");

/* ---------------- UTILITY ---------------- */
const getExamStatus = (start, end) => {
  const now = new Date();
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "ongoing";
  return "completed";
};

/* ---------------- GET AVAILABLE EXAMS ---------------- */
exports.getAvailableExams = async (req, res) => {
  const studentId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT 
        e.examid,
        e.title,
        e.description,
        e.duration,
        e.start_time,
        e.end_time,
        s.name AS subject_name
      FROM exams e
      LEFT JOIN subject s ON e.subject_id = s.id
      ORDER BY e.start_time DESC
    `);

    const exams = await Promise.all(
      result.rows.map(async (exam) => {
        const start = new Date(exam.start_time);
        const end = new Date(exam.end_time);

        let status = getExamStatus(start, end);

        const attemptRes = await pool.query(
          `SELECT id FROM results WHERE exam_id=$1 AND student_id=$2`,
          [exam.examid, studentId]
        );

        if (attemptRes.rows.length && status === "ongoing")
          status = "completed";

        return { ...exam, status };
      })
    );

    res.json(exams);
  } catch (err) {
    console.error("Get available exams error:", err);
    res.status(500).json({ message: "Failed to fetch available exams" });
  }
};

/* ---------------- START EXAM ---------------- */
exports.startExam = async (req, res) => {
  const examId = parseInt(req.params.examId);
  const studentId = req.user.id;

  try {
    const examRes = await pool.query(
      `SELECT examid, start_time, end_time, duration
       FROM exams WHERE examid=$1`,
      [examId]
    );

    if (!examRes.rows.length)
      return res.status(404).json({ message: "Exam not found" });

    const exam = examRes.rows[0];

    const status = getExamStatus(
      new Date(exam.start_time),
      new Date(exam.end_time)
    );

    if (status === "upcoming")
      return res.status(403).json({ message: "Exam not started yet" });

    if (status === "completed")
      return res.status(403).json({ message: "Exam already completed" });

    const existingRes = await pool.query(
      `SELECT id FROM results WHERE exam_id=$1 AND student_id=$2`,
      [examId, studentId]
    );

    if (existingRes.rows.length)
      return res.status(403).json({ message: "Exam already attempted" });

    const startedAt = new Date();

    const insertRes = await pool.query(
      `INSERT INTO results (exam_id, student_id, started_at, status)
       VALUES ($1,$2,$3,'started')
       RETURNING id, started_at`,
      [examId, studentId, startedAt]
    );

    res.json({
      message: "Exam started",
      started_at: insertRes.rows[0].started_at,
      duration_minutes: exam.duration,
      result_id: insertRes.rows[0].id,
    });
  } catch (err) {
    console.error("Start exam error:", err);
    res.status(500).json({ message: "Failed to start exam" });
  }
};

/* ---------------- TAKE EXAM ---------------- */
exports.takeExam = async (req, res) => {
  const examId = parseInt(req.params.examId);
  const studentId = req.user.id;

  try {
    // Fetch exam info
    const examRes = await pool.query(
      `SELECT * FROM exams WHERE examid=$1`,
      [examId]
    );

    if (!examRes.rows.length)
      return res.status(404).json({ message: "Exam not found" });

    const exam = examRes.rows[0];

    // Fetch questions for this exam
    const qRes = await pool.query(
      `SELECT q.*
       FROM exam_questions eq
       JOIN questions q ON eq.questionid = q.questionid
       WHERE eq.examid=$1`,
      [examId]
    );

    const questions = qRes.rows;

    res.json({ exam, questions });
  } catch (err) {
    console.error("takeExam error:", err);
    res.status(500).json({ message: "Failed to fetch exam" });
  }
};

/* ---------------- SUBMIT EXAM ---------------- */
exports.submitExam = async (req, res) => {
  const { answers } = req.body;
  const examId = parseInt(req.params.id || req.body.examId, 10);
  const studentId = req.user.id;

  try {
    const resultRes = await pool.query(
      `SELECT * FROM results WHERE exam_id=$1 AND student_id=$2`,
      [examId, studentId]
    );

    if (!resultRes.rows.length)
      return res.status(403).json({ message: "Exam not started" });

    const attempt = resultRes.rows[0];

    if (attempt.status !== "started")
      return res.status(403).json({ message: "Exam already submitted" });

    // Fetch exam questions
    const qRes = await pool.query(
      `SELECT q.* 
       FROM exam_questions eq
       JOIN questions q ON eq.questionid = q.questionid
       WHERE eq.examid=$1`,
      [examId]
    );

    const questions = qRes.rows;

    // Insert student answers
    const insertPromises = questions.map(q => {
      const selectedOption = answers[q.questionid] || null;
      return pool.query(
        `INSERT INTO student_answers (student_id, examid, questionid, selected_option)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, examid, questionid)
         DO UPDATE SET selected_option = EXCLUDED.selected_option`,
        [studentId, examId, q.questionid, selectedOption]
      );
    });
    await Promise.all(insertPromises);

    // Calculate score
    const score = questions.reduce((acc, q) => {
      const selected = answers[q.questionid];
      return selected === q.correct_option ? acc + 1 : acc;
    }, 0);

    const totalQuestions = questions.length;
    const percentage = totalQuestions ? (score / totalQuestions) * 100 : 0;
    const passed = percentage >= 40;

    await pool.query(
      `UPDATE results
       SET score=$1, percentage=$2, passed=$3, submitted_at=NOW(), status='submitted'
       WHERE id=$4`,
      [score, percentage, passed, attempt.id]
    );

    res.json({ message: "Exam submitted successfully", score, percentage, passed });
  } catch (err) {
    console.error("Submit exam error:", err);
    res.status(500).json({ message: "Failed to submit exam" });
  }
};

/* ---------------- LOG VIOLATION ---------------- */
// exports.logViolation = async (req, res) => {
//   const { examId, violationType, details } = req.body;
//   const studentId = req.user.id;

//   if (!examId || !violationType)
//     return res.status(400).json({ message: "examId and violationType are required" });

//   try {
//     await pool.query(
//       `INSERT INTO proctoring_violations (student_id, examid, violation_type, details, created_at)
//        VALUES ($1, $2, $3, $4, NOW())`,
//       [studentId, examId, violationType, details || null]
//     );

//     res.json({ message: "Violation logged" });
//   } catch (err) {
//     console.error("Log violation error:", err);
//     res.status(500).json({ message: "Failed to log violation" });
//   }
// };

/* ---------------- UPDATED LOG VIOLATION ---------------- */
exports.logViolation = async (req, res) => {
  const { examId, violationType, details } = req.body;
  const studentId = req.user.id;

  if (!examId || !violationType)
    return res.status(400).json({ message: "examId and violationType are required" });

  try {
    // 1. Insert the violation
    await pool.query(
      `INSERT INTO proctoring_violations (student_id, examid, violation_type, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [studentId, examId, violationType, details || null]
    );

    // 2. Count total violations for this specific exam session
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM proctoring_violations 
       WHERE student_id = $1 AND examid = $2`,
      [studentId, examId]
    );

    const violationCount = parseInt(countRes.rows[0].count);

    // 3. Trigger Auto-Submit if threshold reached (e.g., 5)
    if (violationCount >= 15) {
      return res.json({ 
        action: "AUTO_SUBMIT", 
        message: "Maximum violations reached. Exam auto-submitted.",
        violations: violationCount 
      });
    }

    res.json({ action: "WARN", violations: violationCount });
  } catch (err) {
    console.error("Log violation error:", err);
    res.status(500).json({ message: "Failed to log violation" });
  }
};

/* ---------------- GET MY RESULTS ---------------- */
exports.getMyResults = async (req, res) => {
  const studentId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT 
        e.title,
        r.score,
        r.percentage::FLOAT AS percentage,
        r.passed,
        r.submitted_at
       FROM results r
       JOIN exams e ON r.exam_id = e.examid
       WHERE r.student_id=$1
       ORDER BY r.submitted_at DESC`,
      [studentId]
    );

    res.json(result.rows || []);
  } catch (err) {
    console.error("Get results error:", err);
    res.status(500).json({ message: "Failed to fetch results" });
  }
};

/* ---------------- GET SUBJECT PERFORMANCE ---------------- */
exports.getSubjectPerformance = async (req, res) => {
  const studentId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT 
        sub.name AS subject,
        COALESCE(AVG(r.percentage), 0) AS average
      FROM subject sub
      LEFT JOIN exams e ON e.subject_id = sub.id
      LEFT JOIN results r ON r.exam_id = e.examid AND r.student_id = $1 AND r.status='submitted'
      GROUP BY sub.name
      ORDER BY average ASC
      `,
      [studentId]
    );

    const data = result.rows.map(r => ({
      subject: r.subject,
      average: parseFloat(r.average)
    }));

    res.json(data);
  } catch (err) {
    console.error("getSubjectPerformance error:", err);
    res.status(500).json({ message: "Failed to fetch subject performance" });
  }
};

// /* ---------------- GET WRONG QUESTIONS ---------------- */
// exports.getWrongQuestions = async (req, res) => {
//   const studentId = req.user.id;

//   try {
//     const result = await pool.query(
//       `
//       SELECT 
//         q.questionid,
//         q.question,
//         sa.selected_option AS student_answer,
//         q.correct_option,
//         s.name AS subject_name
//       FROM student_answers sa
//       JOIN questions q ON sa.questionid = q.questionid
//       JOIN subject s ON q.subject_id = s.id
//       JOIN exams e ON sa.examid = e.examid
//       WHERE sa.student_id = $1
//         AND sa.selected_option IS DISTINCT FROM q.correct_option
//       ORDER BY sa.examid, q.questionid
//       `,
//       [studentId]
//     );

//     res.json(result.rows);
//   } catch (err) {
//     console.error("getWrongQuestions error:", err);
//     res.status(500).json({ message: "Failed to fetch wrong questions" });
//   }
// };
/* ---------------- GET WRONG QUESTIONS WITH FULL TEXT ---------------- */
exports.getWrongQuestions = async (req, res) => {
  const studentId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT 
        q.questionid,
        q.question,
        s.name AS subject_name,
       
        sa.selected_option AS student_option_letter,
        
        CASE 
          WHEN sa.selected_option = 'A' THEN q.option_a
          WHEN sa.selected_option = 'B' THEN q.option_b
          WHEN sa.selected_option = 'C' THEN q.option_c
          WHEN sa.selected_option = 'D' THEN q.option_d
        END AS student_answer_text,
        
        q.correct_option AS correct_option_letter,
       
        CASE 
          WHEN q.correct_option = 'A' THEN q.option_a
          WHEN q.correct_option = 'B' THEN q.option_b
          WHEN q.correct_option = 'C' THEN q.option_c
          WHEN q.correct_option = 'D' THEN q.option_d
        END AS correct_answer_text
      FROM student_answers sa
      JOIN questions q ON sa.questionid = q.questionid
      JOIN subject s ON q.subject_id = s.id
      WHERE sa.student_id = $1
        AND sa.selected_option IS DISTINCT FROM q.correct_option
      ORDER BY sa.examid, q.questionid
      `,
      [studentId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching wrong questions:", err);
    res.status(500).json({ error: "Server error" });
  }
};


// /* ---------------- GET PROFILE ---------------- */ 
// exports.getProfile = async (req, res) => {
//   try {
//     const studentId = req.user.id;

//     // Fetch basic user info
//     const userResult = await pool.query(
//       "SELECT id, full_name, email, role FROM users WHERE id=$1",
//       [studentId]
//     );

//     if (!userResult.rows.length)
//       return res.status(404).json({ message: "Student not found" });

//     // Fetch profile picture
//     const profileResult = await pool.query(
//       "SELECT profile_pic FROM user_profiles WHERE user_id=$1",
//       [studentId]
//     );

//     let profilePic = profileResult.rows[0]?.profile_pic || null;

//     // 🔥 Prepend full backend URL if profile_pic exists
//     if (profilePic) {
//       profilePic = `http://localhost:5000/uploads/${profilePic}`;
//     }

//     // Send response
//     res.json({
//       ...userResult.rows[0],
//       profile_pic: profilePic,
//     });
    
//   } catch (err) {
//     console.error("Error fetching profile:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };


// // exports.updateProfile = async (req, res) => {
// //   try {
// //     const studentId = req.user.id;
// //     const { full_name, email } = req.body;
// //     const profile_pic = req.file ? `/uploads/${req.file.filename}` : null;

// //     const userResult = await pool.query(
// //       "UPDATE users SET full_name=$1, email=$2 WHERE id=$3 RETURNING id, full_name, email, role",
// //       [full_name, email, studentId]
// //     );

// //     if (profile_pic) {
// //       await pool.query(
// //         `INSERT INTO user_profiles(user_id, profile_pic)
// //          VALUES($1, $2)
// //          ON CONFLICT (user_id)
// //          DO UPDATE SET profile_pic = EXCLUDED.profile_pic`,
// //         [studentId, profile_pic]
// //       );
// //     }

// //     const profileResult = await pool.query(
// //       "SELECT profile_pic FROM user_profiles WHERE user_id=$1",
// //       [studentId]
// //     );

// //     res.json({
// //       ...userResult.rows[0],
// //       profile_pic: profileResult.rows[0]?.profile_pic || null,
// //     });
// //   } catch (err) {
// //     console.error("Error updating profile:", err);
// //     res.status(500).json({ message: "Server error" });
// //   }
// // };



// /* ---------------- UPDATE STUDENT PROFILE ---------------- */
// exports.updateProfile = async (req, res) => {
//   try {
//     const studentId = req.user.id;
//     const { full_name, email } = req.body;
    
//     // Store ONLY the filename in DB, not the path
//     const filename = req.file ? req.file.filename : null;

//     const userResult = await pool.query(
//       "UPDATE users SET full_name=$1, email=$2 WHERE id=$3 RETURNING id, full_name, email, role",
//       [full_name, email, studentId]
//     );

//     if (filename) {
//       await pool.query(
//         `INSERT INTO user_profiles(user_id, profile_pic)
//          VALUES($1, $2)
//          ON CONFLICT (user_id) 
//          DO UPDATE SET profile_pic = EXCLUDED.profile_pic`,
//         [studentId, filename]
//       );
      
//       // LOG ACTIVITY: Student updated profile
//       await pool.query(
//         "INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)",
//         [studentId, 'PROFILE_UPDATE', `Updated name/email and profile picture`]
//       );
//     }

//     const profileResult = await pool.query(
//       "SELECT profile_pic FROM user_profiles WHERE user_id=$1",
//       [studentId]
//     );

//     const dbPath = profileResult.rows[0]?.profile_pic;

//     res.json({
//       ...userResult.rows[0],
//       profile_pic: dbPath ? `http://localhost:5000/uploads/${dbPath}` : null,
//     });
//   } catch (err) {
//     console.error("Error updating profile:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };




// /* ---------------- REMOVE PROFILE PICTURE ---------------- */
// exports.removestdProfilePic = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     await pool.query(
//       "UPDATE user_profiles SET profile_pic = NULL WHERE user_id = $1",
//       [teacherId]
//     );
    
//     // Fetch updated user info to return
//     const userResult = await pool.query(
//       "SELECT id, full_name, email, role FROM users WHERE id = $1",
//       [teacherId]
//     );

//     res.json({
//       ...userResult.rows[0],
//       profile_pic: null
//     });
//   } catch (err) {
//     console.error("Error removing profile pic:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };



/* ---------------- GET PROFILE ---------------- */ 
exports.getProfile = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Use a JOIN to get everything in one request
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, p.profile_pic 
       FROM users u 
       LEFT JOIN user_profiles p ON u.id = p.user_id 
       WHERE u.id = $1`,
      [studentId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const student = result.rows[0];
    if (student.profile_pic) {
      student.profile_pic = `http://localhost:5000/uploads/${student.profile_pic}`;
    }

    res.json(student);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- UPDATE STUDENT PROFILE ---------------- */
exports.updateProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { full_name, email } = req.body;
    const filename = req.file ? req.file.filename : null;

    // 1. Update basic info
    const userResult = await pool.query(
      "UPDATE users SET full_name=$1, email=$2 WHERE id=$3 RETURNING id, full_name, email, role",
      [full_name, email, studentId]
    );

    // 2. Update profile pic if a new one was uploaded
    if (filename) {
      await pool.query(
        `INSERT INTO user_profiles(user_id, profile_pic)
         VALUES($1, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET profile_pic = EXCLUDED.profile_pic`,
        [studentId, filename]
      );
    }

    // 3. Get the final profile pic state
    const profileResult = await pool.query(
      "SELECT profile_pic FROM user_profiles WHERE user_id=$1",
      [studentId]
    );

    const dbPath = profileResult.rows[0]?.profile_pic;

    res.json({
      ...userResult.rows[0],
      profile_pic: dbPath ? `http://localhost:5000/uploads/${dbPath}` : null,
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- REMOVE PROFILE PICTURE ---------------- */
exports.removestdProfilePic = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    await pool.query(
      "UPDATE user_profiles SET profile_pic = NULL WHERE user_id = $1",
      [studentId]
    );
    
    const userResult = await pool.query(
      "SELECT id, full_name, email, role FROM users WHERE id = $1",
      [studentId]
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