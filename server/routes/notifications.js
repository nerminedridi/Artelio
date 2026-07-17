const express = require("express");
const AuthGuard = require("../middleware/auth");
const Showroom = require("../models/Showroom");
const User = require("../models/User");

const router = express.Router();

router.get("/notifications", AuthGuard.requireAuth, async (req, res, next) => {
  try {
    let notifications;

    if (req.user.role === "curator") {
      const pending = await Showroom.getPendingSubmissions(req.user.id);
      notifications = [
        { text: `You have ${pending.length} submission${pending.length === 1 ? "" : "s"} awaiting review.`, time: "Today" },
        { text: "A new guestbook message was left in one of your showrooms.", time: "This week" },
        { text: "Welcome to ARTélio! Your curator account is active.", time: "Earlier" },
      ];
    } else if (req.user.role === "artist") {
      notifications = [
        { text: "Someone left a new comment on one of your artworks.", time: "Today" },
        { text: "Your revenue for this month just updated.", time: "This week" },
        { text: "Welcome to ARTélio! Your artist account is active.", time: "Earlier" },
      ];
    } else if (req.user.role === "admin") {
      const pendingCurators = await User.countPendingCurators();
      notifications = [
        { text: `${pendingCurators} curator${pendingCurators === 1 ? "" : "s"} awaiting approval.`, time: "Today" },
        { text: "Platform activity is up compared to last month.", time: "This week" },
      ];
    } else {
      notifications = [
        { text: "A showroom you saved has new artworks.", time: "Today" },
        { text: "Your order was delivered — leave a review!", time: "This week" },
        { text: "Welcome to ARTélio! Start exploring the showrooms.", time: "Earlier" },
      ];
    }

    res.render("notifications", { notifications });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
