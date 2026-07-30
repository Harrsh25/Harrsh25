const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { nextNumber } = require("../lib/numbering");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

// List vendors — filterable by status/type/search, used by both the directory
// screen and pickers (RFQ invite list, PO vendor select, etc).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, vendorType, search } = req.query;
    const vendors = await prisma.vendor.findMany({
      where: {
        status: status || undefined,
        vendorType: vendorType || undefined,
        ...(search
          ? {
              OR: [
                { legalName: { contains: search, mode: "insensitive" } },
                { vendorCode: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { holds: { where: { active: true } }, tradeTags: { include: { tradeCategory: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(vendors);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        contacts: true,
        bankAccounts: true,
        documents: true,
        holds: true,
        tradeTags: { include: { tradeCategory: true } },
        rateCards: true,
        scorecards: { include: { metrics: true }, orderBy: { evaluationPeriodEnd: "desc" } },
        correctiveActions: true,
      },
    });
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json(vendor);
  })
);

// Vendor Registration Form (module 1.1.1) — creates a Prospective-tier record.
// Only minimal fields are required at this stage; full profile fields are
// filled in when the vendor is promoted (see /promote below).
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { legalName, vendorType, currency, contact } = req.body;
    if (!legalName || !vendorType) {
      return res.status(400).json({ error: "legalName and vendorType are required" });
    }
    const vendorCode = await nextNumber(prisma, "vendor", "VEN");
    const vendor = await prisma.vendor.create({
      data: {
        vendorCode,
        legalName,
        vendorType,
        currency: currency || "INR",
        status: "PROSPECTIVE",
        contacts: contact
          ? { create: [{ name: contact.name, email: contact.email, phone: contact.phone, isPrimary: true }] }
          : undefined,
      },
      include: { contacts: true },
    });
    res.status(201).json(vendor);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const allowed = [
      "legalName",
      "tradingAsName",
      "taxIdType",
      "taxIdNumber",
      "countryOfRegistration",
      "currency",
      "paymentTermsTemplate",
      "defaultTaxTemplate",
      "withholdingTaxRate",
      "preferredSupplier",
      "isInternalSupplier",
      "internalCompanyRef",
      "groupId",
    ];
    const data = {};
    for (const key of allowed) if (key in req.body) data[key] = req.body[key];
    const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data });
    res.json(vendor);
  })
);

// Two-tier registration: Prospective -> Spend-Authorized (module 1.1.2).
// Requires the fuller profile (tax ID + at least one bank account) and is
// gated by an approval instance rather than flipping status directly.
router.post(
  "/:id/promote",
  asyncHandler(async (req, res) => {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: { bankAccounts: true },
    });
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    if (vendor.status !== "PROSPECTIVE" && vendor.status !== "PENDING_APPROVAL") {
      return res.status(409).json({ error: `Vendor is already ${vendor.status}` });
    }
    if (!vendor.taxIdNumber || vendor.bankAccounts.length === 0) {
      return res.status(400).json({
        error: "Tax ID and at least one bank account are required before promotion",
      });
    }

    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { entityType: "VENDOR" },
      include: { stages: true },
    });
    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: { status: "PENDING_APPROVAL" },
    });
    const instance = workflow
      ? await prisma.approvalInstance.create({
          data: { workflowId: workflow.id, entityType: "VENDOR", entityId: vendor.id },
        })
      : null;
    res.json({ vendor: updated, approvalInstance: instance });
  })
);

// Vendor Type Classification / multi-trade tagging (module 1.3)
router.post(
  "/:id/trade-tags",
  asyncHandler(async (req, res) => {
    const { tradeCategoryName } = req.body;
    const tradeCategory = await prisma.tradeCategory.upsert({
      where: { name: tradeCategoryName },
      update: {},
      create: { name: tradeCategoryName },
    });
    const tag = await prisma.vendorTradeTag.upsert({
      where: { vendorId_tradeCategoryId: { vendorId: req.params.id, tradeCategoryId: tradeCategory.id } },
      update: {},
      create: { vendorId: req.params.id, tradeCategoryId: tradeCategory.id },
      include: { tradeCategory: true },
    });
    res.status(201).json(tag);
  })
);

// Contacts
router.post(
  "/:id/contacts",
  asyncHandler(async (req, res) => {
    const contact = await prisma.vendorContact.create({
      data: { vendorId: req.params.id, ...req.body },
    });
    res.status(201).json(contact);
  })
);

// Bank accounts (module 3.5 / 3.6 — multiple accounts, one default)
router.post(
  "/:id/bank-accounts",
  asyncHandler(async (req, res) => {
    const { isDefault, ...rest } = req.body;
    if (isDefault) {
      await prisma.vendorBankAccount.updateMany({
        where: { vendorId: req.params.id },
        data: { isDefault: false },
      });
    }
    const account = await prisma.vendorBankAccount.create({
      data: { vendorId: req.params.id, isDefault: !!isDefault, ...rest },
    });
    res.status(201).json(account);
  })
);

// Document upload + checklist verification (module 1.2)
router.post(
  "/:id/documents",
  asyncHandler(async (req, res) => {
    const doc = await prisma.vendorDocument.create({
      data: { vendorId: req.params.id, ...req.body },
    });
    res.status(201).json(doc);
  })
);

router.patch(
  "/documents/:docId",
  asyncHandler(async (req, res) => {
    const { status, rejectionReason, reviewedByUserId } = req.body;
    const doc = await prisma.vendorDocument.update({
      where: { id: req.params.docId },
      data: { status, rejectionReason, reviewedByUserId },
    });
    res.json(doc);
  })
);

// Hold / Block vendor (module 3.13 / 11.2.1)
router.post(
  "/:id/holds",
  asyncHandler(async (req, res) => {
    const hold = await prisma.vendorHold.create({
      data: { vendorId: req.params.id, ...req.body },
    });
    await prisma.vendor.update({ where: { id: req.params.id }, data: { status: "ON_HOLD" } });
    res.status(201).json(hold);
  })
);

router.post(
  "/holds/:holdId/release",
  asyncHandler(async (req, res) => {
    const hold = await prisma.vendorHold.update({
      where: { id: req.params.holdId },
      data: { active: false },
    });
    const remainingActive = await prisma.vendorHold.count({
      where: { vendorId: hold.vendorId, active: true },
    });
    if (remainingActive === 0) {
      await prisma.vendor.update({ where: { id: hold.vendorId }, data: { status: "SPEND_AUTHORIZED" } });
    }
    res.json(hold);
  })
);

// Blacklist / deactivate (module 3.11 / 12.2.2)
router.post(
  "/:id/deactivate",
  asyncHandler(async (req, res) => {
    const { reason, blacklist } = req.body;
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { status: blacklist ? "BLACKLISTED" : "DEACTIVATED" },
    });
    await prisma.auditLogEntry.create({
      data: {
        entityType: "VENDOR",
        entityId: vendor.id,
        action: blacklist ? "BLACKLISTED" : "DEACTIVATED",
        changes: { reason },
      },
    });
    res.json(vendor);
  })
);

module.exports = router;
