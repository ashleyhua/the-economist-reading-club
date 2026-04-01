import { Link, useLocation, Outlet } from 'react-router-dom';

const links = [
  { to: '/admin', label: 'Overview', icon: '', exact: true },
  { to: '/admin/new-post', label: 'New Post', icon: '️' },
  { to: '/admin/posts', label: 'All Posts', icon: '' },
  { to: '/admin/users', label: 'Users', icon: '' },
];

export default function AdminLayout() {
  const loc = useLocation();
  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 63px)' }}>
      <aside style={{ width: 220, background: 'white', borderRight: '1px solid var(--border)', padding: '24px 0', flexShrink: 0, position: 'sticky', top: 63, height: 'calc(100vh - 63px)', overflow: 'auto' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Admin Panel</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Dashboard</div>
        </div>
        {links.map(({ to, label, icon, exact }) => {
          const isActive = exact ? loc.pathname === to : loc.pathname.startsWith(to) && to !== '/admin';
          return (
            <Link key={to} to={to} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', fontSize: 14, color: isActive ? '#CC0000' : 'var(--text-muted)', background: isActive ? '#FFF0F0' : 'transparent', fontWeight: isActive ? 600 : 400, borderLeft: isActive ? '3px solid #CC0000' : '3px solid transparent', textDecoration: 'none', transition: 'all 0.15s' }}>
              <span>{icon}</span>{label}
            </Link>
          );
        })}
      </aside>
      <main style={{ flex: 1, padding: '32px', overflow: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  );
}