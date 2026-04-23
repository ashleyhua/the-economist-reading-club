const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const cheerio = require('cheerio');
// pdf-parse import with Node 24 compatibility
let pdfParse;
try {
  const _pdf = require('pdf-parse');
  pdfParse = typeof _pdf === 'function' ? _pdf : (_pdf.default || null);
  if (typeof pdfParse !== 'function') {
    console.error('[pdf-parse] Unexpected export type:', typeof _pdf, '- keys:', Object.keys(_pdf || {}));
    pdfParse = null;
  } else {
    console.log('[pdf-parse] Loaded successfully');
  }
} catch(e) {
  console.error('[pdf-parse] Failed to load:', e.message);
  pdfParse = null;
}

const { pool } = require('../db');
const { adminAuth } = require('../middleware');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.html', '.htm', '.mp3', '.m4a', '.wav', '.ogg', '.aac'];
    allowed.includes(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('File type not allowed'));
  }
});

function extractArticleFromHtml(html) {
  const $ = cheerio.load(html);
  let articleTitle = '';
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  if (ogTitle && ogTitle.length > 5) {
    articleTitle = ogTitle.replace(/\s*[|\-–—]\s*The Economist.*$/i, '').trim();
  }
  if (!articleTitle) {
    const pageTitle = $('title').first().text().replace(/\s+/g, ' ').trim();
    if (pageTitle && pageTitle.length > 5) {
      articleTitle = pageTitle.replace(/\s*[|\-–—]\s*The Economist.*$/i, '').trim();
    }
  }
  if (!articleTitle) {
    articleTitle = $('h1').first().text().replace(/\s+/g, ' ').trim();
  }
  if (!articleTitle) {
    articleTitle = ($('meta[name="twitter:title"]').attr('content') || '').replace(/\s*[|\-–—]\s*The Economist.*$/i, '').trim();
  }
  console.log('Extracted title:', articleTitle);
  $('nav, header, footer, aside, script, style, noscript, button').remove();
  $('[class*="newsletter"], [class*="follow"], [class*="subscribe"], [class*="signup"]').remove();
  $('[class*="recommend"], [class*="more-from"], [class*="related"], [class*="share"]').remove();
  $('[class*="audio"], [class*="podcast"], [class*="listen"]').remove();
  const bodySelectors = ['.article__body-text','.article-body','[data-component="article-body"]','.layout-article-body','.body-copy','article'];
  let $content = null;
  for (const sel of bodySelectors) {
    if ($(sel).length) { $content = $(sel); break; }
  }
  if (!$content) $content = $('body');
  const parts = [];
  if (articleTitle) parts.push(articleTitle);
  $content.find('p, h2, h3, [class*="subheading"], [class*="sub-heading"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && text.length > 15) parts.push(text);
  });
  let text = parts.join('\n\n').trim();
  const endIdx = text.indexOf('■');
  if (endIdx !== -1) text = text.slice(0, endIdx + 1).trim();
  return text;
}

async function callClaude(prompt, pdfBase64 = null) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const content = [];
  if (pdfBase64) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } });
  content.push({ type: 'text', text: prompt });
  const msg = await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages: [{ role: 'user', content }] });
  return msg.content[0].text;
}

function safeParseJSON(raw) {
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(text); } catch (_) {}
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' && depth++ === 0) start = i;
    if (text[i] === '}' && --depth === 0 && start !== -1) {
      const candidate = text.slice(start, i + 1);
      try { return JSON.parse(candidate); } catch (_) {}
      break;
    }
  }
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch (_) {} }
  throw new Error('Could not parse JSON from AI response. Raw: ' + text.slice(0, 200));
}

function repairJSON(text) {
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  let result = '';
  let inString = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inString && ch === '\\') {
      result += ch; i++;
      if (i < text.length) { result += text[i]; i++; }
      continue;
    }
    if (ch === '"') {
      if (!inString) { inString = true; result += ch; i++; continue; }
      let j = i + 1;
      while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
      const next = text[j];
      if (next === ':' || next === ',' || next === '}' || next === ']' || j >= text.length) {
        inString = false; result += ch; i++; continue;
      } else {
        result += '\\"'; i++; continue;
      }
    }
    if (inString && ch === '\n') { result += '\\n'; i++; continue; }
    if (inString && ch === '\r') { result += '\\r'; i++; continue; }
    if (inString && ch === '\t') { result += '\\t'; i++; continue; }
    result += ch; i++;
  }
  return result;
}

