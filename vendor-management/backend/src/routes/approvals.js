const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

// One engine drives vendor approval, PO approval, and invoice hold/release —
// each is just a different ApprovalWorkflow (entityType + ordered stages)
// pointed at the same instance/action tables.

router.post(
  "/workflows",
  asyncHandler(async (req, res) => {
    const { name, entityType, stages } = req.body; // stages: [{sequence, name, approverRole}]
    const workflow = await prisma.approvalWorkflow.create({
      data: {
        name,
        entityType,
        stages: { create: stages },
      },
      include: { stages: true },
    });
    res.status(201).json(workflow);
  })
);

router.get(
  "/workflows",
  asyncHandler(async (req, res) => {
    const workflows = await prisma.approvalWorkflow.findMany({
      where: { entityType: req.query.entityType || undefined },
      include: { stages: { orderBy: { sequence: "asc" } } },
    });
    res.json(workflows);
  })
);

// Pending approvals queue for a given approver role — powers the "Approvals"
// inbox screen across every entity type at once.
router.get(
  "/queue",
  asyncHandler(async (req, res) => {
    const instances = await prisma.approvalInstance.findMany({
      where: { status: "PENDING" },
      include: { workflow: { include: { stages: true } }, actions: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(instances);
  })
);

router.get(
  "/instances/:id",
  asyncHandler(async (req, res) => {
    const instance = await prisma.approvalInstance.findUnique({
      where: { id: req.params.id },
      include: { workflow: { include: { stages: true } }, actions: { orderBy: { actedAt: "asc" } } },
    });
    if (!instance) return res.status(404).json({ error: "Approval instance not found" });
    res.json(instance);
  })
);

// Act on the current stage. Rejection ends the workflow immediately
// (module 2.1.2 rejection/resubmission — resubmission is a new instance).
router.post(
  "/instances/:id/act",
  asyncHandler(async (req, res) => {
    const { decision, approverUserId, comments } = req.body; // decision: APPROVED | REJECTED
    const instance = await prisma.approvalInstance.findUnique({
      where: { id: req.params.id },
      include: { workflow: { include: { stages: true } } },
    });
    if (!instance) return res.status(404).json({ error: "Approval instance not found" });
    if (instance.status !== "PENDING") {
      return res.status(409).json({ error: `Instance already ${instance.status}` });
    }

    await prisma.approvalAction.create({
      data: {
        instanceId: instance.id,
        stageSequence: instance.currentStage,
        approverUserId,
        decision,
        comments,
      },
    });

    if (decision === "REJECTED") {
      const updated = await prisma.approvalInstance.update({
        where: { id: instance.id },
        data: { status: "REJECTED" },
      });
      return res.json(updated);
    }

    const stages = instance.workflow.stages.sort((a, b) => a.sequence - b.sequence);
    const isLastStage = instance.currentStage >= stages[stages.length - 1].sequence;

    const updated = await prisma.approvalInstance.update({
      where: { id: instance.id },
      data: isLastStage
        ? { status: "APPROVED" }
        : { currentStage: instance.currentStage + 1 },
    });

    // On final approval, flip the underlying entity's status.
    if (isLastStage && instance.entityType === "VENDOR") {
      await prisma.vendor.update({
        where: { id: instance.entityId },
        data: { status: "SPEND_AUTHORIZED" },
      });
    }
    if (isLastStage && instance.entityType === "PURCHASE_ORDER") {
      await prisma.purchaseOrder.update({
        where: { id: instance.entityId },
        data: { status: "APPROVED" },
      });
    }
    if (isLastStage && instance.entityType === "INVOICE") {
      await prisma.invoice.update({
        where: { id: instance.entityId },
        data: { status: "APPROVED" },
      });
    }

    res.json(updated);
  })
);

module.exports = router;
