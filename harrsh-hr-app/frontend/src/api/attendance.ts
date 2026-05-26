import api from './axios';

export const checkIn = (data?: any) => api.post('/attendance/check-in', data || {}).then(r => r.data);
export const checkOut = (data?: any) => api.put('/attendance/check-out', data || {}).then(r => r.data);
export const getMyAttendance = (params?: any) => api.get('/attendance/me', { params }).then(r => r.data);
export const getAttendanceSummary = (params?: any) => api.get('/attendance/summary', { params }).then(r => r.data);
export const getAllAttendance = (params?: any) => api.get('/attendance', { params }).then(r => r.data);
export const requestRegularization = (id: any, data: any) => api.post(`/attendance/${id}/regularize`, data).then(r => r.data);
export const getRegularizations = () => api.get('/attendance/regularizations').then(r => r.data);
export const approveRegularization = (id: any, data: any) => api.put(`/attendance/regularizations/${id}/approve`, data).then(r => r.data);
