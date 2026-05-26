const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { checkIn, checkOut, getMyAttendance, getAttendanceSummary, getAllAttendance, getAttendanceByDate } = require('../controllers/attendanceController');

router.post('/check-in', authenticate, checkIn);
router.put('/check-out', authenticate, checkOut);
router.get('/me', authenticate, getMyAttendance);
router.get('/summary', authenticate, getAttendanceSummary);
router.get('/', authenticate, authorize('HR', 'ADMIN', 'MANAGER'), getAllAttendance);
router.get('/date/:date', authenticate, authorize('HR', 'ADMIN', 'MANAGER'), getAttendanceByDate);

module.exports = router;
