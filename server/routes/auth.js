const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("../config/passport");
const pool = require("../../db");
const PasswordReset = require("../models/PasswordReset");
const { sendEmail } = require("../utils/email");
const { welcomeEmail, passwordResetEmail } = require("../utils/emailTemplates");

const router = express.Router();

const ALLOWED_ROLES = ["visitor", "artist", "curator"];

function addAccount(session, userId) {
  session.accounts = session.accounts || [];
  let idx = session.accounts.findIndex((a) => a && a.id === userId);
  if (idx !== -1) return idx;

  idx = session.accounts.findIndex((a) => !a);
  if (idx !== -1) {
    session.accounts[idx] = { id: userId };
    return idx;
  }

  session.accounts.push({ id: userId });
  return session.accounts.length - 1;
}

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
    const idx = addAccount(req.session, newUser.id);
    const message =
      initialStatus === "pending"
        ? "Account created. A curator account needs admin approval before you can access the dashboard."
        : null;
    sendEmail({
      to: newUser.email,
      subject: "Welcome to ARTélio",
      html: welcomeEmail(newUser.username),
    });
    res.status(201).json({ redirect: `/u/${idx}/home`, message });
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
    const idx = addAccount(req.session, user.id);
    res.json({ redirect: `/u/${idx}/home` });
  })(req, res, next);
});

router.post("/logout", (req, res) => {
  if (req.acctIdx !== null && req.session.accounts) {
    req.session.accounts[req.acctIdx] = null;
  }
  res.redirect("/login");
});

router.post("/forgot-password", async (req, res, next) => {
  const email = (req.body.email || "").trim();
  if (!email) {
    return res.status(400).json({ error: "Enter your email address." });
  }

  try {
    const { rows } = await pool.query("SELECT id, username, email FROM users WHERE email = $1", [email]);
    const user = rows[0];

    if (user) {
      const token = await PasswordReset.create(user.id);
      const resetUrl = `${req.protocol}://${req.get("host")}/reset-password?token=${token}`;
      sendEmail({
        to: user.email,
        subject: "Reset your ARTélio password",
        html: passwordResetEmail(user.username, resetUrl),
      });
    }

    res.json({ message: "If that email is registered, a reset link is on its way." });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next) => {
  const { token, password, confirm } = req.body;

  if (!token || !password || !confirm) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (password !== confirm) {
    return res.status(400).json({ error: "Passwords do not match." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  try {
    const reset = await PasswordReset.findValid(token);
    if (!reset) {
      return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, reset.user_id]);
    await PasswordReset.markUsed(token);

    res.json({ redirect: "/login" });
  } catch (err) {
    next(err);
  }
});

router.get("/accounts", async (req, res, next) => {
  try {
    const accounts = req.session.accounts || [];
    const openAccounts = [];
    for (let idx = 0; idx < accounts.length; idx++) {
      const slot = accounts[idx];
      if (!slot) continue;
      const { rows } = await pool.query(
        "SELECT id, username, email, role, avatar_url FROM users WHERE id = $1",
        [slot.id]
      );
      if (rows[0]) openAccounts.push({ idx, ...rows[0] });
    }
    res.render("accounts", { openAccounts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
