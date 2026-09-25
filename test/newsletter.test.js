require("./env");
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../server");

test("rejects malformed emails", async () => {
  const res = await request(app).post("/newsletter/subscribe").send({ email: "not-an-email" });
  assert.strictEqual(res.status, 400);
});

test("subscribes once and reports duplicates without erroring", async () => {
  const first = await request(app).post("/newsletter/subscribe").send({ email: "reader@example.com" });
  assert.strictEqual(first.status, 200);
  assert.match(first.body.message, /Subscribed/);

  const second = await request(app).post("/newsletter/subscribe").send({ email: "reader@example.com" });
  assert.strictEqual(second.status, 200);
  assert.match(second.body.message, /already subscribed/);
});
