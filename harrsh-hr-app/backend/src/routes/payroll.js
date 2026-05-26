const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getMyPayslips, getPayslipById, getAllPayroll, processPayroll, getPayrollSummary } = require('../controllers/payrollController');

router.get('/me', authenticate, getMyPayslips);
router.get('/summary', authenticate, authorize('HR', 'ADMIN'), getPayrollSummary);
router.get('/', authenticate, authorize('HR', 'ADMIN'), getAllPayroll);
router.post('/process', authenticate, authorize('HR', 'ADMIN'), processPayroll);
router.get('/:id', authenticate, getPayslipById);

module.exports = router;
