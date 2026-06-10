import { api } from './client';

export const ordersApi = {
  list: () => api('/api/orders'),
  get: (id) => api(`/api/orders/${id}`),
  update: (id, data) => api(`/api/orders/${id}`, { method: 'PATCH', body: data }),
};
