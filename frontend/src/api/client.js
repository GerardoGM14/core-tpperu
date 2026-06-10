// Cliente HTTP central.
// - El access token vive solo en memoria (nunca en localStorage).
// - El refresh token viaja en cookie httpOnly (credentials: 'include').
// - Ante un 401, intenta refrescar una vez y reintenta la petición.

// En dev dejamos BASE_URL vacío para usar el proxy de Vite (mismo origen),
// lo que evita problemas de CORS y de upgrade de WebSocket.
// En prod usamos la URL absoluta de la API (VITE_API_URL).
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

let accessToken = null;
let onSessionExpired = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnSessionExpired(handler) {
  onSessionExpired = handler;
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function rawRequest(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

let refreshPromise = null;

async function tryRefresh() {
  // Evita refrescos paralelos: todas las peticiones 401 esperan al mismo refresh
  if (!refreshPromise) {
    refreshPromise = rawRequest('/api/auth/refresh', { method: 'POST' })
      .then((data) => {
        setAccessToken(data.accessToken);
        return data;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function api(path, options = {}) {
  try {
    return await rawRequest(path, options);
  } catch (err) {
    const isAuthPath = path.startsWith('/api/auth/');
    if (err instanceof ApiError && err.status === 401 && !isAuthPath) {
      try {
        await tryRefresh();
      } catch {
        setAccessToken(null);
        onSessionExpired?.();
        throw err;
      }
      return rawRequest(path, options);
    }
    throw err;
  }
}

export { BASE_URL };
