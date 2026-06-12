import { api } from './client';

export const flowsApi = {
  list: () => api('/api/flows'),
  get: (id) => api(`/api/flows/${id}`),
  create: (data) => api('/api/flows', { method: 'POST', body: data }),
  update: (id, data) => api(`/api/flows/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => api(`/api/flows/${id}`, { method: 'DELETE' }),
  // Guarda el canvas completo (nodos + conexiones) del flujo.
  saveCanvas: (id, { nodes, edges }) => api(`/api/flows/${id}/canvas`, { method: 'PUT', body: { nodes, edges } }),
};
