import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, apiFetch } from '../utils/api';

export default function VocabList() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/vocab')
      .then(data => setWords(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (word) => {
    try {
      await apiFetch(`/vocab/${word}`, { method: 'DELETE' });
      setWords(prev => prev.filter(w => w.word !== word));
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <Link to="/learn" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            ← Back to articles
          </Link>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 28 }}>My Vocab List</h1>
        </div>
        {words.length > 0 && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{words.length} word{words.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : words.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>A</div>
          <p style={{ marginBottom: 16 }}>Your vocab list is empty.</p>
          <p style={{ fontSize: 14, marginBottom: 24 }}>While reading an article, click any highlighted word and press "+ Add to vocab".</p>
          <Link to="/learn" className="btn btn-primary">Browse articles</Link>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr 100px',
            padding: '10px 20px',
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            <span>Word</span>
            <span>Translation</span>
            <span></span>
          </div>

          {words.map((item, i) => (
            <div key={item.word} style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr 100px',
              padding: '14px 20px',
              borderBottom: i < words.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
              gap: 12,
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFAF7'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 500 }}>
                {item.word}
              </span>
              <span style={{ fontSize: 15, color: '#CC0000', fontWeight: 500 }}>
                {item.translation || '—'}
              </span>
              <button
                onClick={() => remove(item.word)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '5px 12px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#CC0000'; e.currentTarget.style.color = '#CC0000'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}