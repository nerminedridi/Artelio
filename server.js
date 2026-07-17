require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const passport = require("./server/config/passport");
const authRoutes = require("./server/routes/auth");
const cartRoutes = require("./server/routes/cart");
const artistRoutes = require("./server/routes/artist");
const dashboardRoutes = require("./server/routes/dashboard");
const searchRoutes = require("./server/routes/search");
const feedbackRoutes = require("./server/routes/feedback");
const accountRoutes = require("./server/routes/account");
const ordersRoutes = require("./server/routes/orders");
const notificationsRoutes = require("./server/routes/notifications");
const reportsRoutes = require("./server/routes/reports");
const AuthGuard = require("./server/middleware/auth");
const Artwork = require("./server/models/Artwork");
const Showroom = require("./server/models/Showroom");
const User = require("./server/models/User");

const app = express();
const PORT = process.env.PORT || 3000;
require("./db");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views", "pages"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (!req.body) req.body = {};
  next();
});
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  next();
});

app.use("/", authRoutes);
app.use("/", cartRoutes);
app.use("/", artistRoutes);
app.use("/", dashboardRoutes);
app.use("/", searchRoutes);
app.use("/", feedbackRoutes);
app.use("/", accountRoutes);
app.use("/", ordersRoutes);
app.use("/", notificationsRoutes);
app.use("/", reportsRoutes);

function roleHome(role) {
  switch (role) {
    case "artist":
      return "/dashboard-artist";
    case "curator":
      return "/dashboard-curator";
    case "admin":
      return "/dashboard-admin";
    default:
      return "/dashboard-visitor";
  }
}

app.get("/dashboard", AuthGuard.requireAuth, (req, res) => {
  res.redirect(roleHome(req.user.role));
});

app.get(["/", "/index.html"], async (req, res, next) => {
  try {
    const artworks = await Artwork.getPopular(5);
    res.render("index", { artworks });
  } catch (err) {
    next(err);
  }
});

app.get(["/home", "/homelogged.html"], async (req, res, next) => {
  try {
    const artworks = await Artwork.getPopular(5);
    res.render("homelogged", { artworks });
  } catch (err) {
    next(err);
  }
});
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "login.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "login.html"));
});
app.get("/sign-up", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "sign-up.html"));
});
app.get("/sign-up.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "sign-up.html"));
});
app.get("/search.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "search.html"));
});
app.get("/search", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "search.html"));
});
app.get(["/explore", "/explore.html"], async (req, res, next) => {
  try {
    const [showrooms, artworks, artists, tags, guestbook, featuredArtwork] = await Promise.all([
      Showroom.getAll(),
      Artwork.getRecent(4),
      User.getArtists(),
      Artwork.getTrendingTags(6),
      Showroom.getRecentGuestbookGlobal(2),
      Artwork.getPopular(1),
    ]);
    res.render("explore", {
      showrooms,
      artworks,
      artists,
      tags,
      guestbook,
      featuredArtwork: featuredArtwork[0] || null,
      featuredShowroom: showrooms[0] || null,
    });
  } catch (err) {
    next(err);
  }
});
app.get("/cart-out.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "cart-out.html"));
});
app.get("/cart-out", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "cart-out.html"));
});
app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "about.html"));
});
app.get("/about.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "about.html"));
});
app.get("/help.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "help.html"));
});
app.get("/help", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "help.html"));
});
app.get("/analytics-artist", AuthGuard.requireRole("artist"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "analytics-artist.html"));
});
app.get(["/artwork-details", "/artwork-details.html"], async (req, res, next) => {
  try {
    const artwork = await Artwork.getDetails(req.query.id);
    if (!artwork) return res.status(404).send("Artwork not found");
    const comments = await Artwork.getComments(req.query.id);
    res.render("artwork-details", { artwork, comments });
  } catch (err) {
    next(err);
  }
});
app.get(["/settings", "/settings.html"], AuthGuard.requireAuth, (req, res) => {
  res.render("settings");
});
app.get("/logout", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "logout.html"));
});

app.get("/logout.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "logout.html"));
});

app.get("/analytics", AuthGuard.requireRole("artist"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "analytics-artist.html"));
});

app.get("/analytics.html", AuthGuard.requireRole("artist"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "analytics-artist.html"));
});

app.get(["/showrooms", "/showrooms.html"], async (req, res, next) => {
  try {
    const showrooms = await Showroom.getAll();
    const featured = showrooms.length
      ? await Showroom.getDetails(showrooms[0].id)
      : null;
    res.render("showrooms", { showrooms, featured });
  } catch (err) {
    next(err);
  }
});
app.get(["/curators", "/curators.html"], async (req, res, next) => {
  try {
    const curators = await User.getCurators();
    res.render("curators", { curators, featured: curators[0] || null });
  } catch (err) {
    next(err);
  }
});
app.get(["/artists", "/artists.html"], async (req, res, next) => {
  try {
    const artists = await User.getArtists();
    res.render("artists", { artists, featured: artists[0] || null });
  } catch (err) {
    next(err);
  }
});
app.get(["/single-showroom", "/single-showroom.html"], async (req, res, next) => {
  try {
    const showroom = await Showroom.getDetails(req.query.room);
    if (!showroom) return res.status(404).send("Showroom not found");
    const artworks = await Showroom.getArtworks(req.query.room);
    const guestbook = await Showroom.getGuestbook(req.query.room);
    res.render("single-showroom", { showroom, artworks, guestbook });
  } catch (err) {
    next(err);
  }
});
app.get(["/profiles", "/profiles.html"], async (req, res, next) => {
  try {
    const baseUser = await User.getById(req.query.user);
    if (!baseUser || !["artist", "curator"].includes(baseUser.role)) {
      return res.status(404).send("Profile not found");
    }

    if (baseUser.role === "artist") {
      const profile = await User.getArtistProfile(baseUser.id);
      const works = await Artwork.getPublicByArtist(baseUser.id);
      const reviews = await Artwork.getCommentsByArtist(baseUser.id, 10);
      const tags = [...new Set(works.flatMap((w) => w.style_tags || []))];
      profile.artwork_count = works.length;
      res.render("profiles", { profile, profileType: "artist", works, reviews, tags });
    } else {
      const profile = await User.getCuratorProfile(baseUser.id);
      const works = await Showroom.getByCurator(baseUser.id);
      const reviews = await Showroom.getGuestbookByCurator(baseUser.id, 10);
      const tags = [...new Set(works.map((w) => w.theme).filter(Boolean))];
      res.render("profiles", { profile, profileType: "curator", works, reviews, tags });
    }
  } catch (err) {
    next(err);
  }
});
app.get("/404.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "404.html"));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "views", "pages", "404.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("server-error");
});

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
