const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');

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

module.exports = { getMyPayslips, getPayslipById, getAllPayroll, processPayroll, getPayrollSummary };
