const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const { success, error } = require('../utils/response');

const prisma = new PrismaClient();

const DOCUMENT_TYPES = [
  'AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'DEGREE',
  'OFFER_LETTER', 'CONTRACT', 'EXPERIENCE_LETTER', 'RELIEVING_LETTER',
  'PAYSLIP', 'OTHER',
];

// POST /documents
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);
    const { name, type, expiryDate } = req.body;
    if (!name) return error(res, 'Document name is required', 400);

    const docType = DOCUMENT_TYPES.includes(type) ? type : 'OTHER';
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    const document = await prisma.document.create({
      data: {
        userId: req.user.id,
        organizationId: req.user.organizationId || null,
        name,
        type: docType,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: 'PENDING',
      },
    });

    return success(res, document, 'Document uploaded successfully', 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to upload document', 500);
  }
};

// GET /documents
const getMyDocuments = async (req, res) => {
  try {
    const { type } = req.query;
    const where = { userId: req.user.id, isDeleted: false };
    if (type) where.type = type;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const docsWithWarnings = documents.map(doc => ({
      ...doc,
      isExpiringSoon: doc.expiryDate && new Date(doc.expiryDate) <= thirtyDaysLater && new Date(doc.expiryDate) > now,
      isExpired: doc.expiryDate && new Date(doc.expiryDate) < now,
    }));

    return success(res, docsWithWarnings);
  } catch (err) {
    return error(res, 'Failed to fetch documents', 500);
  }
};

// GET /documents/attention
const getDocumentsRequiringAttention = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where = { isDeleted: false };
    if (orgId) where.organizationId = orgId;

    const docs = await prisma.document.findMany({
      where: {
        ...where,
        OR: [
          { status: 'PENDING' },
          { expiryDate: { lte: thirtyDaysLater, gte: now } },
        ],
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return success(res, docs);
  } catch (err) {
    return error(res, 'Failed to fetch documents requiring attention', 500);
  }
};

// GET /documents/expiring
const getExpiringDocuments = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const now = new Date();
    const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const where = {
      isDeleted: false,
      expiryDate: { lte: sixtyDaysLater, gte: now },
    };

    if (!['HR', 'ADMIN', 'MANAGER'].includes(req.user.role)) {
      where.userId = req.user.id;
    } else if (orgId) {
      where.organizationId = orgId;
    }

    const docs = await prisma.document.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return success(res, docs);
  } catch (err) {
    return error(res, 'Failed to fetch expiring documents', 500);
  }
};

// GET /documents/:id
const getDocumentById = async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc || doc.isDeleted) return error(res, 'Document not found', 404);
    if (doc.userId !== req.user.id && !['HR', 'ADMIN'].includes(req.user.role)) {
      return error(res, 'Forbidden', 403);
    }
    return success(res, doc);
  } catch (err) {
    return error(res, 'Failed to fetch document', 500);
  }
};

// GET /documents/:id/download
const downloadDocument = async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc || doc.isDeleted) return error(res, 'Document not found', 404);
    if (doc.userId !== req.user.id && !['HR', 'ADMIN'].includes(req.user.role)) {
      return error(res, 'Forbidden', 403);
    }

    const filePath = path.join(__dirname, '..', '..', doc.fileUrl);
    if (!fs.existsSync(filePath)) return error(res, 'File not found on server', 404);

    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.sendFile(filePath);
  } catch (err) {
    return error(res, 'Failed to download document', 500);
  }
};

// DELETE /documents/:id
const deleteDocument = async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc || doc.isDeleted) return error(res, 'Document not found', 404);
    if (doc.userId !== req.user.id && !['HR', 'ADMIN'].includes(req.user.role)) {
      return error(res, 'Forbidden', 403);
    }
    await prisma.document.update({ where: { id: req.params.id }, data: { isDeleted: true } });
    return success(res, null, 'Document deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete document', 500);
  }
};

// POST /documents/request
const requestDocument = async (req, res) => {
  try {
    const { employeeId, documentType, message } = req.body;
    if (!employeeId || !documentType) return error(res, 'Employee ID and document type are required', 400);

    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) return error(res, 'Employee not found', 404);

    await prisma.notification.create({
      data: {
        userId: employeeId,
        organizationId: req.user.organizationId || null,
        title: 'Document Required',
        message: message || `Please upload your ${documentType} document`,
        type: 'WARNING',
        actionUrl: '/documents',
      },
    });

    return success(res, null, 'Document request sent to employee');
  } catch (err) {
    return error(res, 'Failed to request document', 500);
  }
};

// PUT /documents/:id/verify
const verifyDocument = async (req, res) => {
  try {
    const { status, comment } = req.body;
    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return error(res, 'Status must be VERIFIED or REJECTED', 400);
    }

    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc || doc.isDeleted) return error(res, 'Document not found', 404);

    const updated = await prisma.document.update({
      where: { id: req.params.id },
      data: { status, verifiedById: req.user.id, verifierComment: comment || null },
    });

    await prisma.notification.create({
      data: {
        userId: doc.userId,
        organizationId: req.user.organizationId || null,
        title: `Document ${status === 'VERIFIED' ? 'Verified' : 'Rejected'}`,
        message: `Your document "${doc.name}" has been ${status.toLowerCase()}${comment ? ': ' + comment : ''}`,
        type: status === 'VERIFIED' ? 'SUCCESS' : 'ERROR',
        actionUrl: '/documents',
      },
    });

    return success(res, updated, `Document ${status.toLowerCase()} successfully`);
  } catch (err) {
    return error(res, 'Failed to verify document', 500);
  }
};

module.exports = {
  uploadDocument,
  getMyDocuments,
  getDocumentsRequiringAttention,
  getExpiringDocuments,
  getDocumentById,
  downloadDocument,
  deleteDocument,
  requestDocument,
  verifyDocument,
};
