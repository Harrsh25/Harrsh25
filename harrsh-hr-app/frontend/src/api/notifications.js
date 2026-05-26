import api from './axios.js';

export const getMyNotifications = (params) => api.get('/notifications', { params }).then(r => r.data);
export const markAsRead = (id) => api.put(`/notifications/${id}/read`).then(r => r.data);
export const markAllRead = () => api.put('/notifications/read-all').then(r => r.data);
export const getUnreadCount = () => api.get('/notifications/unread-count').then(r => r.data);
