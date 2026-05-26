import api from './axios';

export const applyLeave = (data: any) => api.post('/leave', data).then(r => r.data);
export const getMyLeaves = (params?: any) => api.get('/leave/me', { params }).then(r => r.data);
export const getLeaveBalance = () => api.get('/leave/balance').then(r => r.data);
export const getLeaveTypes = () => api.get('/leave/types').then(r => r.data);
export const getLeaveById = (id: any) => api.get(`/leave/${id}`).then(r => r.data);
export const cancelLeave = (id: any) => api.put(`/leave/${id}/cancel`).then(r => r.data);
export const approveLeave = (id: any, data: any) => api.put(`/leave/${id}/approve`, data).then(r => r.data);
export const rejectLeave = (id: any, data: any) => api.put(`/leave/${id}/reject`, data).then(r => r.data);
export const getPendingApprovals = (params?: any) => api.get('/leave/pending', { params }).then(r => r.data);
