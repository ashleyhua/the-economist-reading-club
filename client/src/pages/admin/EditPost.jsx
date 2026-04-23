import { useState, useEffect } from 'react';
import AudioGenerateButton from '../../components/AudioGenerateButton';
import { useParams, useNavigate } from 'react-router-dom';
import { api, apiFetch, resolveUrl } from '../../utils/api';

export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get(`/admin/posts/${id}`).then(data => {
      setForm({ ...data, country_tags: Array.isArray(data.country_tags) ? data.country_tags : [] });
    }).catch(err => setError(err.message));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const uploadAudio = async () => {
    if (!audioFile) return;
    setUploadingAudio(true);
    try {
      const fd = new FormData();
      fd.append('audio', audioFile);
      const data = await apiFetch('/admin/upload-audio', { method: 'POST', body: fd });
      set('audio_url', data.audio_url);
    } catch (err) { setError('Audio upload failed: ' + err.message); }
    finally { setUploadingAudio(false); }
  };

  const save = async (publish) => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put(`/admin/posts/${id}`, { ...form, is_published: publish });
      setSuccess(publish ? 'Published!' : 'Saved as draft.');
      setTimeout(() => navigate('/admin/posts'), 1200);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (!form) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={() => navigate('/admin/posts')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26 }}>Edit Post</h1>
        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: form.is_published ? '#E8F5E9' : '#FFF8E1', color: form.is_published ? '#2E7D32' : '#F57C00', fontWeight: 600 }}>
          {form.is_published ? 'Published' : 'Draft'}
        </span>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Title</label>
            <input value={form.title || ''} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Original Economist title</label>
            <input value={form.economist_title || ''} onChange={e => set('economist_title', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>One-sentence summary</label>
            <textarea value={form.summary || ''} onChange={e => set('summary', e.target.value)} rows={2} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Audio script</label>
            <textarea value={form.audio_script || ''} onChange={e => set('audio_script', e.target.value)} rows={7} />
          </div>
          <div>
            <AudioGenerateButton
              script={form.audio_script}
              onAudioGenerated={(url) => set('audio_url', url)}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Audio file</label>
            {form.audio_url && <audio controls src={resolveUrl(form.audio_url)} style={{ width: '100%', marginBottom: 10 }} />}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files[0])} style={{ width: 'auto', flex: 1 }} />
              <button className="btn btn-outline btn-sm" onClick={uploadAudio} disabled={!audioFile || uploadingAudio}>
                {uploadingAudio ? 'Uploading…' : 'Upload new recording'}
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Theory & concepts</label>
            <textarea value={form.theory_explanation || ''} onChange={e => set('theory_explanation', e.target.value)} rows={8} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Exam questions</label>
            <textarea value={form.exam_questions || ''} onChange={e => set('exam_questions', e.target.value)} rows={6} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>What other media are saying</label>
            <textarea value={form.other_media || ''} onChange={e => set('other_media', e.target.value)} rows={6} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Country tags <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(edit if needed)</span></label>
            <input
              value={form.country_tags?.join(', ') || ''}
              onChange={e => set('country_tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-outline" onClick={() => save(false)} disabled={saving}>Save draft</button>
        <button className="btn btn-primary" onClick={() => save(true)} disabled={saving}>
          {saving ? 'Saving…' : form.is_published ? 'Update' : 'Publish'}
        </button>
      </div>
    </div>
  );
}