const pool = require("../../db");

class Newsletter {
  static async subscribe(email) {
    const { rows } = await pool.query(
      `INSERT INTO newsletter_subscribers (email) VALUES ($1)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email]
    );
    return rows.length > 0;
  }
}

module.exports = Newsletter;
