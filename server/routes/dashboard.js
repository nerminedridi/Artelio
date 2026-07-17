const express = require("express");
const AuthGuard = require("../middleware/auth");
const Artwork = require("../models/Artwork");
const Showroom = require("../models/Showroom");
const User = require("../models/User");
const Order = require("../models/Order");
const Report = require("../models/Report");
const pool = require("../../db");
const upload = require("../config/cloudinary");
const { isUniqueViolation, isForeignKeyViolation } = require("../utils/pgErrors");
const { parseTagList } = require("../utils/tags");

const router = express.Router();

router.get(["/dashboard-artist", "/dashboard-artist.html"], AuthGuard.requireRole("artist"), async (req, res, next) => {
  try {
    const artistId = req.user.id;
    const [profile, works, activity, revenue, orders, submissions] = await Promise.all([
      User.getArtistProfile(artistId),
      Artwork.getByArtist(artistId),
      Artwork.getCommentsByArtist(artistId, 4),
      Order.getMonthlyRevenueForArtist(artistId),
      Order.getByArtist(artistId),
      Artwork.getSubmissionsByArtist(artistId),
    ]);

    const rated = works.filter((w) => w.rating_count > 0);
    const highestRated = rated.length
      ? rated.reduce((best, w) => (Number(w.avg_rating) > Number(best.avg_rating) ? w : best))
      : null;

    const submissionsByArtwork = {};
    submissions.forEach((sub) => {
      if (!submissionsByArtwork[sub.artwork_id]) submissionsByArtwork[sub.artwork_id] = [];
      submissionsByArtwork[sub.artwork_id].push(sub);
    });

    res.render("dashboard-artist", {
      profile,
      works,
      activity,
      revenue,
      recentSale: orders[0] || null,
      totalSales: orders.length,
      highestRated,
      submissionsByArtwork,
    });
  } catch (err) {
    next(err);
  }
});

const CURATOR_SECTIONS = ["statistics", "showrooms", "requests", "artists", "earnings"];

router.get(
  ["/dashboard-curator", "/dashboard-curator.html", "/dashboard-curator/:section"],
  AuthGuard.requireRole("curator"),
  async (req, res, next) => {
  try {
    const activeSection = CURATOR_SECTIONS.includes(req.params.section) ? req.params.section : "statistics";
    const curatorId = req.user.id;
    const [profile, showrooms, pending, artists, orders, monthlyCommission, earningsByShowroom] = await Promise.all([
      User.getCuratorProfile(curatorId),
      Showroom.getByCurator(curatorId),
      Showroom.getPendingSubmissions(curatorId),
      Showroom.getFeaturedArtists(curatorId),
      Order.getByCurator(curatorId),
      Order.getMonthlyCommissionForCurator(curatorId),
      Order.getEarningsByShowroomForCurator(curatorId),
    ]);
    const totalCommission = orders.reduce((sum, o) => sum + Number(o.commission_amount), 0);
    res.render("dashboard-curator", { profile, showrooms, pending, artists, orders, monthlyCommission, totalCommission, earningsByShowroom, activeSection });
  } catch (err) {
    next(err);
  }
});

router.get("/curator/showrooms/new", AuthGuard.requireRole("curator"), (req, res) => {
  res.render("create-showroom", { error: null });
});

router.post(
  "/curator/showrooms",
  AuthGuard.requireRole("curator"),
  upload.single("coverImage"),
  async (req, res, next) => {
    try {
      const { title, theme, conceptEssay, commissionRate, moodTags } = req.body;
      if (!title) {
        return res.status(400).render("create-showroom", { error: "Title is required." });
      }
      const coverImageUrl = req.file ? (req.file.secure_url || req.file.url) : null;
      const moodTagsArray = parseTagList(moodTags);
      await Showroom.create(req.user.id, { title, theme, conceptEssay, commissionRate, coverImageUrl, moodTags: moodTagsArray });
      res.redirect("/dashboard-curator");
    } catch (err) {
      if (isUniqueViolation(err)) {
        return res.status(409).render("create-showroom", { error: "That theme is already taken by another showroom — pick a unique one." });
      }
      next(err);
    }
  }
);

router.post("/curator/showrooms/:id/status", AuthGuard.requireRole("curator"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["active", "archived"].includes(status)) return res.status(400).send("Invalid status");
    await Showroom.setStatus(req.params.id, req.user.id, status);
    res.redirect("/dashboard-curator");
  } catch (err) {
    next(err);
  }
});

router.post("/curator/submissions/:id/approve", AuthGuard.requireRole("curator"), async (req, res, next) => {
  try {
    await Showroom.reviewSubmission(req.params.id, req.user.id, "approved", req.body?.note);
    res.redirect("/dashboard-curator");
  } catch (err) {
    next(err);
  }
});

router.post("/curator/submissions/:id/reject", AuthGuard.requireRole("curator"), async (req, res, next) => {
  try {
    await Showroom.reviewSubmission(req.params.id, req.user.id, "rejected", req.body.note);
    res.redirect("/dashboard-curator");
  } catch (err) {
    next(err);
  }
});

