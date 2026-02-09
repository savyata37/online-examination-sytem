
const pool = require("../config/db");

/* ---------------- CREATE EXAM ---------------- */
exports.createExam = async (req, res) => {
  try {
    const { title, description, duration, subject_id, start_time, end_time, status } = req.body;

    const result = await pool.query(
      `
      INSERT INTO exams (title, description, duration, subject_id, created_by, start_time, end_time, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
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
    console.error("createExam error:", err);
    res.status(500).json({ message: "Failed to create exam" });
  }
};

/* ---------------- GET ALL EXAMS ---------------- */
exports.getAllExams = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.examid,
        e.title,
        e.description,
        e.duration,
        e.status,
        e.start_time,
        e.end_time,
        s.name AS subject_name
      FROM exams e
      LEFT JOIN subject s ON e.subject_id = s.id
      ORDER BY e.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("getAllExams error:", err);
    res.status(500).json({ message: "Failed to fetch exams" });
  }
};

/* ---------------- GET EXAM BY ID ---------------- */
exports.getExamById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        e.*,
        s.name AS subject_name
      FROM exams e
      LEFT JOIN subject s ON e.subject_id = s.id
      WHERE e.examid = $1
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Exam not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("getExamById error:", err);
    res.status(500).json({ message: "Failed to fetch exam" });
  }
};

/* ---------------- EXAM ANALYTICS ---------------- */
exports.getExamAnalytics = async (req, res) => {
  try {
    const { exam_id } = req.params;

    const result = await pool.query(
      `
      SELECT COUNT(*) AS total_attempts
      FROM results
      WHERE examid = $1
      `,
      [exam_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("getExamAnalytics error:", err);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
};



exports.getExamQuestionsByExamId = async (req, res) => {
  const { id } = req.params; // examid
  try {
    const result = await pool.query(
      `SELECT q.* 
       FROM exam_questions eq
       JOIN questions q ON eq.questionid = q.questionid
       WHERE eq.examid = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "No questions found for this exam" });
    }

    res.json(result.rows);
  } catch (err) {
    console.error("getExamQuestionsByExamId error:", err);
    res.status(500).json({ message: "Failed to fetch exam questions" });
  }
};
