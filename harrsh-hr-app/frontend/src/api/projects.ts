import api from './axios';

export const getAllProjects = (params?: any) => api.get('/projects', { params }).then(r => r.data);
export const getProjectById = (id: any) => api.get(`/projects/${id}`).then(r => r.data);
export const createProject = (data: any) => api.post('/projects', data).then(r => r.data);
export const updateProject = (id: any, data: any) => api.put(`/projects/${id}`, data).then(r => r.data);
export const getProjectTasks = (id: any) => api.get(`/projects/${id}/tasks`).then(r => r.data);
export const createTask = (projectId: any, data: any) => api.post(`/projects/${projectId}/tasks`, data).then(r => r.data);
export const updateTask = (projectId: any, taskId: any, data: any) => api.put(`/projects/${projectId}/tasks/${taskId}`, data).then(r => r.data);
export const getMyTasks = (params?: any) => api.get('/projects/tasks/me', { params }).then(r => r.data);
