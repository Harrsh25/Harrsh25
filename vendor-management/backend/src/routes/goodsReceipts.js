const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { nextNumber } = require("../lib/numbering");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

// Goods Receipt (9.1.1) with accepted/rejected split (9.1.2) and quality
// inspection result (9.1.4). Updates each PO line's receivedQty and flips
// the PO to PARTIALLY_RECEIVED / RECEIVED based on ordered vs. received.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { poId, receivedByUserId, warehouseOrCostCode, items } = req.body;
    // items: [{poItemId, quantityDelivered, quantityAccepted, quantityRejected, rejectionReason, qualityInspectionResult}]
    const grNumber = await nextNumber(prisma, "goodsReceipt", "GR");

    const receipt = await prisma.$transaction(async (tx) => {
      const gr = await tx.goodsReceipt.create({
        data: {
          grNumber,
          poId,
          receivedByUserId,
          warehouseOrCostCode,
          items: { create: items },
        },
        include: { items: true },
      });

      for (const item of items) {
        await tx.pOItem.update({
          where: { id: item.poItemId },
          data: { receivedQty: { increment: item.quantityAccepted } },
        });
      }

      const poItems = await tx.pOItem.findMany({ where: { poId } });
      const fullyReceived = poItems.every((i) => Number(i.receivedQty) >= Number(i.orderedQty));
      const anyReceived = poItems.some((i) => Number(i.receivedQty) > 0);
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: fullyReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : undefined },
      });

      return gr;
    });

    res.status(201).json(receipt);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { poId } = req.query;
    const receipts = await prisma.goodsReceipt.findMany({
      where: { poId: poId || undefined },
      include: { items: { include: { poItem: true } }, po: true },
      orderBy: { receivedDate: "desc" },
    });
    res.json(receipts);
  })
);

// Return to Vendor / Debit Note on rejection (9.1.7)
router.post(
  "/returns",
  asyncHandler(async (req, res) => {
    const rtv = await prisma.returnToVendor.create({ data: req.body });
    res.status(201).json(rtv);
  })
);

// Subcontracting order (9.1.3) — raw material out, finished work back
router.post(
  "/subcontracting-orders",
  asyncHandler(async (req, res) => {
    const order = await prisma.subcontractingOrder.create({ data: req.body });
    res.status(201).json(order);
  })
);

router.post(
  "/subcontracting-orders/:id/receive",
  asyncHandler(async (req, res) => {
    const order = await prisma.subcontractingOrder.update({
      where: { id: req.params.id },
      data: { consumedQty: { increment: req.body.consumedQty } },
    });
    res.json(order);
  })
);

module.exports = router;
