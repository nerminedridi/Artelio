require("./env");
const fs = require("fs");
const path = require("path");
const pool = require("../db");

async function setup() {
  const dbDir = path.join(__dirname, "..", "db");
  await pool.query(fs.readFileSync(path.join(dbDir, "schema.sql"), "utf8"));
  await pool.query(fs.readFileSync(path.join(dbDir, "seed.sql"), "utf8"));
  console.log("Test database reset and seeded.");
  await pool.end();
}

setup().catch((err) => {
  console.error("Test DB setup failed:", err.message);
  process.exit(1);
});
