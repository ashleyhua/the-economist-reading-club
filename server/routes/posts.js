const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { subscriberAuth } = require('../middleware');

// Feed — never load heavy columns (audio_url is base64, can be 5-8MB per post)
router.get('/', subscriberAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const country = req.query.country;

    let query, countQuery, params;
    const lightCols = `id, title, economist_title, summary, country_tags, published_at, created_at,
      CASE WHEN audio_url IS NOT NULL THEN true ELSE false END as has_audio`;

    if (country) {
      query = `SELECT ${lightCols} FROM posts WHERE is_published = TRUE AND $1 = ANY(country_tags)
               ORDER BY published_at DESC LIMIT $2 OFFSET $3`;
      countQuery = `SELECT COUNT(*) FROM posts WHERE is_published = TRUE AND $1 = ANY(country_tags)`;
      params = [country, limit, offset];
    } else {
      query = `SELECT ${lightCols} FROM posts WHERE is_published = TRUE
               ORDER BY published_at DESC LIMIT $1 OFFSET $2`;
      countQuery = `SELECT COUNT(*) FROM posts WHERE is_published = TRUE`;
      params = [limit, offset];
    }

    const [postsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, country ? [country] : [])
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ posts: postsResult.rows, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Country counts for globe
router.get('/meta/countries', subscriberAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT unnest(country_tags) AS country, COUNT(*) AS count
       FROM posts WHERE is_published = TRUE
       GROUP BY country ORDER BY count DESC`
    );
    const counts = {};
    rows.forEach(r => { counts[r.country] = parseInt(r.count); });
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Single post — load everything including audio_url
router.get('/:id', subscriberAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1 AND is_published = TRUE',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;