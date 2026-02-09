const pool = require("../config/db");

exports.getAllUsers = async (req, res) => {
  const result = await pool.query(
    "SELECT id, full_name, email, role FROM users"
  );
  res.json(result.rows);
};

// ---------- USERS / TEACHERS / STUDENTS ----------
exports.getTeachers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, full_name FROM users WHERE role = 'teacher'"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching teachers:", err.message);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, full_name FROM users WHERE role = 'student'"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching students:", err.message);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

exports.getExams = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT examid, title FROM exams"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching exams:", err.message);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
};

// ---------- TEACHER ANALYTICS ----------
exports.getTeacherAnalytics = async (req, res) => {
  try {
    const { teacherId, startDate, endDate } = req.query;

    // Summary for selected teacher
    const summaryQuery = `
      SELECT 
        AVG(score) as teacher_avg,
        -- overall avg for subject exams by this teacher
        (SELECT AVG(score) FROM results r
         JOIN exams e ON e.examid = r.exam_id
         WHERE e.created_by = $1
         ${startDate && endDate ? "AND r.started_at BETWEEN $2 AND $3" : ""}) as subject_avg,
        (SELECT AVG(score) FROM results r) as overall_avg
    `;
    const params = [teacherId];
    if (startDate && endDate) params.push(startDate, endDate);

    const summaryRes = await pool.query(summaryQuery, params);
    const teacher_summary = summaryRes.rows[0];

    // Teacher ranking (by avg score)
    const rankingRes = await pool.query(`
      SELECT u.full_name as teacher, AVG(r.score) as avg_score
      FROM results r
      JOIN exams e ON r.exam_id = e.examid
      JOIN users u ON e.created_by = u.id
      WHERE u.role='teacher'
      GROUP BY u.full_name
      ORDER BY avg_score DESC
    `);
    const teacher_ranking = rankingRes.rows;

    // Student progress for this teacher's exams
    const studentProgressRes = await pool.query(`
      SELECT u.full_name as student, e.title as exam, AVG(r.score) as avg_score
      FROM results r
      JOIN users u ON r.student_id = u.id
      JOIN exams e ON r.exam_id = e.examid
      WHERE e.created_by = $1
      GROUP BY u.full_name, e.title
      ORDER BY u.full_name, e.title
    `, [teacherId]);
    const student_progress = studentProgressRes.rows;

    // Heatmap data
    const heatmapRes = await pool.query(`
      SELECT u.full_name as student, e.title as exam, r.score
      FROM results r
      JOIN users u ON r.student_id = u.id
      JOIN exams e ON r.exam_id = e.examid
      WHERE e.created_by = $1
      ORDER BY u.full_name, e.title
    `, [teacherId]);
    const heatmap_data = heatmapRes.rows;

    res.json({ teacher_summary, teacher_ranking, student_progress, heatmap_data });

  } catch (err) {
    console.error("Teacher analytics error:", err.message);
    res.status(500).json({ error: "Failed to fetch teacher analytics" });
  }
};

// ---------- STUDENT ANALYTICS ----------
exports.getStudentAnalytics = async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;

    const resultsRes = await pool.query(`
      SELECT u.full_name as student, e.title as exam, r.score, r.percentage
      FROM results r
      JOIN users u ON r.student_id = u.id
      JOIN exams e ON r.exam_id = e.examid
      ${studentId ? "WHERE u.id = $1" : ""}
      ORDER BY e.start_time
    `, studentId ? [studentId] : []);
    
    res.json(resultsRes.rows);
  } catch (err) {
    console.error("Student analytics error:", err.message);
    res.status(500).json({ error: "Failed to fetch student analytics" });
  }
};

// ---------- EXAM ANALYTICS ----------
exports.getExamAnalytics = async (req, res) => {
  try {
    const { examId } = req.query;

    const examRes = await pool.query(`
      SELECT e.title as exam, AVG(r.score) as avg_score, COUNT(r.student_id) as total_students
      FROM results r
      JOIN exams e ON r.exam_id = e.examid
      ${examId ? "WHERE e.examid = $1" : ""}
      GROUP BY e.title
    `, examId ? [examId] : []);
    
    res.json(examRes.rows);
  } catch (err) {
    console.error("Exam analytics error:", err.message);
    res.status(500).json({ error: "Failed to fetch exam analytics" });
  }
};

// ---------- SUBJECT ANALYTICS ----------
// exports.getSubjectAnalytics = async (req, res) => {
//   try {
//     const { subjectId } = req.query;

//     const subjectRes = await pool.query(`
//       SELECT s.name, AVG(r.score) as avg_score, COUNT(r.student_id) as total_students
//       FROM results r
//       JOIN exams e ON r.exam_id = e.examid
//       JOIN subject s ON e.subject_id = s.id
//       ${subjectId ? "WHERE s.id = $1" : ""}
//       GROUP BY s.name
//     `, subjectId ? [subjectId] : []);
    
//     res.json(subjectRes.rows);
//   } catch (err) {
//     console.error("Subject analytics error:", err.message);
//     res.status(500).json({ error: "Failed to fetch subject analytics" });
//   }
// };

exports.getSubjectAnalytics = async (req, res) => {
  const subjectId = parseInt(req.query.subjectId); // convert to integer
  if (isNaN(subjectId)) return res.status(400).json({ message: "Invalid subject ID" });

  try {
    // Example query: teacher performance in this subject
    const teacherPerf = await pool.query(
      `SELECT u.id AS teacher_id, u.full_name AS teacher_name, AVG(r.score) AS avg_score
       FROM results r
       JOIN exams e ON r.exam_id = e.examid
       JOIN users u ON e.created_by = u.id
       WHERE e.subject_id = $1
       GROUP BY u.id, u.full_name
       ORDER BY avg_score DESC`,
      [subjectId]
    );

    res.json({
      teacher_performance: teacherPerf.rows
    });
  } catch (error) {
    console.error("Subject analytics error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};



exports.getAllSubjects = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, difficulty_level FROM subject ORDER BY name"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ---------- GET ALL USERS ----------
exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, full_name, email, role FROM users"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};