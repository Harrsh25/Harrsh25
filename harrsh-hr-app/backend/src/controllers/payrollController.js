const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
const { generatePayslipPDF } = require('../services/payrollService');
const { notifyPayslipReady } = require('../services/notificationService');

const prisma = new PrismaClient();

const getMyPayslips = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [payslips, total] = await Promise.all([
      prisma.payrollRecord.findMany({
        where: { userId: req.user.id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip,
        take: parseInt(limit),
      }),
      prisma.payrollRecord.count({ where: { userId: req.user.id } }),
    ]);
    return success(res, { payslips, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch payslips', 500);
  }
};

const getPayslipById = async (req, res) => {
  try {
    const payslip = await prisma.payrollRecord.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true, designation: true } } },
    });
    if (!payslip) return error(res, 'Payslip not found', 404);
    if (payslip.userId !== req.user.id && !['HR', 'ADMIN'].includes(req.user.role)) {
      return error(res, 'Forbidden', 403);
    }
    return success(res, payslip);
  } catch (err) {
    return error(res, 'Failed to fetch payslip', 500);
  }
};

const getAllPayroll = async (req, res) => {
  try {
    const { month, year, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      prisma.payrollRecord.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip,
        take: parseInt(limit),
      }),
      prisma.payrollRecord.count({ where }),
    ]);
    return success(res, { records, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, 'Failed to fetch payroll', 500);
  }
};

const processPayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return error(res, 'Month and year are required', 400);

    const users = await prisma.user.findMany({ where: { status: 'ACTIVE' } });
    const createdRecords = [];

    for (const user of users) {
      const existing = await prisma.payrollRecord.findUnique({
        where: { userId_month_year: { userId: user.id, month: parseInt(month), year: parseInt(year) } },
      });
      if (existing) continue;

      // Sample salary calculation
      const basicSalary = 50000;
      const hra = basicSalary * 0.4;
      const specialAllowance = basicSalary * 0.2;
      const transportAllowance = 2000;
      const medicalAllowance = 1250;
      const grossSalary = basicSalary + hra + specialAllowance + transportAllowance + medicalAllowance;
      const pfEmployee = basicSalary * 0.12;
      const pfEmployer = basicSalary * 0.12;
      const professionalTax = 200;
      const tds = grossSalary > 50000 ? grossSalary * 0.1 : 0;
      const esiEmployee = grossSalary <= 21000 ? grossSalary * 0.0075 : 0;
      const totalDeductions = pfEmployee + professionalTax + tds + esiEmployee;
      const netSalary = grossSalary - totalDeductions;

      const record = await prisma.payrollRecord.create({
        data: {
          userId: user.id, month: parseInt(month), year: parseInt(year),
          basicSalary, hra, specialAllowance, transportAllowance, medicalAllowance,
          grossSalary, pfEmployee, pfEmployer, professionalTax, tds, esiEmployee,
          totalDeductions, netSalary, status: 'PROCESSED',
        },
      });
      createdRecords.push(record);
    }

    return success(res, { processed: createdRecords.length }, `Payroll processed for ${createdRecords.length} employees`, 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to process payroll', 500);
  }
};

const getPayrollSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const m = parseInt(month) || currentDate.getMonth() + 1;
    const y = parseInt(year) || currentDate.getFullYear();

    const records = await prisma.payrollRecord.findMany({ where: { month: m, year: y } });
    const totalNetSalary = records.reduce((sum, r) => sum + r.netSalary, 0);
    const totalGrossSalary = records.reduce((sum, r) => sum + r.grossSalary, 0);
    const totalDeductions = records.reduce((sum, r) => sum + r.totalDeductions, 0);
    const statusBreakdown = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

    return success(res, { month: m, year: y, totalEmployees: records.length, totalNetSalary, totalGrossSalary, totalDeductions, statusBreakdown });
  } catch (err) {
    return error(res, 'Failed to fetch payroll summary', 500);
  }
};

