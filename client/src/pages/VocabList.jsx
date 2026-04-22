import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, apiFetch } from '../utils/api';

export default function VocabList() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/vocab').then(data => setWords(data)).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const remove = async (word) => {
    try {
      await apiFetch(`/vocab/${word}`, { method: 'DELETE' });
      setWords(prev => prev.filter(w => w.word !== word));
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Link to="/learn" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>← Back</Link>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 24 }}>My Vocab List</h1>
        </div>
        {words.length > 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{words.length} word{words.length !== 1 ? 's' : ''}</span>}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : words.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: 16 }}>Your vocab list is empty.</p>
          <p style={{ fontSize: 14, marginBottom: 20 }}>While reading, tap any underlined word and press "+ Add to vocab".</p>
          <Link to="/learn" className="btn btn-primary">Browse articles</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {words.map(item => (
            <div key={item.word} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 500, marginBottom: 2 }}>{item.word}</div>
                <div style={{ fontSize: 14, color: '#CC0000', fontWeight: 500 }}>{item.translation || '—'}</div>
              </div>
              <button
                onClick={() => remove(item.word)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '5px 12px', flexShrink: 0, transition: 'all 0.15s' }}
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