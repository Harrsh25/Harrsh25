const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  onboardOrg, getMyOrg, updateOrg,
  getOrgSettings, updateOrgSettings,
  getOrgStats, inviteEmployee,
  getOrgHolidays, addHoliday, deleteHoliday,
} = require('../controllers/orgController');

// Onboarding is public (creates first org + admin)
router.post('/onboard', onboardOrg);

// All other routes require auth
router.use(authenticate);

router.get('/', getMyOrg);
router.put('/', authorize('ADMIN'), updateOrg);
router.get('/settings', getOrgSettings);
router.put('/settings', authorize('ADMIN'), updateOrgSettings);
router.get('/stats', authorize('ADMIN', 'HR'), getOrgStats);
router.post('/invite', authorize('ADMIN', 'HR'), inviteEmployee);
router.get('/holidays', getOrgHolidays);
router.post('/holidays', authorize('ADMIN', 'HR'), addHoliday);
router.delete('/holidays/:id', authorize('ADMIN', 'HR'), deleteHoliday);

module.exports = router;
