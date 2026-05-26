import api from './axios.js';

export const getMyPayslips = (params) => api.get('/payroll/me', { params }).then(r => r.data);
export const getPayslipById = (id) => api.get(`/payroll/${id}`).then(r => r.data);
export const getAllPayroll = (params) => api.get('/payroll', { params }).then(r => r.data);
export const processPayroll = (data) => api.post('/payroll/process', data).then(r => r.data);
export const getPayrollSummary = (params) => api.get('/payroll/summary', { params }).then(r => r.data);
