const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { attendanceReport, leaveReport, payrollReport } = require('../controllers/reportController');

router.use(authenticate, authorize('HR', 'ADMIN', 'MANAGER'));

router.get('/attendance', attendanceReport);
router.get('/leave', leaveReport);
router.get('/payroll', payrollReport);

module.exports = router;
