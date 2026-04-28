# The Economist Reading Club

A full-stack subscription web app that curates The Economist for Chinese high school students. The teacher uploads articles and AI generates summaries, theory explanations, exam questions, and audio briefings in the teacher's cloned voice.

Live at [theeconomistreadingclub.com](https://theeconomistreadingclub.com)

---

## Features

**For students:**
- Article feed with AI-generated Chinese summaries, theory explanations, and exam questions
- Audio briefings generated in the teacher's cloned voice
- Interactive 3D globe - click any country to see related articles and an AI-generated country profile
- Learn English mode - read original Economist articles with vocabulary highlighted by type, click any word for a Chinese translation, save words to a personal vocab list
- Fully mobile responsive

**For the teacher (admin):**
- Upload article HTML - AI extracts clean text and generates all content automatically
- Upload pre-analysed PDFs - AI extracts existing sections and generates any missing ones
- Generate audio in cloned voice directly from the audio script
- Full post management - draft, edit, publish, delete
- User management and subscription control

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) |
| AI | Anthropic Claude Haiku |
| Audio | Replicate Qwen3-TTS (voice cloning) |
| HTML parsing | Cheerio |
| 3D Globe | globe.gl |
| Auth | JWT + bcryptjs |
| Frontend hosting | GitHub Pages |
| Backend hosting | Render |

---
