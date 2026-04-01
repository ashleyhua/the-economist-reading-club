import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('wenjing_token');
    const storedUser = localStorage.getItem('wenjing_user');
    if (stored && storedUser) {
      setToken(stored);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (tokenVal, userData) => {
    setToken(tokenVal);
    setUser(userData);
    localStorage.setItem('wenjing_token', tokenVal);
    localStorage.setItem('wenjing_user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('wenjing_token');
    localStorage.removeItem('wenjing_user');
  };

  const isAdmin = user?.role === 'admin';
  const isSubscribed = isAdmin || (user?.subscribed_until && new Date(user.subscribed_until) > new Date());

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isSubscribed }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
