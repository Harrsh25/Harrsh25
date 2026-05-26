const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getMyPayslips, getPayslipById, getAllPayroll, processPayroll, getPayrollSummary, downloadPayslipPDF, emailPayslip, processMonthlyPayroll } = require('../controllers/payrollController');

router.get('/me', authenticate, getMyPayslips);
router.get('/summary', authenticate, authorize('HR', 'ADMIN'), getPayrollSummary);
router.get('/', authenticate, authorize('HR', 'ADMIN'), getAllPayroll);
router.post('/process', authenticate, authorize('HR', 'ADMIN'), processPayroll);
router.post('/process-all', authenticate, authorize('HR', 'ADMIN'), processMonthlyPayroll);
router.get('/:id/download', authenticate, downloadPayslipPDF);
router.get('/:id/pdf', authenticate, downloadPayslipPDF);
router.post('/:id/email', authenticate, authorize('HR', 'ADMIN'), emailPayslip);
router.get('/:id', authenticate, getPayslipById);

module.exports = router;
