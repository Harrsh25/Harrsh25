const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

const getAllProjects = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          manager: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.project.count({ where }),
    ]);
    return success(res, { projects, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch projects', 500);
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!project) return error(res, 'Project not found', 404);
    return success(res, project);
  } catch (err) {
    return error(res, 'Failed to fetch project', 500);
  }
};

const createProject = async (req, res) => {
  try {
    const { name, description, status, startDate, endDate, managerId, budget, priority } = req.body;
    const project = await prisma.project.create({
      data: {
        name, description, status: status || 'ACTIVE',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        managerId: managerId || req.user.id,
        budget: budget ? parseFloat(budget) : null,
        priority: priority || 'MEDIUM',
      },
      include: { manager: { select: { id: true, firstName: true, lastName: true } } },
    });
    return success(res, project, 'Project created successfully', 201);
  } catch (err) {
    return error(res, 'Failed to create project', 500);
  }
};

const updateProject = async (req, res) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Project not found', 404);

    const { name, description, status, startDate, endDate, managerId, budget, progress, priority } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(managerId !== undefined && { managerId }),
        ...(budget !== undefined && { budget: budget ? parseFloat(budget) : null }),
        ...(progress !== undefined && { progress: parseInt(progress) }),
        ...(priority && { priority }),
      },
      include: { manager: { select: { id: true, firstName: true, lastName: true } } },
    });
    return success(res, project, 'Project updated successfully');
  } catch (err) {
    return error(res, 'Failed to update project', 500);
  }
};

const deleteProject = async (req, res) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Project not found', 404);
    await prisma.project.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    return success(res, null, 'Project cancelled successfully');
  } catch (err) {
    return error(res, 'Failed to delete project', 500);
  }
};

const getProjectTasks = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, tasks);
  } catch (err) {
    return error(res, 'Failed to fetch tasks', 500);
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, assignedToId, status, priority, startDate, dueDate } = req.body;
    const task = await prisma.task.create({
      data: {
        projectId: req.params.id,
        title,
        description,
        assignedToId,
        assignedById: req.user.id,
        status: status || 'NOT_STARTED',
        priority: priority || 'MEDIUM',
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (assignedToId) {
      await prisma.notification.create({
        data: { userId: assignedToId, title: 'New Task Assigned', message: `You have been assigned a new task: ${title}`, type: 'INFO', actionUrl: `/projects/${req.params.id}` },
      });
    }

    return success(res, task, 'Task created successfully', 201);
  } catch (err) {
    return error(res, 'Failed to create task', 500);
  }
};

const updateTask = async (req, res) => {
  try {
    const { title, description, assignedToId, status, priority, startDate, dueDate, progress } = req.body;
    const existing = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!existing) return error(res, 'Task not found', 404);

    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(progress !== undefined && { progress: parseInt(progress) }),
      },
      include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    });
    return success(res, task, 'Task updated successfully');
  } catch (err) {
    return error(res, 'Failed to update task', 500);
  }
};

const getMyTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = { assignedToId: req.user.id };
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: { project: { select: { id: true, name: true, status: true } }, assignedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.task.count({ where }),
    ]);
    return success(res, { tasks, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch tasks', 500);
  }
};

module.exports = { getAllProjects, getProjectById, createProject, updateProject, deleteProject, getProjectTasks, createTask, updateTask, getMyTasks };
