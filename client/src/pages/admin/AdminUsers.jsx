import { useState, useEffect } from 'react';
import { api } from '../../utils/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null);
  const [months, setMonths] = useState({});

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try { const data = await api.get('/admin/users'); setUsers(data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const subscribe = async (userId) => {
    setWorking(userId);
    try {
      const m = parseInt(months[userId]) || 12;
      await api.put(`/admin/users/${userId}/subscribe`, { months: m });
      await loadUsers();
    } catch (err) { setError(err.message); }
    finally { setWorking(null); }
  };

  const revoke = async (userId) => {
    if (!confirm('Revoke this subscription?')) return;
    setWorking(userId);
    try { await api.put(`/admin/users/${userId}/revoke`); await loadUsers(); }
    catch (err) { setError(err.message); }
    finally { setWorking(null); }
  };

  const isActive = (until) => until && new Date(until) > new Date();

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const active = users.filter(u => isActive(u.subscribed_until) || u.role === 'admin');
  const pending = users.filter(u => !isActive(u.subscribed_until) && u.role !== 'admin');

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 8 }}>Users</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 14 }}>
        After someone registers, activate their subscription here before they can access content.
      </p>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Active subscribers', value: active.length, color: '#388E3C' },
          { label: 'Pending activation', value: pending.length, color: '#F57C00' },
          { label: 'Total registered', value: users.length, color: '#1976D2' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: s.color, fontFamily: 'var(--serif)' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, background: '#FFF8E1', color: '#F57C00', padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>{pending.length} pending</span>
            Awaiting activation
          </h2>
          <UserTable users={pending} working={working} months={months} setMonths={setMonths} onSubscribe={subscribe} onRevoke={revoke} isActive={isActive} highlight />
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>All users</h2>
        <UserTable users={users} working={working} months={months} setMonths={setMonths} onSubscribe={subscribe} onRevoke={revoke} isActive={isActive} />
      </div>
    </div>
  );
}

function UserTable({ users, working, months, setMonths, onSubscribe, onRevoke, isActive, highlight }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${highlight ? '#FFE0B2' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px 200px', padding: '10px 20px', background: highlight ? '#FFFDE7' : 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span>User</span><span>Status</span><span>Expires</span><span>Actions</span>
      </div>
      {users.map((user, i) => {
        const active = isActive(user.subscribed_until) || user.role === 'admin';
        return (
          <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px 200px', padding: '14px 20px', borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: user.role === 'admin' ? '#E3F2FD' : active ? '#E8F5E9' : '#FFF8E1', color: user.role === 'admin' ? '#1565C0' : active ? '#2E7D32' : '#F57C00', fontWeight: 600 }}>
                {user.role === 'admin' ? 'Admin' : active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {user.role === 'admin' ? '—' : user.subscribed_until ? new Date(user.subscribed_until).toLocaleDateString('en-US') : 'Not set'}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {user.role !== 'admin' && (
                <>
                  <select value={months[user.id] || '12'} onChange={e => setMonths(m => ({ ...m, [user.id]: e.target.value }))} style={{ width: 80, padding: '5px 8px', fontSize: 12 }}>
                    <option value="1">1 mo</option>
                    <option value="3">3 mo</option>
                    <option value="6">6 mo</option>
                    <option value="12">1 year</option>
                    <option value="24">2 years</option>
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={() => onSubscribe(user.id)} disabled={working === user.id} style={{ fontSize: 12, padding: '5px 10px' }}>
                    Activate
                  </button>
                  {active && (
                    <button onClick={() => onRevoke(user.id)} disabled={working === user.id} style={{ fontSize: 12, color: '#CC0000', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Revoke
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
