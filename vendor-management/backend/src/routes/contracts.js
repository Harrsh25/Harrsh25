const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { nextNumber } = require("../lib/numbering");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { vendorId } = req.query;
    const contracts = await prisma.contract.findMany({
      where: { vendorId: vendorId || undefined },
      include: { vendor: true, milestones: true, revisions: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(contracts);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { vendor: true, milestones: true, purchaseOrders: true, revisions: true, parentContract: true },
    });
    if (!contract) return res.status(404).json({ error: "Contract not found" });
    res.json(contract);
  })
);

// Centralized contract repository (7.1.1) — covers master agreements, SOWs,
// blanket POs, and amendments through the same `type` field.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { vendorId, type, title, startDate, endDate, fileUrl, milestones, renewalReminderDays } = req.body;
    const contractNumber = await nextNumber(prisma, "contract", "CON");
    const contract = await prisma.contract.create({
      data: {
        contractNumber,
        vendorId,
        type,
        title,
        status: "ACTIVE",
        startDate,
        endDate,
        fileUrl,
        renewalReminderDays: renewalReminderDays || [90, 30],
        milestones: milestones ? { create: milestones } : undefined,
      },
      include: { milestones: true },
    });
    res.status(201).json(contract);
  })
);

// Change Order Management (7.1.5) — creates a new versioned revision that
// keeps the prior version intact for audit rather than overwriting it.
router.post(
  "/:id/amendments",
  asyncHandler(async (req, res) => {
    const original = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: "Contract not found" });
    const contractNumber = await nextNumber(prisma, "contract", "CON");
    const amendment = await prisma.contract.create({
      data: {
        contractNumber,
        vendorId: original.vendorId,
        type: "AMENDMENT",
        title: `${original.title} — Amendment`,
        status: "ACTIVE",
        startDate: original.startDate,
        endDate: req.body.endDate || original.endDate,
        parentContractId: original.id,
        version: original.version + 1,
        fileUrl: req.body.fileUrl,
      },
    });
    res.status(201).json(amendment);
  })
);

// Contracts nearing renewal — powers the 90/30-day reminder job (7.1.2).
router.get(
  "/alerts/renewals",
  asyncHandler(async (req, res) => {
    const contracts = await prisma.contract.findMany({
      where: { status: "ACTIVE", endDate: { not: null } },
      include: { vendor: true },
    });
    const now = Date.now();
    const withDaysLeft = contracts
      .map((c) => ({
        ...c,
        daysToExpiry: c.endDate ? Math.ceil((new Date(c.endDate).getTime() - now) / 86400000) : null,
      }))
      .filter((c) => c.daysToExpiry !== null && c.renewalReminderDays.some((d) => c.daysToExpiry <= d));
    res.json(withDaysLeft);
  })
);

// SOW Milestone tracking (9.2.5) + Deliverable Approval (9.2.6)
router.post(
  "/milestones/:milestoneId/complete",
  asyncHandler(async (req, res) => {
    const milestone = await prisma.sOWMilestone.update({
      where: { id: req.params.milestoneId },
      data: { status: "COMPLETED" },
    });
    res.json(milestone);
  })
);

router.post(
  "/milestones/:milestoneId/accept",
  asyncHandler(async (req, res) => {
    const milestone = await prisma.sOWMilestone.update({
      where: { id: req.params.milestoneId },
      data: { status: "ACCEPTED", acceptedByUserId: req.body.acceptedByUserId, acceptedAt: new Date() },
    });
    res.json(milestone);
  })
);

module.exports = router;
