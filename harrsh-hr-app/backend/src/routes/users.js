const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAllUsers, getUserById, updateUser, deleteUser, updateProfilePhoto, getDirectReports } = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', authenticate, authorize('HR', 'ADMIN', 'MANAGER'), getAllUsers);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, authorize('HR', 'ADMIN'), updateUser);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser);
router.put('/:id/photo', authenticate, upload.single('photo'), updateProfilePhoto);
router.get('/:id/direct-reports', authenticate, getDirectReports);

module.exports = router;
