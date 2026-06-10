import { api } from './client';

export const templatesApi = {
  list: () => api('/api/templates'),
  get: (id) => api(`/api/templates/${id}`),
  create: (data) => api('/api/templates', { method: 'POST', body: data }),
  update: (id, data) => api(`/api/templates/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => api(`/api/templates/${id}`, { method: 'DELETE' }),
};
