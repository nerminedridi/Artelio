const express = require("express");
const AuthGuard = require("../middleware/auth");
const Artwork = require("../models/Artwork");
const Order = require("../models/Order");
const CardValidator = require("../utils/CardValidator");
const pool = require("../../db");

const router = express.Router();

const SAVED_ITEM_TYPES = ["artwork", "showroom", "artist"];

router.post("/saved/:type/:id", AuthGuard.requireAuth, async (req, res, next) => {
  try {
    const { type } = req.params;
    const itemId = Number(req.params.id);
    if (!SAVED_ITEM_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid item type." });
    }

    const existing = await pool.query(
      "SELECT id FROM saved_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3",
      [req.user.id, type, itemId]
    );

    if (existing.rows.length > 0) {
      await pool.query("DELETE FROM saved_items WHERE id = $1", [existing.rows[0].id]);
      return res.json({ saved: false });
    }

    await pool.query(
      "INSERT INTO saved_items (user_id, item_type, item_id) VALUES ($1, $2, $3)",
      [req.user.id, type, itemId]
    );
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
});

router.post("/cart/add/:id", AuthGuard.requireAuth, async (req, res, next) => {
  try {
    const artworkId = Number(req.params.id);
    const artwork = await Artwork.getDetails(artworkId);
    if (!artwork) return res.status(404).json({ error: "Artwork not found." });
    if (artwork.artist_id === req.user.id) {
      return res.status(400).json({ error: "You can't add your own artwork to your cart." });
    }
    if (artwork.status !== "available") {
      return res.status(400).json({ error: "This artwork is no longer available." });
    }

    req.session.cart = req.session.cart || [];
    if (!req.session.cart.includes(artworkId)) req.session.cart.push(artworkId);
    res.json({ cart: req.session.cart });
  } catch (err) {
    next(err);
  }
});

router.post("/cart/remove/:id", AuthGuard.requireAuth, (req, res) => {
  const artworkId = Number(req.params.id);
  req.session.cart = (req.session.cart || []).filter((id) => id !== artworkId);
  res.json({ cart: req.session.cart });
});

router.get(["/cart-in", "/cart-in.html"], AuthGuard.requireAuth, async (req, res, next) => {
  try {
    const items = await Order.getCartItems(req.session.cart || []);
    const subtotal = items.reduce((sum, i) => sum + Number(i.price), 0);
    res.render("cart-in", { items, subtotal });
  } catch (err) {
    next(err);
  }
});

router.get(["/checkout", "/checkout.html"], AuthGuard.requireAuth, async (req, res, next) => {
  try {
    const items = await Order.getCartItems(req.session.cart || []);
    if (items.length === 0) return res.redirect(req.acctUrl("/cart-in"));
    const subtotal = items.reduce((sum, i) => sum + Number(i.price), 0);
    res.render("checkout", { items, subtotal, error: null });
  } catch (err) {
    next(err);
  }
});

router.post(["/checkout", "/checkout.html"], AuthGuard.requireAuth, async (req, res, next) => {
  const cartIds = req.session.cart || [];
  if (cartIds.length === 0) return res.redirect(req.acctUrl("/cart-in"));

  try {
    const { cardNumber, expiry, cvv, cardholderName } = req.body;
    const { valid, errors, last4 } = CardValidator.validate({ cardNumber, expiry, cvv });

    if (!valid) {
      const items = await Order.getCartItems(cartIds);
      const subtotal = items.reduce((sum, i) => sum + Number(i.price), 0);
      return res.status(400).render("checkout", {
        items,
        subtotal,
        error: Object.values(errors).join(" "),
      });
    }

    const paymentData = { card_last4: last4, cardholder_name: cardholderName || req.user.username };
    await Order.checkout(req.user.id, cartIds, paymentData);
    req.session.cart = [];
    res.redirect(req.acctUrl("/order-confirmation"));
  } catch (err) {
    const items = await Order.getCartItems(cartIds);
    const subtotal = items.reduce((sum, i) => sum + Number(i.price), 0);
    res.status(400).render("checkout", { items, subtotal, error: err.message });
  }
});

router.get(["/order-confirmation", "/order-confirmation.html"], AuthGuard.requireAuth, (req, res) => {
  res.render("order-confirmation");
});

module.exports = router;
