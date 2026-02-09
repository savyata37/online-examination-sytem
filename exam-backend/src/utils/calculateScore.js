// const calculateScore = (questions, answers) => {
//   let score = 0;

//   questions.forEach((q) => {
//     if (answers[q.id] === q.correct_option) {
//       score++;
//     }
//   });

//   return score;
// };

// module.exports = calculateScore;

const calculateScore = (questions, answers) => {
  let score = 0;

  questions.forEach((q) => {
    const qid = q.questionid.toString(); // ensure string
    if (
      answers[qid] &&
      answers[qid].toUpperCase() === q.correct_option.toUpperCase()
    ) {
      score++;
    }
  });

  return score;
};

module.exports = calculateScore;
