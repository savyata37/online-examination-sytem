exports.getExamStatus = (start, end) => {
  const now = new Date();
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "ongoing";
  return "completed";
};
