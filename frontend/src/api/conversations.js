import { api } from './client';

export const conversationsApi = {
  list: () => api('/api/conversations'),
  get: (id) => api(`/api/conversations/${id}`),
  messages: (id, take = 100) => api(`/api/conversations/${id}/messages?take=${take}`),
  send: (id, body) => api(`/api/conversations/${id}/messages`, { method: 'POST', body: { body } }),
  sendMedia: (id, { data, mime, caption, filename }) =>
    api(`/api/conversations/${id}/media`, { method: 'POST', body: { data, mime, caption, filename } }),
  markRead: (id) => api(`/api/conversations/${id}/read`, { method: 'POST' }),
};

// Convierte un File del navegador a base64 (sin el prefijo data:).
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
