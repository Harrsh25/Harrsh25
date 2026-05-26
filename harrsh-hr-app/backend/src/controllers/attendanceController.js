const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
const { haversineDistance, isWithinRadius } = require('../utils/geo');

const prisma = new PrismaClient();

const toDateOnly = (d) => {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.organizationId;
    const now = new Date();
    const today = toDateOnly(now);
    const { latitude, longitude, selfieBase64, notes } = req.body;

    // GPS validation if org requires it
    if (orgId) {
      const settings = await prisma.orgSettings.findUnique({ where: { organizationId: orgId } });
      if (settings && settings.requireCheckInGPS) {
        if (latitude === undefined || longitude === undefined) {
          return error(res, 'Location is required for check-in at this organization', 400);
        }
        if (settings.officeLatitude && settings.officeLongitude) {
          const distance = Math.round(haversineDistance(
            parseFloat(latitude), parseFloat(longitude),
            settings.officeLatitude, settings.officeLongitude
          ));
          if (!isWithinRadius(parseFloat(latitude), parseFloat(longitude), settings.officeLatitude, settings.officeLongitude, settings.gpsRadius)) {
            return error(res, `You are ${distance}m from office. Must be within ${settings.gpsRadius}m to check in.`, 400);
          }
        }
      }
    }

    // Determine if late (after org work start time or default 9:30)
    let cutoffHour = 9, cutoffMin = 30;
    if (orgId) {
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (org && org.workStartTime) {
        const parts = org.workStartTime.split(':');
        cutoffHour = parseInt(parts[0]);
        cutoffMin = parseInt(parts[1]) + 30; // 30min grace
        if (cutoffMin >= 60) { cutoffHour++; cutoffMin -= 60; }
      }
    }
    const cutoff = new Date(today);
    cutoff.setHours(cutoffHour, cutoffMin, 0, 0);
    const status = now > cutoff ? 'LATE' : 'PRESENT';

    const existing = await prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date: today } } });
    if (existing && existing.checkInTime) return error(res, 'Already checked in today', 400);

    const data = {
      checkInTime: now,
      status,
      ...(latitude !== undefined && { checkInLatitude: parseFloat(latitude) }),
      ...(longitude !== undefined && { checkInLongitude: parseFloat(longitude) }),
      ...(notes && { notes }),
      ...(orgId && { organizationId: orgId }),
    };

    const record = existing
      ? await prisma.attendanceRecord.update({ where: { id: existing.id }, data })
      : await prisma.attendanceRecord.create({ data: { userId, date: today, ...data } });

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
    const { latitude, longitude } = req.body || {};

    const existing = await prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date: today } } });
    if (!existing || !existing.checkInTime) return error(res, 'No check-in record found for today', 400);
    if (existing.checkOutTime) return error(res, 'Already checked out today', 400);

    const diff = (now - new Date(existing.checkInTime)) / (1000 * 60 * 60);
    const workingHours = Math.round(diff * 100) / 100;
    const statusOverride = workingHours < 4 ? 'HALF_DAY' : existing.status;

    const record = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        checkOutTime: now,
        workingHours,
        status: statusOverride,
        ...(latitude !== undefined && { checkOutLatitude: parseFloat(latitude) }),
        ...(longitude !== undefined && { checkOutLongitude: parseFloat(longitude) }),
      },
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
    if (req.user.organizationId) where.organizationId = req.user.organizationId;
    if (date) where.date = toDateOnly(new Date(date));
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
    const date = toDateOnly(new Date(req.params.date));
    const where = { date };
    if (req.user.organizationId) where.organizationId = req.user.organizationId;
    const records = await prisma.attendanceRecord.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true } } },
    });
    return success(res, records);
  } catch (err) {
    return error(res, 'Failed to fetch attendance for date', 500);
  }
};

// POST /attendance/:id/regularize
const requestRegularization = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return error(res, 'Reason is required', 400);

    const record = await prisma.attendanceRecord.findUnique({ where: { id: req.params.id } });
    if (!record) return error(res, 'Attendance record not found', 404);
    if (record.userId !== req.user.id) return error(res, 'Forbidden', 403);
    if (record.regularizationStatus === 'pending') return error(res, 'Regularization already requested', 400);

    const updated = await prisma.attendanceRecord.update({
      where: { id: req.params.id },
      data: { regularizationStatus: 'pending', regularizationReason: reason },
    });
    return success(res, updated, 'Regularization request submitted');
  } catch (err) {
    return error(res, 'Failed to request regularization', 500);
  }
};

// GET /attendance/regularizations
const getRegularizations = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const where = { regularizationStatus: 'pending' };
    if (orgId) where.organizationId = orgId;

    // Managers see only their direct reports
    if (req.user.role === 'MANAGER') {
      const reports = await prisma.user.findMany({ where: { managerId: req.user.id }, select: { id: true } });
      where.userId = { in: reports.map(u => u.id) };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
      orderBy: { date: 'desc' },
    });
    return success(res, records);
  } catch (err) {
    return error(res, 'Failed to fetch regularizations', 500);
  }
};

// PUT /attendance/regularizations/:id/approve
const approveRegularization = async (req, res) => {
  try {
    const { approved, status: overrideStatus } = req.body;
    const record = await prisma.attendanceRecord.findUnique({ where: { id: req.params.id } });
    if (!record) return error(res, 'Record not found', 404);

    const newStatus = approved ? 'approved' : 'rejected';
    const updateData = { regularizationStatus: newStatus };

    // If approving and a new status override is given
    if (approved && overrideStatus) {
      updateData.status = overrideStatus;
    }

    const updated = await prisma.attendanceRecord.update({ where: { id: req.params.id }, data: updateData });
    return success(res, updated, `Regularization ${newStatus}`);
  } catch (err) {
    return error(res, 'Failed to process regularization', 500);
  }
};

module.exports = {
  checkIn, checkOut, getMyAttendance, getAttendanceSummary, getAllAttendance, getAttendanceByDate,
  requestRegularization, getRegularizations, approveRegularization,
};
