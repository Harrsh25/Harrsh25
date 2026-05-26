import api from './axios.js';

export const getAttendanceReport = (params) => api.get('/reports/attendance', { params });
export const downloadAttendancePDF = (params) => api.get('/reports/attendance', { params: { ...params, format: 'pdf' }, responseType: 'blob' });
export const downloadAttendanceExcel = (params) => api.get('/reports/attendance', { params: { ...params, format: 'excel' }, responseType: 'blob' });
export const getLeaveReport = (params) => api.get('/reports/leave', { params });
export const downloadLeaveExcel = (params) => api.get('/reports/leave', { params: { ...params, format: 'excel' }, responseType: 'blob' });
export const getPayrollReport = (params) => api.get('/reports/payroll', { params });
export const downloadPayrollExcel = (params) => api.get('/reports/payroll', { params: { ...params, format: 'excel' }, responseType: 'blob' });
