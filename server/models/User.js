const pool = require("../../db");

class User {
  static async getArtists() {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.bio, u.avatar_url,
         COUNT(DISTINCT a.id) FILTER (WHERE EXISTS (
           SELECT 1 FROM submissions sub WHERE sub.artwork_id = a.id AND sub.status = 'approved'
         )) AS artwork_count,
         COALESCE(AVG(r.score), 0) AS avg_rating,
         COUNT(DISTINCT r.id) AS rating_count
       FROM users u
       LEFT JOIN artworks a ON a.artist_id = u.id
       LEFT JOIN ratings r ON r.artwork_id = a.id
       WHERE u.role = 'artist' AND u.status = 'approved'
       GROUP BY u.id
       ORDER BY avg_rating DESC, artwork_count DESC`
    );
    return rows;
  }

  static async getCurators() {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.bio, u.avatar_url,
         COUNT(DISTINCT s.id) AS showroom_count,
         COUNT(DISTINCT sub.artwork_id) FILTER (WHERE sub.status = 'approved') AS artwork_count,
         COALESCE(AVG(r.score), 0) AS avg_rating
       FROM users u
       LEFT JOIN showrooms s ON s.curator_id = u.id
       LEFT JOIN submissions sub ON sub.room_id = s.id AND sub.status = 'approved'
       LEFT JOIN ratings r ON r.artwork_id = sub.artwork_id
       WHERE u.role = 'curator' AND u.status = 'approved'
       GROUP BY u.id
       ORDER BY avg_rating DESC, showroom_count DESC`
    );
    return rows;
  }

  static async getById(id) {
    const { rows } = await pool.query(
      `SELECT id, username, email, role, bio, avatar_url, created_at FROM users WHERE id = $1 AND status = 'approved'`,
      [id]
    );
    return rows[0] || null;
  }

  static async getOwnProfile(id) {
    const { rows } = await pool.query(
      `SELECT id, username, email, role, status, bio, avatar_url, created_at FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  static async getArtistProfile(id) {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.bio, u.avatar_url, u.created_at,
         COUNT(DISTINCT a.id) AS artwork_count,
         COALESCE(AVG(r.score), 0) AS avg_rating,
         COUNT(DISTINCT r.id) AS rating_count,
         (SELECT COUNT(*) FROM saved_items si WHERE si.item_type = 'artist' AND si.item_id = u.id) AS follower_count,
         (
           SELECT COUNT(*) FROM saved_items si
           JOIN artworks aa ON aa.id = si.item_id
           WHERE si.item_type = 'artwork' AND aa.artist_id = u.id
         ) AS like_count
       FROM users u
       LEFT JOIN artworks a ON a.artist_id = u.id
       LEFT JOIN ratings r ON r.artwork_id = a.id
       WHERE u.id = $1 AND u.role = 'artist' AND u.status = 'approved'
       GROUP BY u.id`,
      [id]
    );
    return rows[0] || null;
  }

  static async getCuratorProfile(id) {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.bio, u.avatar_url, u.created_at,
         COUNT(DISTINCT s.id) AS showroom_count,
         COUNT(DISTINCT sub.artwork_id) FILTER (WHERE sub.status = 'approved') AS artwork_count,
         COALESCE(AVG(r.score), 0) AS avg_rating,
         COUNT(DISTINCT r.id) AS rating_count,
         (
           SELECT COUNT(*) FROM saved_items si
           WHERE si.item_type = 'showroom' AND si.item_id IN (SELECT id FROM showrooms WHERE curator_id = u.id)
         ) AS follower_count
       FROM users u
       LEFT JOIN showrooms s ON s.curator_id = u.id
       LEFT JOIN submissions sub ON sub.room_id = s.id AND sub.status = 'approved'
       LEFT JOIN ratings r ON r.artwork_id = sub.artwork_id
       WHERE u.id = $1 AND u.role = 'curator' AND u.status = 'approved'
       GROUP BY u.id`,
      [id]
    );
    return rows[0] || null;
  }

  static async getAllForAdmin() {
    const { rows } = await pool.query(
      `SELECT id, username, email, role, status, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    return rows;
  }

  static async countPendingCurators() {
    const { rows } = await pool.query(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'curator' AND status = 'pending'"
    );
    return Number(rows[0].count);
  }

  static async setStatus(id, status) {
    await pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, id]);
  }

  static async updateBio(id, bio) {
    await pool.query("UPDATE users SET bio = $1 WHERE id = $2", [bio || null, id]);
  }

  static async searchByRole(role, term) {
    const like = `%${term}%`;
    const { rows } = await pool.query(
      `SELECT id, username, bio, avatar_url FROM users
       WHERE role = $1 AND status = 'approved'
         AND ($2 = '' OR username ILIKE $3 OR bio ILIKE $3)
       ORDER BY username
       LIMIT 60`,
      [role, term, like]
    );
    return rows;
  }

  static async getSignupsByMonth(months = 6) {
    const { rows } = await pool.query(
      `SELECT to_char(date_trunc('month', created_at), 'Mon') AS month, COUNT(*) AS count
       FROM users
       WHERE created_at >= NOW() - ($1 || ' months')::interval
       GROUP BY date_trunc('month', created_at)
       ORDER BY date_trunc('month', created_at)`,
      [months]
    );
    return rows;
  }
}

module.exports = User;
