import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';

export default function AdminDashboard() {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/admin/posts'), api.get('/admin/users')])
      .then(([p, u]) => { setPosts(p); setUsers(u); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const published = posts.filter(p => p.is_published).length;
  const drafts = posts.filter(p => !p.is_published).length;
  const activeUsers = users.filter(u => u.subscribed_until && new Date(u.subscribed_until) > new Date()).length;

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 6 }}>Welcome back </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Here's what's happening with Reading Club.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 36 }}>
        {[
          { label: 'Published posts', value: published, color: '#CC0000' },
          { label: 'Drafts', value: drafts, color: '#F57C00' },
          { label: 'Active subscribers', value: activeUsers, color: '#388E3C' },
          { label: 'Total users', value: users.length, color: '#1976D2' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '20px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 32, fontWeight: 600, color: s.color, fontFamily: 'var(--serif)' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36 }}>
        <Link to="/admin/new-post" style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#CC0000', borderRadius: 8, padding: '20px 24px', textDecoration: 'none', color: 'white' }}>
          <span style={{ fontSize: 28 }}>️</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Publish new post</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Save article as HTML, AI generates the content</div>
          </div>
        </Link>
        <Link to="/admin/users" style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', textDecoration: 'none', color: 'var(--text)' }}>
          <span style={{ fontSize: 28 }}></span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Manage users</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Activate or revoke subscriptions</div>
          </div>
        </Link>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>Recent posts</h2>
          <Link to="/admin/posts" style={{ fontSize: 13, color: '#CC0000' }}>View all →</Link>
        </div>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {posts.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No posts yet.</div>
          ) : posts.slice(0, 5).map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: p.is_published ? '#E8F5E9' : '#FFF8E1', color: p.is_published ? '#2E7D32' : '#F57C00', flexShrink: 0 }}>
                {p.is_published ? 'Published' : 'Draft'}
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
              <span style={{ fontSize: 12, color: 'var(--text-light)', flexShrink: 0 }}>
                {p.published_at ? new Date(p.published_at).toLocaleDateString('en-US') : '—'}
              </span>
              <Link to={`/admin/edit/${p.id}`} style={{ fontSize: 12, color: '#CC0000', flexShrink: 0 }}>Edit</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}