const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

const PF_RATE = 0.12;
const ESI_RATE = 0.0075;
const ESI_THRESHOLD = 21000;
const PT_SLABS = [
  { max: 15000, tax: 0 },
  { max: 20000, tax: 150 },
  { max: Infinity, tax: 200 },
];

const getProfessionalTax = (gross) => {
  for (const slab of PT_SLABS) {
    if (gross <= slab.max) return slab.tax;
  }
  return 200;
};

const calculatePayroll = (basicSalary) => {
  const hra = basicSalary * 0.4;
  const specialAllowance = basicSalary * 0.1;
  const transportAllowance = 1600;
  const medicalAllowance = 1250;
  const grossSalary = basicSalary + hra + specialAllowance + transportAllowance + medicalAllowance;

  const pfEmployee = Math.min(basicSalary * PF_RATE, 1800);
  const pfEmployer = pfEmployee;
  const professionalTax = getProfessionalTax(grossSalary);
  const esiEmployee = grossSalary <= ESI_THRESHOLD ? Math.round(grossSalary * ESI_RATE) : 0;

  // Simple TDS: 0% up to 5L/yr, 5% 5-10L, 20% above 10L
  const annualGross = grossSalary * 12;
  let annualTDS = 0;
  if (annualGross > 1000000) annualTDS = (annualGross - 1000000) * 0.2 + 250000 * 0.05;
  else if (annualGross > 500000) annualTDS = (annualGross - 500000) * 0.05;
  const tds = Math.round(annualTDS / 12);

  const totalDeductions = pfEmployee + professionalTax + esiEmployee + tds;
  const netSalary = grossSalary - totalDeductions;

  return {
    basicSalary,
    hra: Math.round(hra),
    specialAllowance: Math.round(specialAllowance),
    transportAllowance,
    medicalAllowance,
    grossSalary: Math.round(grossSalary),
    pfEmployee: Math.round(pfEmployee),
    pfEmployer: Math.round(pfEmployer),
    professionalTax,
    esiEmployee,
    tds,
    totalDeductions: Math.round(totalDeductions),
    netSalary: Math.round(netSalary),
  };
};

const generatePayslipPDF = (payroll, user, org) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthName = MONTHS[payroll.month - 1];
    const primaryColor = '#4F46E5';
    const textGray = '#374151';

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text(org?.name || 'Harrsh HR', 40, 20);
    doc.fontSize(10).font('Helvetica').text('PAYSLIP', 40, 48);
    doc.text(`${monthName} ${payroll.year}`, doc.page.width - 140, 48, { align: 'right', width: 100 });

    doc.fillColor(textGray);

    // Employee details
    doc.fontSize(11).font('Helvetica-Bold').text('Employee Details', 40, 100);
    doc.moveTo(40, 115).lineTo(doc.page.width - 40, 115).stroke('#e5e7eb');

    const empDetails = [
      ['Name', `${user.firstName} ${user.lastName}`],
      ['Employee ID', user.employeeId],
      ['Department', user.department || '-'],
      ['Designation', user.designation || '-'],
      ['Pay Period', `${monthName} ${payroll.year}`],
      ['Pay Date', payroll.paidAt ? new Date(payroll.paidAt).toDateString() : '-'],
    ];
    let y = 125;
    empDetails.forEach(([label, value]) => {
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text(label, 40, y);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(textGray).text(value, 200, y);
      y += 18;
    });

    // Earnings & Deductions
    y += 10;
    doc.fontSize(11).font('Helvetica-Bold').text('Earnings', 40, y);
    doc.text('Deductions', 320, y);
    y += 15;
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#e5e7eb');
    y += 8;

    const earnings = [
      ['Basic Salary', payroll.basicSalary],
      ['HRA', payroll.hra],
      ['Special Allowance', payroll.specialAllowance],
      ['Transport Allowance', payroll.transportAllowance],
      ['Medical Allowance', payroll.medicalAllowance],
    ];
    const deductions = [
      ['PF (Employee)', payroll.pfEmployee],
      ['Professional Tax', payroll.professionalTax],
      ['ESI', payroll.esiEmployee],
      ['TDS', payroll.tds],
    ];

    const maxRows = Math.max(earnings.length, deductions.length);
    for (let i = 0; i < maxRows; i++) {
      if (earnings[i]) {
        doc.font('Helvetica').fontSize(9).fillColor(textGray).text(earnings[i][0], 40, y);
        doc.font('Helvetica-Bold').fontSize(9).text(`₹ ${earnings[i][1].toLocaleString('en-IN')}`, 200, y, { align: 'right', width: 80 });
      }
      if (deductions[i]) {
        doc.font('Helvetica').fontSize(9).fillColor(textGray).text(deductions[i][0], 320, y);
        doc.font('Helvetica-Bold').fontSize(9).text(`₹ ${deductions[i][1].toLocaleString('en-IN')}`, 480, y, { align: 'right', width: 75 });
      }
      y += 18;
    }

    y += 10;
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#e5e7eb');
    y += 8;

    doc.font('Helvetica-Bold').fontSize(10).fillColor(textGray)
      .text('Gross Salary', 40, y)
      .text(`₹ ${payroll.grossSalary.toLocaleString('en-IN')}`, 200, y, { align: 'right', width: 80 });
    doc.text('Total Deductions', 320, y)
      .text(`₹ ${payroll.totalDeductions.toLocaleString('en-IN')}`, 480, y, { align: 'right', width: 75 });

    // Net pay
    y += 35;
    doc.rect(40, y, doc.page.width - 80, 44).fill('#F0FDF4');
    doc.fillColor('#16A34A').fontSize(13).font('Helvetica-Bold')
      .text('NET PAY', 60, y + 14)
      .text(`₹ ${payroll.netSalary.toLocaleString('en-IN')}`, 60, y + 14, { align: 'right', width: doc.page.width - 120 });

    // Footer
    doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica')
      .text('This is a system-generated payslip and does not require a signature.', 40, doc.page.height - 50, { align: 'center', width: doc.page.width - 80 });

    doc.end();
  });
};

module.exports = { calculatePayroll, generatePayslipPDF };
