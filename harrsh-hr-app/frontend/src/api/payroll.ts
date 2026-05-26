import api from './axios';

export const getMyPayslips = (params?: any) => api.get('/payroll/me', { params }).then(r => r.data);
export const getPayslipById = (id: any) => api.get(`/payroll/${id}`).then(r => r.data);
export const getAllPayroll = (params?: any) => api.get('/payroll', { params }).then(r => r.data);
export const processPayroll = (data: any) => api.post('/payroll/process', data).then(r => r.data);
export const processMonthlyPayroll = (data: any) => api.post('/payroll/process-all', data).then(r => r.data);
export const getPayrollSummary = (params?: any) => api.get('/payroll/summary', { params }).then(r => r.data);

export const downloadPayslip = async (payrollId: any, month?: any, year?: any) => {
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

export const emailPayslip = (id: any) => api.post(`/payroll/${id}/email`).then(r => r.data);
