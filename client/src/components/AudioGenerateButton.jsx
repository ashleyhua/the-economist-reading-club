// client/src/components/AudioGenerateButton.jsx
// Reusable button to generate audio from a script using ElevenLabs

const BASE = import.meta.env.VITE_API_BASE || '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('wenjing_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

import { useState } from 'react';

export default function AudioGenerateButton({ script, onAudioGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function generate() {
    if (!script?.trim()) { setError('No audio script to generate from.'); return; }
    setGenerating(true);
    setError('');
    setSuccess(false);
    try {
      const data = await apiFetch('/admin/generate-audio-elevenlabs', {
        method: 'POST',
        body: JSON.stringify({ script }),
      });
      onAudioGenerated(data.audio_url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    }
    setGenerating(false);
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={generate}
        disabled={generating || !script?.trim()}
        style={{
          padding: '8px 16px',
          background: generating ? '#999' : success ? '#48BB78' : '#CC0000',
          color: 'white', border: 'none', borderRadius: 6,
          cursor: generating || !script?.trim() ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 500, transition: 'background 0.2s',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        {generating && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />}
        {generating ? 'Generating audio…' : success ? 'Audio generated!' : 'Generate Audio from Script (ElevenLabs)'}
      </button>
      {error && <div style={{ marginTop: 6, fontSize: 12, color: '#E53E3E' }}>{error}</div>}
      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
        Uses ElevenLabs Wenjing voice · eleven_multilingual_v2 · ~10 seconds
      </div>
    </div>
  );
}