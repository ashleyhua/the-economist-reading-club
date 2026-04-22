import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import PostCard from '../components/PostCard';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();

  useEffect(() => { loadPosts(page); }, [page]);

  const loadPosts = async (p) => {
    setLoading(true);
    try {
      const data = await api.get(`/posts?page=${p}&limit=10`);
      setPosts(data.posts);
      setTotalPages(data.pages);
    } catch (err) {
      setError(err.code === 'SUBSCRIPTION_REQUIRED' ? 'subscription' : err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error === 'subscription') {
    return (
      <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, marginBottom: 12 }}>Subscription Required</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
          Reading Club is a paid subscription service. Contact the admin to activate your subscription.
        </p>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', textAlign: 'left' }}>
          {['Daily curated Economist articles', 'One-sentence summary + 2-minute audio briefing', 'Theory explanations + exam questions', 'What other media are saying', 'Full English article for reading practice'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 14, color: 'var(--text-muted)' }}>
              <span style={{ color: '#CC0000', flexShrink: 0 }}>✓</span> {item}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 6 }}>Daily Reading</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Curated Economist articles with analysis</p>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading…</span></div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p>No articles yet — check back soon.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline btn-sm">← Prev</button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-outline btn-sm">Next →</button>
        </div>
      )}
    </div>
  );
}