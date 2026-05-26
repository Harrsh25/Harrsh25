const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAllProjects, getProjectById, createProject, updateProject, deleteProject, getProjectTasks, createTask, updateTask, getMyTasks } = require('../controllers/projectController');

router.get('/tasks/me', authenticate, getMyTasks);
router.get('/', authenticate, getAllProjects);
router.post('/', authenticate, authorize('MANAGER', 'ADMIN', 'HR'), createProject);
router.get('/:id', authenticate, getProjectById);
router.put('/:id', authenticate, authorize('MANAGER', 'ADMIN', 'HR'), updateProject);
router.delete('/:id', authenticate, authorize('MANAGER', 'ADMIN'), deleteProject);
router.get('/:id/tasks', authenticate, getProjectTasks);
router.post('/:id/tasks', authenticate, authorize('MANAGER', 'ADMIN', 'HR'), createTask);
router.put('/:id/tasks/:taskId', authenticate, updateTask);

module.exports = router;
