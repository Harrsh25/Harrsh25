const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const prisma = new PrismaClient();

// ─── ATTENDANCE REPORT ────────────────────────────────────────────────────────

const getAttendanceReportData = async (organizationId, { month, year, userId, department }) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const where = { date: { gte: startDate, lte: endDate } };
  if (organizationId) where.organizationId = organizationId;
  if (userId) where.userId = userId;

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true, employeeId: true, department: true } } },
    orderBy: [{ user: { firstName: 'asc' } }, { date: 'asc' }],
  });

  return records;
};

const generateAttendancePDF = async (records, { month, year, orgName }) => {
  return new Promise((resolve, reject) => {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.rect(0, 0, doc.page.width, 60).fill('#4F46E5');
    doc.fillColor('white').fontSize(16).font('Helvetica-Bold').text(orgName || 'HR System', 40, 15);
    doc.fontSize(10).font('Helvetica').text(`Attendance Report — ${MONTHS[month-1]} ${year}`, 40, 38);
    doc.fillColor('#374151');

    let y = 80;
    // Table headers
    const cols = [
      { label: 'Employee', w: 140 }, { label: 'Emp ID', w: 70 }, { label: 'Department', w: 90 },
      { label: 'Date', w: 70 }, { label: 'Check In', w: 70 }, { label: 'Check Out', w: 70 },
      { label: 'Hours', w: 50 }, { label: 'Status', w: 70 }
    ];
    let x = 40;
    doc.rect(x, y, cols.reduce((s, c) => s + c.w, 0), 20).fill('#F3F4F6');
    doc.fillColor('#374151');
    cols.forEach(col => {
      doc.font('Helvetica-Bold').fontSize(8).text(col.label, x + 4, y + 6, { width: col.w - 8 });
      x += col.w;
    });
    y += 20;

    const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
    records.forEach((r, i) => {
      if (y > doc.page.height - 60) { doc.addPage({ layout: 'landscape' }); y = 40; }
      if (i % 2 === 0) { doc.rect(40, y, cols.reduce((s, c) => s + c.w, 0), 18).fill('#FAFAFA'); }
      x = 40;
      const statusColors = { PRESENT: '#10B981', ABSENT: '#EF4444', LATE: '#F59E0B', HALF_DAY: '#8B5CF6', LEAVE: '#3B82F6', HOLIDAY: '#6B7280' };
      const row = [
        `${r.user.firstName} ${r.user.lastName}`,
        r.user.employeeId,
        r.user.department || '—',
        new Date(r.date).toLocaleDateString('en-IN'),
        fmt(r.checkInTime),
        fmt(r.checkOutTime),
        r.workingHours ? `${r.workingHours}h` : '—',
        r.status,
      ];
      row.forEach((val, ci) => {
        if (ci === 7) {
          doc.fillColor(statusColors[val] || '#374151').font('Helvetica-Bold').fontSize(7).text(val, x + 4, y + 5, { width: cols[ci].w - 8 });
        } else {
          doc.fillColor('#374151').font('Helvetica').fontSize(7.5).text(val, x + 4, y + 5, { width: cols[ci].w - 8 });
        }
        x += cols[ci].w;
      });
      y += 18;
    });

    // Summary
    y += 10;
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9)
      .text(`Total: ${records.length}  |  Present: ${present}  |  Absent: ${absent}  |  Late: ${late}`, 40, y);

    doc.fillColor('#9CA3AF').fontSize(7).font('Helvetica')
      .text(`Generated on ${new Date().toLocaleString()}`, 40, doc.page.height - 30);
    doc.end();
  });
};

const generateAttendanceExcel = async (records, { month, year, orgName }) => {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Harrsh HR';
  const ws = wb.addWorksheet(`Attendance ${MONTHS[month-1]} ${year}`);

  // Title row
  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = `${orgName || 'HR System'} — Attendance Report — ${MONTHS[month-1]} ${year}`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF4F46E5' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.addRow([]);
  const headerRow = ws.addRow(['Employee Name', 'Employee ID', 'Department', 'Date', 'Check In', 'Check Out', 'Working Hours', 'Status']);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  headerRow.alignment = { horizontal: 'center' };

  const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  const statusColors = { PRESENT: 'FF10B981', ABSENT: 'FFEF4444', LATE: 'FFF59E0B', HALF_DAY: 'FF8B5CF6', LEAVE: 'FF3B82F6' };

  records.forEach(r => {
    const row = ws.addRow([
      `${r.user.firstName} ${r.user.lastName}`,
      r.user.employeeId,
      r.user.department || '',
      new Date(r.date).toLocaleDateString('en-IN'),
      fmt(r.checkInTime),
      fmt(r.checkOutTime),
      r.workingHours || 0,
      r.status,
    ]);
    const statusCell = row.getCell(8);
    statusCell.font = { bold: true, color: { argb: statusColors[r.status] || 'FF374151' } };
  });

  ws.columns = [{ width: 22 }, { width: 14 }, { width: 18 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 12 }];

  // Summary
  ws.addRow([]);
  const present = records.filter(r => r.status === 'PRESENT').length;
  const absent = records.filter(r => r.status === 'ABSENT').length;
  const late = records.filter(r => r.status === 'LATE').length;
  const summaryRow = ws.addRow([`Total: ${records.length} | Present: ${present} | Absent: ${absent} | Late: ${late}`]);
  summaryRow.font = { bold: true };

  return wb.xlsx.writeBuffer();
};

