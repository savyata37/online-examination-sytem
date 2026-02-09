const { Pool } = require("pg");

const pool = new Pool({
  host: "127.0.0.1",
  user: "postgres",
  password: "123456",
  database: "exam_system",
  port: 5432,
});

(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("PostgreSQL Connected ✅", res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("DB connection failed ❌", err.message);
    process.exit(1);
  }
})();
