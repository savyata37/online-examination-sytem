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

    if (!teacherId) return res.status(400).json({ error: "Teacher ID required" });

    // 1. Summary Metrics
    // We join results -> exams to find scores for exams CREATED BY this teacher
    const summaryQuery = `
      SELECT 
        ROUND(AVG(r.score)::numeric, 2) as teacher_avg,
        (SELECT ROUND(AVG(score)::numeric, 2) FROM results) as overall_avg,
        (SELECT COUNT(DISTINCT r.student_id) FROM results r 
         JOIN exams e ON r.exam_id = e.examid 
         WHERE e.created_by = $1) as total_students
      FROM results r
      JOIN exams e ON r.exam_id = e.examid
      WHERE e.created_by = $1
      ${startDate && endDate ? "AND r.started_at BETWEEN $2 AND $3" : ""}
    `;
    
    const params = [teacherId];
    if (startDate && endDate) params.push(startDate, endDate);
    const summaryRes = await pool.query(summaryQuery, params);

    // 2. Ranking Logic (Rank teachers by their students' average scores)
    const rankingRes = await pool.query(`
      SELECT u.full_name as teacher, ROUND(AVG(r.score)::numeric, 2) as avg_score
      FROM results r
      JOIN exams e ON r.exam_id = e.examid
      JOIN users u ON e.created_by = u.id
      WHERE u.role = 'teacher'
      GROUP BY u.full_name
      ORDER BY avg_score DESC
    `);

    // 3. Student Progress (Line Chart)
    const progressRes = await pool.query(`
      SELECT e.title as exam, ROUND(AVG(r.score)::numeric, 2) as avg_score
      FROM results r
      JOIN exams e ON r.exam_id = e.examid
      WHERE e.created_by = $1
      GROUP BY e.title, e.start_time
      ORDER BY e.start_time ASC
    `, [teacherId]);

    // 4. Heatmap Data (Matrix)
    const heatmapRes = await pool.query(`
      SELECT u.full_name as student, e.title as exam, r.score
      FROM results r
      JOIN users u ON r.student_id = u.id
      JOIN exams e ON r.exam_id = e.examid
      WHERE e.created_by = $1
      ORDER BY u.full_name, e.title
    `, [teacherId]);

    // Find ranking position
    const rankingData = rankingRes.rows;
    const currentTeacherName = (await pool.query("SELECT full_name FROM users WHERE id = $1", [teacherId])).rows[0]?.full_name;
    const rankIndex = rankingData.findIndex(t => t.teacher === currentTeacherName) + 1;

    res.json({
      teacher_summary: {
        ...summaryRes.rows[0],
        ranking: rankIndex > 0 ? rankIndex : "-",
        subject_avg: summaryRes.rows[0]?.teacher_avg // Simplified for this context
      },
      teacher_ranking: rankingData,
      student_progress: progressRes.rows,
      heatmap_data: heatmapRes.rows
    });

  } catch (err) {
    console.error("Teacher analytics error:", err.message);
    res.status(500).json({ error: "Database error occurred" });
  }
};




// ---------- STUDENT ANALYTICS ----------
// ---------- STUDENT ANALYTICS (CORRECTED) ----------
exports.getStudentAnalytics = async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: "Student ID is required" });
    }

    // 1. Fetch Exam Scores for the charts
    const scoresQuery = `
      SELECT e.title as exam, r.score, r.percentage
      FROM results r
      JOIN exams e ON r.exam_id = e.examid
      WHERE r.student_id = $1
      ${startDate && endDate ? "AND e.start_time BETWEEN $2 AND $3" : ""}
      ORDER BY e.start_time ASC
    `;
    
    const scoreParams = [studentId];
    if (startDate && endDate) scoreParams.push(startDate, endDate);
    
    const scoresRes = await pool.query(scoresQuery, scoreParams);

    // 2. Fetch Summary Statistics for the SummaryCards
    const summaryQuery = `
      SELECT 
        (SELECT AVG(score) FROM results WHERE student_id = $1) as student_avg,
        (SELECT AVG(score) FROM results r 
         JOIN exams e ON r.exam_id = e.examid 
         WHERE e.examid IN (SELECT exam_id FROM results WHERE student_id = $1)) as class_avg,
        (SELECT AVG(score) FROM results) as overall_avg
    `;
    
    const summaryRes = await pool.query(summaryQuery, [studentId]);

    // 3. Send the response in the format the frontend expects
    res.json({
      student_summary: {
        student_avg: Math.round(summaryRes.rows[0].student_avg || 0),
        class_avg: Math.round(summaryRes.rows[0].class_avg || 0),
        overall_avg: Math.round(summaryRes.rows[0].overall_avg || 0)
      },
      exam_scores: scoresRes.rows // This matches 'data.exam_scores' in React
    });

  } catch (err) {
    console.error("Student analytics error:", err.message);
    res.status(500).json({ error: "Failed to fetch student analytics" });
  }
};



