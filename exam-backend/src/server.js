

require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log(`✅ Server running on port ${PORT}`);
    console.log("✅ PostgreSQL connected");
  } catch (err) {
    console.error("❌ DB connection failed", err);
  }
});
