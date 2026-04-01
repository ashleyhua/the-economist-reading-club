const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');
const { subscriberAuth } = require('../middleware');

// Get all published posts for article selection
router.get('/articles', subscriberAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, economist_title, summary, published_at, country_tags
       FROM posts WHERE is_published = TRUE AND pdf_text IS NOT NULL AND pdf_text != ''
       ORDER BY published_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get word annotations for an article — cached in DB, generated on first request
router.get('/annotations/:id', subscriberAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT pdf_text, word_annotations FROM posts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });

    const post = rows[0];

    // Return cached annotations if they exist
    if (post.word_annotations) {
      return res.json({ annotations: JSON.parse(post.word_annotations), cached: true });
    }

    if (!post.pdf_text) return res.status(400).json({ error: 'No article text available for this post' });

    // Generate annotations with Claude
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `Analyze the vocabulary in this article for Chinese English learners.

For each UNIQUE word that is a noun, adjective, or notable/advanced verb — skip basic words like is, are, was, have, be, do, can, will, would, the, a, an, in, on, at, to, of, and, but, or, for, with, by, from, that, this, it, he, she, they, we, you, I, not, also, as, an — return a JSON object.

Classify each word as one of:
- "technical": professional/specialized terms (e.g. "procurement", "GDP", "sovereignty")  
- "opinion": words showing the author's attitude or judgment (e.g. "reckless", "remarkable", "dire")
- "vocab": general advanced vocabulary worth learning

Article text:
${post.pdf_text.slice(0, 6000)}

Return ONLY a valid JSON object (no markdown, no explanation) where keys are lowercase words and values are objects:
{
  "procurement": {"translation": "采购", "type": "technical", "explanation": "The process of obtaining goods or services, especially for government or military use."},
  "reckless": {"translation": "鲁莽的", "type": "opinion", "explanation": "Showing a lack of care about danger or the consequences of one's actions."},
  "sovereignty": {"translation": "主权", "type": "technical", "explanation": "Supreme power or authority, especially of a state."},
  "remarkable": {"translation": "非凡的", "type": "opinion"}
}

Rules:
- Only include words that appear in the article
- "explanation" field only for technical and opinion words, not regular vocab
- Keep translations concise (2-6 Chinese characters when possible)
- Include 60-120 words total`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    let raw = msg.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const annotations = JSON.parse(raw);

    // Cache in database
    await pool.query('UPDATE posts SET word_annotations = $1 WHERE id = $2', [JSON.stringify(annotations), req.params.id]);

    res.json({ annotations, cached: false });
  } catch (err) {
    console.error('Annotation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single post article text
router.get('/article/:id', subscriberAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, economist_title, title, pdf_text, published_at FROM posts WHERE id = $1 AND is_published = TRUE',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;