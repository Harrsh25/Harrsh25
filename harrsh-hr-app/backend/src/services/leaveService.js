const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Calculate working days between two dates, excluding weekends and org holidays.
 */
const calculateWorkingDays = async (startDate, endDate, organizationId) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Fetch org working days config
  let workingDayNums = [1, 2, 3, 4, 5]; // Mon-Fri default
  let holidays = [];

  if (organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (org && org.workingDays) {
      workingDayNums = org.workingDays.split(',').map(Number);
    }

    // Fetch holidays in the date range
    holidays = await prisma.holiday.findMany({
      where: {
        organizationId,
        date: { gte: start, lte: end },
      },
    });
  }

  const holidayDates = new Set(
    holidays.map(h => {
      const d = new Date(h.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    const key = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
    if (workingDayNums.includes(dayOfWeek) && !holidayDates.has(key)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

/**
 * Check if user has sufficient leave balance.
 */
const checkLeaveBalance = async (userId, leaveTypeId, days) => {
  const currentYear = new Date().getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year: currentYear } },
  });

  if (!balance) {
    return { hasBalance: false, available: 0, requested: days, reason: 'No leave balance found for this leave type' };
  }

  return {
    hasBalance: balance.remaining >= days,
    available: balance.remaining,
    requested: days,
    reason: balance.remaining < days ? `Insufficient balance. Available: ${balance.remaining}, Requested: ${days}` : null,
  };
};

/**
 * Get the approval chain for a user based on org settings.
 * Returns array of approver objects: [{ userId, role, level }]
 */
const getApprovalChain = async (userId, organizationId) => {
  const chain = [];
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Level 1: Direct manager
  if (user?.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: user.managerId }, select: { id: true, firstName: true, lastName: true, role: true } });
    if (manager) {
      chain.push({ userId: manager.id, name: `${manager.firstName} ${manager.lastName}`, role: manager.role, level: 1 });
    }
  }

  // Level 2: HR (if org requires 2-level approval)
  if (organizationId) {
    const settings = await prisma.orgSettings.findUnique({ where: { organizationId } });
    if (settings && settings.leaveApprovalLevels >= 2) {
      const hrUsers = await prisma.user.findMany({
        where: { organizationId, role: 'HR', status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, role: true },
        take: 1,
      });
      if (hrUsers.length > 0) {
        const hr = hrUsers[0];
        chain.push({ userId: hr.id, name: `${hr.firstName} ${hr.lastName}`, role: hr.role, level: 2 });
      }
    }
  }

  return chain;
};

/**
 * Process leave approval via state machine.
 * Handles level progression, final approval, and balance deduction.
 */
const processLeaveApproval = async (leaveRequestId, approverId, action, comment) => {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { user: true },
  });

  if (!leave) throw new Error('Leave request not found');
  if (!['PENDING', 'MANAGER_APPROVED'].includes(leave.status)) {
    throw new Error('Leave request cannot be actioned in its current state');
  }

  const approver = await prisma.user.findUnique({ where: { id: approverId } });
  if (!approver) throw new Error('Approver not found');

  const now = new Date();

  if (action === 'REJECT') {
    await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: 'REJECTED',
          approverId,
          approverComment: comment,
          actionedAt: now,
          ...(approver.role === 'MANAGER' ? { managerComment: comment, managerActionedAt: now } : {}),
          ...(approver.role === 'HR' || approver.role === 'ADMIN' ? { hrComment: comment, hrActionedAt: now, hrReviewerId: approverId } : {}),
        },
      }),
      prisma.approvalRequest.updateMany({ where: { referenceId: leaveRequestId, requestType: 'LEAVE' }, data: { status: 'REJECTED' } }),
    ]);
    return { status: 'REJECTED' };
  }

  if (action === 'APPROVE') {
    // Check if there are more approval levels needed
    const settings = leave.user.organizationId
      ? await prisma.orgSettings.findUnique({ where: { organizationId: leave.user.organizationId } })
      : null;

    const levelsRequired = settings?.leaveApprovalLevels || 1;
    const currentLevel = leave.approvalLevel;

    const isManager = approver.role === 'MANAGER' || (approver.role !== 'HR' && approver.role !== 'ADMIN');
    const nextLevel = currentLevel + 1;

    if (levelsRequired >= 2 && isManager && nextLevel < levelsRequired) {
      // Manager approved, needs HR too
      await prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: 'MANAGER_APPROVED',
          approvalLevel: nextLevel,
          managerId: approverId,
          managerComment: comment,
          managerActionedAt: now,
        },
      });
      return { status: 'MANAGER_APPROVED', nextApprover: 'HR' };
    }

    // Final approval
    const currentYear = new Date(leave.startDate).getFullYear();
    await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: 'APPROVED',
          approvalLevel: nextLevel,
          approverId,
          approverComment: comment,
          actionedAt: now,
          ...(approver.role === 'MANAGER' ? { managerId: approverId, managerComment: comment, managerActionedAt: now } : {}),
          ...(approver.role === 'HR' || approver.role === 'ADMIN' ? { hrReviewerId: approverId, hrComment: comment, hrActionedAt: now } : {}),
        },
      }),
      prisma.leaveBalance.update({
        where: { userId_leaveTypeId_year: { userId: leave.userId, leaveTypeId: leave.leaveTypeId, year: currentYear } },
        data: { used: { increment: leave.totalDays }, remaining: { decrement: leave.totalDays } },
      }),
      prisma.approvalRequest.updateMany({ where: { referenceId: leaveRequestId, requestType: 'LEAVE' }, data: { status: 'APPROVED' } }),
    ]);
    return { status: 'APPROVED' };
  }

  throw new Error('Invalid action. Must be APPROVE or REJECT');
};

/**
 * Generate leave calendar for an org (month/year).
 * Returns array of dates with list of employees on leave.
 */
const generateLeaveCalendar = async (organizationId, month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      organizationId,
      status: 'APPROVED',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, department: true } },
      leaveType: { select: { name: true, color: true } },
    },
  });

  const calendar = {};
  for (const leave of approvedLeaves) {
    const cur = new Date(Math.max(new Date(leave.startDate), startDate));
    const leaveEnd = new Date(Math.min(new Date(leave.endDate), endDate));
    while (cur <= leaveEnd) {
      const key = cur.toISOString().split('T')[0];
      if (!calendar[key]) calendar[key] = [];
      calendar[key].push({
        userId: leave.user.id,
        name: `${leave.user.firstName} ${leave.user.lastName}`,
        department: leave.user.department,
        leaveType: leave.leaveType.name,
        color: leave.leaveType.color,
      });
      cur.setDate(cur.getDate() + 1);
    }
  }

  return calendar;
};

module.exports = { calculateWorkingDays, checkLeaveBalance, getApprovalChain, processLeaveApproval, generateLeaveCalendar };
