import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE = import.meta.env.VITE_API_BASE || '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('wenjing_token');
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function Field({ label, value, onChange, rows = 4, mono = false }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        style={{
          width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6,
          fontSize: mono ? 13 : 14, fontFamily: mono ? 'monospace' : 'inherit',
          lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box', color: 'var(--text)',
        }}
      />
    </div>
  );
}

export default function AdminPDFUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState(null);

  function setField(key, val) {
    setContent(c => ({ ...c, [key]: val }));
  }

  async function handleFile(f) {
    if (!f || f.type !== 'application/pdf') { setError('Please select a PDF file'); return; }
    setFile(f);
    setError('');
    setParsing(true);
    setContent(null);
    try {
      const form = new FormData();
      form.append('pdf', f);
      const data = await apiFetch('/admin/parse-pdf-post', { method: 'POST', body: form });
      setContent(data);
    } catch (err) {
      setError('Failed to parse PDF: ' + err.message);
    }
    setParsing(false);
  }

  async function handleSave(isPublished) {
    setSaving(true);
    setError('');
    try {
      // Ensure published_at is set when publishing
      const payload = { ...content, is_published: isPublished };
      if (isPublished && !payload.published_at) {
        payload.published_at = new Date().toISOString();
      } else if (payload.published_at && !payload.published_at.includes('T')) {
        // Convert "2026-03-19" date string to full ISO timestamp
        payload.published_at = new Date(payload.published_at + 'T12:00:00').toISOString();
      }
      await apiFetch('/admin/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      navigate('/admin/posts');
    } catch (err) {
      setError('Save failed: ' + err.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 6 }}>Upload PDF</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Upload a PDF in the standard analysis format. The sections will be extracted automatically for review before publishing.
        </p>
      </div>

      {/* Upload zone */}
      {!content && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          onDragOver={e => e.preventDefault()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 10, padding: '48px 32px',
            textAlign: 'center', cursor: 'pointer', marginBottom: 24, background: 'white',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#CC0000'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          {parsing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Parsing PDF and extracting sections…</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>PDF</div>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>{file ? file.name : 'Click to upload PDF, or drag and drop'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Format: 经济学人｜MMDD｜Article title</div>
            </>
          )}
        </div>
      )}

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Extracted content editor */}
      {content && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, background: '#F0FFF4', border: '1px solid #C6F6D5', borderRadius: 8, padding: '12px 16px' }}>
            <span style={{ fontSize: 14, color: '#276749' }}>PDF parsed successfully. Review and edit before publishing.</span>
            <button onClick={() => { setContent(null); setFile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#276749', textDecoration: 'underline' }}>
              Upload different PDF
            </button>
          </div>

          {/* Title & meta */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Article Info</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Chinese Title</label>
              <input value={content.title || ''} onChange={e => setField('title', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 15, boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Original English Title</label>
              <input value={content.economist_title || ''} onChange={e => setField('economist_title', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Published Date</label>
                <input type="date" value={content.published_at || ''} onChange={e => setField('published_at', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Country Tags (comma separated)</label>
                <input
                  value={Array.isArray(content.country_tags) ? content.country_tags.join(', ') : ''}
                  onChange={e => setField('country_tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  placeholder="China, Iran, United States"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* Content sections */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Content Sections</h3>
            <Field label="Summary (一句话总结)" value={content.summary} onChange={v => setField('summary', v)} rows={2} />
            <Field label="Audio Script (语音稿)" value={content.audio_script} onChange={v => setField('audio_script', v)} rows={6} />
            <Field label="More Insights (深度分析)" value={content.theory_explanation} onChange={v => setField('theory_explanation', v)} rows={8} />
            <Field label="Exam Questions (启发性问题)" value={content.exam_questions} onChange={v => setField('exam_questions', v)} rows={8} />
            <Field label="Other Media Perspectives (外媒视角)" value={content.other_media} onChange={v => setField('other_media', v)} rows={8} />
          </div>

          {/* Original article */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Original Article (English)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>This will appear in the Learn English section.</p>
            <Field label="" value={content.pdf_text} onChange={v => setField('pdf_text', v)} rows={12} mono />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => handleSave(false)} disabled={saving} className="btn btn-outline">
              Save as Draft
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="btn btn-primary">
              {saving ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}