// ─── LEAVE REPORT ─────────────────────────────────────────────────────────────

const getLeaveReportData = async (organizationId, { year, userId, status, leaveTypeId }) => {
  const where = { startDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } };
  if (organizationId) where.organizationId = organizationId;
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true, employeeId: true, department: true } },
      leaveType: { select: { name: true } },
    },
    orderBy: { appliedAt: 'desc' },
  });
  return requests;
};

const generateLeaveExcel = async (requests, { year, orgName }) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Leave Report ${year}`);

  ws.mergeCells('A1:I1');
  ws.getCell('A1').value = `${orgName || 'HR System'} — Leave Report — ${year}`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF4F46E5' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };
  ws.addRow([]);

  const headerRow = ws.addRow(['Employee', 'Emp ID', 'Department', 'Leave Type', 'From', 'To', 'Days', 'Status', 'Applied On']);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

  const statusColors = { APPROVED: 'FF10B981', REJECTED: 'FFEF4444', PENDING: 'FFF59E0B', CANCELLED: 'FF6B7280' };
  requests.forEach(r => {
    const row = ws.addRow([
      `${r.user.firstName} ${r.user.lastName}`,
      r.user.employeeId,
      r.user.department || '',
      r.leaveType.name,
      new Date(r.startDate).toLocaleDateString('en-IN'),
      new Date(r.endDate).toLocaleDateString('en-IN'),
      r.totalDays,
      r.status,
      new Date(r.appliedAt).toLocaleDateString('en-IN'),
    ]);
    row.getCell(8).font = { bold: true, color: { argb: statusColors[r.status] || 'FF374151' } };
  });

  ws.columns = [{ width: 22 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 8 }, { width: 12 }, { width: 14 }];
  return wb.xlsx.writeBuffer();
};

// ─── PAYROLL REPORT ───────────────────────────────────────────────────────────

const getPayrollReportData = async (organizationId, { month, year }) => {
  const where = { month: parseInt(month), year: parseInt(year) };
  if (organizationId) where.organizationId = organizationId;

  return prisma.payrollRecord.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true } } },
    orderBy: { user: { firstName: 'asc' } },
  });
};

const generatePayrollExcel = async (records, { month, year, orgName }) => {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Payroll ${MONTHS[month-1]} ${year}`);

  ws.mergeCells('A1:N1');
  ws.getCell('A1').value = `${orgName || 'HR System'} — Payroll Report — ${MONTHS[month-1]} ${year}`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF4F46E5' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };
  ws.addRow([]);

  const headerRow = ws.addRow(['Employee', 'Emp ID', 'Department', 'Basic', 'HRA', 'Special Allow.', 'Transport', 'Medical', 'Gross', 'PF', 'PT', 'TDS', 'Total Ded.', 'Net Salary']);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

  const inr = (n) => Math.round(n || 0);
  records.forEach(r => {
    ws.addRow([
      `${r.user.firstName} ${r.user.lastName}`,
      r.user.employeeId,
      r.user.department || '',
      inr(r.basicSalary), inr(r.hra), inr(r.specialAllowance),
      inr(r.transportAllowance), inr(r.medicalAllowance), inr(r.grossSalary),
      inr(r.pfEmployee), inr(r.professionalTax), inr(r.tds),
      inr(r.totalDeductions), inr(r.netSalary),
    ]);
  });

  // Totals row
  ws.addRow([]);
  const totals = ['TOTAL', '', '',
    records.reduce((s, r) => s + r.basicSalary, 0),
    records.reduce((s, r) => s + r.hra, 0),
    records.reduce((s, r) => s + r.specialAllowance, 0),
    records.reduce((s, r) => s + r.transportAllowance, 0),
    records.reduce((s, r) => s + r.medicalAllowance, 0),
    records.reduce((s, r) => s + r.grossSalary, 0),
    records.reduce((s, r) => s + r.pfEmployee, 0),
    records.reduce((s, r) => s + r.professionalTax, 0),
    records.reduce((s, r) => s + r.tds, 0),
    records.reduce((s, r) => s + r.totalDeductions, 0),
    records.reduce((s, r) => s + r.netSalary, 0),
  ].map((v, i) => i > 2 ? Math.round(v) : v);
  const totalRow = ws.addRow(totals);
  totalRow.font = { bold: true };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

  ws.columns = [{ width: 22 }, { width: 12 }, { width: 16 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 10 }, { width: 8 }, { width: 10 }, { width: 12 }, { width: 12 }];
  return wb.xlsx.writeBuffer();
};

module.exports = {
  getAttendanceReportData, generateAttendancePDF, generateAttendanceExcel,
  getLeaveReportData, generateLeaveExcel,
  getPayrollReportData, generatePayrollExcel,
};
