require("./env");
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../server");

const PASSWORD = "Password123!";
const login = (agent, email, password = PASSWORD) => agent.post("/login").send({ email, password });

test("rejects wrong credentials", async () => {
  const res = await login(request(app), "artist@artelio.com", "wrong-password");
  assert.strictEqual(res.status, 401);
});

test("protected pages redirect anonymous visitors to /login and are never cached", async () => {
  const res = await request(app).get("/dashboard-artist");
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, "/login");
  assert.match(res.headers["cache-control"], /no-store/);
});

test("two accounts stay logged in side by side, one per /u/:idx slot", async () => {
  const agent = request.agent(app);

  const first = await login(agent, "artist@artelio.com");
  assert.strictEqual(first.body.redirect, "/u/0/home");
  const second = await login(agent, "curator@artelio.com");
  assert.strictEqual(second.body.redirect, "/u/1/home");

  assert.strictEqual((await agent.get("/u/0/dashboard-artist")).status, 200);
  assert.strictEqual((await agent.get("/u/1/dashboard-curator")).status, 200);
  assert.strictEqual((await agent.get("/u/1/dashboard-artist")).status, 403, "curator must not reach the artist dashboard");
});

test("logging out one slot leaves the other untouched and frees the slot for reuse", async () => {
  const agent = request.agent(app);
  await login(agent, "artist@artelio.com");
  await login(agent, "curator@artelio.com");

  await agent.post("/u/1/logout");
  const gone = await agent.get("/u/1/dashboard-curator");
  assert.strictEqual(gone.status, 302);
  assert.strictEqual((await agent.get("/u/0/dashboard-artist")).status, 200);

  const reused = await login(agent, "visitor@artelio.com");
  assert.strictEqual(reused.body.redirect, "/u/1/home");
});

test("logging in the same account twice reuses its slot", async () => {
  const agent = request.agent(app);
  await login(agent, "visitor@artelio.com");
  const again = await login(agent, "visitor@artelio.com");
  assert.strictEqual(again.body.redirect, "/u/0/home");
});

test("out-of-range and non-numeric slots fall back to login", async () => {
  const agent = request.agent(app);
  await login(agent, "artist@artelio.com");
  assert.strictEqual((await agent.get("/u/9/dashboard-artist")).status, 302);
  assert.strictEqual((await agent.get("/u/abc/dashboard-artist")).status, 302);
});
