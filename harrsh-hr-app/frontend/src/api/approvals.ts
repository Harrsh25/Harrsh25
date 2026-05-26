import api from './axios';

export const getPendingApprovals = (params?: any) => api.get('/approvals/pending', { params }).then(r => r.data);
export const getApprovalById = (id: any) => api.get(`/approvals/${id}`).then(r => r.data);
export const approveRequest = (id: any, data: any) => api.put(`/approvals/${id}/approve`, data).then(r => r.data);
export const rejectRequest = (id: any, data: any) => api.put(`/approvals/${id}/reject`, data).then(r => r.data);