function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/^[-]\s+/gm, '')
    .trim();
}

function cleanPdfText(raw) {
  if (!raw) return '';
  const cleaned = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (t === '') { cleaned.push(''); continue; }
    if (
      t.includes('●') || t.includes('InsiderFor') || t.includes('SaveShare') ||
      t.includes('Weekly edition') || t.includes('Listen to this story') ||
      t.includes('0:000:00') || t.includes('http://') || t.includes('https://') ||
      t.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/) || t.match(/^\d+\/\d+$/) ||
      t.match(/\d+ min read/i) || t.match(/^[A-Z]$/) ||
      t.match(/^\w+\s*\|\s*\w/) || t.match(/^Leaders\s*\|/i) ||
      t.match(/^illustration:/i) || t.match(/^photograph:/i) ||
      t.match(/^Chart:/i) || t.match(/^chart:/i) ||
      t.includes('Read the rest of our cover') || t.includes('For subscribers only') ||
      t.includes('subscriber only') || t.includes('Sign up') ||
      t.match(/From the .* edition/i) || t.includes('Discover stories') ||
      t.includes('list of contents') || t.includes('Explore the edition') ||
      t.match(/^Explore more/i) || t.match(/^More from /i) ||
      t.includes('Get The Economist app') || t.match(/^Follow$/) ||
      t.includes('See the latest') || t.includes('This article appeared') ||
      t.includes('Reuse this content') || t.includes('newsletter') ||
      t.match(/^To stay on top/i) || t.match(/^To enhance/i) || t.match(/sign up to/i) ||
      t.match(/^⇒/) || t.match(/^→/) || t.match(/^the economist$/i) ||
      t.match(/^About$/) || t.match(/^Subscribe$/) || t.match(/^Reuse our content$/) ||
      t.includes('Gift subscriptions') || t.includes('SecureDrop') ||
      t.includes('Economist Group') || t.includes('Economist Intelligence') ||
      t.includes('Economist Impact') || t.includes('Economist Education') ||
      t.includes('Economist Pro') || t.match(/^contact$/i) ||
      t.includes('Help and support') || t.match(/^careers$/i) ||
      t.includes('Working here') || t.includes('Terms of use') ||
      t.includes('Registered in England') || t.includes('Manage cookies') ||
      t.includes('Privacy Choices') || t.includes('© The Economist') ||
      t.match(/^Advertise$/) || t.includes('Press centre') ||
      t.includes('Affiliate programme') || t.includes('Executive Jobs') ||
      t.includes('enhance your experience') || t.includes('use cookies') ||
      t.includes('VAT Reg') || t.includes('Registered office') ||
      t.includes('Modern Slavery') || t.includes('Cookie Policy') ||
      t.match(/^Accessibility$/) || t.match(/^Sitemap$/) ||
      t.match(/^Privacy$/) || t.match(/^Menu$/) ||
      t.match(/^(Iran|Leaders|Opinion|Europe|World|Defence|Donald Trump|War in the Middle East)$/) ||
      t.includes('Editorials, columns') || t.match(/^From the [A-Z]/i) ||
      t.match(/edition$/)
    ) continue;
    cleaned.push(line);
  }
  const out = [];
  let blanks = 0;
  for (const line of cleaned) {
    if (line.trim() === '') { if (++blanks <= 1) out.push(''); }
    else { blanks = 0; out.push(line); }
  }
  return out.join('\n').trim();
}

