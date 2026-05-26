const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { documentUpload } = require('../middleware/upload');
const {
  uploadDocument, getMyDocuments, getDocumentsRequiringAttention,
  getExpiringDocuments, getDocumentById, downloadDocument,
  deleteDocument, requestDocument, verifyDocument,
} = require('../controllers/documentController');

router.use(authenticate);

router.post('/upload', documentUpload.single('file'), uploadDocument);
router.get('/', getMyDocuments);
router.get('/attention', authorize('HR', 'ADMIN', 'MANAGER'), getDocumentsRequiringAttention);
router.get('/expiring', authorize('HR', 'ADMIN'), getExpiringDocuments);
router.post('/request', authorize('HR', 'ADMIN'), requestDocument);
router.get('/:id', getDocumentById);
router.get('/:id/download', downloadDocument);
router.put('/:id/verify', authorize('HR', 'ADMIN'), verifyDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
