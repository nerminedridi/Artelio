const express = require("express");
const AuthGuard = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

router.get("/my-profile", AuthGuard.requireAuth, async (req, res, next) => {
  try {
    const user = await User.getOwnProfile(req.user.id);
    if (!user) return res.status(404).send("User not found");
    res.render("my-profile", { profileUser: user });
  } catch (err) {
    next(err);
  }
});

router.post("/account/update-bio", AuthGuard.requireAuth, async (req, res, next) => {
  try {
    await User.updateBio(req.user.id, req.body.bio);
    const redirectTo = req.user.role === "admin" ? "/dashboard-admin#section-settings" : "/my-profile";
    res.redirect(req.acctUrl(redirectTo));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
