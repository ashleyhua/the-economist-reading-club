const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');
const { subscriberAuth, adminAuth } = require('../middleware');

function repairJSON(raw) {
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Find the outermost { } using brace counting
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' && depth++ === 0) start = i;
    if (text[i] === '}' && --depth === 0 && start !== -1) {
      return text.slice(start, i + 1);
    }
  }
  return text;
}

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
    const prompt = `You are a geopolitical analyst creating an educational country profile for Chinese high school students. Generate a profile for: ${country} (2025-2026 context).

CRITICAL JSON rules:
- Return ONLY valid JSON, no markdown, no code fences
- No actual newlines inside string values — use the two characters \\n instead
- No unescaped double quotes inside strings — use Chinese quotes 「」instead
- Keep all string values SHORT to avoid JSON errors

Return this exact structure:
{"snapshot":"One sentence in Chinese about ${country} current situation","current_issues":[{"title":"Issue 1 in Chinese","description":"2 sentences in Chinese"},{"title":"Issue 2 in Chinese","description":"2 sentences in Chinese"},{"title":"Issue 3 in Chinese","description":"2 sentences in Chinese"}],"political":{"system":"Political system in Chinese (1 sentence)","key_actors":["Actor 1 in Chinese","Actor 2 in Chinese","Actor 3 in Chinese"],"foreign_relations":[{"country":"Country name","status":"ally","description":"1 sentence in Chinese"},{"country":"Country name","status":"neutral","description":"1 sentence in Chinese"},{"country":"Country name","status":"tense","description":"1 sentence in Chinese"},{"country":"Country name","status":"hostile","description":"1 sentence in Chinese"}]},"economic":{"gdp":"GDP figure","inflation":"Inflation rate","key_export":"Main export","story":"2 sentences in Chinese"},"historical":[{"year":"Year","event":"Event in Chinese","significance":"1 sentence in Chinese"},{"year":"Year","event":"Event in Chinese","significance":"1 sentence in Chinese"},{"year":"Year","event":"Event in Chinese","significance":"1 sentence in Chinese"}],"concepts":[{"term_en":"English term","term_zh":"Chinese term","explanation":"1 sentence in Chinese"},{"term_en":"English term","term_zh":"Chinese term","explanation":"1 sentence in Chinese"},{"term_en":"English term","term_zh":"Chinese term","explanation":"1 sentence in Chinese"}]}`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = msg.content[0].text;
    console.log(`Profile for ${country}, raw length: ${raw.length}`);

    const cleaned = repairJSON(raw);
    const profile = JSON.parse(cleaned);

    await pool.query(
      `INSERT INTO country_profiles (country_name, profile_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (country_name) DO UPDATE SET profile_data = $2, updated_at = NOW()`,
      [country, JSON.stringify(profile)]
    );

    res.json({ profile });
  } catch (err) {
    console.error(`Profile gen error for ${country}:`, err.message);
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