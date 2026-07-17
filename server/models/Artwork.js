const pool = require("../../db");
const { memoizeAsync } = require("../utils/cache");

class Artwork {
  static async getPopular(limit = 5) {
    const { rows } = await pool.query(
      `SELECT
         a.id, a.title, a.image_url, a.description, a.price,
         u.username AS artist_name,
         (
           SELECT s.id FROM submissions sub
           JOIN showrooms s ON s.id = sub.room_id
           WHERE sub.artwork_id = a.id AND sub.status = 'approved'
           LIMIT 1
         ) AS showroom_id
       FROM artworks a
       JOIN users u ON u.id = a.artist_id
       LEFT JOIN ratings r ON r.artwork_id = a.id
       LEFT JOIN orders o ON o.artwork_id = a.id
       WHERE a.status != 'archived'
       GROUP BY a.id, u.username
       ORDER BY (COUNT(DISTINCT o.id) * 2 + COUNT(DISTINCT r.id)) DESC,
                COALESCE(AVG(r.score), 0) DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  static async getDetails(id) {
    const { rows } = await pool.query(
      `SELECT
         a.*, u.username AS artist_name,
         (
           SELECT s.id FROM submissions sub JOIN showrooms s ON s.id = sub.room_id
           WHERE sub.artwork_id = a.id AND sub.status = 'approved' LIMIT 1
         ) AS showroom_id,
         (
           SELECT s.title FROM submissions sub JOIN showrooms s ON s.id = sub.room_id
           WHERE sub.artwork_id = a.id AND sub.status = 'approved' LIMIT 1
         ) AS showroom_title,
         COALESCE(AVG(r.score), 0) AS avg_rating,
         COUNT(DISTINCT r.id) AS rating_count
       FROM artworks a
       JOIN users u ON u.id = a.artist_id
       LEFT JOIN ratings r ON r.artwork_id = a.id
       WHERE a.id = $1
       GROUP BY a.id, u.username`,
      [id]
    );
    return rows[0] || null;
  }

  static async getComments(id) {
    const { rows } = await pool.query(
      `SELECT c.id, c.user_id, c.content, c.created_at, u.username
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.artwork_id = $1
       ORDER BY c.created_at DESC`,
      [id]
    );
    return rows;
  }

  static async addComment(userId, artworkId, content) {
    const { rows } = await pool.query(
      `INSERT INTO comments (user_id, artwork_id, content) VALUES ($1, $2, $3) RETURNING id`,
      [userId, artworkId, content]
    );
    return rows[0];
  }

  static async deleteComment(commentId, userId, isAdmin) {
    if (isAdmin) {
      await pool.query("DELETE FROM comments WHERE id = $1", [commentId]);
    } else {
      await pool.query("DELETE FROM comments WHERE id = $1 AND user_id = $2", [commentId, userId]);
    }
  }

  static async upsertRating(userId, artworkId, score) {
    await pool.query(
      `INSERT INTO ratings (user_id, artwork_id, score) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, artwork_id) DO UPDATE SET score = EXCLUDED.score, created_at = NOW()`,
      [userId, artworkId, score]
    );
  }

  static async search({ term = "", tag = "all", medium = "all", priceRange = "any", availability = "any" } = {}) {
    const like = `%${term}%`;
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.image_url, a.price, a.medium, a.status, u.username AS artist_name,
         (SELECT COUNT(*) FROM saved_items si WHERE si.item_type = 'artwork' AND si.item_id = a.id) AS save_count
       FROM artworks a
       JOIN users u ON u.id = a.artist_id
       WHERE a.status != 'archived'
         AND ($1 = 'all' OR $1 = ANY(a.style_tags))
         AND ($2 = '' OR a.title ILIKE $3 OR a.description ILIKE $3 OR u.username ILIKE $3)
         AND ($4 = 'all' OR a.medium = $4)
         AND ($5 = 'any'
              OR ($5 = 'under500' AND a.price < 500)
              OR ($5 = '500to2000' AND a.price BETWEEN 500 AND 2000)
              OR ($5 = 'over2000' AND a.price > 2000))
         AND ($6 = 'any' OR a.status::text = $6)
       ORDER BY a.created_at DESC
       LIMIT 60`,
      [tag || "all", term, like, medium || "all", priceRange || "any", availability || "any"]
    );
    return rows;
  }

  static async getDistinctMediums() {
    const { rows } = await pool.query(
      `SELECT DISTINCT medium FROM artworks WHERE medium IS NOT NULL AND medium != '' ORDER BY medium`
    );
    return rows.map((r) => r.medium);
  }

  static async getAllStyleTags() {
    const { rows } = await pool.query(
      `SELECT DISTINCT tag FROM artworks, unnest(style_tags) AS tag ORDER BY tag`
    );
    return rows.map((r) => r.tag);
  }

  static async getRecent(limit = 4) {
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.image_url, u.username AS artist_name,
         (SELECT COUNT(*) FROM saved_items si WHERE si.item_type = 'artwork' AND si.item_id = a.id) AS save_count
       FROM artworks a
       JOIN users u ON u.id = a.artist_id
       WHERE a.status != 'archived'
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  static async getByArtist(artistId) {
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.image_url, a.price, a.status, a.style_tags,
         COALESCE(AVG(r.score), 0) AS avg_rating, COUNT(DISTINCT r.id) AS rating_count
       FROM artworks a
       LEFT JOIN ratings r ON r.artwork_id = a.id
       WHERE a.artist_id = $1
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [artistId]
    );
    return rows;
  }

  static async getSubmissionsByArtist(artistId) {
    const { rows } = await pool.query(
      `SELECT sub.artwork_id, sub.status, sub.curatorial_note, sub.submitted_at,
         s.id AS room_id, s.title AS room_title
       FROM submissions sub
       JOIN artworks a ON a.id = sub.artwork_id
       JOIN showrooms s ON s.id = sub.room_id
       WHERE a.artist_id = $1
       ORDER BY sub.submitted_at DESC`,
      [artistId]
    );
    return rows;
  }

  static async getPublicByArtist(artistId) {
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.image_url, a.price, a.status, a.style_tags,
         COALESCE(AVG(r.score), 0) AS avg_rating, COUNT(DISTINCT r.id) AS rating_count
       FROM artworks a
       LEFT JOIN ratings r ON r.artwork_id = a.id
       WHERE a.artist_id = $1
         AND a.status != 'archived'
         AND EXISTS (
           SELECT 1 FROM submissions sub WHERE sub.artwork_id = a.id AND sub.status = 'approved'
         )
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [artistId]
    );
    return rows;
  }

  static async getCommentsByArtist(artistId, limit = 10) {
    const { rows } = await pool.query(
      `SELECT c.content, c.created_at, u.username, a.title AS artwork_title
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN artworks a ON a.id = c.artwork_id
       WHERE a.artist_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2`,
      [artistId, limit]
    );
    return rows;
  }

  static async getTrendingTags(limit = 6) {
    const { rows } = await pool.query(
      `SELECT tag, COUNT(*) AS tag_count
       FROM artworks, unnest(style_tags) AS tag
       WHERE status != 'archived'
       GROUP BY tag
       ORDER BY tag_count DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map((r) => r.tag);
  }

  static async getTagDistribution(limit = 5) {
    const { rows } = await pool.query(
      `SELECT tag, COUNT(*) AS tag_count
       FROM artworks, unnest(style_tags) AS tag
       GROUP BY tag
       ORDER BY tag_count DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map((r) => ({ tag: r.tag, count: Number(r.tag_count) }));
  }

  static async getAllForAdmin() {
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.price, a.status, a.created_at, u.username AS artist_name
       FROM artworks a
       JOIN users u ON u.id = a.artist_id
       ORDER BY a.created_at DESC`
    );
    return rows;
  }

  static async delete(id) {
    await pool.query("DELETE FROM artworks WHERE id = $1", [id]);
  }

  static async getOwnById(id, artistId) {
    const { rows } = await pool.query(
      "SELECT * FROM artworks WHERE id = $1 AND artist_id = $2",
      [id, artistId]
    );
    return rows[0] || null;
  }

  static async updateOwn(id, artistId, { title, description, price, styleTags, imageUrl, medium, dimensions }) {
    const { rows } = await pool.query(
      `UPDATE artworks
       SET title = $1, description = $2, price = $3, style_tags = $4,
           image_url = COALESCE($5, image_url), medium = $6, dimensions = $7
       WHERE id = $8 AND artist_id = $9
       RETURNING id`,
      [title, description || null, price, styleTags, imageUrl || null, medium || null, dimensions || null, id, artistId]
    );
    return rows[0] || null;
  }
}

Artwork.getDistinctMediums = memoizeAsync(Artwork.getDistinctMediums, 60000);
Artwork.getAllStyleTags = memoizeAsync(Artwork.getAllStyleTags, 60000);

module.exports = Artwork;
