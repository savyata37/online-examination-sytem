

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

/* ---------------- AUTO SUBMIT CHECK ---------------- */
const autoSubmitIfExpired = async (attempt, examId, answers = {}) => {
  const examRes = await pool.query(
    `SELECT duration FROM exams WHERE examid=$1`,
    [examId]
  );

  if (!examRes.rows.length) return { autoSubmitted: false };

  const durationMs = examRes.rows[0].duration * 60 * 1000;

  const now = new Date();
  const startTime = new Date(attempt.started_at);

  if (now - startTime > durationMs) {
    const qRes = await pool.query(
      `SELECT * FROM questions WHERE examid=$1`,
      [examId]
    );

    const score = calculateScore(qRes.rows, answers);
    const total = qRes.rows.length;
    const percentage = total ? (score / total) * 100 : 0;
    const passed = percentage >= 40;

    await pool.query(
      `UPDATE results
       SET score=$1, percentage=$2, passed=$3,
           submitted_at=$4, status='auto_submitted'
       WHERE id=$5`,
      [score, percentage, passed, now, attempt.id]
    );

    return { autoSubmitted: true, score, percentage, passed };
  }

  return { autoSubmitted: false };
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


// // ---------------- SUBMIT EXAM ----------------
// exports.submitExam = async (req, res) => {
//   const { answers } = req.body;
//   const examId = parseInt(req.params.id, 10);
//   const studentId = req.user.id;

//   try {
//     // 1️⃣ Fetch student's attempt
//     const resultRes = await pool.query(
//       `SELECT * FROM results WHERE exam_id=$1 AND student_id=$2`,
//       [examId, studentId]
//     );

//     if (!resultRes.rows.length)
//       return res.status(403).json({ message: "Exam not started" });

//     const attempt = resultRes.rows[0];

//     if (attempt.status !== "started")
//       return res.status(403).json({ message: "Exam already submitted" });

//     // 2️⃣ Fetch exam questions
//     const qRes = await pool.query(
//       `SELECT q.*
//        FROM exam_questions eq
//        JOIN questions q ON eq.questionid = q.questionid
//        WHERE eq.examid=$1`,
//       [examId]
//     );

//     // 3️⃣ Calculate score
//     const score = calculateScore(qRes.rows, answers);
//     const totalQuestions = qRes.rows.length;
//     const percentage = totalQuestions ? (score / totalQuestions) * 100 : 0;
//     const passed = percentage >= 40;

//     // 4️⃣ Update result
//     await pool.query(
//       `UPDATE results
//        SET score=$1, percentage=$2, passed=$3, submitted_at=NOW(), status='submitted'
//        WHERE id=$4`,
//       [score, percentage, passed, attempt.id]
//     );

//     res.json({ message: "Exam submitted successfully", score, percentage, passed });
//   } catch (err) {
//     console.error("Submit exam error:", err);
//     res.status(500).json({ message: "Failed to submit exam" });
//   }
// };

// ---------------- SUBMIT EXAM ----------------
exports.submitExam = async (req, res) => {
  const { answers } = req.body; // { questionId: "A", ... }
  const examId = parseInt(req.params.id, 10);
  const studentId = req.user.id;

  try {
    // 1️⃣ Fetch student's attempt
    const resultRes = await pool.query(
      `SELECT * FROM results WHERE exam_id=$1 AND student_id=$2`,
      [examId, studentId]
    );

    if (!resultRes.rows.length)
      return res.status(403).json({ message: "Exam not started" });

    const attempt = resultRes.rows[0];

    if (attempt.status !== "started")
      return res.status(403).json({ message: "Exam already submitted" });

    // 2️⃣ Fetch exam questions
    const qRes = await pool.query(
      `SELECT q.* 
       FROM exam_questions eq
       JOIN questions q ON eq.questionid = q.questionid
       WHERE eq.examid=$1`,
      [examId]
    );

    const questions = qRes.rows;

    // 3️⃣ Insert student answers
    const insertPromises = questions.map(q => {
      const selectedOption = answers[q.questionid] || null; // null if not answered
      return pool.query(
        `INSERT INTO student_answers (student_id, examid, questionid, selected_option)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, examid, questionid)
         DO UPDATE SET selected_option = EXCLUDED.selected_option`,
        [studentId, examId, q.questionid, selectedOption]
      );
    });
    await Promise.all(insertPromises);

    // 4️⃣ Calculate score
    const score = questions.reduce((acc, q) => {
      const selected = answers[q.questionid];
      return selected === q.correct_option ? acc + 1 : acc;
    }, 0);

    const totalQuestions = questions.length;
    const percentage = totalQuestions ? (score / totalQuestions) * 100 : 0;
    const passed = percentage >= 40;

    // 5️⃣ Update result table
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


// ---------------- LOG VIOLATION ----------------
exports.logViolation = async (req, res) => {
  const { examId, violationType, details } = req.body;
  const studentId = req.user.id;

  if (!examId || !violationType)
    return res.status(400).json({ message: "examId and violationType are required" });

  try {
    await pool.query(
      `INSERT INTO proctoring_violations (student_id, examid, violation_type, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [studentId, examId, violationType, details || null]
    );

    res.json({ message: "Violation logged" });
  } catch (err) {
    console.error("Log violation error:", err);
    res.status(500).json({ message: "Failed to log violation" });
  }
};

// exports.getSubjectPerformance = async (req, res) => {
//   try {
//     const studentId = req.user.id;

//     const result = await pool.query(
//       `
//       SELECT
//         e.subject_id,
//         AVG(r.percentage)::FLOAT AS average
//       FROM results r
//       JOIN exams e ON r.exam_id = e.examid
//       WHERE r.student_id = $1
//       GROUP BY e.subject_id
//       ORDER BY e.subject_id
//       `,
//       [studentId]
//     );

//     res.json(result.rows);
//   } catch (err) {
//     console.error("Subject performance error:", err);
//     res.status(500).json({ message: "Failed to fetch subject performance" });
//   }
// };



// ---------------- GET SUBJECT PERFORMANCE ----------------
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



// ---------------- GET WRONG QUESTIONS ----------------
exports.getWrongQuestions = async (req, res) => {
  const studentId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT 
        q.questionid,
        q.question,
        sa.selected_option AS student_answer,
        q.correct_option,
        s.name AS subject_name
      FROM student_answers sa
      JOIN questions q ON sa.questionid = q.questionid
      JOIN subject s ON q.subject_id = s.id
      JOIN exams e ON sa.examid = e.examid
      WHERE sa.student_id = $1
        AND sa.selected_option IS DISTINCT FROM q.correct_option
      ORDER BY sa.examid, q.questionid
      `,
      [studentId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getWrongQuestions error:", err);
    res.status(500).json({ message: "Failed to fetch wrong questions" });
  }
};
