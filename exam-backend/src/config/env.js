// // require("dotenv").config();

// // module.exports = {
// //   PORT: process.env.PORT || 5000,
// //   JWT_SECRET: process.env.JWT_SECRET
// // };


// require("dotenv").config();

// module.exports = {
//   PORT: process.env.PORT || 5000,
//   DATABASE_URL: process.env.DATABASE_URL,
//   JWT_SECRET: process.env.JWT_SECRET
// };


// Only require dotenv locally
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL
};


