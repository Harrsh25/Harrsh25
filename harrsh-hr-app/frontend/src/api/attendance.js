import api from './axios.js';

export const checkIn = () => api.post('/attendance/check-in').then(r => r.data);
export const checkOut = () => api.put('/attendance/check-out').then(r => r.data);
export const getMyAttendance = (params) => api.get('/attendance/me', { params }).then(r => r.data);
export const getAttendanceSummary = (params) => api.get('/attendance/summary', { params }).then(r => r.data);
export const getAllAttendance = (params) => api.get('/attendance', { params }).then(r => r.data);
