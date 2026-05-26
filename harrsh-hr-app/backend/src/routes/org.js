const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  onboardOrg, getMyOrg, updateOrg,
  getOrgSettings, updateOrgSettings,
  getHolidays, createHoliday, deleteHoliday,
} = require('../controllers/orgController');

router.use(authenticate);

router.post('/onboard', onboardOrg);
router.get('/', getMyOrg);
router.put('/', authorize('ADMIN', 'HR'), updateOrg);
router.get('/settings', getOrgSettings);
router.put('/settings', authorize('ADMIN', 'HR'), updateOrgSettings);
router.get('/holidays', getHolidays);
router.post('/holidays', authorize('ADMIN', 'HR'), createHoliday);
router.delete('/holidays/:id', authorize('ADMIN', 'HR'), deleteHoliday);

module.exports = router;
