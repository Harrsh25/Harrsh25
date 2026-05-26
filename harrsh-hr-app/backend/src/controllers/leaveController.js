const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

const calcWorkingDays = (start, end) => {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const applyLeave = async (req, res) => {
  try {
    const { leaveTypeId, startDate, endDate, reason } = req.body;
    const userId = req.user.id;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return error(res, 'Start date must be before end date', 400);

    const totalDays = calcWorkingDays(start, end);
    const currentYear = new Date().getFullYear();

    const balance = await prisma.leaveBalance.findUnique({ where: { userId_leaveTypeId_year: { userId, leaveTypeId, year: currentYear } } });
    if (!balance) return error(res, 'Leave balance not found for this leave type', 400);
    if (balance.remaining < totalDays) return error(res, `Insufficient leave balance. Available: ${balance.remaining} days`, 400);

    const leaveRequest = await prisma.leaveRequest.create({
      data: { userId, leaveTypeId, startDate: start, endDate: end, totalDays, reason, status: 'PENDING' },
      include: { leaveType: true, user: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
    });

    // Create approval request
    await prisma.approvalRequest.create({
      data: { requestType: 'LEAVE', referenceId: leaveRequest.id, requestedById: userId, status: 'PENDING' },
    });

    // Notify manager
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.managerId) {
      await prisma.notification.create({
        data: { userId: user.managerId, title: 'New Leave Request', message: `${user.firstName} ${user.lastName} has applied for ${totalDays} day(s) of leave`, type: 'INFO', actionUrl: '/approvals' },
      });
    }

    return success(res, leaveRequest, 'Leave application submitted', 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to apply leave', 500);
  }
};

const getMyLeaves = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = { userId: req.user.id };
    if (status) where.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where, include: { leaveType: true, approver: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { appliedAt: 'desc' }, skip, take: parseInt(limit),
      }),
      prisma.leaveRequest.count({ where }),
    ]);
    return success(res, { leaves, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch leaves', 500);
  }
};

const getLeaveBalance = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const balances = await prisma.leaveBalance.findMany({
      where: { userId: req.user.id, year: currentYear },
      include: { leaveType: true },
    });
    return success(res, balances);
  } catch (err) {
    return error(res, 'Failed to fetch leave balance', 500);
  }
};

const getLeaveById = async (req, res) => {
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: req.params.id },
      include: { leaveType: true, user: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true } }, approver: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!leave) return error(res, 'Leave request not found', 404);
    if (leave.userId !== req.user.id && !['MANAGER', 'HR', 'ADMIN'].includes(req.user.role)) {
      return error(res, 'Forbidden', 403);
    }
    return success(res, leave);
  } catch (err) {
    return error(res, 'Failed to fetch leave', 500);
  }
};

const cancelLeave = async (req, res) => {
  try {
    const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
    if (!leave) return error(res, 'Leave request not found', 404);
    if (leave.userId !== req.user.id) return error(res, 'Forbidden', 403);
    if (leave.status !== 'PENDING') return error(res, 'Only pending leave requests can be cancelled', 400);

    await prisma.leaveRequest.update({ where: { id: leave.id }, data: { status: 'CANCELLED', actionedAt: new Date() } });
    await prisma.approvalRequest.updateMany({ where: { referenceId: leave.id, requestType: 'LEAVE' }, data: { status: 'CANCELLED' } });
    return success(res, null, 'Leave request cancelled');
  } catch (err) {
    return error(res, 'Failed to cancel leave', 500);
  }
};

const approveLeave = async (req, res) => {
  try {
    const { comment } = req.body;
    const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
    if (!leave) return error(res, 'Leave request not found', 404);
    if (leave.status !== 'PENDING') return error(res, 'Leave request is not pending', 400);

    const currentYear = new Date(leave.startDate).getFullYear();
    await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: 'APPROVED', approverId: req.user.id, approverComment: comment, actionedAt: new Date() },
      }),
      prisma.leaveBalance.update({
        where: { userId_leaveTypeId_year: { userId: leave.userId, leaveTypeId: leave.leaveTypeId, year: currentYear } },
        data: { used: { increment: leave.totalDays }, remaining: { decrement: leave.totalDays } },
      }),
      prisma.approvalRequest.updateMany({ where: { referenceId: leave.id, requestType: 'LEAVE' }, data: { status: 'APPROVED' } }),
      prisma.notification.create({
        data: { userId: leave.userId, title: 'Leave Approved', message: `Your leave request has been approved`, type: 'SUCCESS', actionUrl: '/leave' },
      }),
    ]);
    return success(res, null, 'Leave approved successfully');
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to approve leave', 500);
  }
};

const rejectLeave = async (req, res) => {
  try {
    const { comment } = req.body;
    const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
    if (!leave) return error(res, 'Leave request not found', 404);
    if (leave.status !== 'PENDING') return error(res, 'Leave request is not pending', 400);

    await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: 'REJECTED', approverId: req.user.id, approverComment: comment, actionedAt: new Date() },
      }),
      prisma.approvalRequest.updateMany({ where: { referenceId: leave.id, requestType: 'LEAVE' }, data: { status: 'REJECTED' } }),
      prisma.notification.create({
        data: { userId: leave.userId, title: 'Leave Rejected', message: `Your leave request has been rejected. ${comment || ''}`, type: 'ERROR', actionUrl: '/leave' },
      }),
    ]);
    return success(res, null, 'Leave rejected');
  } catch (err) {
    return error(res, 'Failed to reject leave', 500);
  }
};

const getPendingApprovals = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const where = { status: 'PENDING' };

    // Managers see their direct reports' leaves
    if (req.user.role === 'MANAGER') {
      const directReports = await prisma.user.findMany({ where: { managerId: req.user.id }, select: { id: true } });
      where.userId = { in: directReports.map(u => u.id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true, profilePhoto: true } },
          leaveType: true,
        },
        orderBy: { appliedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.leaveRequest.count({ where }),
    ]);
    return success(res, { leaves, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch pending approvals', 500);
  }
};

const getLeaveTypes = async (req, res) => {
  try {
    const types = await prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
    return success(res, types);
  } catch (err) {
    return error(res, 'Failed to fetch leave types', 500);
  }
};

module.exports = { applyLeave, getMyLeaves, getLeaveBalance, getLeaveById, cancelLeave, approveLeave, rejectLeave, getPendingApprovals, getLeaveTypes };
