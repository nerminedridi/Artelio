const express = require("express");
const AuthGuard = require("../middleware/auth");
const Order = require("../models/Order");

const router = express.Router();

router.get("/orders", AuthGuard.requireAuth, async (req, res, next) => {
  try {
    let orders;
    let viewType;
    let purchases = null;

    if (req.user.role === "artist") {
      orders = await Order.getByArtist(req.user.id);
      purchases = await Order.getByBuyer(req.user.id);
      viewType = "artist";
    } else if (req.user.role === "curator") {
      orders = await Order.getByCurator(req.user.id);
      viewType = "curator";
    } else {
      orders = await Order.getByBuyer(req.user.id);
      viewType = "buyer";
    }

    res.render("orders", { orders, purchases, viewType });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
