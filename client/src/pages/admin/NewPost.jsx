import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiFetch } from '../../utils/api';
import AudioGenerateButton from '../../components/AudioGenerateButton';

const STEPS = ['Choose article', 'Upload HTML · AI generate', 'Upload recording', 'Review & publish'];

function StepHeader({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: i <= current ? '#CC0000' : 'var(--border)', color: i <= current ? 'white' : 'var(--text-muted)' }}>
              {i < current ? '' : i + 1}
            </div>
            <span style={{ fontSize: 13, fontWeight: i === current ? 600 : 400, color: i === current ? '#CC0000' : i < current ? 'var(--text)' : 'var(--text-muted)' }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < current ? '#CC0000' : 'var(--border)', margin: '0 12px' }} />}
        </div>
      ))}
    </div>
  );
}

export default function NewPost() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const [pdfFile, setPdfFile] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [editedContent, setEditedContent] = useState(null);

  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSuggestions = async () => {
    setLoadingSuggestions(true); setError('');
    try { const data = await api.get('/admin/suggestions'); setSuggestions(data); }
    catch (err) { setError('Failed to get suggestions: ' + err.message); }
    finally { setLoadingSuggestions(false); }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) return;
    setGenerating(true); setError('');
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      const data = await apiFetch('/admin/generate', { method: 'POST', body: formData });
      setEditedContent(data);
      setStep(2);
    } catch (err) { setError('AI generation failed: ' + err.message); }
    finally { setGenerating(false); }
  };

  const uploadAudio = async () => {
    if (!audioFile) return;
    setUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      const data = await apiFetch('/admin/upload-audio', { method: 'POST', body: formData });
      setAudioUrl(data.audio_url);
    } catch (err) { setError('Audio upload failed: ' + err.message); }
    finally { setUploadingAudio(false); }
  };

  const publish = async (isDraft = false) => {
    setPublishing(true); setError('');
    try {
      await api.post('/admin/posts', { ...editedContent, audio_url: audioUrl || null, is_published: !isDraft });
      setSuccess(isDraft ? 'Saved as draft.' : 'Post published!');
      setTimeout(() => navigate('/admin/posts'), 1500);
    } catch (err) { setError('Publish failed: ' + err.message); }
    finally { setPublishing(false); }
  };

  const setField = (key, val) => setEditedContent(c => ({ ...c, [key]: val }));

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 28 }}>New Post</h1>
      <StepHeader current={step} />

      {error && <div className="error-msg" style={{ marginBottom: 20 }}>{error}</div>}
      {success && <div className="success-msg" style={{ marginBottom: 20 }}>{success}</div>}

      {/* Step 0: Suggestions */}
      {step === 0 && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 8 }}>Get article ideas</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Click below and the AI will suggest 8 topics The Economist is likely covering right now. Pick one, find the article on economist.com, save it as HTML (Cmd+S → Webpage, HTML Only), then move to the next step.
            </p>
            <button onClick={loadSuggestions} className="btn btn-primary" disabled={loadingSuggestions}>
              {loadingSuggestions ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Generating…</> : ' Get topic suggestions'}
            </button>
          </div>

          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {suggestions.map((s, i) => (
                <div key={i} onClick={() => setSelectedSuggestion(selectedSuggestion === i ? null : i)}
                  style={{ border: `1px solid ${selectedSuggestion === i ? '#CC0000' : 'var(--border)'}`, borderRadius: 8, padding: '16px 20px', background: selectedSuggestion === i ? '#FFF0F0' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: selectedSuggestion === i ? '#CC0000' : 'var(--border)', color: selectedSuggestion === i ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
                      {selectedSuggestion === i ? '' : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{s.title}</span>
                        <span style={{ fontSize: 11, background: '#F5F5F5', padding: '1px 8px', borderRadius: 100, color: 'var(--text-muted)' }}>{s.section}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{s.why}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {s.concepts?.map(c => <span key={c} style={{ fontSize: 11, background: '#E3F2FD', color: '#1565C0', padding: '2px 8px', borderRadius: 100 }}>{c}</span>)}
                        {s.countries?.map(c => <span key={c} style={{ fontSize: 11, background: '#F3E5F5', color: '#6A1B9A', padding: '2px 8px', borderRadius: 100 }}>{c}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary" onClick={() => setStep(1)}>
            {selectedSuggestion !== null ? 'I found the article, upload HTML →' : 'Skip, go straight to HTML upload →'}
          </button>
        </div>
      )}

      {/* Step 1: HTML upload */}
      {step === 1 && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 8 }}>Upload the article HTML</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              In Chrome, open the Economist article and press Cmd+S (Mac) or Ctrl+S (Windows). Save as "Webpage, HTML Only". Upload that .html file here. The text will be extracted automatically.
            </p>
            <div
              style={{ border: `2px dashed ${pdfFile ? '#CC0000' : 'var(--border)'}`, borderRadius: 8, padding: '32px', textAlign: 'center', background: pdfFile ? '#FFF9F9' : 'var(--bg)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => document.getElementById('pdf-input').click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name?.match(/\.html?$/i)) setPdfFile(f); }}
            >
              <input id="pdf-input" type="file" accept=".html,.htm" style={{ display: 'none' }} onChange={e => setPdfFile(e.target.files[0])} />
              {pdfFile ? (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8 }}></div>
                  <div style={{ fontWeight: 600, color: '#CC0000' }}>{pdfFile.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{(pdfFile.size / 1024).toFixed(0)} KB · Click to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 12 }}></div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>Click to upload HTML file, or drag and drop here</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>.html files only — save the article page from your browser</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary" onClick={handlePdfUpload} disabled={!pdfFile || generating}>
              {generating ? <><span className="spinner" style={{ width: 16, height: 16 }} /> AI is reading the article, please wait…</> : ' Generate all content with AI →'}
            </button>
          </div>

          {generating && (
            <div style={{ marginTop: 20, padding: '16px 20px', background: '#FFF9F9', border: '1px solid #FFCDD2', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              The AI is reading the article and generating: summary, theory explanation, exam questions, other-media perspectives, and audio script. This usually takes 20–40 seconds.
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review + audio */}
      {step === 2 && editedContent && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 16 }}>Review & edit AI-generated content</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Title *</label>
                <input value={editedContent.title || ''} onChange={e => setField('title', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Original Economist title</label>
                <input value={editedContent.economist_title || ''} onChange={e => setField('economist_title', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>One-sentence summary *</label>
                <textarea value={editedContent.summary || ''} onChange={e => setField('summary', e.target.value)} rows={2} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                   Audio script (~2 minutes)
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>— record yourself reading this, then upload below</span>
                </label>
                <textarea value={editedContent.audio_script || ''} onChange={e => setField('audio_script', e.target.value)} rows={8} style={{ fontFamily: 'var(--sans)', lineHeight: 1.8 }} />
                <AudioGenerateButton script={editedContent.audio_script} onAudioGenerated={(url) => setAudioUrl(url)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Theory & concepts (student section)</label>
                <textarea value={editedContent.theory_explanation || ''} onChange={e => setField('theory_explanation', e.target.value)} rows={8} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Exam questions</label>
                <textarea value={editedContent.exam_questions || ''} onChange={e => setField('exam_questions', e.target.value)} rows={6} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>What other media are saying</label>
                <textarea value={editedContent.other_media || ''} onChange={e => setField('other_media', e.target.value)} rows={6} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Country tags <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(edit if needed)</span>
                </label>
                <input
                  value={Array.isArray(editedContent.country_tags) ? editedContent.country_tags.join(', ') : ''}
                  onChange={e => setField('country_tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="United States, China, Germany"
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>Upload audio recording</h2>
              <span style={{ fontSize: 11, background: '#F5F5F5', color: 'var(--text-muted)', padding: '2px 10px', borderRadius: 100, fontWeight: 500 }}>Optional</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
              Record yourself reading the audio script above (~2 minutes), then upload it here. You can skip this and add audio later when editing the post.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files[0])} style={{ width: 'auto', flex: 1 }} />
              <button className="btn btn-outline" onClick={uploadAudio} disabled={!audioFile || uploadingAudio}>
                {uploadingAudio ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</> : 'Upload audio'}
              </button>
              {audioUrl && <span style={{ fontSize: 13, color: '#388E3C' }}> Audio uploaded</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>← Re-upload HTML</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              {audioUrl ? 'Continue to review →' : 'Skip audio & review →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Final review */}
      {step === 3 && editedContent && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 16 }}>Ready to publish</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Title', value: editedContent.title, ok: !!editedContent.title },
                { label: 'Summary', value: editedContent.summary, ok: !!editedContent.summary },
                { label: 'Audio script', value: editedContent.audio_script ? 'Generated' : '—', ok: !!editedContent.audio_script },
                { label: 'Audio file', value: audioUrl ? 'Uploaded' : 'Not uploaded (optional)', ok: true },
                { label: 'Theory explanation', value: editedContent.theory_explanation ? 'Generated' : '—', ok: !!editedContent.theory_explanation },
                { label: 'Article text', value: editedContent.pdf_text ? 'Extracted' : 'Not extracted', ok: !!editedContent.pdf_text },
                { label: 'Country tags', value: (editedContent.country_tags || []).join(', ') || '—', ok: true },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--bg)', borderRadius: 6 }}>
                  <span style={{ color: item.ok ? '#388E3C' : '#CC0000', flexShrink: 0 }}>{item.ok ? '' : ''}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, width: 140, flexShrink: 0 }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {typeof item.value === 'string' && item.value.length > 80 ? item.value.slice(0, 80) + '…' : item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}>← Back to edit</button>
            <button className="btn btn-outline" onClick={() => publish(true)} disabled={publishing}>Save as draft</button>
            <button className="btn btn-primary" onClick={() => publish(false)} disabled={publishing || !editedContent.title || !editedContent.summary}>
              {publishing ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Publishing…</> : ' Publish now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}