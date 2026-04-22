import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); setMenuOpen(false); };
  const isActive = (path) => loc.pathname === path || loc.pathname.startsWith(path + '/');
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav style={{ background: 'white', borderBottom: '3px solid #CC0000', position: 'sticky', top: 0, zIndex: 200, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', height: 60 }}>
          {/* Logo */}
          <Link to="/" onClick={closeMenu} style={{ display: 'flex', flexDirection: 'column', marginRight: 'auto' }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600, color: '#CC0000', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              The Economist Reading Club
            </span>
          </Link>

          {/* Desktop nav */}
          {user && (
            <div style={{ display: 'none', gap: 4 }} className="desktop-nav">
              <NavLink to="/" active={loc.pathname === '/'}>Feed</NavLink>
              <NavLink to="/globe" active={isActive('/globe')}>Globe</NavLink>
              <NavLink to="/learn" active={isActive('/learn')}>Learn English</NavLink>
              {isAdmin && <NavLink to="/admin" active={isActive('/admin')}>Admin</NavLink>}
            </div>
          )}

          {/* Desktop user info */}
          <div style={{ display: 'none', alignItems: 'center', gap: 12, marginLeft: 20 }} className="desktop-user">
            {user && (
              <>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {user.name}
                  {user.role === 'admin' && (
                    <span style={{ marginLeft: 6, fontSize: 10, background: '#CC0000', color: 'white', padding: '1px 6px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin</span>
                  )}
                </span>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm">Log out</button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          {user && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="mobile-hamburger"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', flexDirection: 'column', gap: 5 }}
              aria-label="Menu"
            >
              <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? 'transparent' : '#444', transition: 'all 0.2s' }} />
              <span style={{ display: 'block', width: 22, height: 2, background: '#444', transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, -5px)' : 'none' }} />
              <span style={{ display: 'block', width: 22, height: 2, background: '#444', transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, 5px)' : 'none', marginTop: menuOpen ? -9 : 0 }} />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {menuOpen && user && (
        <div style={{ position: 'fixed', top: 63, left: 0, right: 0, bottom: 0, zIndex: 199, background: 'rgba(0,0,0,0.3)' }} onClick={closeMenu}>
          <div style={{ background: 'white', padding: '16px 0', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            {[
              { to: '/', label: 'Feed', active: loc.pathname === '/' },
              { to: '/globe', label: 'Globe', active: isActive('/globe') },
              { to: '/learn', label: 'Learn English', active: isActive('/learn') },
              ...(isAdmin ? [{ to: '/admin', label: 'Admin', active: isActive('/admin') }] : []),
            ].map(({ to, label, active }) => (
              <Link key={to} to={to} onClick={closeMenu} style={{ display: 'block', padding: '14px 24px', fontSize: 16, fontWeight: active ? 600 : 400, color: active ? '#CC0000' : '#333', background: active ? '#FFF0F0' : 'transparent', textDecoration: 'none', borderLeft: active ? '3px solid #CC0000' : '3px solid transparent' }}>
                {label}
              </Link>
            ))}
            <div style={{ margin: '12px 24px 4px', paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {user.name}
                {user.role === 'admin' && <span style={{ marginLeft: 6, fontSize: 10, background: '#CC0000', color: 'white', padding: '1px 6px', borderRadius: 2, textTransform: 'uppercase' }}>Admin</span>}
              </span>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm">Log out</button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles injected once */}
      <style>{`
        @media (min-width: 640px) {
          .desktop-nav { display: flex !important; }
          .desktop-user { display: flex !important; }
          .mobile-hamburger { display: none !important; }
        }
      `}</style>
    </>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link to={to} style={{ padding: '6px 14px', fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#CC0000' : '#444', borderRadius: 4, background: active ? '#FFF0F0' : 'transparent', transition: 'all 0.15s' }}>
      {children}
    </Link>
  );
}