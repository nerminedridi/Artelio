const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const pool = require("../../db");

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      const user = rows[0];
      if (!user) return done(null, false, { message: "Invalid email or password." });

      const matches = await bcrypt.compare(password, user.password_hash);
      if (!matches) return done(null, false, { message: "Invalid email or password." });

      if (user.status === "suspended") {
        return done(null, false, { message: "Your account has been suspended. Contact support." });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, email, role, status, bio, avatar_url FROM users WHERE id = $1",
      [id]
    );
    done(null, rows[0] || false);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
