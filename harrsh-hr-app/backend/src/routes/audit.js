const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditController');

router.get('/', authenticate, authorize('HR', 'ADMIN'), getAuditLogs);

module.exports = router;
