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
      <div style={{ maxWidth: 640, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}></div>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 12 }}>Subscription Required</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>
          Reading Club is a paid subscription service.<br />
          Get daily curated articles with analysis, audio briefings, and study guides.
        </p>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: 24, marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Your subscription includes:</div>
          {[
            'Daily curated Economist articles',
            'One-sentence summary + 2-minute audio briefing',
            'Theory explanations + exam questions for students',
            'What other media are saying',
            'Full English article for reading practice'
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: 'var(--text-muted)' }}>
              <span style={{ color: '#CC0000' }}></span> {item}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-light)' }}>
          Contact the admin to activate your subscription.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, marginBottom: 8 }}>Daily Reading</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
          Curated Economist articles with analysis, updated daily
        </p>
      </div>

      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}></div>
          <p>No articles yet — check back soon.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
              <span style={{ padding: '7px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}