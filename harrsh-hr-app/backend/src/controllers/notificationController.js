const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

const getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const where = { userId: req.user.id };
    if (unreadOnly === 'true') where.isRead = false;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.notification.count({ where }),
    ]);
    return success(res, { notifications, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch notifications', 500);
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return error(res, 'Notification not found', 404);
    if (notification.userId !== req.user.id) return error(res, 'Forbidden', 403);
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    return success(res, null, 'Marked as read');
  } catch (err) {
    return error(res, 'Failed to mark notification', 500);
  }
};

const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    return error(res, 'Failed to mark notifications', 500);
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    return success(res, { count });
  } catch (err) {
    return error(res, 'Failed to get unread count', 500);
  }
};

module.exports = { getMyNotifications, markAsRead, markAllRead, getUnreadCount };
