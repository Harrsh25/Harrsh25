import api from './axios';

export const getAttendanceReport = (params?: any) => api.get('/reports/attendance', { params });
export const downloadAttendancePDF = (params?: any) => api.get('/reports/attendance', { params: { ...params, format: 'pdf' }, responseType: 'blob' });
export const downloadAttendanceExcel = (params?: any) => api.get('/reports/attendance', { params: { ...params, format: 'excel' }, responseType: 'blob' });
export const getLeaveReport = (params?: any) => api.get('/reports/leave', { params });
export const downloadLeaveExcel = (params?: any) => api.get('/reports/leave', { params: { ...params, format: 'excel' }, responseType: 'blob' });
export const getPayrollReport = (params?: any) => api.get('/reports/payroll', { params });
export const downloadPayrollExcel = (params?: any) => api.get('/reports/payroll', { params: { ...params, format: 'excel' }, responseType: 'blob' });
