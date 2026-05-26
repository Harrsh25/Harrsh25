const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
const ExcelJS = require('exceljs');
const prisma = new PrismaClient();

// GET /gdpr/export — export all personal data for the authenticated user
const exportMyData = async (req, res) => {
  try {
    const userId = req.user.id;

    const [user, attendance, leaves, payroll, notifications, documents, expenses] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, employeeId: true, email: true, firstName: true, lastName: true, role: true, department: true, designation: true, phone: true, joinDate: true, status: true, createdAt: true } }),
      prisma.attendanceRecord.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      prisma.leaveRequest.findMany({ where: { userId }, include: { leaveType: { select: { name: true } } }, orderBy: { appliedAt: 'desc' } }),
      prisma.payrollRecord.findMany({ where: { userId }, orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.document.findMany({ where: { userId, isDeleted: false } }),
      prisma.expense.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Harrsh HR GDPR Export';

    // Profile sheet
    const wsProfile = wb.addWorksheet('Profile');
    wsProfile.addRow(['Field', 'Value']);
    wsProfile.getRow(1).font = { bold: true };
    Object.entries(user).forEach(([k, v]) => wsProfile.addRow([k, v ? String(v) : '']));

    // Attendance sheet
    const wsAtt = wb.addWorksheet('Attendance');
    wsAtt.addRow(['Date', 'Check In', 'Check Out', 'Working Hours', 'Status']);
    wsAtt.getRow(1).font = { bold: true };
    attendance.forEach(r => wsAtt.addRow([
      new Date(r.date).toLocaleDateString(),
      r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '',
      r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '',
      r.workingHours || 0,
      r.status,
    ]));

    // Leave sheet
    const wsLeave = wb.addWorksheet('Leave Requests');
    wsLeave.addRow(['Leave Type', 'From', 'To', 'Days', 'Status', 'Reason', 'Applied On']);
    wsLeave.getRow(1).font = { bold: true };
    leaves.forEach(r => wsLeave.addRow([
      r.leaveType.name,
      new Date(r.startDate).toLocaleDateString(),
      new Date(r.endDate).toLocaleDateString(),
      r.totalDays, r.status, r.reason,
      new Date(r.appliedAt).toLocaleDateString(),
    ]));

    // Payroll sheet
    const wsPayroll = wb.addWorksheet('Payroll');
    wsPayroll.addRow(['Month', 'Year', 'Gross Salary', 'Net Salary', 'Status']);
    wsPayroll.getRow(1).font = { bold: true };
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    payroll.forEach(r => wsPayroll.addRow([MONTHS[r.month-1], r.year, r.grossSalary, r.netSalary, r.status]));

    // Documents sheet
    const wsDocs = wb.addWorksheet('Documents');
    wsDocs.addRow(['Name', 'Type', 'Status', 'Uploaded At', 'Expiry Date']);
    wsDocs.getRow(1).font = { bold: true };
    documents.forEach(d => wsDocs.addRow([d.name, d.type, d.status, new Date(d.uploadedAt).toLocaleDateString(), d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '']));

    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="my-data-export-${userId}.xlsx"`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to export data', 500);
  }
};

// DELETE /gdpr/me — anonymize the authenticated user's personal data (GDPR right to erasure)
// Keeps records for compliance but strips PII
const deleteMyData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirmation } = req.body;
    if (confirmation !== 'DELETE MY DATA') {
      return error(res, 'Please send { "confirmation": "DELETE MY DATA" } to confirm', 400);
    }

    const anonymizedEmail = `deleted-${userId}@anonymized.invalid`;
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        profilePhoto: null,
        status: 'DELETED',
      },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId } });

    return success(res, null, 'Your personal data has been anonymized. Account access has been revoked.');
  } catch (err) {
    return error(res, 'Failed to process deletion request', 500);
  }
};

// GET /gdpr/export/:userId — HR/Admin export of any employee's data
const exportEmployeeData = async (req, res) => {
  try {
    const { userId } = req.params;
    req.user = { ...req.user, id: userId };
    return exportMyData(req, res);
  } catch (err) {
    return error(res, 'Failed to export employee data', 500);
  }
};

module.exports = { exportMyData, deleteMyData, exportEmployeeData };
