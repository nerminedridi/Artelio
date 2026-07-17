const express = require("express");
const AuthGuard = require("../middleware/auth");
const Artwork = require("../models/Artwork");
const Showroom = require("../models/Showroom");

const router = express.Router();

router.post("/artwork/:id/feedback", AuthGuard.requireAuth, async (req, res, next) => {
  try {
    const artworkId = Number(req.params.id);
    const comment = (req.body.comment || "").trim();
    const score = Number(req.body.rating);

    if (comment) {
      await Artwork.addComment(req.user.id, artworkId, comment);
    }
    if (score >= 1 && score <= 5) {
      await Artwork.upsertRating(req.user.id, artworkId, score);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/artwork/comments/:commentId/delete", AuthGuard.requireAuth, async (req, res, next) => {
  try {
    await Artwork.deleteComment(Number(req.params.commentId), req.user.id, req.user.role === "admin");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/showroom/:id/guestbook", AuthGuard.requireAuth, async (req, res, next) => {
  try {
    const message = (req.body.message || "").trim();
    if (!message) return res.status(400).json({ error: "Message is required." });
    await Showroom.addGuestbookEntry(req.user.id, Number(req.params.id), message);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
