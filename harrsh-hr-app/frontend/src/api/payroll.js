import api from './axios.js';

export const getMyPayslips = (params) => api.get('/payroll/me', { params }).then(r => r.data);
export const getPayslipById = (id) => api.get(`/payroll/${id}`).then(r => r.data);
export const getAllPayroll = (params) => api.get('/payroll', { params }).then(r => r.data);
export const processPayroll = (data) => api.post('/payroll/process', data).then(r => r.data);
export const processMonthlyPayroll = (data) => api.post('/payroll/process-all', data).then(r => r.data);
export const getPayrollSummary = (params) => api.get('/payroll/summary', { params }).then(r => r.data);

export const downloadPayslip = async (payrollId, month, year) => {
  const response = await api.get(`/payroll/${payrollId}/download`, { responseType: 'blob' });
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthLabel = monthNames[(month || 1) - 1];
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip-${monthLabel}-${year}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

export const emailPayslip = (id) => api.post(`/payroll/${id}/email`).then(r => r.data);
