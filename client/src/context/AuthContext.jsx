import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
      localStorage.removeItem('dayflow_token');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (localStorage.getItem('dayflow_token')) {
      refreshMe();
    } else {
      setLoading(false);
    }
  }, []);

  async function login(loginId, password) {
    const { data } = await api.post('/auth/login', { loginId, password });
    localStorage.setItem('dayflow_token', data.token);
    await refreshMe();
    return data;
  }

  async function signup(payload) {
    const { data } = await api.post('/auth/signup', payload);
    localStorage.setItem('dayflow_token', data.token);
    await refreshMe();
    return data;
  }

  function logout() {
    localStorage.removeItem('dayflow_token');
    setUser(null);
  }

  const roleLower = user?.role?.toLowerCase() || '';
  const jobLower = user?.job_position?.toLowerCase() || '';
  const isAdmin = roleLower === 'admin' || roleLower === 'hr' || jobLower.includes('admin') || jobLower.includes('hr');

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshMe, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
