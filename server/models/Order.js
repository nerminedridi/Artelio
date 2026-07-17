const pool = require("../../db");

class Order {
  static async getCartItems(artworkIds) {
    if (!artworkIds.length) return [];
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.image_url, a.price, a.status, a.artist_id
       FROM artworks a WHERE a.id = ANY($1::int[])`,
      [artworkIds]
    );
    return rows;
  }

  static async checkout(buyerId, artworkIds, paymentData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const created = [];

      for (const artworkId of artworkIds) {
        const { rows: artworkRows } = await client.query(
          "SELECT * FROM artworks WHERE id = $1 FOR UPDATE",
          [artworkId]
        );
        const artwork = artworkRows[0];
        if (!artwork) throw new Error(`Artwork #${artworkId} not found.`);
        if (artwork.status !== "available") {
          throw new Error(`"${artwork.title}" is no longer available.`);
        }
        if (artwork.artist_id === buyerId) {
          throw new Error(`You can't purchase your own artwork ("${artwork.title}").`);
        }

        const { rows: subRows } = await client.query(
          `SELECT s.id AS room_id, s.curator_id, s.commission_rate
           FROM submissions sub
           JOIN showrooms s ON s.id = sub.room_id
           WHERE sub.artwork_id = $1 AND sub.status = 'approved'
           LIMIT 1`,
          [artworkId]
        );
        const sub = subRows[0];
        const commissionRate = sub ? Number(sub.commission_rate) : 0;
        const grossPrice = Number(artwork.price);
        const commissionAmount = Math.round(grossPrice * commissionRate) / 100;
        const artistNet = Math.round((grossPrice - commissionAmount) * 100) / 100;

        const { rows: orderRows } = await client.query(
          `INSERT INTO orders (buyer_id, artwork_id, room_id, curator_id, gross_price, commission_rate, commission_amount, artist_net, payment_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            buyerId,
            artworkId,
            sub ? sub.room_id : null,
            sub ? sub.curator_id : null,
            grossPrice,
            commissionRate,
            commissionAmount,
            artistNet,
            paymentData,
          ]
        );
        await client.query("UPDATE artworks SET status = 'sold' WHERE id = $1", [artworkId]);
        created.push(orderRows[0]);
      }

      await client.query("COMMIT");
      return created;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async getByBuyer(buyerId) {
    const { rows } = await pool.query(
      `SELECT o.*, a.title, a.image_url
       FROM orders o
       JOIN artworks a ON a.id = o.artwork_id
       WHERE o.buyer_id = $1
       ORDER BY o.purchased_at DESC`,
      [buyerId]
    );
    return rows;
  }

  static async getByArtist(artistId) {
    const { rows } = await pool.query(
      `SELECT o.*, a.title
       FROM orders o
       JOIN artworks a ON a.id = o.artwork_id
       WHERE a.artist_id = $1
       ORDER BY o.purchased_at DESC`,
      [artistId]
    );
    return rows;
  }

  static async getMonthlyRevenueForArtist(artistId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(o.artist_net), 0) AS revenue
       FROM orders o
       JOIN artworks a ON a.id = o.artwork_id
       WHERE a.artist_id = $1 AND date_trunc('month', o.purchased_at) = date_trunc('month', NOW())`,
      [artistId]
    );
    return Number(rows[0].revenue);
  }

  static async getByCurator(curatorId) {
    const { rows } = await pool.query(
      `SELECT o.*, a.title
       FROM orders o
       JOIN artworks a ON a.id = o.artwork_id
       WHERE o.curator_id = $1
       ORDER BY o.purchased_at DESC`,
      [curatorId]
    );
    return rows;
  }

  static async getPlatformTotals() {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(gross_price), 0) AS total_sales, COALESCE(SUM(commission_amount), 0) AS total_commissions
       FROM orders`
    );
    return { totalSales: Number(rows[0].total_sales), totalCommissions: Number(rows[0].total_commissions) };
  }

  static async getCommissionFlow(limit = 20) {
    const { rows } = await pool.query(
      `SELECT o.id, o.purchased_at, o.gross_price, o.commission_rate, o.commission_amount, o.artist_net,
         a.title AS artwork_title, ar.username AS artist_name, cu.username AS curator_name, s.title AS room_title
       FROM orders o
       JOIN artworks a ON a.id = o.artwork_id
       JOIN users ar ON ar.id = a.artist_id
       LEFT JOIN users cu ON cu.id = o.curator_id
       LEFT JOIN showrooms s ON s.id = o.room_id
       ORDER BY o.purchased_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  static async getEarningsByShowroomForCurator(curatorId) {
    const { rows } = await pool.query(
      `SELECT s.id AS room_id, s.title AS room_title,
         COUNT(o.id) AS sale_count,
         COALESCE(SUM(o.commission_amount), 0) AS total_commission
       FROM showrooms s
       LEFT JOIN orders o ON o.room_id = s.id
       WHERE s.curator_id = $1
       GROUP BY s.id, s.title
       ORDER BY total_commission DESC`,
      [curatorId]
    );
    return rows.map((r) => ({ ...r, sale_count: Number(r.sale_count), total_commission: Number(r.total_commission) }));
  }

  static async getMonthlyCommissionForCurator(curatorId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS commission
       FROM orders
       WHERE curator_id = $1 AND date_trunc('month', purchased_at) = date_trunc('month', NOW())`,
      [curatorId]
    );
    return Number(rows[0].commission);
  }
}

module.exports = Order;
