import api from './axios.js';

export const getPendingApprovals = (params) => api.get('/approvals/pending', { params }).then(r => r.data);
export const getApprovalById = (id) => api.get(`/approvals/${id}`).then(r => r.data);
export const approveRequest = (id, data) => api.put(`/approvals/${id}/approve`, data).then(r => r.data);
export const rejectRequest = (id, data) => api.put(`/approvals/${id}/reject`, data).then(r => r.data);
