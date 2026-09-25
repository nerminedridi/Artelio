require("./env");
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../server");
const pool = require("../db");

const EMAIL = "nora.whitfield@artelio.com";

async function latestToken() {
  const { rows } = await pool.query(
    "SELECT token FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE u.email = $1 ORDER BY pr.id DESC LIMIT 1",
    [EMAIL]
  );
  return rows[0].token;
}

test("forgot-password gives the same answer for known and unknown emails", async () => {
  const known = await request(app).post("/forgot-password").send({ email: EMAIL });
  const unknown = await request(app).post("/forgot-password").send({ email: "nobody@example.com" });
  assert.strictEqual(known.status, 200);
  assert.deepStrictEqual(known.body, unknown.body);
});

test("reset-password validates input", async () => {
  const token = await latestToken();
  const mismatch = await request(app).post("/reset-password").send({ token, password: "NewPassword1!", confirm: "different" });
  assert.strictEqual(mismatch.status, 400);
  const short = await request(app).post("/reset-password").send({ token, password: "short", confirm: "short" });
  assert.strictEqual(short.status, 400);
  const bogus = await request(app).post("/reset-password").send({ token: "not-a-real-token", password: "NewPassword1!", confirm: "NewPassword1!" });
  assert.strictEqual(bogus.status, 400);
});

test("a valid token changes the password exactly once", async () => {
  const token = await latestToken();
  const ok = await request(app).post("/reset-password").send({ token, password: "BrandNewPass1!", confirm: "BrandNewPass1!" });
  assert.strictEqual(ok.status, 200);

  assert.strictEqual((await request(app).post("/login").send({ email: EMAIL, password: "BrandNewPass1!" })).status, 200);
  assert.strictEqual((await request(app).post("/login").send({ email: EMAIL, password: "Password123!" })).status, 401);

  const replay = await request(app).post("/reset-password").send({ token, password: "AnotherPass1!", confirm: "AnotherPass1!" });
  assert.strictEqual(replay.status, 400);
});

test("expired tokens are rejected", async () => {
  await request(app).post("/forgot-password").send({ email: EMAIL });
  const token = await latestToken();
  await pool.query("UPDATE password_resets SET expires_at = NOW() - INTERVAL '1 minute' WHERE token = $1", [token]);
  const res = await request(app).post("/reset-password").send({ token, password: "TooLate123!", confirm: "TooLate123!" });
  assert.strictEqual(res.status, 400);
});
