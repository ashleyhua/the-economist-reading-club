const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');
const { subscriberAuth, adminAuth } = require('../middleware');

router.get('/list', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT country_name, updated_at FROM country_profiles ORDER BY country_name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:country', subscriberAuth, async (req, res) => {
  try {
    const country = decodeURIComponent(req.params.country);
    const { rows } = await pool.query('SELECT * FROM country_profiles WHERE country_name = $1', [country]);
    if (!rows[0]) return res.json({ profile: null });
    res.json({ profile: JSON.parse(rows[0].profile_data), updated_at: rows[0].updated_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/generate/:country', adminAuth, async (req, res) => {
  const country = decodeURIComponent(req.params.country);
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `You are an expert geopolitical analyst creating an educational country profile for Chinese high school students learning about global affairs through The Economist. Generate a profile for: ${country} based on the most current information available (2025-2026).

Return ONLY valid JSON, no markdown:
{
  "snapshot": "One vivid sentence in Chinese describing ${country} current geopolitical and economic situation",
  "current_issues": [
    {"title": "Issue title in Chinese", "description": "2-3 sentences in Chinese on this major current issue"},
    {"title": "Issue title in Chinese", "description": "2-3 sentences in Chinese"},
    {"title": "Issue title in Chinese", "description": "2-3 sentences in Chinese"}
  ],
  "political": {
    "system": "Political system description in Chinese",
    "key_actors": ["Key actor 1 in Chinese", "Key actor 2 in Chinese", "Key actor 3 in Chinese"],
    "foreign_relations": [
      {"country": "Country in English", "status": "ally", "description": "Relationship description in Chinese"},
      {"country": "Country in English", "status": "neutral", "description": "Relationship in Chinese"},
      {"country": "Country in English", "status": "tense", "description": "Relationship in Chinese"},
      {"country": "Country in English", "status": "hostile", "description": "Relationship in Chinese"}
    ]
  },
  "economic": {
    "gdp": "GDP figure",
    "inflation": "Inflation rate",
    "key_export": "Main export",
    "story": "2-3 sentences on economic situation in Chinese"
  },
  "historical": [
    {"year": "Year", "event": "Event in Chinese", "significance": "Why it matters in Chinese"},
    {"year": "Year", "event": "Event in Chinese", "significance": "Why it matters in Chinese"},
    {"year": "Year", "event": "Event in Chinese", "significance": "Why it matters in Chinese"}
  ],
  "concepts": [
    {"term_en": "English term", "term_zh": "Chinese term", "explanation": "Explanation in Chinese"},
    {"term_en": "English term", "term_zh": "Chinese term", "explanation": "Explanation in Chinese"},
    {"term_en": "English term", "term_zh": "Chinese term", "explanation": "Explanation in Chinese"}
  ]
}`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    let raw = msg.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const profile = JSON.parse(raw);

    await pool.query(
      `INSERT INTO country_profiles (country_name, profile_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (country_name) DO UPDATE SET profile_data = $2, updated_at = NOW()`,
      [country, JSON.stringify(profile)]
    );

    res.json({ profile });
  } catch (err) {
    console.error('Profile gen error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:country', adminAuth, async (req, res) => {
  const country = decodeURIComponent(req.params.country);
  const { profile } = req.body;
  try {
    await pool.query(
      `INSERT INTO country_profiles (country_name, profile_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (country_name) DO UPDATE SET profile_data = $2, updated_at = NOW()`,
      [country, JSON.stringify(profile)]
    );
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;