import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, apiFetch } from '../utils/api';

// Tokenize text preserving whitespace and punctuation
function tokenize(text) {
  // Split into tokens: words and non-words separately
  return text.split(/(\s+|[^a-zA-Z''-]+)/).filter(t => t !== '');
}

function isWord(token) {
  return /^[a-zA-Z''-]+$/.test(token) && token.length > 1;
}

function WordToken({ word, annotation, inVocab, onAddVocab, onRemoveVocab }) {
  const [showPopup, setShowPopup] = useState(false);
  const ref = useRef(null);
  const key = word.toLowerCase().replace(/['']/g, "'");
  const ann = annotation;

  useEffect(() => {
    if (!showPopup) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowPopup(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPopup]);

  if (!ann) return <span>{word}</span>;

  const color = ann.type === 'technical' ? '#1565C0' : ann.type === 'opinion' ? '#7B1FA2' : '#CC0000';
  const bg = ann.type === 'technical' ? '#E3F2FD' : ann.type === 'opinion' ? '#F3E5F5' : 'transparent';
  const isVocab = inVocab(key);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
      <span
        onClick={() => setShowPopup(v => !v)}
        style={{
          color,
          background: showPopup ? bg : 'transparent',
          borderBottom: `1px dotted ${color}`,
          cursor: 'pointer',
          borderRadius: 2,
          padding: '0 1px',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = bg}
        onMouseLeave={e => { if (!showPopup) e.currentTarget.style.background = 'transparent'; }}
      >
        {word}
      </span>

      {showPopup && (
        <span style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 6,
          background: '#1A1A1A',
          color: 'white',
          borderRadius: 8,
          padding: '10px 14px',
          minWidth: 180,
          maxWidth: 280,
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'block',
        }}>
          {/* Type badge */}
          {ann.type !== 'vocab' && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: ann.type === 'technical' ? '#1976D2' : '#7B1FA2',
              padding: '2px 6px',
              borderRadius: 3,
              marginBottom: 6,
              display: 'inline-block',
            }}>
              {ann.type === 'technical' ? 'Technical' : 'Opinion'}
            </span>
          )}

          {/* Word + translation */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: ann.type !== 'vocab' ? 6 : 0 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600 }}>{word}</span>
            <span style={{ fontSize: 14, color: '#aaa' }}>→</span>
            <span style={{ fontSize: 15, color: '#FFD700', fontWeight: 500 }}>{ann.translation}</span>
          </div>

          {/* Explanation for technical/opinion */}
          {ann.explanation && (
            <div style={{ fontSize: 12, color: '#bbb', marginTop: 6, lineHeight: 1.5 }}>
              {ann.explanation}
            </div>
          )}

          {/* Add/remove vocab button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              isVocab ? onRemoveVocab(key) : onAddVocab(key, ann.translation);
            }}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '5px 0',
              background: isVocab ? 'rgba(204,0,0,0.2)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${isVocab ? '#CC0000' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 4,
              color: isVocab ? '#ff6666' : 'white',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {isVocab ? '− Remove from vocab' : '+ Add to vocab'}
          </button>

          {/* Caret */}
          <span style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1A1A1A',
          }} />
        </span>
      )}
    </span>
  );
}