router.get('/suggestions', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT title, economist_title, created_at FROM posts ORDER BY created_at DESC LIMIT 50');
    const coveredList = rows.length > 0 ? rows.map(p => `- ${p.economist_title || p.title}`).join('\n') : 'None yet.';
    const prompt = `You are an editorial assistant for a Chinese educational newsletter curating The Economist for Chinese high school students.\n\nToday's date: ${new Date().toISOString().slice(0, 10)}.\n\nARTICLES ALREADY COVERED (do NOT suggest these topics or closely related ones):\n${coveredList}\n\nGenerate 8 NEW compelling article topic suggestions The Economist would likely be covering RIGHT NOW in ${new Date().toISOString().slice(0, 7)}. Focus on the most recent and relevant global developments. Span politics, economics, tech, ESG, and society. Do not repeat or closely overlap with any already-covered topic above.\n\nRespond ONLY with a valid JSON array, no other text, no markdown:\n[\n  {\n    "title": "Suggested article title or topic",\n    "section": "The Economist section (e.g. Finance & economics)",\n    "why": "One sentence on why this matters for Chinese students",\n    "concepts": ["concept 1", "concept 2", "concept 3"],\n    "countries": ["Country1", "Country2"]\n  }\n]`;
    const raw = await callClaude(prompt);
    res.json(safeParseJSON(raw));
  } catch (err) {
    console.error('Suggestion error:', err);
    res.status(500).json({ error: 'Failed to generate suggestions: ' + err.message });
  }
});

router.post('/generate', adminAuth, upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'HTML file required' });
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  if (fileExt !== '.html' && fileExt !== '.htm') {
    return res.status(400).json({ error: 'Please upload an HTML file (.html). Save the article page as HTML from your browser.' });
  }
  try {
    const html = fs.readFileSync(req.file.path, 'utf8');
    const articleText = extractArticleFromHtml(html);
    console.log('HTML extraction:', articleText.length, 'chars');
    if (articleText.length < 100) {
      return res.status(400).json({ error: 'Could not extract article text from HTML. Make sure you saved the page as "Webpage, HTML Only" from your browser.' });
    }
    const exactTitle = articleText.split('\n')[0].trim();
    console.log('Article title:', exactTitle);
    const prompt = `You are an editorial assistant creating educational content about this Economist article for Chinese high school students and general learners.\n\nHere is the full article text:\n---\n${articleText}\n---\n\nRead the article carefully and return ONLY a JSON object. Strict formatting rules:\n- NO markdown — no **, no *, no #, no dashes as bullets\n- Only use 【】brackets for: media outlet names, and the single theory name at the start of theory_explanation. Nowhere else.\n- Every string value must be on ONE line — use the escape sequence \\n for line breaks, never actual newlines\n- All content fields in Simplified Chinese except economist_title and country_tags\n\nFields:\n- title: Engaging Chinese title\n- economist_title: The exact English title of the article as it appears in the text above. Copy it precisely.\n- summary: One sentence in Chinese summarizing the core message\n- theory_explanation: Write as flowing prose paragraphs separated by \\n\\n. Structure: first paragraph introduces the theory name in 【】and its origin. Second paragraph explains the theory. Third paragraph applies it to this article.\n- exam_questions: 5 numbered questions in Chinese, each on its own line.\n- other_media: Write THREE in-depth paragraphs separated by \\n\\n. Each starts with a named outlet in 【】followed by a colon, then 4-6 sentences.\n- audio_script: Natural 2-minute spoken script in Chinese, approx 300 characters\n- country_tags: English country names array\n\nCRITICAL JSON rules:\n- Do NOT use double quotes " inside any string value — use 「」instead\n- Return the JSON on a SINGLE LINE\n- Every \\n line break inside a value must be written as the two characters backslash-n\n\nReturn exactly this JSON shape on ONE LINE:\n{"title":"<value>","economist_title":"<value>","summary":"<value>","theory_explanation":"<value>","exam_questions":"<value>","other_media":"<value>","audio_script":"<value>","country_tags":["<country1>"]}`;
    const raw = await callClaude(prompt);
    console.log('Raw AI response (first 300 chars):', raw.slice(0, 300));
    const repaired = repairJSON(raw);
    const generated = safeParseJSON(repaired);
    ['title','summary','theory_explanation','exam_questions','other_media','audio_script'].forEach(k => {
      if (generated[k]) generated[k] = stripMarkdown(generated[k]);
    });
    generated.pdf_text = articleText;
    res.json(generated);
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

router.post('/upload-audio', adminAuth, upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Audio file required' });
  res.json({ audio_url: `/uploads/${req.file.filename}` });
});

