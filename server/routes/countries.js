const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');
const { subscriberAuth, adminAuth } = require('../middleware');

function extractAndRepairJSON(raw) {
  // Strip markdown fences
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Find start of JSON object
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');
  text = text.slice(start);

  // Fix actual newlines and tabs inside the text (they break JSON string values)
  // Process character by character to fix newlines inside strings
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      result += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString) {
      // Inside a string, replace raw newlines/tabs with escaped versions
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
    }
    result += ch;
  }

  return result;
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

    const prompt = `Country profile for ${country} for Chinese students (2025-2026). Return ONLY JSON. No markdown. No code fences. Keep ALL string values SHORT (under 60 characters each). No line breaks inside strings. No double quotes inside strings - use 「」instead.

{"snapshot":"<20-30 char Chinese>","current_issues":[{"title":"<15 char Chinese>","description":"<50 char Chinese>"},{"title":"<15 char>","description":"<50 char>"},{"title":"<15 char>","description":"<50 char>"}],"political":{"system":"<30 char Chinese>","key_actors":["<20 char>","<20 char>","<20 char>"],"foreign_relations":[{"country":"USA","status":"ally","description":"<40 char Chinese>"},{"country":"Russia","status":"neutral","description":"<40 char>"},{"country":"Japan","status":"tense","description":"<40 char>"},{"country":"India","status":"neutral","description":"<40 char>"}]},"economic":{"gdp":"$XX trillion","inflation":"X%","key_export":"<10 char>","story":"<50 char Chinese>"},"historical":[{"year":"1949","event":"<15 char Chinese>","significance":"<40 char>"},{"year":"1978","event":"<15 char>","significance":"<40 char>"},{"year":"2001","event":"<15 char>","significance":"<40 char>"}],"concepts":[{"term_en":"GDP","term_zh":"国内生产总值","explanation":"<40 char Chinese>"},{"term_en":"BRI","term_zh":"一带一路","explanation":"<40 char>"},{"term_en":"SOE","term_zh":"国有企业","explanation":"<40 char>"}]}`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = msg.content[0].text;
    console.log(`${country} raw response length: ${raw.length}`);

    const repaired = extractAndRepairJSON(raw);
    const profile = JSON.parse(repaired);

    await pool.query(
      `INSERT INTO country_profiles (country_name, profile_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (country_name) DO UPDATE SET profile_data = $2, updated_at = NOW()`,
      [country, JSON.stringify(profile)]
    );

    res.json({ profile });
  } catch (err) {
    console.error(`Profile error for ${country}:`, err.message);
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