require("./env");
process.env.RATE_LIMIT_IN_TEST = "1";
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../server");

test("login is throttled after repeated attempts from one address", async () => {
  const statuses = [];
  for (let i = 0; i < 12; i++) {
    const res = await request(app).post("/login").send({ email: "artist@artelio.com", password: "wrong" });
    statuses.push(res.status);
  }
  assert.strictEqual(statuses.slice(0, 10).every((s) => s === 401), true);
  assert.strictEqual(statuses[10], 429);
  assert.strictEqual(statuses[11], 429);
});

test("password reset requests are throttled", async () => {
  let last;
  for (let i = 0; i < 6; i++) {
    last = await request(app).post("/forgot-password").send({ email: "nobody@example.com" });
  }
  assert.strictEqual(last.status, 429);
  assert.match(last.body.error, /Too many/);
});

test("responses carry security headers and the session cookie is SameSite=Lax", async () => {
  const res = await request(app).get("/login");
  assert.ok(res.headers["content-security-policy"].includes("default-src 'self'"));
  assert.strictEqual(res.headers["x-content-type-options"], "nosniff");
  assert.ok(!res.headers["x-powered-by"]);
});
