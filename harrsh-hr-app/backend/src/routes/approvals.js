const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getPendingApprovals, getApprovalById, approveRequest, rejectRequest } = require('../controllers/approvalController');

router.get('/pending', authenticate, authorize('MANAGER', 'HR', 'ADMIN'), getPendingApprovals);
router.get('/:id', authenticate, getApprovalById);
router.put('/:id/approve', authenticate, authorize('MANAGER', 'HR', 'ADMIN'), approveRequest);
router.put('/:id/reject', authenticate, authorize('MANAGER', 'HR', 'ADMIN'), rejectRequest);

module.exports = router;
