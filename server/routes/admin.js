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


// Extract clean article text from saved Economist HTML page
function extractArticleFromHtml(html) {
  const $ = cheerio.load(html);

  // --- Step 1: Extract title — try multiple sources in order of reliability ---
  let articleTitle = '';

  // 1. og:title meta tag (most reliable for saved pages)
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  if (ogTitle && ogTitle.length > 5) {
    articleTitle = ogTitle.replace(/\s*[|\-–—]\s*The Economist.*$/i, '').trim();
  }

  // 2. <title> tag
  if (!articleTitle) {
    const pageTitle = $('title').first().text().replace(/\s+/g, ' ').trim();
    if (pageTitle && pageTitle.length > 5) {
      articleTitle = pageTitle.replace(/\s*[|\-–—]\s*The Economist.*$/i, '').trim();
    }
  }

  // 3. h1 tag
  if (!articleTitle) {
    articleTitle = $('h1').first().text().replace(/\s+/g, ' ').trim();
  }

  // 4. twitter:title meta tag
  if (!articleTitle) {
    articleTitle = ($('meta[name="twitter:title"]').attr('content') || '').replace(/\s*[|\-–—]\s*The Economist.*$/i, '').trim();
  }

  console.log('Extracted title:', articleTitle);

  // --- Step 2: Remove all navigation/chrome elements ---
  $('nav, header, footer, aside, script, style, noscript, button').remove();
  $('[class*="newsletter"], [class*="follow"], [class*="subscribe"], [class*="signup"]').remove();
  $('[class*="recommend"], [class*="more-from"], [class*="related"], [class*="share"]').remove();
  $('[class*="audio"], [class*="podcast"], [class*="listen"]').remove();

  // --- Step 3: Find article body ---
  const bodySelectors = [
    '.article__body-text',
    '.article-body',
    '[data-component="article-body"]',
    '.layout-article-body',
    '.body-copy',
    'article',
  ];
  let $content = null;
  for (const sel of bodySelectors) {
    if ($(sel).length) { $content = $(sel); break; }
  }
  if (!$content) $content = $('body');

  // --- Step 4: Extract paragraphs and in-article subheadings only ---
  const parts = [];
  if (articleTitle) parts.push(articleTitle);

  $content.find('p, h2, h3, [class*="subheading"], [class*="sub-heading"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && text.length > 15) parts.push(text);
  });

  let text = parts.join('\n\n').trim();

  // --- Step 5: Cut off everything after ■ ---
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

// Safely parse JSON from Claude — strips markdown fences and finds the first valid JSON object/array
function safeParseJSON(raw) {
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Try direct parse first
  try { return JSON.parse(text); } catch (_) {}

  // Try extracting the {...} block using brace counting (handles nested braces)
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' && depth++ === 0) start = i;
    if (text[i] === '}' && --depth === 0 && start !== -1) {
      const candidate = text.slice(start, i + 1);
      try { return JSON.parse(candidate); } catch (_) {}
      break;
    }
  }

  // Try array
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch (_) {} }

  throw new Error('Could not parse JSON from AI response. Raw: ' + text.slice(0, 200));
}

