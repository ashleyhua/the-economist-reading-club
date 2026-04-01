import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => loc.pathname === path || loc.pathname.startsWith(path + '/');

  return (
    <nav style={{
      background: 'white',
      borderBottom: '3px solid #CC0000',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 60 }}>
        <Link to="/" style={{ display: 'flex', flexDirection: 'column', marginRight: 40 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: '#CC0000', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            The Economist Reading Club
          </span>
        </Link>

        {user && (
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            <NavLink to="/" active={loc.pathname === '/'}>Feed</NavLink>
            <NavLink to="/globe" active={isActive('/globe')}>Globe</NavLink>
            <NavLink to="/learn" active={isActive('/learn')}>Learn English</NavLink>
            {isAdmin && <NavLink to="/admin" active={isActive('/admin')}>Admin</NavLink>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          {user ? (
            <>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {user.name}
                {user.role === 'admin' && (
                  <span style={{ marginLeft: 6, fontSize: 10, background: '#CC0000', color: 'white', padding: '1px 6px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Admin
                  </span>
                )}
              </span>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm">Log out</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Log in</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link to={to} style={{
      padding: '6px 14px',
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      color: active ? '#CC0000' : '#444',
      borderRadius: 4,
      background: active ? '#FFF0F0' : 'transparent',
      transition: 'all 0.15s'
    }}>
      {children}
    </Link>
  );
}