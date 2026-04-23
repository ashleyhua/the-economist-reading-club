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
  const [status, setStatus] = useState('idle'); // idle | starting | processing | done | error
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [elapsed, setElapsed] = useState(0);

  async function generate() {
    if (!script?.trim()) { setError('No audio script to generate from.'); return; }
    setStatus('starting');
    setError('');
    setAudioUrl('');
    setElapsed(0);

    try {
      // Step 1: start the prediction — returns immediately with a prediction_id
      const { prediction_id } = await apiFetch('/admin/generate-audio', {
        method: 'POST',
        body: JSON.stringify({ script }),
      });

      if (!prediction_id) throw new Error('No prediction ID returned');
      setStatus('processing');

      // Step 2: poll every 4 seconds until done (up to 10 minutes)
      const startTime = Date.now();
      for (let i = 0; i < 150; i++) {
        await new Promise(r => setTimeout(r, 4000));
        setElapsed(Math.round((Date.now() - startTime) / 1000));

        const result = await apiFetch(`/admin/generate-audio-status/${prediction_id}`);

        if (result.status === 'succeeded' && result.audio_url) {
          setAudioUrl(result.audio_url);
          onAudioGenerated(result.audio_url);
          setStatus('done');
          return;
        }

        if (result.status === 'failed') {
          throw new Error(result.error || 'Audio generation failed on Replicate');
        }
        // still 'starting' or 'processing' — keep polling
      }
      throw new Error('Timed out after 10 minutes');
    } catch (err) {
      console.error('Audio generation error:', err);
      setError(err.message);
      setStatus('error');
    }
  }

  const isGenerating = status === 'starting' || status === 'processing';

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={generate}
        disabled={isGenerating || !script?.trim()}
        style={{
          padding: '8px 16px',
          background: isGenerating ? '#999' : status === 'done' ? '#48BB78' : '#CC0000',
          color: 'white', border: 'none', borderRadius: 6,
          cursor: isGenerating || !script?.trim() ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        {isGenerating && (
          <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
        )}
        {status === 'starting' && 'Starting…'}
        {status === 'processing' && `Generating… ${elapsed}s`}
        {status === 'done' && 'Audio ready ✓'}
        {(status === 'idle' || status === 'error') && 'Generate Audio from Script'}
      </button>

      {error && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#E53E3E', padding: '6px 10px', background: '#FFF5F5', borderRadius: 4, border: '1px solid #FED7D7' }}>
          {error}
        </div>
      )}

      {audioUrl && (
        <div style={{ marginTop: 10 }}>
          <audio controls src={audioUrl} style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
}