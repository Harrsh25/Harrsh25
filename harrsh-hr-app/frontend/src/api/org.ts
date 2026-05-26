import api from './axios';

export const getMyOrg = () => api.get('/org').then(r => r.data);
export const updateOrg = (data: any) => api.put('/org', data).then(r => r.data);
export const getOrgSettings = () => api.get('/org/settings').then(r => r.data);
export const updateOrgSettings = (data: any) => api.put('/org/settings', data).then(r => r.data);
export const getOrgStats = () => api.get('/org/stats').then(r => r.data);
export const onboardOrg = (data: any) => api.post('/org/onboard', data).then(r => r.data);
export const inviteEmployee = (data: any) => api.post('/org/invite', data).then(r => r.data);
export const getOrgHolidays = (params?: any) => api.get('/org/holidays', { params }).then(r => r.data);
export const addHoliday = (data: any) => api.post('/org/holidays', data).then(r => r.data);
export const deleteHoliday = (id: any) => api.delete(`/org/holidays/${id}`).then(r => r.data);
