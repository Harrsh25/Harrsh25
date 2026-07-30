const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { nextNumber } = require("../lib/numbering");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rfqs = await prisma.rfq.findMany({
      include: { items: true, invites: { include: { vendor: true } }, quotations: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(rfqs);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const rfq = await prisma.rfq.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        invites: { include: { vendor: true } },
        quotations: { include: { vendor: true, lines: { include: { rfqItem: true } } } },
      },
    });
    if (!rfq) return res.status(404).json({ error: "RFQ not found" });
    res.json(rfq);
  })
);

// RFQ to Single Vendor (4.1.1) or Call for Tenders / multi-vendor (4.1.2) —
// `type` + how many vendorIds are invited decides which this is.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, type, responseDueDate, deliveryDate, deliveryLocation, items, vendorIds } = req.body;
    const rfqNumber = await nextNumber(prisma, "rfq", "RFQ");
    const rfq = await prisma.rfq.create({
      data: {
        rfqNumber,
        title,
        type: type || (vendorIds?.length > 1 ? "MULTI_VENDOR" : "SINGLE_VENDOR"),
        status: "SENT",
        responseDueDate,
        deliveryDate,
        deliveryLocation,
        items: { create: items },
        invites: { create: (vendorIds || []).map((vendorId) => ({ vendorId })) },
      },
      include: { items: true, invites: true },
    });
    res.status(201).json(rfq);
  })
);

// Vendor Price / RFQ Response — Supplier Quotation (module 5.1 / 5.2)
router.post(
  "/:id/quotations",
  asyncHandler(async (req, res) => {
    const { vendorId, currency, validUntil, lines } = req.body; // lines: [{rfqItemId, unitPrice, quantity, deliveryDate}]
    const quotationNumber = await nextNumber(prisma, "vendorQuotation", "QUO");
    const quotation = await prisma.vendorQuotation.create({
      data: {
        quotationNumber,
        rfqId: req.params.id,
        vendorId,
        currency: currency || "INR",
        validUntil,
        lines: { create: lines },
      },
      include: { lines: true },
    });
    await prisma.rfqVendorInvite.updateMany({
      where: { rfqId: req.params.id, vendorId },
      data: { status: "RESPONDED" },
    });
    await prisma.rfq.update({ where: { id: req.params.id }, data: { status: "RESPONSES_RECEIVED" } });
    res.status(201).json(quotation);
  })
);

// Vendor Comparison Sheet (4.1.4 / 6.2) — side-by-side view of every quote
// line against the same RFQ item, cheapest first, to support (not replace)
// the manual selection decision.
router.get(
  "/:id/comparison",
  asyncHandler(async (req, res) => {
    const items = await prisma.rfqItem.findMany({
      where: { rfqId: req.params.id },
      include: {
        quotationLines: {
          include: { quotation: { include: { vendor: true } } },
          orderBy: { unitPrice: "asc" },
        },
      },
    });
    res.json(items);
  })
);

// Best Price Auto-Selection / Partial Quotation accept-reject (5.6, 6.1) —
// accepts specific quotation lines and converts them into a draft PO.
router.post(
  "/:id/select",
  asyncHandler(async (req, res) => {
    const { quotationLineIds, vendorId } = req.body;
    const lines = await prisma.quotationLine.findMany({
      where: { id: { in: quotationLineIds } },
      include: { rfqItem: true, quotation: true },
    });
    if (lines.length === 0) return res.status(400).json({ error: "No quotation lines given" });

    await prisma.quotationLine.updateMany({
      where: { id: { in: quotationLineIds } },
      data: { accepted: true },
    });

    const poNumber = await nextNumber(prisma, "purchaseOrder", "PO");
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: vendorId || lines[0].quotation.vendorId,
        quotationId: lines[0].quotationId,
        status: "DRAFT",
        currency: lines[0].quotation.currency,
        items: {
          create: lines.map((l) => ({
            rfqItemId: l.rfqItemId,
            itemName: l.rfqItem.itemName,
            uom: l.rfqItem.uom,
            orderedQty: l.quantity,
            unitPrice: l.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    await prisma.rfq.update({ where: { id: req.params.id }, data: { status: "CLOSED" } });
    res.status(201).json(po);
  })
);

// Negotiation log / counter-offer tracking (6.6)
router.post(
  "/negotiation-log",
  asyncHandler(async (req, res) => {
    const entry = await prisma.negotiationLogEntry.create({ data: req.body });
    res.status(201).json(entry);
  })
);

module.exports = router;