router.get("/curator/showrooms/:id/edit", AuthGuard.requireRole("curator"), async (req, res, next) => {
  try {
    const showroom = await Showroom.getOwnById(req.params.id, req.user.id);
    if (!showroom) return res.status(404).send("Showroom not found");
    const artworks = await Showroom.getApprovedForCurator(req.params.id, req.user.id);
    res.render("showroom-edit", { showroom, artworks, error: null });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/curator/showrooms/:id/edit",
  AuthGuard.requireRole("curator"),
  upload.single("coverImage"),
  async (req, res, next) => {
    try {
      const { title, theme, conceptEssay, commissionRate, moodTags } = req.body;
      const moodTagsArray = parseTagList(moodTags);
      if (!title) {
        const showroom = await Showroom.getOwnById(req.params.id, req.user.id);
        if (!showroom) return res.status(404).send("Showroom not found");
        const artworks = await Showroom.getApprovedForCurator(req.params.id, req.user.id);
        return res.status(400).render("showroom-edit", {
          showroom: { ...showroom, title, theme, concept_essay: conceptEssay, commission_rate: commissionRate, mood_tags: moodTagsArray },
          artworks,
          error: "Title is required.",
        });
      }
      const coverImageUrl = req.file ? (req.file.secure_url || req.file.url) : null;
      const updated = await Showroom.updateOwn(req.params.id, req.user.id, {
        title,
        theme,
        conceptEssay,
        commissionRate,
        coverImageUrl,
        moodTags: moodTagsArray,
      });
      if (!updated) return res.status(404).send("Showroom not found");
      res.redirect("/dashboard-curator");
    } catch (err) {
      if (isUniqueViolation(err)) {
        const showroom = await Showroom.getOwnById(req.params.id, req.user.id);
        if (!showroom) return res.status(404).send("Showroom not found");
        const artworks = await Showroom.getApprovedForCurator(req.params.id, req.user.id);
        const moodTagsArray = parseTagList(req.body.moodTags);
        return res.status(409).render("showroom-edit", {
          showroom: { ...showroom, title: req.body.title, theme: req.body.theme, concept_essay: req.body.conceptEssay, commission_rate: req.body.commissionRate, mood_tags: moodTagsArray },
          artworks,
          error: "That theme is already taken by another showroom — pick a unique one.",
        });
      }
      next(err);
    }
  }
);

router.post("/curator/showrooms/:id/delete", AuthGuard.requireRole("curator"), async (req, res, next) => {
  try {
    await Showroom.deleteOwn(req.params.id, req.user.id);
    res.redirect("/dashboard-curator");
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return res.status(409).send("Can't delete: this showroom has existing orders or submissions tied to it.");
    }
    next(err);
  }
});

router.post("/curator/submissions/:id/reorder", AuthGuard.requireRole("curator"), async (req, res, next) => {
  try {
    const { direction, roomId } = req.body;
    if (!["up", "down"].includes(direction)) return res.status(400).send("Invalid direction");
    await Showroom.reorderSubmission(req.params.id, req.user.id, direction);
    res.redirect(`/curator/showrooms/${roomId}/edit`);
  } catch (err) {
    next(err);
  }
});

router.get(["/dashboard-visitor", "/dashboard-visitor.html"], AuthGuard.requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [savedCountRes, ratedCountRes, reviewCountRes, orders, savedArtworks, activity] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM saved_items WHERE user_id = $1", [userId]),
      pool.query("SELECT COUNT(*) FROM ratings WHERE user_id = $1", [userId]),
      pool.query("SELECT COUNT(*) FROM comments WHERE user_id = $1", [userId]),
      Order.getByBuyer(userId),
      pool.query(
        `SELECT a.id, a.title, a.image_url, a.price, u.username AS artist_name
         FROM saved_items si
         JOIN artworks a ON a.id = si.item_id
         JOIN users u ON u.id = a.artist_id
         WHERE si.user_id = $1 AND si.item_type = 'artwork'
         ORDER BY si.saved_at DESC LIMIT 3`,
        [userId]
      ),
      pool.query(
        `(SELECT 'rated' AS action, a.title AS item, r.created_at AS at FROM ratings r JOIN artworks a ON a.id = r.artwork_id WHERE r.user_id = $1)
         UNION ALL
         (SELECT 'commented' AS action, a.title AS item, c.created_at AS at FROM comments c JOIN artworks a ON a.id = c.artwork_id WHERE c.user_id = $1)
         UNION ALL
         (SELECT 'purchased' AS action, a.title AS item, o.purchased_at AS at FROM orders o JOIN artworks a ON a.id = o.artwork_id WHERE o.buyer_id = $1)
         UNION ALL
         (SELECT 'saved' AS action, CASE WHEN si.item_type = 'artwork' THEN a.title ELSE s.title END AS item, si.saved_at AS at
            FROM saved_items si
            LEFT JOIN artworks a ON a.id = si.item_id AND si.item_type = 'artwork'
            LEFT JOIN showrooms s ON s.id = si.item_id AND si.item_type = 'showroom'
            WHERE si.user_id = $1)
         ORDER BY at DESC LIMIT 6`,
        [userId]
      ),
    ]);

    const [exploreShowrooms, exploreArtworks, exploreArtists] = await Promise.all([
      Showroom.getAll(),
      Artwork.getRecent(2),
      User.getArtists(),
    ]);

    res.render("dashboard-visitor", {
      savedCount: Number(savedCountRes.rows[0].count),
      ratedCount: Number(ratedCountRes.rows[0].count),
      reviewCount: Number(reviewCountRes.rows[0].count),
      orderCount: orders.length,
      savedArtworks: savedArtworks.rows,
      activity: activity.rows,
      exploreShowroom: exploreShowrooms[0] || null,
      exploreArtworks: exploreArtworks,
      exploreArtist: exploreArtists[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

const ADMIN_SECTIONS = ["dashboard", "users", "artworks", "showrooms", "reports", "analytics", "settings"];

router.get(
  ["/dashboard-admin", "/dashboard-admin.html", "/dashboard-admin/:section"],
  AuthGuard.requireRole("admin"),
  async (req, res, next) => {
  try {
    const activeSection = ADMIN_SECTIONS.includes(req.params.section) ? req.params.section : "dashboard";
    const [
      userCountRes,
      artworkCountRes,
      showroomCountRes,
      pendingCurators,
      users,
      artworks,
      showrooms,
      categories,
      signups,
      topArtists,
      topShowrooms,
      recentActivity,
      platformTotals,
      commissionFlow,
      reports,
      pendingReportCount,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM artworks"),
      pool.query("SELECT COUNT(*) FROM showrooms"),
      User.countPendingCurators(),
      User.getAllForAdmin(),
      Artwork.getAllForAdmin(),
      Showroom.getAllForAdmin(),
      Artwork.getTagDistribution(5),
      User.getSignupsByMonth(6),
      User.getArtists(),
      Showroom.getAll(),
      pool.query(
        `(SELECT 'New user registered' AS label, username AS detail, created_at AS at FROM users)
         UNION ALL
         (SELECT 'Artwork uploaded' AS label, title AS detail, created_at AS at FROM artworks)
         UNION ALL
         (SELECT 'Showroom created' AS label, title AS detail, created_at AS at FROM showrooms)
         ORDER BY at DESC LIMIT 6`
      ),
      Order.getPlatformTotals(),
      Order.getCommissionFlow(20),
      Report.getAllForAdmin(),
      Report.countPending(),
    ]);

    res.render("dashboard-admin", {
      userCount: Number(userCountRes.rows[0].count),
      artworkCount: Number(artworkCountRes.rows[0].count),
      showroomCount: Number(showroomCountRes.rows[0].count),
      pendingCurators,
      users,
      artworks,
      showrooms,
      categories,
      signups,
      topArtists: topArtists.slice(0, 4),
      topShowrooms: topShowrooms.slice(0, 4),
      recentActivity: recentActivity.rows,
      platformTotals,
      commissionFlow,
      reports,
      pendingReportCount,
      activeSection,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/users/:id/status", AuthGuard.requireRole("admin"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["approved", "suspended", "pending"].includes(status)) {
      return res.status(400).send("Invalid status");
    }
    if (Number(req.params.id) === req.user.id && status === "suspended") {
      return res.status(400).send("You can't suspend your own account.");
    }
    await User.setStatus(req.params.id, status);
    res.redirect("/dashboard-admin");
  } catch (err) {
    next(err);
  }
});

router.post("/admin/artworks/:id/delete", AuthGuard.requireRole("admin"), async (req, res, next) => {
  try {
    await Artwork.delete(req.params.id);
    res.redirect("/dashboard-admin");
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return res.status(409).send("Can't delete: this artwork has existing orders or submissions tied to it.");
    }
    next(err);
  }
});

router.post("/admin/showrooms/:id/delete", AuthGuard.requireRole("admin"), async (req, res, next) => {
  try {
    await Showroom.delete(req.params.id);
    res.redirect("/dashboard-admin");
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return res.status(409).send("Can't delete: this showroom has existing orders or submissions tied to it.");
    }
    next(err);
  }
});

router.post("/admin/showrooms/:id/theme", AuthGuard.requireRole("admin"), async (req, res, next) => {
  try {
    const theme = (req.body.theme || "").trim();
    if (!theme) {
      return res.status(400).send("Theme can't be empty.");
    }
    const updated = await Showroom.setTheme(req.params.id, theme);
    if (!updated) return res.status(404).send("Showroom not found");
    res.redirect("/dashboard-admin/showrooms");
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).send("That theme is already taken by another showroom — pick a unique one.");
    }
    next(err);
  }
});

router.post("/admin/reports/:id/resolve", AuthGuard.requireRole("admin"), async (req, res, next) => {
  try {
    await Report.resolve(req.params.id, req.user.id, "resolved");
    res.redirect("/dashboard-admin/reports");
  } catch (err) {
    next(err);
  }
});

router.post("/admin/reports/:id/dismiss", AuthGuard.requireRole("admin"), async (req, res, next) => {
  try {
    await Report.resolve(req.params.id, req.user.id, "dismissed");
    res.redirect("/dashboard-admin/reports");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
