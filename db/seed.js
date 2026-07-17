const fs = require("fs");
const path = require("path");
const pool = require("./index");

async function seed() {
  const sql = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
  await pool.query(sql);
  console.log("Database seeded successfully.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
