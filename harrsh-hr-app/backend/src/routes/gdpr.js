const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { exportMyData, deleteMyData, exportEmployeeData } = require('../controllers/gdprController');

router.get('/export', authenticate, exportMyData);
router.delete('/me', authenticate, deleteMyData);
router.get('/export/:userId', authenticate, authorize('HR', 'ADMIN'), exportEmployeeData);

module.exports = router;
