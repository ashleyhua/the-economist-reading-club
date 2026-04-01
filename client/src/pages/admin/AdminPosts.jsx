import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';

export default function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    try { const data = await api.get('/admin/posts'); setPosts(data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const deletePost = async (id) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    setDeleting(id);
    try { await api.delete(`/admin/posts/${id}`); setPosts(posts.filter(p => p.id !== id)); }
    catch (err) { setError(err.message); }
    finally { setDeleting(null); }
  };

  const togglePublish = async (post) => {
    try {
      await api.put(`/admin/posts/${post.id}`, { ...post, is_published: !post.is_published });
      setPosts(posts.map(p => p.id === post.id ? { ...p, is_published: !p.is_published } : p));
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26 }}>All Posts</h1>
        <Link to="/admin/new-post" className="btn btn-primary">+ New post</Link>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}></div>
          <p>No posts yet. Create your first one.</p>
          <Link to="/admin/new-post" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Create post</Link>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px', padding: '10px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Title</span><span>Status</span><span>Published</span><span>Actions</span>
          </div>
          {posts.map((post, i) => (
            <div key={post.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px', padding: '14px 20px', borderBottom: i < posts.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFAF7'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                {post.economist_title && <div style={{ fontSize: 11, color: 'var(--text-light)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.economist_title}</div>}
              </div>
              <div>
                <button onClick={() => togglePublish(post)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', fontWeight: 600, background: post.is_published ? '#E8F5E9' : '#FFF8E1', color: post.is_published ? '#2E7D32' : '#F57C00' }}>
                  {post.is_published ? 'Published' : 'Draft'}
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US') : '—'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/admin/edit/${post.id}`} style={{ fontSize: 12, color: '#1976D2' }}>Edit</Link>
                <button onClick={() => deletePost(post.id)} disabled={deleting === post.id} style={{ fontSize: 12, color: '#CC0000', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}