const crypto = require("crypto");
const pool = require("../../db");

const TOKEN_TTL_MS = 60 * 60 * 1000;

class PasswordReset {
  static async create(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
    return token;
  }

  static async findValid(token) {
    const { rows } = await pool.query(
      `SELECT pr.id, pr.user_id, u.email, u.username
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token = $1 AND pr.used_at IS NULL AND pr.expires_at > NOW()`,
      [token]
    );
    return rows[0] || null;
  }

  static async markUsed(token) {
    await pool.query(`UPDATE password_resets SET used_at = NOW() WHERE token = $1`, [token]);
  }
}

module.exports = PasswordReset;
