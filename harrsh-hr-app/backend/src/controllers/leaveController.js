const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
const { calculateWorkingDays, checkLeaveBalance, processLeaveApproval, generateLeaveCalendar } = require('../services/leaveService');
const { notifyLeaveApplied, notifyLeaveActioned } = require('../services/notificationService');

const prisma = new PrismaClient();

const applyLeave = async (req, res) => {
  try {
    const { leaveTypeId, startDate, endDate, reason, attachmentUrl } = req.body;
    const userId = req.user.id;
    const orgId = req.user.organizationId;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return error(res, 'Start date must be before end date', 400);

    // Calculate actual working days excluding weekends + holidays
    const totalDays = await calculateWorkingDays(start, end, orgId);
    if (totalDays === 0) return error(res, 'No working days in the selected date range', 400);

    // Check leave balance
    const balanceCheck = await checkLeaveBalance(userId, leaveTypeId, totalDays);
    if (!balanceCheck.hasBalance) return error(res, balanceCheck.reason || 'Insufficient leave balance', 400);

    // Get manager
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const managerId = user?.managerId || null;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveTypeId,
        organizationId: orgId || null,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        status: 'PENDING',
        managerId,
        approvalLevel: 0,
        ...(attachmentUrl && { attachmentUrl }),
      },
      include: {
        leaveType: true,
        user: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
    });

    // Create approval request
    await prisma.approvalRequest.create({
      data: {
        requestType: 'LEAVE',
        referenceId: leaveRequest.id,
        requestedById: userId,
        organizationId: orgId || null,
        status: 'PENDING',
        currentApproverId: managerId,
      },
    });

    // Notify manager
    await notifyLeaveApplied(leaveRequest);

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
        where,
        include: {
          leaveType: true,
          approver: { select: { id: true, firstName: true, lastName: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { appliedAt: 'desc' },
        skip,
        take: parseInt(limit),
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
    const where = { userId: req.user.id, year: currentYear };
    const balances = await prisma.leaveBalance.findMany({
      where,
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
      include: {
        leaveType: true,
        user: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
        hrReviewer: { select: { id: true, firstName: true, lastName: true } },
      },
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
    const { cancelReason } = req.body;
    const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
    if (!leave) return error(res, 'Leave request not found', 404);
    if (leave.userId !== req.user.id) return error(res, 'Forbidden', 403);
    if (!['PENDING', 'MANAGER_APPROVED'].includes(leave.status)) {
      return error(res, 'Only pending leave requests can be cancelled', 400);
    }

    await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: 'CANCELLED', actionedAt: new Date(), cancelReason: cancelReason || null },
      }),
      prisma.approvalRequest.updateMany({
        where: { referenceId: leave.id, requestType: 'LEAVE' },
        data: { status: 'CANCELLED' },
      }),
    ]);
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

    const result = await processLeaveApproval(req.params.id, req.user.id, 'APPROVE', comment);

    // Notify employee
    await notifyLeaveActioned({ ...leave, status: result.status }, result.status);

    return success(res, result, `Leave ${result.status.toLowerCase()} successfully`);
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Failed to approve leave', 500);
  }
};

const rejectLeave = async (req, res) => {
  try {
    const { comment } = req.body;
    const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
    if (!leave) return error(res, 'Leave request not found', 404);

    await processLeaveApproval(req.params.id, req.user.id, 'REJECT', comment);
    await notifyLeaveActioned({ ...leave, status: 'REJECTED' }, 'REJECTED');

    return success(res, null, 'Leave rejected');
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Failed to reject leave', 500);
  }
};

const getPendingApprovals = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const where = { status: { in: ['PENDING', 'MANAGER_APPROVED'] } };

    if (req.user.organizationId) where.organizationId = req.user.organizationId;

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
          manager: { select: { id: true, firstName: true, lastName: true } },
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
    const where = {};
    if (req.user.organizationId) {
      where.OR = [
        { organizationId: req.user.organizationId },
        { organizationId: null },
      ];
    }
    const types = await prisma.leaveType.findMany({ where, orderBy: { name: 'asc' } });
    return success(res, types);
  } catch (err) {
    return error(res, 'Failed to fetch leave types', 500);
  }
};

// GET /leave/calendar?month=&year=
const getLeaveCalendar = async (req, res) => {
  try {
    const { month, year } = req.query;
    const orgId = req.user.organizationId;
    if (!orgId) return error(res, 'No organization associated', 400);

    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const calendar = await generateLeaveCalendar(orgId, m, y);
    return success(res, { calendar, month: m, year: y });
  } catch (err) {
    return error(res, 'Failed to fetch leave calendar', 500);
  }
};

// GET /leave/team — manager sees team's approved leaves this month
const getTeamLeaves = async (req, res) => {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const where = {
      status: 'APPROVED',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    };

    if (req.user.role === 'MANAGER') {
      const directReports = await prisma.user.findMany({ where: { managerId: req.user.id }, select: { id: true } });
      where.userId = { in: directReports.map(u => u.id) };
    } else if (req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, department: true, profilePhoto: true } },
        leaveType: { select: { name: true, color: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return success(res, leaves);
  } catch (err) {
    return error(res, 'Failed to fetch team leaves', 500);
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getLeaveBalance,
  getLeaveById,
  cancelLeave,
  approveLeave,
  rejectLeave,
  getPendingApprovals,
  getLeaveTypes,
  getLeaveCalendar,
  getTeamLeaves,
};
