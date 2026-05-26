const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

const toDateOnly = (d) => {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const today = toDateOnly(now);
    const checkInTime = now;
    // Determine if late (after 9:30 AM)
    const cutoff = new Date(today);
    cutoff.setHours(9, 30, 0, 0);
    const status = checkInTime > cutoff ? 'LATE' : 'PRESENT';

    const existing = await prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date: today } } });
    if (existing && existing.checkInTime) return error(res, 'Already checked in today', 400);

    const record = await existing
      ? prisma.attendanceRecord.update({ where: { id: existing.id }, data: { checkInTime, status } })
      : prisma.attendanceRecord.create({ data: { userId, date: today, checkInTime, status } });

    return success(res, record, 'Checked in successfully');
  } catch (err) {
    console.error(err);
    return error(res, 'Check-in failed', 500);
  }
};

const checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const today = toDateOnly(now);

    const existing = await prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date: today } } });
    if (!existing || !existing.checkInTime) return error(res, 'No check-in record found for today', 400);
    if (existing.checkOutTime) return error(res, 'Already checked out today', 400);

    const diff = (now - new Date(existing.checkInTime)) / (1000 * 60 * 60);
    const workingHours = Math.round(diff * 100) / 100;
    const statusOverride = workingHours < 4 ? 'HALF_DAY' : existing.status;

    const record = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkOutTime: now, workingHours, status: statusOverride },
    });
    return success(res, record, 'Checked out successfully');
  } catch (err) {
    console.error(err);
    return error(res, 'Check-out failed', 500);
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    const where = { userId: req.user.id };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({ where, orderBy: { date: 'desc' }, skip, take: parseInt(limit) }),
      prisma.attendanceRecord.count({ where }),
    ]);
    return success(res, { records, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch attendance', 500);
  }
};

const getAttendanceSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const m = parseInt(month) || currentDate.getMonth() + 1;
    const y = parseInt(year) || currentDate.getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const records = await prisma.attendanceRecord.findMany({
      where: { userId: req.user.id, date: { gte: startDate, lte: endDate } },
    });

    const summary = records.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    const totalWorkingHours = records.reduce((sum, r) => sum + (r.workingHours || 0), 0);

    return success(res, { summary, totalWorkingHours: Math.round(totalWorkingHours * 100) / 100, month: m, year: y, totalDays: records.length });
  } catch (err) {
    return error(res, 'Failed to fetch summary', 500);
  }
};

const getAllAttendance = async (req, res) => {
  try {
    const { date, department, userId, page = 1, limit = 50 } = req.query;
    const where = {};
    if (date) where.date = new Date(date);
    if (userId) where.userId = userId;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.attendanceRecord.count({ where }),
    ]);
    return success(res, { records, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch attendance records', 500);
  }
};

const getAttendanceByDate = async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const records = await prisma.attendanceRecord.findMany({
      where: { date },
      include: { user: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true } } },
    });
    return success(res, records);
  } catch (err) {
    return error(res, 'Failed to fetch attendance for date', 500);
  }
};

module.exports = { checkIn, checkOut, getMyAttendance, getAttendanceSummary, getAllAttendance, getAttendanceByDate };
