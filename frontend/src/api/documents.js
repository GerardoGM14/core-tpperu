import { api } from './client';

export const documentsApi = {
  list: () => api('/api/documents'),
  get: (id) => api(`/api/documents/${id}`),
  create: (data) => api('/api/documents', { method: 'POST', body: data }),
  update: (id, data) => api(`/api/documents/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => api(`/api/documents/${id}`, { method: 'DELETE' }),
  // Sube un archivo (base64) y devuelve { fileUrl, fileSize, mimeType }
  upload: ({ data, mime, filename }) =>
    api('/api/documents/upload', { method: 'POST', body: { data, mime, filename } }),
  // Etiquetas de clientes con conteo, para filtrar destinatarios: [{ tag, count }]
  customerTags: () => api('/api/documents/customer-tags'),
  // Envía o programa un documento a uno o varios clientes.
  // body: { customerIds: [], caption?, scheduledAt? (ISO) }
  send: (documentId, body) =>
    api(`/api/documents/${documentId}/send`, { method: 'POST', body }),
  // Envíos programados pendientes.
  scheduled: () => api('/api/documents/scheduled'),
  cancelScheduled: (id) => api(`/api/documents/scheduled/${id}`, { method: 'DELETE' }),
};
