import api from './axios.js';

export const applyLeave = (data) => api.post('/leave', data).then(r => r.data);
export const getMyLeaves = (params) => api.get('/leave/me', { params }).then(r => r.data);
export const getLeaveBalance = () => api.get('/leave/balance').then(r => r.data);
export const getLeaveTypes = () => api.get('/leave/types').then(r => r.data);
export const getLeaveById = (id) => api.get(`/leave/${id}`).then(r => r.data);
export const cancelLeave = (id) => api.put(`/leave/${id}/cancel`).then(r => r.data);
export const approveLeave = (id, data) => api.put(`/leave/${id}/approve`, data).then(r => r.data);
export const rejectLeave = (id, data) => api.put(`/leave/${id}/reject`, data).then(r => r.data);
export const getPendingApprovals = (params) => api.get('/leave/pending', { params }).then(r => r.data);