export default function LearnArticle() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [annotations, setAnnotations] = useState({});
  const [vocabWords, setVocabWords] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [annotating, setAnnotating] = useState(false);
  const [error, setError] = useState('');
  const [vocabMsg, setVocabMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/learn/article/${id}`),
      api.get(`/learn/annotations/${id}`),
      api.get('/vocab'),
    ]).then(([art, ann, vocab]) => {
      setArticle(art);
      setAnnotations(ann.annotations || {});
      setVocabWords(new Set(vocab.map(v => v.word)));
    }).catch(err => {
      // Try loading article even if annotations fail
      api.get(`/learn/article/${id}`).then(art => {
        setArticle(art);
        setAnnotating(true);
        // Trigger annotation generation
        api.get(`/learn/annotations/${id}`).then(ann => {
          setAnnotations(ann.annotations || {});
          setAnnotating(false);
        }).catch(() => setAnnotating(false));
      }).catch(e => setError(e.message));
      api.get('/vocab').then(vocab => setVocabWords(new Set(vocab.map(v => v.word)))).catch(() => {});
    }).finally(() => setLoading(false));
  }, [id]);

  const addVocab = useCallback(async (word, translation) => {
    try {
      await apiFetch('/vocab', {
        method: 'POST',
        body: JSON.stringify({ word, translation, post_id: id }),
      });
      setVocabWords(prev => new Set([...prev, word]));
      setVocabMsg(`"${word}" added to your vocab list`);
      setTimeout(() => setVocabMsg(''), 2500);
    } catch (err) { console.error(err); }
  }, [id]);

  const removeVocab = useCallback(async (word) => {
    try {
      await apiFetch(`/vocab/${word}`, { method: 'DELETE' });
      setVocabWords(prev => { const s = new Set(prev); s.delete(word); return s; });
      setVocabMsg(`"${word}" removed from vocab list`);
      setTimeout(() => setVocabMsg(''), 2500);
    } catch (err) { console.error(err); }
  }, []);

  const inVocab = useCallback((word) => vocabWords.has(word), [vocabWords]);

  if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><div className="spinner" /><span>Loading article…</span></div>;
  if (error) return <div style={{ maxWidth: 760, margin: '40px auto', padding: '0 24px' }}><div className="error-msg">{error}</div></div>;
  if (!article) return null;

  // Render article text with annotated words
  function renderAnnotatedText(text) {
    if (!text) return null;
    const paragraphs = text.split(/\n\n+/);
    return paragraphs.map((para, pi) => {
      const tokens = tokenize(para);
      return (
        <p key={pi} style={{ marginBottom: 20, lineHeight: 1.9, fontSize: 16, color: 'var(--text)' }}>
          {tokens.map((token, ti) => {
            if (!isWord(token)) return <span key={ti}>{token}</span>;
            const key = token.toLowerCase().replace(/['']/g, "'");
            const ann = annotations[key];
            if (!ann) return <span key={ti}>{token}</span>;
            return (
              <WordToken
                key={`${pi}-${ti}`}
                word={token}
                annotation={ann}
                inVocab={inVocab}
                onAddVocab={addVocab}
                onRemoveVocab={removeVocab}
              />
            );
          })}
        </p>
      );
    });
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* Back */}
      <Link to="/learn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
        ← Back to articles
      </Link>

      {/* Header */}
      <header style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="tag">The Economist</span>
          <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
            {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.3, marginBottom: 16 }}>
          {article.economist_title || article.title}
        </h1>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '12px 16px', background: '#F8F8F6', borderRadius: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Click any highlighted word:</span>
          <span style={{ color: '#CC0000', borderBottom: '1px dotted #CC0000' }}>General vocabulary</span>
          <span style={{ color: '#1565C0', borderBottom: '1px dotted #1565C0' }}>Technical term</span>
          <span style={{ color: '#7B1FA2', borderBottom: '1px dotted #7B1FA2' }}>Author's opinion</span>
        </div>
      </header>

      {/* Vocab toast */}
      {vocabMsg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1A1A1A', color: 'white', padding: '10px 18px', borderRadius: 8, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {vocabMsg}
        </div>
      )}

      {/* Annotating indicator */}
      {annotating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FFF9F9', border: '1px solid #FFCDD2', borderRadius: 8, marginBottom: 24, fontSize: 14, color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ width: 16, height: 16, flexShrink: 0 }} />
          Analyzing vocabulary… this takes about 10 seconds the first time
        </div>
      )}

      {/* Article text */}
      <div style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        {article.pdf_text ? renderAnnotatedText(article.pdf_text) : (
          <div className="error-msg">No article text available for this post.</div>
        )}
      </div>

      {/* Vocab CTA at bottom */}
      {vocabWords.size > 0 && (
        <div style={{ marginTop: 40, padding: '16px 20px', background: 'white', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            You have <strong>{vocabWords.size}</strong> word{vocabWords.size !== 1 ? 's' : ''} in your vocab list
          </span>
          <Link to="/learn/vocab" className="btn btn-primary btn-sm">View vocab list</Link>
        </div>
      )}
    </div>
  );
}