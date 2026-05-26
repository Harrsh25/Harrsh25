import api from './axios';

export const login = (data: any) => api.post('/auth/login', data).then(r => r.data);
export const register = (data: any) => api.post('/auth/register', data).then(r => r.data);
export const refreshToken = (token: any) => api.post('/auth/refresh', { refreshToken: token }).then(r => r.data);
export const logout = (token: any) => api.post('/auth/logout', { refreshToken: token }).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);
export const changePassword = (data: any) => api.put('/auth/change-password', data).then(r => r.data);
