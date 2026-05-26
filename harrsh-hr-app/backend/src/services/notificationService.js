const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// SSE client management
const clients = new Map(); // userId -> res

const addClient = (userId, res) => {
  clients.set(userId, res);
};

const removeClient = (userId) => {
  clients.delete(userId);
};

const sendToClient = (userId, data) => {
  const res = clients.get(userId);
  if (res) {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      removeClient(userId);
    }
  }
};

const createNotification = async (userId, { title, message, type = 'INFO', actionUrl }) => {
  const notification = await prisma.notification.create({
    data: { userId, title, message, type, actionUrl },
  });
  return notification;
};

const sendNotificationToUser = async (userId, { title, message, type = 'INFO', actionUrl }) => {
  const notification = await createNotification(userId, { title, message, type, actionUrl });
  sendToClient(userId, {
    type: 'notification',
    notification,
    message,
  });
  return notification;
};

const broadcastToOrg = async (organizationId, { title, message, type = 'INFO', actionUrl }, roles = null) => {
  const where = { organizationId };
  if (roles && roles.length > 0) where.role = { in: roles };
  const users = await prisma.user.findMany({ where, select: { id: true } });
  await Promise.all(users.map(u => sendNotificationToUser(u.id, { title, message, type, actionUrl })));
};

const notifyLeaveApplied = async (leaveRequest) => {
  const user = await prisma.user.findUnique({ where: { id: leaveRequest.userId } });
  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveRequest.leaveTypeId } });
  if (user?.managerId) {
    await sendNotificationToUser(user.managerId, {
      title: 'New Leave Request',
      message: `${user.firstName} ${user.lastName} applied for ${leaveRequest.totalDays} day(s) of ${leaveType?.name || 'leave'}`,
      type: 'INFO',
      actionUrl: '/approvals',
    });
  }
};

const notifyLeaveActioned = async (leaveRequest, action) => {
  const actionText = action === 'APPROVED' ? 'approved' : 'rejected';
  await sendNotificationToUser(leaveRequest.userId, {
    title: `Leave ${action === 'APPROVED' ? 'Approved' : 'Rejected'}`,
    message: `Your leave request has been ${actionText}`,
    type: action === 'APPROVED' ? 'SUCCESS' : 'ERROR',
    actionUrl: '/leave',
  });
};

const notifyPayslipReady = async (userId, month, year) => {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  await sendNotificationToUser(userId, {
    title: 'Payslip Ready',
    message: `Your payslip for ${monthNames[month - 1]} ${year} is ready`,
    type: 'INFO',
    actionUrl: '/payroll',
  });
};

const notifyTaskAssigned = async (task, assigneeId) => {
  await sendNotificationToUser(assigneeId, {
    title: 'New Task Assigned',
    message: `You have been assigned: ${task.title}`,
    type: 'INFO',
    actionUrl: `/projects/${task.projectId}`,
  });
};

module.exports = {
  clients,
  addClient,
  removeClient,
  sendToClient,
  createNotification,
  sendNotificationToUser,
  broadcastToOrg,
  notifyLeaveApplied,
  notifyLeaveActioned,
  notifyPayslipReady,
  notifyTaskAssigned,
};
