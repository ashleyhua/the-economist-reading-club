import { Link } from 'react-router-dom';

export default function PostCard({ post }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const countries = Array.isArray(post.country_tags)
    ? post.country_tags
    : JSON.parse(post.country_tags || '[]');

  return (
    <Link to={`/post/${post.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <article style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '24px 28px', transition: 'box-shadow 0.15s, transform 0.15s', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-light)', letterSpacing: '0.03em' }}>{date}</span>
          {countries.map(c => (
            <span key={c} className="badge" style={{ fontSize: 11 }}>{c}</span>
          ))}
          {post.audio_url && (
            <span style={{ fontSize: 11, color: '#CC0000', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span></span> Audio
            </span>
          )}
        </div>

        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 10, lineHeight: 1.35 }}>
          {post.title}
        </h2>

        {post.economist_title && (
          <div style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic', marginBottom: 12 }}>
            "{post.economist_title}"
          </div>
        )}

        {post.summary && (
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.65 }}>
            {post.summary}
          </p>
        )}

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#CC0000', fontSize: 13, fontWeight: 500 }}>
          Read more <span>→</span>
        </div>
      </article>
    </Link>
  );
}