import { api } from './client';

export const customersApi = {
  list: () => api('/api/customers'),
  get: (id) => api(`/api/customers/${id}`),
  create: (data) => api('/api/customers', { method: 'POST', body: data }),
  update: (id, data) => api(`/api/customers/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => api(`/api/customers/${id}`, { method: 'DELETE' }),
};
