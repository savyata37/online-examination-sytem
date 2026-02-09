// // src/controllers/questionController.js

// const pool = require("../config/db");

// /**
//  * Fetch questions by subject
//  */
// exports.getQuestionsBySubject = async (req, res) => {
//   try {
//     const { subjectid } = req.query;

//     if (!subjectid) {
//       return res.status(400).json({ message: "subjectid is required" });
//     }

//     const result = await pool.query(
//       `SELECT * FROM questions WHERE subjectid = $1`,
//       [subjectid]
//     );

//     res.json(result.rows);
//   } catch (err) {
//     console.error("getQuestionsBySubject error:", err);
//     res.status(500).json({ message: "Failed to fetch questions" });
//   }
// };

// /**
//  * Create a new question
//  */
// exports.createQuestion = async (req, res) => {
//   try {
//     const { subjectid, question, optiona, optionb, optionc, optiond, correct } =
//       req.body;

//     const result = await pool.query(
//       `INSERT INTO questions
//        (subjectid, question, optiona, optionb, optionc, optiond, correct)
//        VALUES ($1,$2,$3,$4,$5,$6,$7)
//        RETURNING *`,
//       [subjectid, question, optiona, optionb, optionc, optiond, correct]
//     );

//     res.status(201).json(result.rows[0]);
//   } catch (err) {
//     console.error("createQuestion error:", err);
//     res.status(500).json({ message: "Failed to create question" });
//   }
// };

// /**
//  * Bulk add existing questions to exam
//  * NOTE: uses `questionid` (singular)
//  */
// exports.addQuestionsToExam = async (req, res) => {
//   try {
//     const { examid } = req.params;
//     const { questionids } = req.body;

//     if (!Array.isArray(questionids) || questionids.length === 0) {
//       return res.status(400).json({ message: "questionids array required" });
//     }

//     const values = questionids
//       .map((_, i) => `($1, $${i + 2})`)
//       .join(",");

//     await pool.query(
//       `INSERT INTO exam_questions (examid, questionid)
//        VALUES ${values}`,
//       [examid, ...questionids]
//     );

//     res.json({ message: "Questions added successfully" });
//   } catch (err) {
//     console.error("addQuestionsToExam error:", err);
//     res.status(500).json({ message: "Failed to add questions" });
//   }
// };
