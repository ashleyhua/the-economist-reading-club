import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import AudioPlayer from '../components/AudioPlayer';

function Section({ label, color = '#CC0000', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'white', border: 'none', cursor: 'pointer', borderLeft: `4px solid ${color}` }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#1A1A1A' }}>{label}</span>
        <span style={{ color: 'var(--text-light)', fontSize: 12 }}>{open ? 'Collapse ' : 'Expand '}</span>
      </button>
      {open && (
        <div style={{ padding: '16px 20px 20px', background: 'white', borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then(data => { setPost(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="loading-center" style={{ minHeight: '60vh' }}>
      <div className="spinner" /><span>Loading…</span>
    </div>
  );
  if (error) return <div style={{ maxWidth: 760, margin: '40px auto', padding: '0 24px' }}><div className="error-msg">{error}</div></div>;
  if (!post) return null;

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
        ← Back to feed
      </Link>

      <header style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span className="tag">The Economist</span>
          <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{date}</span>
          {post.country_tags?.map(c => (
            <span key={c} className="badge" style={{ fontSize: 11 }}>{c}</span>
          ))}
        </div>

        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1.3, marginBottom: 12 }}>
          {post.title}
        </h1>

        {post.economist_title && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 16 }}>
            Original title: "{post.economist_title}"
          </div>
        )}

        {post.summary && (
          <div style={{ borderLeft: '4px solid #CC0000', paddingLeft: 16, margin: '20px 0', fontSize: 17, lineHeight: 1.7, color: 'var(--text)', fontWeight: 400 }}>
            {post.summary}
          </div>
        )}
      </header>

      {post.audio_url && (
        <div style={{ marginBottom: 24 }}>
          <AudioPlayer src={post.audio_url} title="2-minute audio briefing" />
        </div>
      )}

      {post.theory_explanation && (
        <Section label=" Theory & Concepts (Student Section)" color="#1976D2">
          <div className="prose" style={{ fontSize: 15, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
            {post.theory_explanation}
          </div>
        </Section>
      )}

      {post.exam_questions && (
        <Section label="️ Discussion & Exam Questions" color="#388E3C" defaultOpen={false}>
          <div className="prose" style={{ fontSize: 15, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
            {post.exam_questions}
          </div>
        </Section>
      )}

      {post.other_media && (
        <Section label=" What Other Media Are Saying" color="#7B1FA2" defaultOpen={false}>
          <div className="prose" style={{ fontSize: 15, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
            {post.other_media}
          </div>
        </Section>
      )}

      {post.pdf_text && (
        <Section label=" Original Article (The Economist)" color="#F57C00" defaultOpen={false}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Read the original English article below. We recommend reading the analysis above first.
          </p>
          <div style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 15,
            lineHeight: 1.9,
            color: 'var(--text)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: '#FAFAF8',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '28px 32px',
            maxHeight: 700,
            overflowY: 'auto',
          }}>
            {post.pdf_text}
          </div>
        </Section>
      )}
    </div>
  );
}