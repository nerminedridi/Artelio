const express = require("express");
const Newsletter = require("../models/Newsletter");
const { sendEmail } = require("../utils/email");
const { newsletterConfirmationEmail } = require("../utils/emailTemplates");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/newsletter/subscribe", async (req, res, next) => {
  const email = (req.body.email || "").trim();

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  try {
    const isNew = await Newsletter.subscribe(email);
    if (isNew) {
      sendEmail({
        to: email,
        subject: "You're subscribed to ARTélio",
        html: newsletterConfirmationEmail(email),
      });
      return res.json({ message: "Subscribed! Check your inbox for a confirmation." });
    }
    res.json({ message: "You're already subscribed." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
