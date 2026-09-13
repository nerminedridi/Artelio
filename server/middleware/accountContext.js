const pool = require("../../db");

async function loadUser(id) {
  const { rows } = await pool.query(
    "SELECT id, username, email, role, status, bio, avatar_url FROM users WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

module.exports = async function accountContext(req, res, next) {
  const accounts = req.session.accounts || [];
  const hasExplicitIdx = req.params.acctIdx !== undefined;
  let idx = null;

  if (hasExplicitIdx) {
    const parsed = Number(req.params.acctIdx);
    idx = Number.isInteger(parsed) && parsed >= 0 ? parsed : -1;
  } else {
    idx = accounts.length > 0 ? 0 : null;
  }

  const slot = idx !== null && idx >= 0 ? accounts[idx] : null;

  try {
    req.user = slot ? await loadUser(slot.id) : undefined;
  } catch (err) {
    return next(err);
  }

  req.isAuthenticated = () => !!req.user;
  req.acctIdx = idx;
  req.acctPrefix = hasExplicitIdx ? `/u/${idx}` : "";
  req.acctUrl = (targetPath) => `${req.acctPrefix}${targetPath}`;

  res.locals.currentUser = req.user || null;
  res.locals.acctPrefix = req.acctPrefix;

  next();
};
