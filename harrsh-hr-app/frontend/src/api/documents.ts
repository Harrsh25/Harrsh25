import api from './axios.js';
import axios from 'axios';

export const uploadDocument = (formData) =>
  api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const getMyDocuments = (params) => api.get('/documents', { params }).then(r => r.data);

export const getDocumentById = (id) => api.get(`/documents/${id}`).then(r => r.data);

export const downloadDocument = async (id, filename) => {
  const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document';
  a.click();
  URL.revokeObjectURL(url);
};

export const deleteDocument = (id) => api.delete(`/documents/${id}`).then(r => r.data);

export const requestDocument = (data) => api.post('/documents/request', data).then(r => r.data);

export const verifyDocument = (id, data) => api.put(`/documents/${id}/verify`, data).then(r => r.data);

export const getDocumentsRequiringAttention = () => api.get('/documents/attention').then(r => r.data);

export const getExpiringDocuments = () => api.get('/documents/expiring').then(r => r.data);
