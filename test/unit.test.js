const test = require("node:test");
const assert = require("node:assert");
const CardValidator = require("../server/utils/CardValidator");
const { parseTagList } = require("../server/utils/tags");
const { isUniqueViolation, isForeignKeyViolation } = require("../server/utils/pgErrors");

const nextYear = String(new Date().getFullYear() + 1).slice(2);

test("CardValidator accepts a well-formed card and returns the last four digits", () => {
  const result = CardValidator.validate({ cardNumber: "4111 1111 1111 1234", expiry: `12/${nextYear}`, cvv: "123" });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.last4, "1234");
});

test("CardValidator rejects bad number, cvv and expiry format", () => {
  const result = CardValidator.validate({ cardNumber: "1234", expiry: "2030-01", cvv: "12" });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.cardNumber && result.errors.cvv && result.errors.expiry);
});

test("CardValidator rejects expired cards and invalid months", () => {
  assert.match(CardValidator.validate({ cardNumber: "4111111111111111", expiry: "01/20", cvv: "123" }).errors.expiry, /expired/);
  assert.match(CardValidator.validate({ cardNumber: "4111111111111111", expiry: `13/${nextYear}`, cvv: "123" }).errors.expiry, /between 01 and 12/);
});

test("parseTagList trims, lowercases and drops empty entries", () => {
  assert.deepStrictEqual(parseTagList(" Abstract, BOLD ,, "), ["abstract", "bold"]);
  assert.deepStrictEqual(parseTagList(undefined), []);
});

test("pg error helpers map SQLSTATE codes", () => {
  assert.strictEqual(isUniqueViolation({ code: "23505" }), true);
  assert.strictEqual(isForeignKeyViolation({ code: "23503" }), true);
  assert.strictEqual(isUniqueViolation({ code: "23503" }), false);
});
