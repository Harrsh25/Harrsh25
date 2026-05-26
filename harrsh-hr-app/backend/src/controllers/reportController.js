const { success, error } = require('../utils/response');
const {
  getAttendanceReportData, generateAttendancePDF, generateAttendanceExcel,
  getLeaveReportData, generateLeaveExcel,
  getPayrollReportData, generatePayrollExcel,
} = require('../services/reportService');

const now = new Date();

const attendanceReport = async (req, res) => {
  try {
    const { format = 'json', month, year, userId, department } = req.query;
    const m = parseInt(month) || now.getMonth() + 1;
    const y = parseInt(year) || now.getFullYear();
    const orgId = req.user.organizationId;

    const records = await getAttendanceReportData(orgId, { month: m, year: y, userId, department });

    if (format === 'pdf') {
      const buf = await generateAttendancePDF(records, { month: m, year: y });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${m}-${y}.pdf"`);
      return res.send(buf);
    }
    if (format === 'excel') {
      const buf = await generateAttendanceExcel(records, { month: m, year: y });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${m}-${y}.xlsx"`);
      return res.send(Buffer.from(buf));
    }

    return success(res, { records, total: records.length });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to generate attendance report', 500);
  }
};

const leaveReport = async (req, res) => {
  try {
    const { format = 'json', year, userId, status, leaveTypeId } = req.query;
    const y = parseInt(year) || now.getFullYear();
    const orgId = req.user.organizationId;

    const requests = await getLeaveReportData(orgId, { year: y, userId, status, leaveTypeId });

    if (format === 'excel') {
      const buf = await generateLeaveExcel(requests, { year: y });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="leave-report-${y}.xlsx"`);
      return res.send(Buffer.from(buf));
    }

    return success(res, { requests, total: requests.length });
  } catch (err) {
    return error(res, 'Failed to generate leave report', 500);
  }
};

const payrollReport = async (req, res) => {
  try {
    const { format = 'json', month, year } = req.query;
    const m = parseInt(month) || now.getMonth() + 1;
    const y = parseInt(year) || now.getFullYear();
    const orgId = req.user.organizationId;

    const records = await getPayrollReportData(orgId, { month: m, year: y });

    if (format === 'excel') {
      const buf = await generatePayrollExcel(records, { month: m, year: y });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="payroll-${m}-${y}.xlsx"`);
      return res.send(Buffer.from(buf));
    }

    const totalNet = records.reduce((s, r) => s + r.netSalary, 0);
    const totalGross = records.reduce((s, r) => s + r.grossSalary, 0);
    return success(res, { records, total: records.length, totalNetSalary: Math.round(totalNet), totalGrossSalary: Math.round(totalGross) });
  } catch (err) {
    return error(res, 'Failed to generate payroll report', 500);
  }
};

module.exports = { attendanceReport, leaveReport, payrollReport };
