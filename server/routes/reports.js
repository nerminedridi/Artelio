const express = require("express");
const AuthGuard = require("../middleware/auth");
const Report = require("../models/Report");
const { isUniqueViolation } = require("../utils/pgErrors");

const router = express.Router();

const VALID_ITEM_TYPES = ["artwork", "comment", "showroom"];

router.post("/report", AuthGuard.requireAuth, async (req, res, next) => {
  try {
    const { itemType, itemId, reason } = req.body;
    const trimmedReason = (reason || "").trim();

    if (!VALID_ITEM_TYPES.includes(itemType) || !Number.isInteger(Number(itemId))) {
      return res.status(400).json({ error: "Invalid report target." });
    }
    if (!trimmedReason) {
      return res.status(400).json({ error: "Please describe the issue before submitting." });
    }

    await Report.create(req.user.id, itemType, Number(itemId), trimmedReason);
    res.json({ ok: true });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: "You've already reported this." });
    }
    next(err);
  }
});

module.exports = router;
