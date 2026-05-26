const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { successResponse, errorResponse } = require('../utils/response');
const { sendNotificationToUser } = require('../services/notificationService');

const prisma = new PrismaClient();

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json(errorResponse('No file uploaded'));

    const { name, type, expiryDate } = req.body;
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    const doc = await prisma.document.create({
      data: {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        name: name || req.file.originalname,
        type: type || 'OTHER',
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: 'PENDING',
      },
    });

    res.status(201).json(successResponse(doc, 'Document uploaded'));
  } catch (err) {
    next(err);
  }
};

const listDocuments = async (req, res, next) => {
  try {
    const { userId, type, status } = req.query;
    const where = { isDeleted: false };

    if (req.user.role === 'EMPLOYEE') {
      where.userId = req.user.id;
    } else {
      where.organizationId = req.user.organizationId;
      if (userId) where.userId = userId;
    }
    if (type) where.type = type;
    if (status) where.status = status;

    const docs = await prisma.document.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(successResponse(docs));
  } catch (err) {
    next(err);
  }
};

const verifyDocument = async (req, res, next) => {
  try {
    const { status, verifierComment } = req.body;
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { status, verifiedById: req.user.id, verifierComment },
    });

    await sendNotificationToUser(doc.userId, {
      title: `Document ${status}`,
      message: `Your document "${doc.name}" has been ${status.toLowerCase()}`,
      type: 'INFO',
      actionUrl: '/documents',
    });

    res.json(successResponse(doc, 'Document updated'));
  } catch (err) {
    next(err);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json(errorResponse('Document not found'));
    if (doc.userId !== req.user.id && !['HR', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json(errorResponse('Forbidden'));
    }
    await prisma.document.update({ where: { id: req.params.id }, data: { isDeleted: true } });
    res.json(successResponse(null, 'Document deleted'));
  } catch (err) {
    next(err);
  }
};

const getExpiringDocuments = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days || '30');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const docs = await prisma.document.findMany({
      where: {
        organizationId: req.user.organizationId,
        isDeleted: false,
        expiryDate: { lte: cutoff, gte: new Date() },
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { expiryDate: 'asc' },
    });

    res.json(successResponse(docs));
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadDocument, listDocuments, verifyDocument, deleteDocument, getExpiringDocuments };
