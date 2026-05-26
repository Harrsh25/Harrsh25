import api from './axios.js';

export const getMyOrg = () => api.get('/org').then(r => r.data);
export const updateOrg = (data) => api.put('/org', data).then(r => r.data);
export const getOrgSettings = () => api.get('/org/settings').then(r => r.data);
export const updateOrgSettings = (data) => api.put('/org/settings', data).then(r => r.data);
export const getOrgStats = () => api.get('/org/stats').then(r => r.data);
export const onboardOrg = (data) => api.post('/org/onboard', data).then(r => r.data);
export const inviteEmployee = (data) => api.post('/org/invite', data).then(r => r.data);
export const getOrgHolidays = (params) => api.get('/org/holidays', { params }).then(r => r.data);
export const addHoliday = (data) => api.post('/org/holidays', data).then(r => r.data);
export const deleteHoliday = (id) => api.delete(`/org/holidays/${id}`).then(r => r.data);
