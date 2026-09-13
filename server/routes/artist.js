const express = require("express");
const AuthGuard = require("../middleware/auth");
const Showroom = require("../models/Showroom");
const Artwork = require("../models/Artwork");
const pool = require("../../db");
const upload = require("../config/cloudinary");
const { isForeignKeyViolation } = require("../utils/pgErrors");
const { parseTagList } = require("../utils/tags");

const router = express.Router();

router.get(["/upload-artwork", "/upload-artwork.html"], AuthGuard.requireRole("artist"), async (req, res, next) => {
  try {
    const showrooms = await Showroom.getAll();
    res.render("upload-artwork", { showrooms, error: null });
  } catch (err) {
    next(err);
  }
});

router.post(
  ["/upload-artwork", "/upload-artwork.html"],
  AuthGuard.requireRole("artist"),
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { title, description, price, tags, showroomId, medium, dimensions } = req.body;
      if (!title || !price || !req.file) {
        const showrooms = await Showroom.getAll();
        return res.status(400).render("upload-artwork", {
          showrooms,
          error: "Title, price, and an image are all required.",
        });
      }

      const styleTags = parseTagList(tags);

      const { rows } = await pool.query(
        `INSERT INTO artworks (artist_id, title, description, medium, dimensions, price, image_url, style_tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [req.user.id, title, description || null, medium || null, dimensions || null, price, req.file.secure_url || req.file.url, styleTags]
      );
      const artworkId = rows[0].id;

      if (showroomId) {
        await pool.query(
          "INSERT INTO submissions (artwork_id, room_id) VALUES ($1, $2)",
          [artworkId, showroomId]
        );
      }

      res.redirect(req.acctUrl("/dashboard-artist"));
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/artwork/:id/edit",
  AuthGuard.requireRole("artist"),
  AuthGuard.isOwner("artworks", "artist_id"),
  async (req, res, next) => {
    try {
      const artwork = await Artwork.getOwnById(req.params.id, req.user.id);
      if (!artwork) return res.status(404).send("Artwork not found");
      res.render("artwork-edit", { artwork, error: null });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/artwork/:id/edit",
  AuthGuard.requireRole("artist"),
  AuthGuard.isOwner("artworks", "artist_id"),
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { title, description, price, tags, medium, dimensions } = req.body;
      if (!title || !price) {
        const artwork = await Artwork.getOwnById(req.params.id, req.user.id);
        return res.status(400).render("artwork-edit", {
          artwork: { ...artwork, title, description, price, medium, dimensions, style_tags: parseTagList(tags) },
          error: "Title and price are required.",
        });
      }

      const styleTags = parseTagList(tags);

      const imageUrl = req.file ? (req.file.secure_url || req.file.url) : null;
      await Artwork.updateOwn(req.params.id, req.user.id, { title, description, price, styleTags, imageUrl, medium, dimensions });
      res.redirect(req.acctUrl("/dashboard-artist"));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/artwork/:id/delete",
  AuthGuard.requireRole("artist"),
  AuthGuard.isOwner("artworks", "artist_id"),
  async (req, res, next) => {
    try {
      await Artwork.delete(req.params.id);
      res.redirect(req.acctUrl("/dashboard-artist"));
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        return res.status(409).send("Can't delete: this artwork has existing orders or submissions tied to it.");
      }
      next(err);
    }
  }
);

module.exports = router;
