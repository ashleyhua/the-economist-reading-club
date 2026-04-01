import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

export default function Login() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await api.post('/auth/login', { email: form.email, password: form.password });
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/register', { email: form.email, password: form.password, name: form.name });
      setSuccess('Account created! Contact the admin to activate your subscription.');
      setTab('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 600, color: '#CC0000', marginBottom: 6 }}>
            Reading Club
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-light)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            The Economist · Curated
          </div>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  border: 'none',
                  background: 'none',
                  fontSize: 14,
                  fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? '#CC0000' : 'var(--text-muted)',
                  borderBottom: tab === t ? '2px solid #CC0000' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {t === 'login' ? 'Log in' : 'Register'}
              </button>
            ))}
          </div>

          {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
          {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Password</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Log in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Password</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="At least 8 characters" minLength={8} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Create account'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'center', lineHeight: 1.5 }}>
                After registering, contact the admin to activate your subscription.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
