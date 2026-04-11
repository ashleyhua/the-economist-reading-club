import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const linkStyle = ({ isActive }) => ({
    display: 'block', padding: '8px 14px', borderRadius: 6, textDecoration: 'none',
    fontSize: 14, fontWeight: 500,
    color: isActive ? '#CC0000' : 'var(--text-muted)',
    background: isActive ? '#FFF0F0' : 'transparent',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 63px)' }}>
      {/* Sidebar */}
      <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: '24px 12px', flexShrink: 0, background: 'white' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: 8, padding: '0 14px' }}>Content</div>
        <NavLink to="/admin" end style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/admin/new-post" style={linkStyle}>New Post</NavLink>
        <NavLink to="/admin/posts" style={linkStyle}>All Posts</NavLink>

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: 8, marginTop: 20, padding: '0 14px' }}>Globe</div>
        <NavLink to="/admin/country-profiles" style={linkStyle}>Country Profiles</NavLink>

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: 8, marginTop: 20, padding: '0 14px' }}>Users</div>
        <NavLink to="/admin/users" style={linkStyle}>All Users</NavLink>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          style={{ marginTop: 24, width: '100%', padding: '8px 14px', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', textAlign: 'left', fontWeight: 500 }}
        >
          Log out
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </div>
    </div>
  );
}