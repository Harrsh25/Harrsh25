const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

const toDateOnly = (d) => {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const today = toDateOnly(new Date());
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    if (role === 'EMPLOYEE') {
      const [todayAttendance, leaveBalances, pendingTasks, unreadNotifications] = await Promise.all([
        prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date: today } } }),
        prisma.leaveBalance.findMany({ where: { userId, year: currentYear }, include: { leaveType: true } }),
        prisma.task.count({ where: { assignedToId: userId, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } } }),
        prisma.notification.count({ where: { userId, isRead: false } }),
      ]);
      return success(res, { role, todayAttendance, leaveBalances, pendingTasks, unreadNotifications });
    }

    if (role === 'MANAGER') {
      const directReports = await prisma.user.findMany({ where: { managerId: userId }, select: { id: true } });
      const reportIds = directReports.map(u => u.id);
      const [teamPresentToday, pendingLeaveApprovals, activeProjects, pendingTasks] = await Promise.all([
        prisma.attendanceRecord.count({ where: { userId: { in: reportIds }, date: today, status: { in: ['PRESENT', 'LATE'] } } }),
        prisma.leaveRequest.count({ where: { userId: { in: reportIds }, status: 'PENDING' } }),
        prisma.project.count({ where: { managerId: userId, status: 'ACTIVE' } }),
        prisma.task.count({ where: { assignedById: userId, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } } }),
      ]);
      return success(res, { role, teamSize: reportIds.length, teamPresentToday, pendingLeaveApprovals, activeProjects, pendingTasks });
    }

    if (role === 'HR') {
      const [totalEmployees, leavesToday, payrollStatus, pendingApprovals] = await Promise.all([
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.leaveRequest.count({ where: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } } }),
        prisma.payrollRecord.count({ where: { month: currentMonth, year: currentYear, status: 'PROCESSED' } }),
        prisma.approvalRequest.count({ where: { status: 'PENDING' } }),
      ]);
      return success(res, { role, totalEmployees, leavesToday, payrollStatus, pendingApprovals });
    }

    if (role === 'ADMIN') {
      const [totalEmployees, activeProjects, pendingApprovals, totalPayroll, unprocessedPayroll, totalDepartments] = await Promise.all([
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.project.count({ where: { status: 'ACTIVE' } }),
        prisma.approvalRequest.count({ where: { status: 'PENDING' } }),
        prisma.payrollRecord.count({ where: { month: currentMonth, year: currentYear } }),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.department.count(),
      ]);
      return success(res, { role, totalEmployees, activeProjects, pendingApprovals, totalPayroll, totalDepartments });
    }

    return success(res, { role, message: 'Unknown role' });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to fetch dashboard stats', 500);
  }
};

module.exports = { getDashboardStats };
