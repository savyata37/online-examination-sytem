

// proctoringModel.js
const pool = require("../config/db");

const insertViolation = async (studentId, examId, violationType, details) => {
  const query = `
    INSERT INTO proctoring_violations
    (student_id, examid, violation_type, details)
    VALUES ($1, $2, $3, $4)
  `;
  await pool.query(query, [studentId, examId, violationType, details]);
};

module.exports = { insertViolation };