// Generate audio using Replicate Qwen3-TTS with voice cloning
// (route name kept as-is for frontend compatibility)
router.post('/generate-audio', adminAuth, async (req, res) => {
  const { script } = req.body;
  if (!script?.trim()) return res.status(400).json({ error: 'Script text required' });

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const referenceAudioUrl = process.env.REFERENCE_AUDIO_URL;

  if (!replicateToken) return res.status(500).json({ error: 'REPLICATE_API_TOKEN not set in environment variables' });
  if (!referenceAudioUrl) return res.status(500).json({ error: 'REFERENCE_AUDIO_URL not set in environment variables' });

  try {
    const startRes = await fetch('https://api.replicate.com/v1/models/qwen/qwen3-tts/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=120'
      },
      body: JSON.stringify({
        input: {
          text: script,
          language: 'zh',
          mode: 'voice_clone',
          reference_audio: referenceAudioUrl,
          style_instruction: 'energetic tone'
        }
      })
    });

    const prediction = await startRes.json();
    console.log('Replicate prediction:', prediction.id, 'status:', prediction.status);

    if (prediction.error) {
      return res.status(500).json({ error: 'Replicate error: ' + prediction.error });
    }

    // Poll until done
    let result = prediction;
    let attempts = 0;
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 60) {
      await new Promise(r => setTimeout(r, 3000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${replicateToken}` }
      });
      result = await pollRes.json();
      console.log('Poll', ++attempts, 'status:', result.status);
    }

    if (result.status === 'failed') {
      return res.status(500).json({ error: 'Audio generation failed: ' + (result.error || 'unknown') });
    }
    if (result.status !== 'succeeded') {
      return res.status(500).json({ error: 'Audio generation timed out after 3 minutes. Try a shorter script.' });
    }

    const audioUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    if (!audioUrl) return res.status(500).json({ error: 'No audio URL in Replicate response' });

    // Download and store as base64 data URL so it survives Render deploys
    const audioRes = await fetch(audioUrl);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    const base64 = audioBuffer.toString('base64');
    const dataUrl = `data:audio/wav;base64,${base64}`;

    res.json({ audio_url: dataUrl });
  } catch (err) {
    console.error('Replicate TTS error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts', adminAuth, async (req, res) => {
  try {
    const { title, economist_title, summary, theory_explanation, exam_questions,
            other_media, audio_script, audio_url, pdf_url, pdf_text, country_tags, is_published } = req.body;
    const id = uuidv4();
    const published_at = is_published ? (req.body.published_at || new Date().toISOString()) : null;
    await pool.query(
      `INSERT INTO posts (id, title, economist_title, summary, theory_explanation, exam_questions,
        other_media, audio_script, audio_url, pdf_url, pdf_text, country_tags, is_published, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id, title, economist_title, summary, theory_explanation, exam_questions,
       other_media, audio_script, audio_url || null, pdf_url || null,
       pdf_text || null, country_tags || [], !!is_published, published_at]
    );
    res.json({ id, message: is_published ? 'Post published!' : 'Post saved as draft' });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/posts/:id', adminAuth, async (req, res) => {
  try {
    const { title, economist_title, summary, theory_explanation, exam_questions,
            other_media, audio_script, audio_url, pdf_url, pdf_text, country_tags, is_published } = req.body;
    const existing = await pool.query('SELECT published_at FROM posts WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Post not found' });
    const published_at = is_published && !existing.rows[0].published_at
      ? new Date().toISOString()
      : existing.rows[0].published_at;
    await pool.query(
      `UPDATE posts SET title=$1, economist_title=$2, summary=$3, theory_explanation=$4,
        exam_questions=$5, other_media=$6, audio_script=$7, audio_url=$8, pdf_url=$9,
        pdf_text=$10, country_tags=$11, is_published=$12, published_at=$13 WHERE id=$14`,
      [title, economist_title, summary, theory_explanation, exam_questions,
       other_media, audio_script, audio_url || null, pdf_url || null,
       pdf_text || null, country_tags || [], !!is_published, published_at, req.params.id]
    );
    res.json({ message: 'Post updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/posts', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/posts/:id', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/posts/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, name, role, subscribed_until, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/users/:id/subscribe', adminAuth, async (req, res) => {
  try {
    const m = parseInt(req.body.months) || 12;
    const until = new Date();
    until.setMonth(until.getMonth() + m);
    await pool.query('UPDATE users SET subscribed_until = $1 WHERE id = $2', [until.toISOString().split('T')[0], req.params.id]);
    res.json({ message: `Subscription set for ${m} months` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/users/:id/revoke', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET subscribed_until = NULL WHERE id = $1', [req.params.id]);
    res.json({ message: 'Subscription revoked' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/parse-pdf-post', adminAuth, upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'PDF file required' });
  try {
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfBase64 = pdfBuffer.toString('base64');
    const filename = req.file.originalname || '';
    const dateMatch = filename.match(/(\d{2})(\d{2})/);
    let publishedAt = '';
    if (dateMatch) {
      const month = parseInt(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const year = new Date().getFullYear();
        publishedAt = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      }
    }
    let titleFromFilename = '';
    const filenameParts = filename.replace(/.pdf$/i, '').split(/[｜|]/);
    if (filenameParts.length >= 3) {
      titleFromFilename = filenameParts[filenameParts.length - 1].trim();
    }
    console.log('Title from filename:', titleFromFilename);
    const prompt = `This PDF is an Economist article analysis. Extract the sections and return a JSON object.\n\nThe PDF has these sections:\n- Title line like "经济学人｜MMDD｜Chinese title" — the title is the THIRD part after splitting by ｜\n- Summary: has 一句话总结 (one sentence) and 语音稿 (audio script paragraph)\n- More Insights: Chinese deep-dive analysis\n- For Students with: 理论补充, 启发性问题与解答, 外媒与行业视角的补充\n- Original Article: The VERBATIM English article text. Copy it word-for-word. Do NOT summarize.\n\nCRITICAL RULES:\n- Return ONLY the raw JSON object\n- Do NOT use double quote characters " inside string values — use 「」instead\n- Every string value must be on ONE LINE — use \\n instead of real line breaks\n\nReturn exactly this shape:\n{"title":"value","economist_title":"value","summary":"value","audio_script":"value","theory_explanation":"value","exam_questions":"value","other_media":"value","pdf_text":"<verbatim English article, NOT a summary>","country_tags":["China"]}`;
    const raw = await callClaude(prompt, pdfBase64);
    console.log('parse-pdf-post raw (first 400):', raw.slice(0, 400));
    let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = text.indexOf('{');
    if (start > 0) text = text.slice(start);
    let fixed = '';
    let inStr = false, esc = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (esc) { fixed += c; esc = false; continue; }
      if (c === '\\') { fixed += c; esc = true; continue; }
      if (c === '"') { inStr = !inStr; fixed += c; continue; }
      if (inStr) {
        if (c === '\n') { fixed += '\\n'; continue; }
        if (c === '\r') continue;
        if (c === '\t') { fixed += '\\t'; continue; }
      }
      fixed += c;
    }
    let extracted;
    try {
      extracted = JSON.parse(fixed);
    } catch (parseErr) {
      console.log('Direct parse failed:', parseErr.message);
      const fields = ['title','economist_title','summary','audio_script','theory_explanation','exam_questions','other_media','pdf_text'];
      extracted = { country_tags: [] };
      for (const field of fields) {
        const match = fixed.match(new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
        if (match) extracted[field] = match[1].replace(/\\n/g, '\n');
      }
      const tagsMatch = fixed.match(/"country_tags"\s*:\s*\[([^\]]*)\]/);
      if (tagsMatch) {
        extracted.country_tags = tagsMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
      }
    }
    if (publishedAt) extracted.published_at = publishedAt;
    if (titleFromFilename) extracted.title = titleFromFilename;
    res.json(extracted);
  } catch (err) {
    console.error('parse-pdf-post error:', err.message);
    res.status(500).json({ error: 'Failed to parse PDF: ' + err.message });
  }
});

module.exports = router;