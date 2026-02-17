

require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");
const { PORT } = require("./env");

// const PORT = process.env.PORT || 5000; 
// change above two pools for local hosting

app.listen(PORT, async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log(`✅ Server running on port ${PORT}`);
    console.log("✅ PostgreSQL connected");
  } catch (err) {
    console.error("❌ DB connection failed", err);
  }
});
