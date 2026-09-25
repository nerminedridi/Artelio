require("./env");
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../server");
const pool = require("../db");

const PASSWORD = "Password123!";
const expiry = `12/${String(new Date().getFullYear() + 2).slice(2)}`;
const card = { cardNumber: "4111111111111111", expiry, cvv: "123", cardholderName: "Test Buyer" };

async function loggedIn(email) {
  const agent = request.agent(app);
  await agent.post("/login").send({ email, password: PASSWORD });
  return agent;
}

async function availableArtwork({ withShowroom }) {
  const { rows } = await pool.query(
    `SELECT a.id FROM artworks a
     WHERE a.status = 'available'
       AND EXISTS (SELECT 1 FROM submissions s WHERE s.artwork_id = a.id AND s.status = 'approved') = $1
     ORDER BY a.id LIMIT 1`,
    [withShowroom]
  );
  assert.ok(rows[0], "seed data should contain a matching available artwork");
  return rows[0].id;
}

test("an artist cannot put their own artwork in the cart", async () => {
  const artist = await loggedIn("aria.solenne@artelio.com");
  const res = await artist.post("/u/0/cart/add/1");
  assert.strictEqual(res.status, 400);
});

test("checkout snapshots price and commission, and marks the artwork sold", async () => {
  const buyer = await loggedIn("elio.marquez@artelio.com");
  const artworkId = await availableArtwork({ withShowroom: true });

  const { rows: [expected] } = await pool.query(
    `SELECT a.price, COALESCE(s.commission_rate, 0) AS rate
     FROM artworks a
     LEFT JOIN submissions sub ON sub.artwork_id = a.id AND sub.status = 'approved'
     LEFT JOIN showrooms s ON s.id = sub.room_id
     WHERE a.id = $1`,
    [artworkId]
  );

  assert.strictEqual((await buyer.post(`/u/0/cart/add/${artworkId}`)).status, 200);
  const res = await buyer.post("/u/0/checkout").type("form").send(card);
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, "/u/0/order-confirmation");

  const { rows: [order] } = await pool.query("SELECT * FROM orders WHERE artwork_id = $1", [artworkId]);
  const gross = Number(expected.price);
  const commission = Math.round(gross * Number(expected.rate)) / 100;
  assert.strictEqual(Number(order.gross_price), gross);
  assert.strictEqual(Number(order.commission_amount), commission);
  assert.strictEqual(Number(order.artist_net), Math.round((gross - commission) * 100) / 100);
  assert.deepStrictEqual(Object.keys(order.payment_data).sort(), ["card_last4", "cardholder_name"]);
  assert.strictEqual(order.payment_data.card_last4, "1111");

  const { rows: [artwork] } = await pool.query("SELECT status FROM artworks WHERE id = $1", [artworkId]);
  assert.strictEqual(artwork.status, "sold");

  const again = await buyer.post(`/u/0/cart/add/${artworkId}`);
  assert.strictEqual(again.status, 400, "sold artwork can't be added again");
});

test("checkout rejects an invalid card without creating an order", async () => {
  const buyer = await loggedIn("nora.whitfield@artelio.com");
  const artworkId = await availableArtwork({ withShowroom: false });
  assert.strictEqual((await buyer.post(`/u/0/cart/add/${artworkId}`)).status, 200);
  const res = await buyer.post("/u/0/checkout").type("form").send({ ...card, cardNumber: "1234" });
  assert.strictEqual(res.status, 400);
  const { rows } = await pool.query("SELECT 1 FROM orders WHERE artwork_id = $1", [artworkId]);
  assert.strictEqual(rows.length, 0);
});
