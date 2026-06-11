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
  // Envía un documento a una conversación por WhatsApp
  sendToConversation: (conversationId, documentId, caption) =>
    api(`/api/conversations/${conversationId}/send-document`, { method: 'POST', body: { documentId, caption } }),
};
