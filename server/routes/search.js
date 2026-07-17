const express = require("express");
const Artwork = require("../models/Artwork");
const Showroom = require("../models/Showroom");
const User = require("../models/User");

const router = express.Router();

const PRICE_RANGE_LABELS = { under500: "Under €500", "500to2000": "€500 – €2000", over2000: "Over €2000" };
const AVAILABILITY_LABELS = { available: "Available", sold: "Sold" };

function pick(value, validValues, fallback) {
  return validValues.includes(value) ? value : fallback;
}

function buildQuery(state, overrides) {
  const merged = { ...state, ...overrides };
  const params = new URLSearchParams();
  if (merged.term) params.set("q", merged.term);
  if (merged.tag && merged.tag !== "all") params.set("filter", merged.tag);
  if (merged.medium && merged.medium !== "all") params.set("medium", merged.medium);
  if (merged.priceRange && merged.priceRange !== "any") params.set("priceRange", merged.priceRange);
  if (merged.availability && merged.availability !== "any") params.set("availability", merged.availability);
  if (merged.moodTag && merged.moodTag !== "all") params.set("moodTag", merged.moodTag);
  const qs = params.toString();
  return "/search-results" + (qs ? `?${qs}` : "");
}

router.get(["/search-results", "/search-results.html"], async (req, res, next) => {
  try {
    const term = (req.query.q || "").trim();
    const tag = (req.query.filter || req.query.tag || "all").toLowerCase();
    const medium = req.query.medium || "all";
    const priceRange = pick(req.query.priceRange, ["under500", "500to2000", "over2000"], "any");
    const availability = pick(req.query.availability, ["available", "sold"], "any");
    const moodTag = (req.query.moodTag || "all").toLowerCase();
    const state = { term, tag, medium, priceRange, availability, moodTag };

    const [artworks, showrooms, artists, curators, styleTagOptions, mediumOptions, moodTagOptions] = await Promise.all([
      Artwork.search({ term, tag, medium, priceRange, availability }),
      Showroom.search({ term, moodTag }),
      User.searchByRole("artist", term),
      User.searchByRole("curator", term),
      Artwork.getAllStyleTags(),
      Artwork.getDistinctMediums(),
      Showroom.getDistinctMoodTags(),
    ]);

    const activeChips = [];
    if (term) activeChips.push({ label: `"${term}"`, url: buildQuery(state, { term: "" }) });
    if (tag !== "all") activeChips.push({ label: `Style: ${tag}`, url: buildQuery(state, { tag: "all" }) });
    if (medium !== "all") activeChips.push({ label: `Technique: ${medium}`, url: buildQuery(state, { medium: "all" }) });
    if (priceRange !== "any") activeChips.push({ label: PRICE_RANGE_LABELS[priceRange], url: buildQuery(state, { priceRange: "any" }) });
    if (availability !== "any") activeChips.push({ label: AVAILABILITY_LABELS[availability], url: buildQuery(state, { availability: "any" }) });
    if (moodTag !== "all") activeChips.push({ label: `Mood: ${moodTag}`, url: buildQuery(state, { moodTag: "all" }) });

    const clearAllUrl = term ? `/search-results?q=${encodeURIComponent(term)}` : "/search-results";

    res.render("search-results", {
      term,
      filters: { tag, medium, priceRange, availability, moodTag },
      options: { styleTagOptions, mediumOptions, moodTagOptions },
      artworks,
      showrooms,
      artists,
      curators,
      activeChips,
      clearAllUrl,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
