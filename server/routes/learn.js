const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');
const { subscriberAuth } = require('../middleware');

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

router.get('/annotations/:id', subscriberAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT pdf_text, word_annotations FROM posts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    const post = rows[0];
    if (post.word_annotations) {
      return res.json({ annotations: JSON.parse(post.word_annotations), cached: true });
    }
    if (!post.pdf_text) return res.status(400).json({ error: 'No article text available' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Split long articles to avoid token limits
    const text = post.pdf_text.slice(0, 8000);

    const prompt = `You are building a vocabulary learning tool for Chinese students reading English articles.

Analyze this article text and return a JSON object mapping English words to their Chinese translations and types.

INCLUDE these word types:
- ALL nouns (people, places, organisations, things, concepts) — even common ones like "president", "country", "market"
- ALL adjectives and adverbs that add meaning
- Notable verbs beyond the most basic (include: "impose", "snarled", "brandished", "mitigate" — skip: is, are, was, were, be, have, do, can, will, would, could, should, may, might, get, go, come, see, make, put, let)
- ALL proper nouns (country names, people names, organisation names)
- Technical/economic/political terms with explanations
- Opinion/attitude words with explanations

SKIP only the most trivial function words: the, a, an, in, on, at, to, of, and, but, or, for, with, by, from, that, this, these, those, it, he, she, they, we, you, I, me, my, his, her, its, our, their, not, also, as, so, if, then, than, when, where, who, which, how, up, out, into, over, after, before, here, there, now, very, just, only, even, still, both, each, such, about, own, same

Target: annotate at least 60% of meaningful words in the text.

Article text:
${text}

Return ONLY a valid JSON object. Keys are lowercase words. No markdown. Example:
{
  "president": {"translation": "总统", "type": "vocab"},
  "strait": {"translation": "海峡", "type": "technical", "explanation": "A narrow passage of water connecting two seas."},
  "reckless": {"translation": "鲁莽的", "type": "opinion", "explanation": "Showing disregard for danger or consequences."},
  "iran": {"translation": "伊朗", "type": "vocab"},
  "sanctions": {"translation": "制裁", "type": "technical", "explanation": "Penalties imposed by countries to pressure another country."},
  "snarled": {"translation": "使陷入混乱", "type": "vocab"},
  "gargantuan": {"translation": "巨大的", "type": "vocab"},
  "infrastructure": {"translation": "基础设施", "type": "technical", "explanation": "Basic physical systems like roads, power, and communications."}
}

Rules:
- Keep translations concise (2-8 Chinese characters)
- Include "explanation" only for technical and opinion words
- Use lowercase keys
- Include proper nouns (country/person/org names) with their Chinese names`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    let raw = msg.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Repair: fix newlines inside strings
    let fixed = '';
    let inStr = false, esc = false;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (esc) { fixed += c; esc = false; continue; }
      if (c === '\\') { fixed += c; esc = true; continue; }
      if (c === '"') { inStr = !inStr; fixed += c; continue; }
      if (inStr && c === '\n') { fixed += '\\n'; continue; }
      fixed += c;
    }

    // Extract JSON object
    const start = fixed.indexOf('{');
    const end = fixed.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object in response');
    const annotations = JSON.parse(fixed.slice(start, end + 1));

    await pool.query('UPDATE posts SET word_annotations = $1 WHERE id = $2', [JSON.stringify(annotations), req.params.id]);
    res.json({ annotations, cached: false });
  } catch (err) {
    console.error('Annotation error:', err);
    res.status(500).json({ error: err.message });
  }
});

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