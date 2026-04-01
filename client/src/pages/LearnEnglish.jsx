import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

export default function LearnEnglish() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/learn/articles')
      .then(data => setArticles(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, marginBottom: 8 }}>Learn English</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
            Click any word while reading to see its Chinese translation. Save words to your personal vocabulary list.
          </p>
        </div>
        <Link to="/learn/vocab" className="btn btn-outline btn-sm" style={{ flexShrink: 0, marginTop: 6 }}>
          My Vocab List
        </Link>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading articles…</span></div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <p>No articles with extracted text yet. Publish articles with HTML upload to enable this feature.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {articles.map(article => (
            <Link
              key={article.id}
              to={`/learn/${article.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '20px 24px',
                transition: 'box-shadow 0.15s, transform 0.15s',
                cursor: 'pointer'
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                    {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </span>
                  {article.country_tags?.map(c => (
                    <span key={c} className="badge" style={{ fontSize: 11 }}>{c}</span>
                  ))}
                </div>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 6, lineHeight: 1.4 }}>
                  {article.economist_title || article.title}
                </h2>
                {article.summary && (
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    {article.summary}
                  </p>
                )}
                <div style={{ marginTop: 12, fontSize: 13, color: '#CC0000', fontWeight: 500 }}>
                  Read & learn →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}