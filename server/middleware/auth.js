const pool = require("../../db");

function setNoCache(res) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
}

class AuthGuard {
  static requireAuth(req, res, next) {
    setNoCache(res);
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
  }

  static requireRole(...roles) {
    return (req, res, next) => {
      setNoCache(res);
      if (!req.isAuthenticated()) return res.redirect("/login");
      if (!roles.includes(req.user.role)) {
        return res.status(403).render("access-denied", { message: "You don't have permission to view this page." });
      }
      if (req.user.status === "pending") {
        return res.status(403).render("access-denied", { message: "Your account is pending admin approval." });
      }
      if (req.user.status === "suspended") {
        return res.status(403).render("access-denied", { message: "Your account has been suspended." });
      }
      next();
    };
  }
  static isOwner(table, ownerColumn) {
    return async (req, res, next) => {
      try {
        const { rows } = await pool.query(
          `SELECT ${ownerColumn} AS owner_id FROM ${table} WHERE id = $1`,
          [req.params.id]
        );
        if (!rows[0]) return res.status(404).send("Not found");
        if (req.user.role !== "admin" && req.user.id !== rows[0].owner_id) {
          return res.status(403).render("access-denied", { message: "You don't have permission to modify this." });
        }
        next();
      } catch (err) {
        next(err);
      }
    };
  }
}

module.exports = AuthGuard;
