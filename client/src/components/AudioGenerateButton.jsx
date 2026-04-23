import { useState } from 'react';

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

export default function AudioGenerateButton({ script, onAudioGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  async function generate() {
    if (!script?.trim()) { setError('No audio script to generate from.'); return; }
    setGenerating(true);
    setError('');
    setAudioUrl('');
    try {
      const data = await apiFetch('/admin/generate-audio', {
        method: 'POST',
        body: JSON.stringify({ script }),
      });
      console.log('Audio generated, url length:', data.audio_url?.length, 'starts with:', data.audio_url?.slice(0, 30));
      // audio_url is now a data: URL — pass it through directly, no resolving needed
      setAudioUrl(data.audio_url);
      onAudioGenerated(data.audio_url);
    } catch (err) {
      console.error('Audio generation error:', err);
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
          background: generating ? '#999' : '#CC0000',
          color: 'white', border: 'none', borderRadius: 6,
          cursor: generating || !script?.trim() ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        {generating && (
          <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
        )}
        {generating ? 'Generating audio…' : 'Generate Audio from Script'}
      </button>
      {error && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#E53E3E', padding: '6px 10px', background: '#FFF5F5', borderRadius: 4, border: '1px solid #FED7D7' }}>
          {error}
        </div>
      )}
      {audioUrl && (
        <div style={{ marginTop: 10 }}>
          <audio controls src={audioUrl} style={{ width: '100%' }}
            onError={(e) => console.error('Audio element error:', e)}
            onLoadedMetadata={() => console.log('Audio metadata loaded')}
          />
        </div>
      )}
    </div>
  );
}