import api from './axios';
export const getAuditLogs = (params?: any) => api.get('/audit', { params });
