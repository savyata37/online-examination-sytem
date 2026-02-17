

// require("dotenv").config();
// const { Pool } = require("pg");

// // console.log("DB_HOST:", process.env.DB_HOST);
// // console.log("DB_USER:", process.env.DB_USER);
// // console.log("DB_PASSWORD:", process.env.DB_PASSWORD);

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
// });

// module.exports = pool;


// db.js
const { Pool } = require("pg");
const { DATABASE_URL } = require("./env");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render
});

module.exports = pool;

