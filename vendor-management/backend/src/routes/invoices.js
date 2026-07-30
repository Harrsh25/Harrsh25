const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { nextNumber } = require("../lib/numbering");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { vendorId, status } = req.query;
    const invoices = await prisma.invoice.findMany({
      where: { vendorId: vendorId || undefined, status: status || undefined },
      include: { vendor: true, lines: true, paymentAllocations: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: { include: { holds: { where: { active: true } } } },
        po: { include: { items: true, goodsReceipts: { include: { items: true } } } },
        lines: true,
        creditDebitNotes: true,
        paymentAllocations: { include: { payment: true } },
      },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  })
);

// Vendor Bill / Invoice Submission (10.1.1), manual or portal-uploaded.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { vendorId, poId, invoiceDate, dueDate, currency, lines, source } = req.body;

    if (poId) {
      const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
      if (!po) return res.status(404).json({ error: "Purchase order not found" });
      if (po.vendorId !== vendorId) {
        return res.status(400).json({ error: "Invoice vendor does not match the linked PO's vendor" });
      }
    }

    const subtotal = lines.reduce((sum, l) => sum + Number(l.amount), 0);
    const taxAmount = req.body.taxAmount || 0;
    const invoiceNumber = await nextNumber(prisma, "invoice", "INV");
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        vendorId,
        poId,
        invoiceDate,
        dueDate,
        currency: currency || "INR",
        subtotal,
        taxAmount,
        totalAmount: subtotal + Number(taxAmount),
        source: source || "MANUAL",
        lines: { create: lines },
      },
      include: { lines: true },
    });
    res.status(201).json(invoice);
  })
);

// Auto-invoice from an approved timesheet (10.1.3) — the most common
// auto-invoice trigger for labor engagements on an EPC site.
router.post(
  "/auto-generate/from-timesheet/:timesheetId",
  asyncHandler(async (req, res) => {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: req.params.timesheetId },
      include: { worker: { include: { vendor: true, rateCard: true } } },
    });
    if (!timesheet) return res.status(404).json({ error: "Timesheet not found" });
    if (timesheet.status !== "APPROVED") {
      return res.status(409).json({ error: "Timesheet must be APPROVED before invoicing" });
    }
    const rate = Number(timesheet.worker.rateCard?.payRate || 0);
    const amount = rate * Number(timesheet.hours);
    const invoiceNumber = await nextNumber(prisma, "invoice", "INV");

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        vendorId: timesheet.worker.vendorId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        currency: timesheet.worker.rateCard?.currency || "INR",
        subtotal: amount,
        taxAmount: 0,
        totalAmount: amount,
        source: "AUTO_TIMESHEET",
        lines: {
          create: [
            {
              timesheetId: timesheet.id,
              description: `Timesheet ${timesheet.periodStart.toISOString().slice(0, 10)} - ${timesheet.periodEnd
                .toISOString()
                .slice(0, 10)}`,
              quantity: timesheet.hours,
              unitPrice: rate,
              amount,
            },
          ],
        },
      },
      include: { lines: true },
    });
    await prisma.timesheet.update({ where: { id: timesheet.id }, data: { status: "INVOICED" } });
    res.status(201).json(invoice);
  })
);

// SOW milestone -> invoice (10.1.2)
router.post(
  "/auto-generate/from-milestone/:milestoneId",
  asyncHandler(async (req, res) => {
    const milestone = await prisma.sOWMilestone.findUnique({
      where: { id: req.params.milestoneId },
      include: { contract: { include: { vendor: true } } },
    });
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });
    if (milestone.status !== "ACCEPTED") {
      return res.status(409).json({ error: "Milestone must be ACCEPTED before invoicing" });
    }
    const invoiceNumber = await nextNumber(prisma, "invoice", "INV");
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        vendorId: milestone.contract.vendorId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        currency: "INR",
        subtotal: milestone.amount,
        taxAmount: 0,
        totalAmount: milestone.amount,
        source: "AUTO_MILESTONE",
        lines: { create: [{ description: `Milestone: ${milestone.name}`, quantity: 1, unitPrice: milestone.amount, amount: milestone.amount }] },
      },
      include: { lines: true },
    });
    await prisma.sOWMilestone.update({ where: { id: milestone.id }, data: { status: "INVOICED" } });
    res.status(201).json(invoice);
  })
);

// 3-Way Matching: PO / Goods Receipt / Invoice (10.2.1) — the standard
// fraud/error control before an invoice can be approved for payment.
router.post(
  "/:id/match",
  asyncHandler(async (req, res) => {
    const tolerancePct = Number(req.body.tolerancePct ?? 2);
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        lines: { include: { poItem: true } },
        po: { include: { goodsReceipts: { include: { items: true } } } },
      },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!invoice.po) {
      return res.status(400).json({ error: "Invoice has no linked PO to match against" });
    }

    const discrepancies = [];
    for (const line of invoice.lines) {
      if (!line.poItemId) continue;
      const receivedQty = invoice.po.goodsReceipts
        .flatMap((gr) => gr.items)
        .filter((i) => i.poItemId === line.poItemId)
        .reduce((sum, i) => sum + Number(i.quantityAccepted), 0);

      const qtyVariancePct = receivedQty === 0 ? 100 : (Math.abs(Number(line.quantity) - receivedQty) / receivedQty) * 100;
      const priceVariancePct =
        Number(line.poItem.unitPrice) === 0
          ? 0
          : (Math.abs(Number(line.unitPrice) - Number(line.poItem.unitPrice)) / Number(line.poItem.unitPrice)) * 100;

      if (qtyVariancePct > tolerancePct || priceVariancePct > tolerancePct) {
        discrepancies.push({
          lineId: line.id,
          itemName: line.poItem.itemName,
          invoicedQty: Number(line.quantity),
          receivedQty,
          qtyVariancePct: Number(qtyVariancePct.toFixed(2)),
          invoicedPrice: Number(line.unitPrice),
          poPrice: Number(line.poItem.unitPrice),
          priceVariancePct: Number(priceVariancePct.toFixed(2)),
        });
      }
    }

    const status = discrepancies.length > 0 ? "MISMATCHED" : "MATCHED";
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status } });
    res.json({ status, discrepancies });
  })
);

// Invoice Dispute / Hold Reason Codes (10.1.5)
router.post(
  "/:id/hold",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: "ON_HOLD", holdReasonCode: req.body.reasonCode },
    });
    res.json(invoice);
  })
);

// Credit / Debit Note from Vendor (10.1.4)
router.post(
  "/:id/credit-debit-notes",
  asyncHandler(async (req, res) => {
    const note = await prisma.creditDebitNote.create({
      data: { invoiceId: req.params.id, ...req.body },
    });
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    const delta = note.type === "CREDIT" ? -Number(note.amount) : Number(note.amount);
    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { totalAmount: Number(invoice.totalAmount) + delta },
    });
    res.status(201).json(note);
  })
);

module.exports = router;
