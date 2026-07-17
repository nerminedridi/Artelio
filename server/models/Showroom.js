const pool = require("../../db");
const { memoizeAsync } = require("../utils/cache");

class Showroom {
  static async getDetails(id) {
    const { rows } = await pool.query(
      `SELECT
         s.*, u.username AS curator_name,
         (SELECT COUNT(*) FROM submissions sub WHERE sub.room_id = s.id AND sub.status = 'approved') AS artwork_count,
         (SELECT COUNT(*) FROM saved_items si WHERE si.item_type = 'showroom' AND si.item_id = s.id) AS follower_count,
         (
           SELECT COALESCE(AVG(r.score), 0) FROM submissions sub
           JOIN ratings r ON r.artwork_id = sub.artwork_id
           WHERE sub.room_id = s.id AND sub.status = 'approved'
         ) AS avg_artwork_rating,
         (
           SELECT COUNT(*) FROM submissions sub
           JOIN ratings r ON r.artwork_id = sub.artwork_id
           WHERE sub.room_id = s.id AND sub.status = 'approved'
         ) AS rating_count
       FROM showrooms s
       JOIN users u ON u.id = s.curator_id
       WHERE s.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  static async getArtworks(id) {
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.image_url, a.price, u.username AS artist_name,
         COALESCE(AVG(r.score), 0) AS avg_rating, COUNT(DISTINCT r.id) AS rating_count
       FROM submissions sub
       JOIN artworks a ON a.id = sub.artwork_id
       JOIN users u ON u.id = a.artist_id
       LEFT JOIN ratings r ON r.artwork_id = a.id
       WHERE sub.room_id = $1 AND sub.status = 'approved'
       GROUP BY a.id, u.username, sub.display_order
       ORDER BY sub.display_order NULLS LAST, a.created_at DESC`,
      [id]
    );
    return rows;
  }

  static async getGuestbook(id) {
    const { rows } = await pool.query(
      `SELECT g.message, g.created_at, u.username
       FROM guestbook_entries g
       JOIN users u ON u.id = g.user_id
       WHERE g.room_id = $1
       ORDER BY g.created_at DESC`,
      [id]
    );
    return rows;
  }

