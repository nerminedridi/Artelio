const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("../config/passport");
const pool = require("../../db");

const router = express.Router();

const ALLOWED_ROLES = ["visitor", "artist", "curator"];

router.post("/register", async (req, res, next) => {
  const { fullname, email, password, confirm, role, bio } = req.body;

  if (!fullname || !email || !password || !confirm) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (password !== confirm) {
    return res.status(400).json({ error: "Passwords do not match." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  const finalRole = ALLOWED_ROLES.includes(role) ? role : "visitor";
  const initialStatus = finalRole === "curator" ? "pending" : "approved";

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, status, bio)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, role, status, bio, avatar_url`,
      [fullname, email, passwordHash, finalRole, initialStatus, bio || null]
    );
    const newUser = rows[0];

    req.login(newUser, (err) => {
      if (err) return next(err);
      const message =
        initialStatus === "pending"
          ? "Account created. A curator account needs admin approval before you can access the dashboard."
          : null;
      res.status(201).json({ redirect: "/home", message });
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || "Invalid credentials." });
    }
    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ redirect: "/home" });
    });
  })(req, res, next);
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/login");
  });
});

module.exports = router;
