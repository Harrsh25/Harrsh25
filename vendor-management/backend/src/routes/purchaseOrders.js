const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { nextNumber } = require("../lib/numbering");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { vendorId, status } = req.query;
    const pos = await prisma.purchaseOrder.findMany({
      where: { vendorId: vendorId || undefined, status: status || undefined },
      include: { vendor: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(pos);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: true,
        items: true,
        goodsReceipts: { include: { items: true } },
        invoices: true,
        contract: true,
        revisions: true,
      },
    });
    if (!po) return res.status(404).json({ error: "Purchase order not found" });
    res.json(po);
  })
);

// Direct PO creation (7.2.1) — for the case where there's no RFQ/quotation
// behind it (RFQ-converted POs are created via /rfqs/:id/select instead).
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { vendorId, contractId, currency, deliveryDate, deliveryLocation, isDropship, dropshipAddress, items } =
      req.body;
    const poNumber = await nextNumber(prisma, "purchaseOrder", "PO");
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId,
        contractId,
        currency: currency || "INR",
        deliveryDate,
        deliveryLocation,
        isDropship: !!isDropship,
        dropshipAddress,
        items: { create: items }, // [{itemName, uom, orderedQty, unitPrice}]
      },
      include: { items: true },
    });
    res.status(201).json(po);
  })
);

router.post(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: "SUBMITTED" },
    });

    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { entityType: "PURCHASE_ORDER" },
    });
    const instance = workflow
      ? await prisma.approvalInstance.create({
          data: { workflowId: workflow.id, entityType: "PURCHASE_ORDER", entityId: po.id },
        })
      : null;
    res.json({ po, approvalInstance: instance });
  })
);

// PO Amendment / Revision History (7.1.7) — keeps prior version, requires
// re-approval before the change takes effect.
router.post(
  "/:id/revise",
  asyncHandler(async (req, res) => {
    const original = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!original) return res.status(404).json({ error: "Purchase order not found" });
    const poNumber = await nextNumber(prisma, "purchaseOrder", "PO");
    const revised = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: original.vendorId,
        contractId: original.contractId,
        currency: original.currency,
        deliveryDate: req.body.deliveryDate || original.deliveryDate,
        deliveryLocation: original.deliveryLocation,
        parentPoId: original.id,
        revisionNumber: original.revisionNumber + 1,
        status: "SUBMITTED",
        items: {
          create: (req.body.items || original.items).map((i) => ({
            itemName: i.itemName,
            uom: i.uom,
            orderedQty: i.orderedQty,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(revised);
  })
);

module.exports = router;
