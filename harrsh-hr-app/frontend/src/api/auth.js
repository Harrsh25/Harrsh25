import api from './axios.js';

export const login = (data) => api.post('/auth/login', data).then(r => r.data);
export const register = (data) => api.post('/auth/register', data).then(r => r.data);
export const refreshToken = (refreshToken) => api.post('/auth/refresh', { refreshToken }).then(r => r.data);
export const logout = (refreshToken) => api.post('/auth/logout', { refreshToken }).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);
export const changePassword = (data) => api.put('/auth/change-password', data).then(r => r.data);
