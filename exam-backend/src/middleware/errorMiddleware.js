
const errorMiddleware = (err, req, res, next) => {
  // Log stack only in development
  if (process.env.NODE_ENV === "development") {
    console.error("Server Error:", err.stack);
  } else {
    console.error("Server Error:", err.message);
  }

  res.status(500).json({
    message: "Server Error",
    // Send stack only in development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
