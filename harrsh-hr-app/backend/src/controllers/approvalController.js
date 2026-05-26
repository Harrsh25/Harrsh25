const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

const getPendingApprovals = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const where = { status: 'PENDING' };
    if (type) where.requestType = type;
    if (req.user.role === 'MANAGER') {
      const directReports = await prisma.user.findMany({ where: { managerId: req.user.id }, select: { id: true } });
      where.requestedById = { in: directReports.map(u => u.id) };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [approvals, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
        include: { requestedBy: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true, profilePhoto: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.approvalRequest.count({ where }),
    ]);
    return success(res, { approvals, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch pending approvals', 500);
  }
};

const getApprovalById = async (req, res) => {
  try {
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: req.params.id },
      include: { requestedBy: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
    });
    if (!approval) return error(res, 'Approval not found', 404);
    return success(res, approval);
  } catch (err) {
    return error(res, 'Failed to fetch approval', 500);
  }
};

const approveRequest = async (req, res) => {
  try {
    const { comments } = req.body;
    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.params.id } });
    if (!approval) return error(res, 'Approval not found', 404);
    if (approval.status !== 'PENDING') return error(res, 'Request is not pending', 400);

    await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: { status: 'APPROVED', currentApproverId: req.user.id, comments },
    });

    // If it's a leave request, approve via leave controller logic
    if (approval.requestType === 'LEAVE' && approval.referenceId) {
      const leave = await prisma.leaveRequest.findUnique({ where: { id: approval.referenceId } });
      if (leave && leave.status === 'PENDING') {
        const currentYear = new Date(leave.startDate).getFullYear();
        await prisma.$transaction([
          prisma.leaveRequest.update({
            where: { id: leave.id },
            data: { status: 'APPROVED', approverId: req.user.id, approverComment: comments, actionedAt: new Date() },
          }),
          prisma.leaveBalance.update({
            where: { userId_leaveTypeId_year: { userId: leave.userId, leaveTypeId: leave.leaveTypeId, year: currentYear } },
            data: { used: { increment: leave.totalDays }, remaining: { decrement: leave.totalDays } },
          }),
          prisma.notification.create({
            data: { userId: leave.userId, title: 'Leave Approved', message: 'Your leave request has been approved', type: 'SUCCESS', actionUrl: '/leave' },
          }),
        ]);
      }
    }

    return success(res, null, 'Request approved successfully');
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to approve request', 500);
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { comments } = req.body;
    const approval = await prisma.approvalRequest.findUnique({ where: { id: req.params.id } });
    if (!approval) return error(res, 'Approval not found', 404);
    if (approval.status !== 'PENDING') return error(res, 'Request is not pending', 400);

    await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: { status: 'REJECTED', currentApproverId: req.user.id, comments },
    });

    if (approval.requestType === 'LEAVE' && approval.referenceId) {
      const leave = await prisma.leaveRequest.findUnique({ where: { id: approval.referenceId } });
      if (leave && leave.status === 'PENDING') {
        await prisma.$transaction([
          prisma.leaveRequest.update({
            where: { id: leave.id },
            data: { status: 'REJECTED', approverId: req.user.id, approverComment: comments, actionedAt: new Date() },
          }),
          prisma.notification.create({
            data: { userId: leave.userId, title: 'Leave Rejected', message: `Your leave request was rejected. ${comments || ''}`, type: 'ERROR', actionUrl: '/leave' },
          }),
        ]);
      }
    }

    return success(res, null, 'Request rejected');
  } catch (err) {
    return error(res, 'Failed to reject request', 500);
  }
};

module.exports = { getPendingApprovals, getApprovalById, approveRequest, rejectRequest };
