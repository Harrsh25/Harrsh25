const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  checkIn, checkOut, getMyAttendance, getAttendanceSummary, getAllAttendance, getAttendanceByDate,
  requestRegularization, getRegularizations, approveRegularization,
} = require('../controllers/attendanceController');

router.post('/check-in', authenticate, checkIn);
router.put('/check-out', authenticate, checkOut);
router.get('/me', authenticate, getMyAttendance);
router.get('/summary', authenticate, getAttendanceSummary);
router.get('/regularizations', authenticate, authorize('MANAGER', 'HR', 'ADMIN'), getRegularizations);
router.put('/regularizations/:id/approve', authenticate, authorize('MANAGER', 'HR', 'ADMIN'), approveRegularization);
router.get('/', authenticate, authorize('HR', 'ADMIN', 'MANAGER'), getAllAttendance);
router.get('/date/:date', authenticate, authorize('HR', 'ADMIN', 'MANAGER'), getAttendanceByDate);
router.post('/:id/regularize', authenticate, requestRegularization);

module.exports = router;
