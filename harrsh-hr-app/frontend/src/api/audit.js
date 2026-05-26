import api from './axios.js';
export const getAuditLogs = (params) => api.get('/audit', { params });
