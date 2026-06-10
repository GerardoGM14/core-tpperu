import { api, setAccessToken } from './client';

export async function login(email, password) {
  const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function register(email, password, fullName) {
  const data = await api('/api/auth/register', { method: 'POST', body: { email, password, fullName } });
  setAccessToken(data.accessToken);
  return data.user;
}

// Restaura la sesión usando la cookie httpOnly del refresh token.
// Devuelve el usuario o null si no hay sesión válida.
export async function restoreSession() {
  try {
    const data = await api('/api/auth/refresh', { method: 'POST' });
    setAccessToken(data.accessToken);
    return data.user;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}
