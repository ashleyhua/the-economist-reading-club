import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

export default function LearnEnglish() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/learn/articles').then(setArticles).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 6 }}>Learn English</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
            Tap any underlined word to see its Chinese translation.
          </p>
        </div>
        <Link to="/learn/vocab" className="btn btn-outline btn-sm" style={{ flexShrink: 0, marginTop: 4 }}>
          My Vocab
        </Link>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading…</span></div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          No articles with extracted text yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {articles.map(article => (
            <Link key={article.id} to={`/learn/${article.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '16px', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                    {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </span>
                  {article.country_tags?.map(c => <span key={c} className="badge" style={{ fontSize: 11 }}>{c}</span>)}
                </div>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6, lineHeight: 1.4 }}>
                  {article.economist_title || article.title}
                </h2>
                {article.summary && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {article.summary}
                  </p>
                )}
                <div style={{ marginTop: 10, fontSize: 13, color: '#CC0000', fontWeight: 500 }}>Read & learn →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}