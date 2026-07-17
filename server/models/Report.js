const pool = require("../../db");

class Report {
  static async create(reporterId, itemType, itemId, reason) {
    const { rows } = await pool.query(
      `INSERT INTO reports (reporter_id, item_type, item_id, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [reporterId, itemType, itemId, reason]
    );
    return rows[0];
  }

  static async getAllForAdmin() {
    const { rows } = await pool.query(
      `SELECT r.id, r.item_type, r.item_id, r.reason, r.status, r.created_at,
         u.username AS reporter_name,
         resolver.username AS resolved_by_name,
         COALESCE(a.title, s.title, c.content) AS item_label,
         CASE WHEN r.item_type = 'artwork' THEN a.id IS NOT NULL
              WHEN r.item_type = 'showroom' THEN s.id IS NOT NULL
              WHEN r.item_type = 'comment' THEN c.id IS NOT NULL
         END AS item_exists,
         CASE WHEN r.item_type = 'artwork' THEN a.id
              WHEN r.item_type = 'comment' THEN c.artwork_id
         END AS artwork_link_id,
         CASE WHEN r.item_type = 'showroom' THEN s.id END AS showroom_link_id
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       LEFT JOIN users resolver ON resolver.id = r.resolved_by
       LEFT JOIN artworks a ON r.item_type = 'artwork' AND a.id = r.item_id
       LEFT JOIN showrooms s ON r.item_type = 'showroom' AND s.id = r.item_id
       LEFT JOIN comments c ON r.item_type = 'comment' AND c.id = r.item_id
       ORDER BY (r.status = 'pending') DESC, r.created_at DESC`
    );
    return rows;
  }

  static async countPending() {
    const { rows } = await pool.query("SELECT COUNT(*) FROM reports WHERE status = 'pending'");
    return Number(rows[0].count);
  }

  static async resolve(id, adminId, status) {
    const { rows } = await pool.query(
      `UPDATE reports SET status = $1, resolved_at = NOW(), resolved_by = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING id`,
      [status, adminId, id]
    );
    return rows[0] || null;
  }
}

module.exports = Report;
