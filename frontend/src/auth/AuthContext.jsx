import React from 'react';
import { setOnSessionExpired } from '../api/client';
import * as authApi from '../api/auth';

const AuthContext = React.createContext(null);

// status: 'loading' (restaurando sesión) | 'authed' | 'anon'
export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [status, setStatus] = React.useState('loading');

  React.useEffect(() => {
    let alive = true;
    authApi.restoreSession().then((u) => {
      if (!alive) return;
      setUser(u);
      setStatus(u ? 'authed' : 'anon');
    });

    setOnSessionExpired(() => {
      setUser(null);
      setStatus('anon');
    });

    return () => { alive = false; };
  }, []);

  const login = React.useCallback(async (email, password) => {
    const u = await authApi.login(email, password);
    setUser(u);
    setStatus('authed');
    return u;
  }, []);

  const logout = React.useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus('anon');
  }, []);

  const value = React.useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