// Repair JSON where the AI inserted actual newlines inside string values
function repairJSON(text) {
  // Strip markdown fences
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Walk char by char. Track when we're inside a JSON string.
  // Fix: (1) real newlines/tabs -> escape sequences
  //      (2) unescaped ASCII " inside string values -> \"
  let result = '';
  let inString = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    // Pass through existing escape sequences untouched
    if (inString && ch === '\\') {
      result += ch; i++;
      if (i < text.length) { result += text[i]; i++; }
      continue;
    }

    if (ch === '"') {
      if (!inString) {
        inString = true; result += ch; i++; continue;
      }
      // We're in a string and hit ". Is it closing the string or content inside it?
      // Look ahead past spaces: structural end is followed by : , } ]
      let j = i + 1;
      while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
      const next = text[j];
      if (next === ':' || next === ',' || next === '}' || next === ']' || j >= text.length) {
        inString = false; result += ch; i++; continue;
      } else {
        // Content quote inside a string value — escape it
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



// Strip markdown formatting (bold, italic, headers) from AI text
function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // remove **bold**
    .replace(/\*([^*\n]+)\*/g, '$1')      // remove *italic*
    .replace(/\*\*/g, '')                  // remove stray **
    .replace(/\*/g, '')                     // remove stray *
    .replace(/#{1,6}\s+/g, '')              // remove ### headers
    .replace(/^[-]\s+/gm, '')               // remove bullet dashes
    .trim();
}

// AI article suggestions — avoids topics already covered
router.get('/suggestions', adminAuth, async (req, res) => {
  try {
    // Fetch existing post titles so AI can avoid repeating them
    const { rows } = await pool.query(
      'SELECT title, economist_title, created_at FROM posts ORDER BY created_at DESC LIMIT 50'
    );

    const coveredList = rows.length > 0
      ? rows.map(p => `- ${p.economist_title || p.title}`).join('\n')
      : 'None yet.';

    const prompt = `You are an editorial assistant for a Chinese educational newsletter curating The Economist for Chinese high school students.

Today's date: ${new Date().toISOString().slice(0, 10)}.

ARTICLES ALREADY COVERED (do NOT suggest these topics or closely related ones):
${coveredList}

Generate 8 NEW compelling article topic suggestions The Economist would likely be covering RIGHT NOW in ${new Date().toISOString().slice(0, 7)}. Focus on the most recent and relevant global developments. Span politics, economics, tech, ESG, and society. Do not repeat or closely overlap with any already-covered topic above.

Respond ONLY with a valid JSON array, no other text, no markdown:
[
  {
    "title": "Suggested article title or topic",
    "section": "The Economist section (e.g. Finance & economics)",
    "why": "One sentence on why this matters for Chinese students",
    "concepts": ["concept 1", "concept 2", "concept 3"],
    "countries": ["Country1", "Country2"]
  }
]`;

    const raw = await callClaude(prompt);
    res.json(safeParseJSON(raw));
  } catch (err) {
    console.error('Suggestion error:', err);
    res.status(500).json({ error: 'Failed to generate suggestions: ' + err.message });
  }
});


// Clean extracted PDF text — removes all Economist website chrome
function cleanPdfText(raw) {
  if (!raw) return '';

  const cleaned = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();

    // Always keep blank lines (collapse later)
    if (t === '') { cleaned.push(''); continue; }

    // Skip if matches any junk pattern
    if (
      t.includes('●') ||
      t.includes('InsiderFor') ||
      t.includes('SaveShare') ||
      t.includes('Weekly edition') ||
      t.includes('Listen to this story') ||
      t.includes('0:000:00') ||
      t.includes('http://') ||
      t.includes('https://') ||
      t.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/) ||  // dates: 3/20/26...
      t.match(/^\d+\/\d+$/) ||                     // page nums: 1/9
      t.match(/^\d+ min read/i) ||
      t.match(/\d+ min read/i) ||
      t.match(/^[A-Z]$/) ||                           // lone drop cap letter
      t.match(/^\w+\s*\|\s*\w/) ||               // "Europe | Pumping iron"
      t.match(/^Leaders\s*\|/i) ||
      t.match(/^illustration:/i) ||
      t.match(/^photograph:/i) ||
      t.match(/^Chart:/i) ||
      t.match(/^chart:/i) ||
      t.includes('Read the rest of our cover') ||
      t.includes('For subscribers only') ||
      t.includes('subscriber only') ||
      t.includes('Sign up') ||
      t.match(/From the .* edition/i) ||
      t.includes('Discover stories') ||
      t.includes('list of contents') ||
      t.includes('Explore the edition') ||
      t.match(/^Explore more/i) ||
      t.match(/^More from /i) ||
      t.includes('Get The Economist app') ||
      t.match(/^Follow$/) ||
      t.includes('See the latest') ||
      t.includes('This article appeared') ||
      t.includes('Reuse this content') ||
      t.includes('newsletter') ||
      t.match(/^To stay on top/i) ||
      t.match(/^To enhance/i) ||
      t.match(/sign up to/i) ||
      t.match(/^⇒/) ||
      t.match(/^→/) ||
      t.match(/^the economist$/i) ||
      t.match(/^About$/) ||
      t.match(/^Subscribe$/) ||
      t.match(/^Reuse our content$/) ||
      t.includes('Gift subscriptions') ||
      t.includes('SecureDrop') ||
      t.includes('Economist Group') ||
      t.includes('economist group') ||
      t.includes('Economist Intelligence') ||
      t.includes('Economist Impact') ||
      t.includes('Economist Education') ||
      t.includes('Economist Pro') ||
      t.match(/^contact$/i) ||
      t.includes('Help and support') ||
      t.match(/^careers$/i) ||
      t.includes('Working here') ||
      t.includes('Terms of use') ||
      t.includes('Registered in England') ||
      t.includes('Manage cookies') ||
      t.includes('Privacy Choices') ||
      t.includes('© The Economist') ||
      t.match(/^Advertise$/) ||
      t.includes('Press centre') ||
      t.includes('Affiliate programme') ||
      t.includes('Executive Jobs') ||
      t.includes('enhance your experience') ||
      t.includes('use cookies') ||
      t.includes('VAT Reg') ||
      t.includes('Registered office') ||
      t.includes('Modern Slavery') ||
      t.includes('Cookie Policy') ||
      t.match(/^Accessibility$/) ||
      t.match(/^Sitemap$/) ||
      t.match(/^Privacy$/) ||
      t.match(/^Menu$/) ||
      t.match(/^(Iran|Leaders|Opinion|Europe|World|Defence|Donald Trump|War in the Middle East|Donald|Trump)$/) ||
      t.includes('Editorials, columns') ||
      t.match(/^From the [A-Z]/i) ||
      t.match(/^\d{4} edition$/i) ||
      t.match(/^\d+ edition$/i) ||
      t.match(/edition$/) ||
      t.match(/^Africa after aid/i) ||
      t.match(/^Gas will not be killed/i) ||
      t.match(/^Lebanon's leaders/i) ||
      t.match(/^A dirty deal/i) ||
      t.match(/^Haiti needs/i) ||
      t.match(/^How to teach/i) ||
      t.match(/^But more needs to be done/i) ||
      t.match(/^But there are ways/i) ||
      t.match(/^And Israel must/i) ||
      t.match(/^Voters must be/i) ||
      t.match(/^By alienating/i) ||
      t.match(/^A prolonged blockade/i) ||
      t.match(/^Viktor Orban/i) ||
      t.match(/^The Iran war is forcing/i) ||
      t.match(/^Charlemagne/i) ||
      t.match(/^How Ukraine/i) ||
      t.match(/^A spy scandal/i) ||
      t.match(/^The quiet recovery/i) ||
      t.match(/^Why the Iran crisis/i) ||
      t.match(/^Despite lavish/i) ||
      t.match(/^High power prices/i) ||
      t.match(/^A testing moment/i) ||
      t.match(/^Embarrassing videos/i)
    ) continue;

    cleaned.push(line);
  }

  // Collapse multiple blank lines into one
  const out = [];
  let blanks = 0;
  for (const line of cleaned) {
    if (line.trim() === '') {
      if (++blanks <= 1) out.push('');
    } else {
      blanks = 0;
      out.push(line);
    }
  }
  return out.join('\n').trim();
}







// Upload HTML + extract text + AI generate all content
router.post('/generate', adminAuth, upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'HTML file required' });
  
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  if (fileExt !== '.html' && fileExt !== '.htm') {
    return res.status(400).json({ error: 'Please upload an HTML file (.html). Save the article page as HTML from your browser.' });
  }

  try {
    // Step 1: Extract clean article text from HTML using cheerio
    const html = fs.readFileSync(req.file.path, 'utf8');
    const articleText = extractArticleFromHtml(html);
    console.log('HTML extraction:', articleText.length, 'chars');

    if (articleText.length < 100) {
      return res.status(400).json({ error: 'Could not extract article text from HTML. Make sure you saved the page as "Webpage, HTML Only" from your browser.' });
    }

    // Title is the first line of articleText (extracted by extractArticleFromHtml)
    const exactTitle = articleText.split('\n')[0].trim();
    console.log('Article title:', exactTitle);

    // Step 2: Use extracted text to generate all content
    const prompt = `You are an editorial assistant creating educational content about this Economist article for Chinese high school students and general learners.

Here is the full article text:
---
${articleText}
---

Read the article carefully and return ONLY a JSON object. Strict formatting rules:
- NO markdown — no **, no *, no #, no dashes as bullets
- Only use 【】brackets for: media outlet names, and the single theory name at the start of theory_explanation. Nowhere else.
- Every string value must be on ONE line — use the escape sequence \n for line breaks, never actual newlines
- All content fields in Simplified Chinese except economist_title and country_tags

Fields:
- title: Engaging Chinese title
- economist_title: The exact English title of the article as it appears in the text above. Copy it precisely.
- summary: One sentence in Chinese summarizing the core message
- theory_explanation: Write as flowing prose paragraphs separated by \n\n. Structure: first paragraph introduces the theory name in 【】and its origin (who proposed it, when). Second paragraph explains the theory itself clearly. Third paragraph applies it specifically to this article. No sub-headings, no bullet points, no extra 【】beyond the theory name.
- exam_questions: 5 numbered questions in Chinese, each on its own line. No 【】in questions.
- other_media: Write THREE in-depth paragraphs separated by \n\n. Each starts with a named outlet in 【】followed by a colon, then 4-6 sentences on their specific angle on THIS article's topic and how it differs from The Economist's take.
- audio_script: Natural 2-minute spoken script in Chinese, approx 300 characters, conversational tone
- country_tags: English country names array

CRITICAL JSON rules:
- Do NOT use double quotes " inside any string value — use 「」for Chinese quotation marks instead
- Do NOT use backslashes inside string values
- Return the JSON on a SINGLE LINE with no line breaks between the keys
- Every \n line break inside a value must be written as the two characters backslash-n

Return exactly this JSON shape on ONE LINE (no other text):
{"title":"<value>","economist_title":"<value>","summary":"<value>","theory_explanation":"<value>","exam_questions":"<value>","other_media":"<value>","audio_script":"<value>","country_tags":["<country1>"]}`;

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

// Upload audio
router.post('/upload-audio', adminAuth, upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Audio file required' });
  res.json({ audio_url: `/uploads/${req.file.filename}` });
});

// Create post
router.post('/posts', adminAuth, async (req, res) => {
  try {
    const { title, economist_title, summary, theory_explanation, exam_questions,
            other_media, audio_script, audio_url, pdf_url, pdf_text, country_tags, is_published } = req.body;
    const id = uuidv4();
    const published_at = is_published ? new Date().toISOString() : null;
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

// Update post
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

// Get all posts (admin)
router.get('/posts', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single post (admin)
router.get('/posts/:id', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete post
router.delete('/posts/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, role, subscribed_until, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Grant subscription
router.put('/users/:id/subscribe', adminAuth, async (req, res) => {
  try {
    const m = parseInt(req.body.months) || 12;
    const until = new Date();
    until.setMonth(until.getMonth() + m);
    await pool.query(
      'UPDATE users SET subscribed_until = $1 WHERE id = $2',
      [until.toISOString().split('T')[0], req.params.id]
    );
    res.json({ message: `Subscription set for ${m} months` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Revoke subscription
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

    // Extract date from filename (format: MMDD e.g. 0319 = March 19)
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

    // Try to extract title from filename "经济学人｜0319｜中国无法完全置身于能源冲击之外.pdf"
    let titleFromFilename = '';
    const filenameParts = filename.replace(/.pdf$/i, '').split(/[｜|]/);
    if (filenameParts.length >= 3) {
      titleFromFilename = filenameParts[filenameParts.length - 1].trim();
    }
    console.log('Title from filename:', titleFromFilename);

    const prompt = `This PDF is an Economist article analysis. Extract the sections and return a JSON object.

The PDF has these sections:
- Title line like "经济学人｜MMDD｜Chinese title" — the title is the THIRD part after splitting by ｜ (the full pipe character). So for "经济学人｜0319｜中国无法完全置身于能源冲击之外", the title is "中国无法完全置身于能源冲击之外" only.
- Summary: has 一句话总结 (one sentence) and 语音稿 (audio script paragraph)
- More Insights: Chinese deep-dive analysis
- For Students with: 理论补充, 启发性问题与解答, 外媒与行业视角的补充
- Original Article: full English text

CRITICAL RULES:
- Return ONLY the raw JSON object — no markdown, no code fences, nothing before or after
- Do NOT use double quote characters " anywhere inside string values — use 「」for Chinese quotes instead
- Every string value must be on ONE LINE — no actual line breaks inside strings, use \\n instead
- All string values must use single Chinese 「」quotes, not ASCII double quotes "

Return exactly this shape (fill in values):
{"title":"value","economist_title":"value","summary":"value","audio_script":"value","theory_explanation":"value","exam_questions":"value","other_media":"value","pdf_text":"value","country_tags":["China"]}`;

    const raw = await callClaude(prompt, pdfBase64);
    console.log('parse-pdf-post raw (first 400):', raw.slice(0, 400));

    // Step 1: strip markdown fences
    let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Step 2: find start of JSON object
    const start = text.indexOf('{');
    if (start > 0) text = text.slice(start);

    // Step 3: walk char by char — fix newlines inside strings AND track string boundaries
    let fixed = '';
    let inStr = false;
    let esc = false;
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

    // Step 4: try parsing — if it fails, attempt a more aggressive field-by-field extraction
    let extracted;
    try {
      extracted = JSON.parse(fixed);
    } catch (parseErr) {
      console.log('Direct parse failed, trying field extraction. Error:', parseErr.message);
      // Extract each field individually using regex that handles Chinese content
      const fields = ['title','economist_title','summary','audio_script','theory_explanation','exam_questions','other_media','pdf_text'];
      extracted = { country_tags: [] };
      for (const field of fields) {
        const match = fixed.match(new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
        if (match) extracted[field] = match[1].replace(/\\n/g, '\n');
      }
      // Extract country_tags array
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