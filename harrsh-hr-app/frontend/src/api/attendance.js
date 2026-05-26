import api from './axios.js';

export const checkIn = (data) => api.post('/attendance/check-in', data || {}).then(r => r.data);
export const checkOut = (data) => api.put('/attendance/check-out', data || {}).then(r => r.data);
export const getMyAttendance = (params) => api.get('/attendance/me', { params }).then(r => r.data);
export const getAttendanceSummary = (params) => api.get('/attendance/summary', { params }).then(r => r.data);
export const getAllAttendance = (params) => api.get('/attendance', { params }).then(r => r.data);
export const requestRegularization = (id, data) => api.post(`/attendance/${id}/regularize`, data).then(r => r.data);
export const getRegularizations = () => api.get('/attendance/regularizations').then(r => r.data);
export const approveRegularization = (id, data) => api.put(`/attendance/regularizations/${id}/approve`, data).then(r => r.data);
