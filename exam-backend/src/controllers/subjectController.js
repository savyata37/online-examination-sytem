

// controllers/subjectController.js
const pool = require("../config/db");
// fetch all subjects
exports.getAllSubjects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM subject ORDER BY name`
    );
    res.json(result.rows); // should return [{id:1, name:"Math"}, ...]
  } catch (err) {
    console.error("Failed to fetch subjects", err);
    res.status(500).json({ message: "Failed to load subjects" });
  }
};