  static async getAll() {
    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.theme, s.concept_essay, s.cover_image_url, u.username AS curator_name,
         (SELECT COUNT(*) FROM submissions sub WHERE sub.room_id = s.id AND sub.status = 'approved') AS artwork_count
       FROM showrooms s
       JOIN users u ON u.id = s.curator_id
       WHERE s.status = 'active'
       ORDER BY s.created_at DESC`
    );
    return rows;
  }

  static async getByCurator(curatorId) {
    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.theme, s.cover_image_url, s.status,
         (SELECT COUNT(*) FROM submissions sub WHERE sub.room_id = s.id AND sub.status = 'approved') AS artwork_count
       FROM showrooms s
       WHERE s.curator_id = $1
       ORDER BY s.created_at DESC`,
      [curatorId]
    );
    return rows;
  }

  static async getGuestbookByCurator(curatorId, limit = 10) {
    const { rows } = await pool.query(
      `SELECT g.message, g.created_at, u.username, s.title AS room_title
       FROM guestbook_entries g
       JOIN users u ON u.id = g.user_id
       JOIN showrooms s ON s.id = g.room_id
       WHERE s.curator_id = $1
       ORDER BY g.created_at DESC
       LIMIT $2`,
      [curatorId, limit]
    );
    return rows;
  }

  static async getRecentGuestbookGlobal(limit = 2) {
    const { rows } = await pool.query(
      `SELECT g.message, u.username, s.title AS room_title
       FROM guestbook_entries g
       JOIN users u ON u.id = g.user_id
       JOIN showrooms s ON s.id = g.room_id
       ORDER BY g.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  static async getPendingSubmissions(curatorId) {
    const { rows } = await pool.query(
      `SELECT sub.id, sub.submitted_at, a.id AS artwork_id, a.title AS artwork_title, a.image_url,
         u.id AS artist_id, u.username AS artist_name, s.title AS room_title
       FROM submissions sub
       JOIN artworks a ON a.id = sub.artwork_id
       JOIN users u ON u.id = a.artist_id
       JOIN showrooms s ON s.id = sub.room_id
       WHERE s.curator_id = $1 AND sub.status = 'pending'
       ORDER BY sub.submitted_at ASC`,
      [curatorId]
    );
    return rows;
  }

  static async reviewSubmission(submissionId, curatorId, decision, note) {
    const { rows } = await pool.query(
      `UPDATE submissions sub
       SET status = $1, curatorial_note = $2, reviewed_at = NOW(),
           display_order = CASE WHEN $1 = 'approved'::submission_status THEN (
             SELECT COALESCE(MAX(sub2.display_order), 0) + 1
             FROM submissions sub2 WHERE sub2.room_id = sub.room_id AND sub2.status = 'approved'
           ) ELSE sub.display_order END
       FROM showrooms s
       WHERE sub.room_id = s.id AND sub.id = $3 AND s.curator_id = $4
       RETURNING sub.id`,
      [decision, note || null, submissionId, curatorId]
    );
    return rows[0] || null;
  }

  static async getOwnById(id, curatorId) {
    const { rows } = await pool.query(
      "SELECT * FROM showrooms WHERE id = $1 AND curator_id = $2",
      [id, curatorId]
    );
    return rows[0] || null;
  }

  static async updateOwn(id, curatorId, { title, theme, conceptEssay, commissionRate, coverImageUrl, moodTags }) {
    const { rows } = await pool.query(
      `UPDATE showrooms
       SET title = $1, theme = $2, concept_essay = $3, commission_rate = $4,
           cover_image_url = COALESCE($5, cover_image_url), mood_tags = $6
       WHERE id = $7 AND curator_id = $8
       RETURNING id`,
      [title, theme || null, conceptEssay || null, commissionRate || 20, coverImageUrl || null, moodTags || [], id, curatorId]
    );
    return rows[0] || null;
  }

  static async deleteOwn(id, curatorId) {
    await pool.query("DELETE FROM showrooms WHERE id = $1 AND curator_id = $2", [id, curatorId]);
  }

  static async getApprovedForCurator(roomId, curatorId) {
    const { rows } = await pool.query(
      `SELECT sub.id AS submission_id, sub.display_order, a.id AS artwork_id, a.title, a.image_url
       FROM submissions sub
       JOIN artworks a ON a.id = sub.artwork_id
       JOIN showrooms s ON s.id = sub.room_id
       WHERE sub.room_id = $1 AND s.curator_id = $2 AND sub.status = 'approved'
       ORDER BY sub.display_order NULLS LAST, sub.submitted_at ASC`,
      [roomId, curatorId]
    );
    return rows;
  }

  static async reorderSubmission(submissionId, curatorId, direction) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: currentRows } = await client.query(
        `SELECT sub.id, sub.room_id, sub.display_order, s.curator_id
         FROM submissions sub JOIN showrooms s ON s.id = sub.room_id
         WHERE sub.id = $1 AND sub.status = 'approved'
         FOR UPDATE`,
        [submissionId]
      );
      const current = currentRows[0];
      if (!current || current.curator_id !== curatorId) {
        await client.query("ROLLBACK");
        return false;
      }

      const comparator = direction === "up" ? "<" : ">";
      const order = direction === "up" ? "DESC" : "ASC";
      const { rows: neighborRows } = await client.query(
        `SELECT id, display_order FROM submissions
         WHERE room_id = $1 AND status = 'approved' AND display_order ${comparator} $2
         ORDER BY display_order ${order} LIMIT 1
         FOR UPDATE`,
        [current.room_id, current.display_order]
      );
      const neighbor = neighborRows[0];
      if (!neighbor) {
        await client.query("ROLLBACK");
        return false;
      }

      await client.query("UPDATE submissions SET display_order = $1 WHERE id = $2", [neighbor.display_order, current.id]);
      await client.query("UPDATE submissions SET display_order = $1 WHERE id = $2", [current.display_order, neighbor.id]);
      await client.query("COMMIT");
      return true;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async create(curatorId, { title, theme, conceptEssay, coverImageUrl, commissionRate, moodTags }) {
    const { rows } = await pool.query(
      `INSERT INTO showrooms (curator_id, title, theme, concept_essay, cover_image_url, commission_rate, mood_tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [curatorId, title, theme || null, conceptEssay || null, coverImageUrl || null, commissionRate || 20, moodTags || []]
    );
    return rows[0];
  }

  static async setStatus(id, curatorId, status) {
    await pool.query(
      "UPDATE showrooms SET status = $1 WHERE id = $2 AND curator_id = $3",
      [status, id, curatorId]
    );
  }

  static async getFeaturedArtists(curatorId) {
    const { rows } = await pool.query(
      `SELECT DISTINCT u.id, u.username, u.avatar_url, u.bio
       FROM submissions sub
       JOIN showrooms s ON s.id = sub.room_id
       JOIN artworks a ON a.id = sub.artwork_id
       JOIN users u ON u.id = a.artist_id
       WHERE s.curator_id = $1 AND sub.status = 'approved'`,
      [curatorId]
    );
    return rows;
  }

  static async getAllForAdmin() {
    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.theme, s.status, s.created_at, u.username AS curator_name,
         (SELECT COUNT(*) FROM submissions sub WHERE sub.room_id = s.id AND sub.status = 'approved') AS artwork_count
       FROM showrooms s
       JOIN users u ON u.id = s.curator_id
       ORDER BY s.created_at DESC`
    );
    return rows;
  }

  static async delete(id) {
    await pool.query("DELETE FROM showrooms WHERE id = $1", [id]);
  }

  static async setTheme(id, theme) {
    const { rows } = await pool.query(
      "UPDATE showrooms SET theme = $1 WHERE id = $2 RETURNING id",
      [theme, id]
    );
    return rows[0] || null;
  }

  static async addGuestbookEntry(userId, roomId, message) {
    const { rows } = await pool.query(
      `INSERT INTO guestbook_entries (room_id, user_id, message) VALUES ($1, $2, $3) RETURNING id`,
      [roomId, userId, message]
    );
    return rows[0];
  }

  static async search({ term = "", moodTag = "all" } = {}) {
    const like = `%${term}%`;
    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.theme, s.cover_image_url, u.username AS curator_name
       FROM showrooms s
       JOIN users u ON u.id = s.curator_id
       WHERE s.status = 'active'
         AND ($1 = '' OR s.title ILIKE $2 OR s.theme ILIKE $2 OR s.concept_essay ILIKE $2 OR u.username ILIKE $2)
         AND ($3 = 'all' OR $3 = ANY(s.mood_tags))
       ORDER BY s.created_at DESC
       LIMIT 30`,
      [term, like, moodTag || "all"]
    );
    return rows;
  }

  static async getDistinctMoodTags() {
    const { rows } = await pool.query(
      `SELECT DISTINCT tag FROM showrooms, unnest(mood_tags) AS tag ORDER BY tag`
    );
    return rows.map((r) => r.tag);
  }
}

Showroom.getDistinctMoodTags = memoizeAsync(Showroom.getDistinctMoodTags, 60000);

module.exports = Showroom;
