import api from './axios.js';

export const getAllProjects = (params) => api.get('/projects', { params }).then(r => r.data);
export const getProjectById = (id) => api.get(`/projects/${id}`).then(r => r.data);
export const createProject = (data) => api.post('/projects', data).then(r => r.data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data).then(r => r.data);
export const getProjectTasks = (id) => api.get(`/projects/${id}/tasks`).then(r => r.data);
export const createTask = (projectId, data) => api.post(`/projects/${projectId}/tasks`, data).then(r => r.data);
export const updateTask = (projectId, taskId, data) => api.put(`/projects/${projectId}/tasks/${taskId}`, data).then(r => r.data);
export const getMyTasks = (params) => api.get('/projects/tasks/me', { params }).then(r => r.data);
