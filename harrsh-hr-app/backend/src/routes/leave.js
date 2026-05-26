const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { applyLeave, getMyLeaves, getLeaveBalance, getLeaveById, cancelLeave, approveLeave, rejectLeave, getPendingApprovals, getLeaveTypes, getLeaveCalendar, getTeamLeaves } = require('../controllers/leaveController');

router.get('/types', authenticate, getLeaveTypes);
router.get('/balance', authenticate, getLeaveBalance);
router.get('/me', authenticate, getMyLeaves);
router.get('/pending', authenticate, authorize('MANAGER', 'HR', 'ADMIN'), getPendingApprovals);
router.get('/:id', authenticate, getLeaveById);
router.post('/',
  authenticate,
  [
    body('leaveTypeId').notEmpty().withMessage('Leave type required'),
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('endDate').isISO8601().withMessage('Valid end date required'),
    body('reason').isLength({ min: 10 }).withMessage('Reason must be at least 10 characters'),
  ],
  validate,
  applyLeave
);
router.put('/:id/cancel', authenticate, cancelLeave);
router.get('/calendar', authenticate, getLeaveCalendar);
router.get('/team', authenticate, authorize('MANAGER', 'HR', 'ADMIN'), getTeamLeaves);
router.put('/:id/approve', authenticate, authorize('MANAGER', 'HR', 'ADMIN'), approveLeave);
router.put('/:id/reject', authenticate, authorize('MANAGER', 'HR', 'ADMIN'), rejectLeave);

module.exports = router;
