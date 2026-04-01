const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { subscriberAuth } = require('../middleware');

// Get user's vocab list
router.get('/', subscriberAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vocab_list WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add word to vocab list
router.post('/', subscriberAuth, async (req, res) => {
  const { word, translation, context, post_id } = req.body;
  if (!word) return res.status(400).json({ error: 'Word is required' });
  try {
    await pool.query(
      `INSERT INTO vocab_list (id, user_id, word, translation, context, post_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, word) DO UPDATE SET translation = $4, context = $5`,
      [uuidv4(), req.user.id, word.toLowerCase(), translation, context, post_id]
    );
    res.json({ message: 'Word added to vocab list' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Remove word from vocab list
router.delete('/:word', subscriberAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM vocab_list WHERE user_id = $1 AND word = $2',
      [req.user.id, req.params.word.toLowerCase()]
    );
    res.json({ message: 'Word removed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;