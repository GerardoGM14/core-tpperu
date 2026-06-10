import { api } from './client';

export const catalogApi = {
  list: () => api('/api/packages'),
  get: (id) => api(`/api/packages/${id}`),
  create: (data) => api('/api/packages', { method: 'POST', body: data }),
  update: (id, data) => api(`/api/packages/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => api(`/api/packages/${id}`, { method: 'DELETE' }),
};
