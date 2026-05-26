const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
const prisma = new PrismaClient();

const getAuditLogs = async (req, res) => {
  try {
    const { entity, userId, action, startDate, endDate, page = 1, limit = 50 } = req.query;
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') where.organizationId = req.user.organizationId;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    return success(res, { logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch audit logs', 500);
  }
};

module.exports = { getAuditLogs };
