const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { documentUpload } = require('../middleware/upload');
const {
  uploadDocument, listDocuments, verifyDocument, deleteDocument, getExpiringDocuments,
} = require('../controllers/documentController');

router.use(authenticate);

router.post('/upload', documentUpload.single('file'), uploadDocument);
router.get('/', listDocuments);
router.get('/expiring', authorize('HR', 'ADMIN'), getExpiringDocuments);
router.put('/:id/verify', authorize('HR', 'ADMIN'), verifyDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
