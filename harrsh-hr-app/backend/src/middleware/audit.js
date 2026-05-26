const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createAuditLog = async ({ organizationId, userId, action, entity, entityId, oldValues, newValues, ipAddress, userAgent, metadata }) => {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    // Audit log failures must never break the main flow
    console.error('Audit log error:', err.message);
  }
};

// Express middleware factory: auditAction('CREATE', 'LeaveRequest')
// Reads entityId from req.params.id or result; call after the action completes
const auditAction = (action, entity) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      createAuditLog({
        organizationId: req.user?.organizationId,
        userId: req.user?.id,
        action,
        entity,
        entityId: req.params?.id || body?.data?.id,
        ipAddress: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        newValues: req.body,
      });
    }
    return originalJson(body);
  };
  next();
};

module.exports = { createAuditLog, auditAction };