const downloadPayslipPDF = async (req, res) => {
  try {
    const payslip = await prisma.payrollRecord.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, employeeId: true,
            department: true, designation: true, organizationId: true,
          },
        },
      },
    });
    if (!payslip) return error(res, 'Payslip not found', 404);
    if (payslip.userId !== req.user.id && !['HR', 'ADMIN'].includes(req.user.role)) {
      return error(res, 'Forbidden', 403);
    }

    const org = payslip.user.organizationId
      ? await prisma.organization.findUnique({ where: { id: payslip.user.organizationId } })
      : null;

    const pdfBuffer = await generatePayslipPDF(payslip, payslip.user, org);
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const filename = `payslip-${payslip.user.employeeId}-${MONTHS[payslip.month - 1]}-${payslip.year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to generate PDF', 500);
  }
};

// POST /payroll/:id/email — generates PDF and emails it
const emailPayslip = async (req, res) => {
  try {
    const payslip = await prisma.payrollRecord.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            employeeId: true, department: true, designation: true, organizationId: true,
          },
        },
      },
    });
    if (!payslip) return error(res, 'Payslip not found', 404);
    if (payslip.userId !== req.user.id && !['HR', 'ADMIN'].includes(req.user.role)) {
      return error(res, 'Forbidden', 403);
    }

    let org = null;
    if (payslip.user.organizationId) {
      org = await prisma.organization.findUnique({
        where: { id: payslip.user.organizationId },
        include: { settings: true },
      });
    }

    const pdfBuffer = await generatePayslipPDF(payslip, payslip.user, org);
    const nodemailer = require('nodemailer');
    const smtpConfig = org?.settings;

    const transportCfg = smtpConfig?.smtpHost
      ? { host: smtpConfig.smtpHost, port: smtpConfig.smtpPort || 587, secure: false, auth: { user: smtpConfig.smtpUser, pass: smtpConfig.smtpPass } }
      : { host: process.env.SMTP_HOST || 'smtp.gmail.com', port: parseInt(process.env.SMTP_PORT || '587'), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } };

    const transporter = nodemailer.createTransport(transportCfg);
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthLabel = MONTHS[payslip.month - 1];

    await transporter.sendMail({
      from: smtpConfig?.smtpUser || process.env.SMTP_USER || 'noreply@harrsh-hr.com',
      to: payslip.user.email,
      subject: `Your Payslip for ${monthLabel} ${payslip.year}`,
      html: `<p>Dear ${payslip.user.firstName},</p><p>Please find your payslip for <strong>${monthLabel} ${payslip.year}</strong> attached.</p>`,
      attachments: [{ filename: `payslip-${monthLabel}-${payslip.year}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
    });

    return success(res, null, `Payslip emailed to ${payslip.user.email}`);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to email payslip: ' + err.message, 500);
  }
};

// POST /payroll/process-all — HR runs payroll for all employees in org
const processMonthlyPayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return error(res, 'Month and year are required', 400);

    const { calculatePayroll } = require('../services/payrollService');
    const orgId = req.user.organizationId;
    const where = { status: 'ACTIVE' };
    if (orgId) where.organizationId = orgId;

    const users = await prisma.user.findMany({ where });
    const salaryMap = { ADMIN: 100000, HR: 80000, MANAGER: 90000, EMPLOYEE: 60000 };
    let processedCount = 0;

    for (const user of users) {
      const existing = await prisma.payrollRecord.findUnique({
        where: { userId_month_year: { userId: user.id, month: parseInt(month), year: parseInt(year) } },
      });
      if (existing) continue;

      const basicSalary = salaryMap[user.role] || 60000;
      const breakdown = calculatePayroll(basicSalary);

      await prisma.payrollRecord.create({
        data: {
          userId: user.id,
          organizationId: orgId || null,
          month: parseInt(month),
          year: parseInt(year),
          ...breakdown,
          status: 'PROCESSED',
        },
      });
      processedCount++;

      try {
        await notifyPayslipReady(user.id, parseInt(month), parseInt(year));
      } catch (notifyErr) {
        console.error('Notification error:', notifyErr.message);
      }
    }

    return success(res, { processed: processedCount, skipped: users.length - processedCount }, `Monthly payroll processed for ${processedCount} employees`, 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to process monthly payroll', 500);
  }
};

module.exports = { getMyPayslips, getPayslipById, getAllPayroll, processPayroll, getPayrollSummary, downloadPayslipPDF, emailPayslip, processMonthlyPayroll };
