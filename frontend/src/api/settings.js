import { api } from './client';

export const settingsApi = {
  get: (key) => api(`/api/settings/${key}`),
  set: (key, value) => api(`/api/settings/${key}`, { method: 'PUT', body: { value } }),
};
