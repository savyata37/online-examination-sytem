

const { insertViolation } = require("../models/proctoringModel");

const logViolation = async (req, res) => {
  const { studentId, examId, violationType, details } = req.body;

  if (!studentId || !examId || !violationType) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await insertViolation(studentId, examId, violationType, details || null);
    res.status(201).json({ message: "Violation logged successfully" });
  } catch (err) {
    console.error("Error logging violation:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { logViolation };


exports.handleViolation = async (req, res) => {
  const { examId, reason } = req.body;
  const studentId = req.user.id;

  await pool.query(
    `INSERT INTO exam_violations (exam_id, student_id, reason)
     VALUES ($1, $2, $3)`,
    [examId, studentId, reason]
  );

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM exam_violations
     WHERE exam_id = $1 AND student_id = $2`,
    [examId, studentId]
  );

  const violations = Number(countRes.rows[0].count);

  if (violations >= 5) {
    await pool.query(
      `UPDATE exam_attempts
       SET submitted_at = NOW()
       WHERE exam_id = $1 AND student_id = $2
       AND submitted_at IS NULL`,
      [examId, studentId]
    );

    return res.status(403).json({
      action: "AUTO_SUBMIT",
      message: "Exam auto-submitted due to violations",
    });
  }

  res.json({ action: "WARN", violations });
};
