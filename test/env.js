require("dotenv").config();

const url = process.env.TEST_DATABASE_URL;
if (!url || !/test/i.test(new URL(url).pathname)) {
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated test database (its name must contain 'test') - the test setup wipes and reseeds it."
  );
}

process.env.DATABASE_URL = url;
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-session-secret";
process.env.RESEND_API_KEY = "";

const originalLog = console.log;
console.log = (...args) => {
  if (typeof args[0] === "string" && args[0].startsWith("[email:dev]")) return;
  originalLog(...args);
};