// ---------- EXAM ANALYTICS ----------
// adminController.js (getExamAnalytics fix)
exports.getExamAnalytics = async (req, res) => {
  try {
    const { examId } = req.query;
    if (!examId) return res.status(400).json({ message: "Exam ID is required" });

    // 1. Get Summary Info
    const summaryRes = await pool.query(
      `SELECT title, AVG(score) as avg_score, COUNT(student_id) as total_students 
       FROM results r JOIN exams e ON r.exam_id = e.examid 
       WHERE e.examid = $1 GROUP BY e.title`, [examId]
    );

    // 2. Get Individual Scores for Charts
    const scoresRes = await pool.query(
      `SELECT u.full_name as student, r.score 
       FROM results r JOIN users u ON r.student_id = u.id 
       WHERE r.exam_id = $1`, [examId]
    );

    res.json({
      exam_summary: summaryRes.rows[0] || {},
      student_scores: scoresRes.rows || []
    });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};




// ---------- SUBJECT ANALYTICS ----------

exports.getSubjectAnalytics = async (req, res) => {
  const subjectId = parseInt(req.query.subjectId);
  if (isNaN(subjectId)) return res.status(400).json({ message: "Invalid subject ID" });

  try {
    // 1. Teacher Performance
    const teacherPerf = await pool.query(
      `SELECT u.full_name AS teacher, AVG(r.score) AS score
       FROM results r
       JOIN exams e ON r.exam_id = e.examid
       JOIN users u ON e.created_by = u.id
       WHERE e.subject_id = $1
       GROUP BY u.full_name`,
      [subjectId]
    );

    // 2. Student Performance
    const studentPerf = await pool.query(
      `SELECT u.full_name AS student, AVG(r.score) AS score
       FROM results r
       JOIN exams e ON r.exam_id = e.examid
       JOIN users u ON r.student_id = u.id
       WHERE e.subject_id = $1
       GROUP BY u.full_name`,
      [subjectId]
    );

    // 3. Summary Stats
    const summary = await pool.query(
      `SELECT 
        (SELECT AVG(score) FROM results r JOIN exams e ON r.exam_id = e.examid WHERE e.subject_id = $1) as overall_avg,
        (SELECT COUNT(DISTINCT student_id) FROM results r JOIN exams e ON r.exam_id = e.examid WHERE e.subject_id = $1) as total_students`,
      [subjectId]
    );

    res.json({
      subject_summary: {
        teacher_avg: Math.round(teacherPerf.rows[0]?.score || 0),
        student_avg: Math.round(studentPerf.rows[0]?.score || 0),
        overall_avg: Math.round(summary.rows[0]?.overall_avg || 0)
      },
      teacher_scores: teacherPerf.rows, // Matches frontend setTeacherScores
      student_scores: studentPerf.rows  // Matches frontend setStudentScores
    });
  } catch (error) {
    console.error("Subject analytics error:", error);
    res.status(500).json({ message: "Internal Server Error" });
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


// exports.getAdminProfile = async (req, res) => {
//   try {
//     const adminId = req.user.id; // From your auth middleware

//     const adminQuery = await pool.query(
//       `SELECT full_name, email, role, created_at 
//        FROM users 
//        WHERE id = $1 AND role = 'admin'`,
//       [adminId]
//     );

//     if (adminQuery.rows.length === 0) {
//       return res.status(404).json({ message: "Admin not found" });
//     }

//     res.json(adminQuery.rows[0]);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ message: "Server error fetching profile" });
//   }
// };



// exports.updateAdminProfile = async (req, res) => {
//   try {
//     const adminId = req.user.id;
//     const { full_name, email } = req.body;

//     const result = await pool.query(
//       `UPDATE users 
//        SET full_name = COALESCE($1, full_name), 
//            email = COALESCE($2, email) 
//        WHERE id = $3 AND role = 'admin'
//        RETURNING id, full_name, email`,
//       [full_name, email, adminId]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "Admin not found" });
//     }

//     res.json({ message: "Profile updated successfully", user: result.rows[0] });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ message: "Server error updating profile" });
//   }
// };


// /* ---------------- GET ADMIN PROFILE ---------------- */
// exports.getAdminProfile = async (req, res) => {
//   try {
//     const adminId = req.user.id;

//     // Fetch basic admin info
//     const adminQuery = await pool.query(
//       `SELECT id, full_name, email, role, created_at 
//        FROM users 
//        WHERE id = $1 AND role = 'admin'`,
//       [adminId]
//     );

//     if (adminQuery.rows.length === 0) {
//       return res.status(404).json({ message: "Admin not found" });
//     }

//     // Fetch profile picture from the shared user_profiles table
//     const profileResult = await pool.query(
//       "SELECT profile_pic FROM user_profiles WHERE user_id = $1",
//       [adminId]
//     );

//     let profilePic = profileResult.rows[0]?.profile_pic || null;

//     // Format the URL if it exists
//     if (profilePic) {
//       // Logic consistent with student controller
//       profilePic = `http://localhost:5000/uploads/${profilePic}`;
//     }

//     res.json({
//       ...adminQuery.rows[0],
//       profile_pic: profilePic,
//     });
//   } catch (err) {
//     console.error("Error fetching admin profile:", err.message);
//     res.status(500).json({ message: "Server error fetching profile" });
//   }
// };

// /* ---------------- UPDATE ADMIN PROFILE ---------------- */
// exports.updateAdminProfile = async (req, res) => {
//   try {
//     const adminId = req.user.id;
//     const { full_name, email } = req.body;
    
//     // Check if a file was uploaded via multer
//     const profile_pic = req.file ? req.file.filename : null;

//     // Update basic user info
//     const result = await pool.query(
//       `UPDATE users 
//        SET full_name = COALESCE($1, full_name), 
//            email = COALESCE($2, email) 
//        WHERE id = $3 AND role = 'admin'
//        RETURNING id, full_name, email, role`,
//       [full_name, email, adminId]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "Admin not found" });
//     }

//     // If a new pic was uploaded, handle the user_profiles table
//     if (profile_pic) {
//       await pool.query(
//         `INSERT INTO user_profiles(user_id, profile_pic)
//          VALUES($1, $2)
//          ON CONFLICT (user_id)
//          DO UPDATE SET profile_pic = EXCLUDED.profile_pic`,
//         [adminId, profile_pic]
//       );
//     }

//     // Get final profile pic state
//     const profileResult = await pool.query(
//       "SELECT profile_pic FROM user_profiles WHERE user_id = $1",
//       [adminId]
//     );

//     let finalPic = profileResult.rows[0]?.profile_pic || null;
//     if (finalPic) {
//       finalPic = `http://localhost:5000/uploads/${finalPic}`;
//     }

//     res.json({ 
//       message: "Profile updated successfully", 
//       user: {
//         ...result.rows[0],
//         profile_pic: finalPic
//       } 
//     });
//   } catch (err) {
//     console.error("Error updating admin profile:", err.message);
//     res.status(500).json({ message: "Server error updating profile" });
//   }
// };



/* ---------------- GET ADMIN PROFILE ---------------- */
exports.getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Use a JOIN to get everything in one go - cleaner and faster
    const adminQuery = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.created_at, p.profile_pic 
       FROM users u 
       LEFT JOIN user_profiles p ON u.id = p.user_id 
       WHERE u.id = $1 AND u.role = 'admin'`,
      [adminId]
    );

    if (adminQuery.rows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const admin = adminQuery.rows[0];
    
    // Consistent URL formatting
    if (admin.profile_pic) {
      admin.profile_pic = `http://localhost:5000/uploads/${admin.profile_pic}`;
    }

    res.json(admin);
  } catch (err) {
    console.error("Error fetching admin profile:", err.message);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

/* ---------------- UPDATE ADMIN PROFILE ---------------- */
exports.updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { full_name, email } = req.body;
    const filename = req.file ? req.file.filename : null;

    // 1. Update basic user info
    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name), 
           email = COALESCE($2, email) 
       WHERE id = $3 AND role = 'admin'
       RETURNING id, full_name, email, role`,
      [full_name, email, adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // 2. Handle profile pic
    if (filename) {
      await pool.query(
        `INSERT INTO user_profiles(user_id, profile_pic)
         VALUES($1, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET profile_pic = EXCLUDED.profile_pic`,
        [adminId, filename]
      );
    }

    // 3. Get updated profile pic for response
    const profileResult = await pool.query(
      "SELECT profile_pic FROM user_profiles WHERE user_id = $1",
      [adminId]
    );

    const finalPicName = profileResult.rows[0]?.profile_pic;
    
    // Return the user object directly (standardized with Teacher logic)
    res.json({ 
      ...result.rows[0],
      profile_pic: finalPicName ? `http://localhost:5000/uploads/${finalPicName}` : null
    });

  } catch (err) {
    console.error("Error updating admin profile:", err.message);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

/* ---------------- REMOVE ADMIN PROFILE PIC ---------------- */
exports.removeAdminProfilePic = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    await pool.query(
      "UPDATE user_profiles SET profile_pic = NULL WHERE user_id = $1",
      [adminId]
    );

    // Fetch and return updated user data
    const userResult = await pool.query(
      "SELECT id, full_name, email, role FROM users WHERE id = $1",
      [adminId]
    );

    res.json({
      ...userResult.rows[0],
      profile_pic: null
    });
  } catch (err) {
    console.error("Error removing admin profile pic:", err);
    res.status(500).json({ message: "Server error" });
  }
};