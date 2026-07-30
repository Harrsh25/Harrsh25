const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { nextNumber } = require("../lib/numbering");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { vendorId } = req.query;
    const payments = await prisma.payment.findMany({
      where: { vendorId: vendorId || undefined },
      include: { vendor: true, allocations: { include: { invoice: true } }, withholdingEntries: true },
      orderBy: { paymentDate: "desc" },
    });
    res.json(payments);
  })
);

// Payment Entry (11.1.2) — auto-fetches vendor's default bank account +
// withholding-tax setting, reconciles against the chosen invoice(s), and is
// blocked if the vendor has an active Hold covering PAYMENTS/ALL (11.2.1) or
// a non-compliant insurance status gating the linked commitment (11.1.4).
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { vendorId, invoiceAllocations, modeOfPayment, referenceNumber } = req.body; // invoiceAllocations: [{invoiceId, amount}]

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { bankAccounts: true, holds: { where: { active: true } } },
    });
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const blockingHold = vendor.holds.find((h) => h.holdType === "PAYMENTS" || h.holdType === "ALL");
    if (blockingHold) {
      return res.status(409).json({ error: `Vendor is on hold: ${blockingHold.reason}` });
    }

    const defaultAccount = vendor.bankAccounts.find((a) => a.isDefault) || vendor.bankAccounts[0];
    const totalAmount = invoiceAllocations.reduce((sum, a) => sum + Number(a.amount), 0);

    const withholdingRate = Number(vendor.withholdingTaxRate || 0);
    const withholdingAmount = (totalAmount * withholdingRate) / 100;

    const paymentNumber = await nextNumber(prisma, "payment", "PAY");
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        vendorId,
        paymentType: "PAY",
        amount: totalAmount,
        modeOfPayment: modeOfPayment || "BANK_TRANSFER",
        referenceNumber,
        bankAccountId: defaultAccount?.id,
        allocations: {
          create: invoiceAllocations.map((a) => ({ invoiceId: a.invoiceId, allocatedAmount: a.amount })),
        },
        withholdingEntries: withholdingRate
          ? {
              create: [
                {
                  rate: withholdingRate,
                  amount: withholdingAmount,
                  filingPeriod: new Date().toISOString().slice(0, 7),
                },
              ],
            }
          : undefined,
      },
      include: { allocations: true, withholdingEntries: true },
    });

    // Recompute each allocated invoice's payment status.
    for (const alloc of invoiceAllocations) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: alloc.invoiceId },
        include: { paymentAllocations: true },
      });
      const totalPaid = invoice.paymentAllocations.reduce((s, a) => s + Number(a.allocatedAmount), 0);
      await prisma.invoice.update({
        where: { id: alloc.invoiceId },
        data: { status: totalPaid >= Number(invoice.totalAmount) ? "PAID" : "PARTIALLY_PAID" },
      });
    }

    res.status(201).json(payment);
  })
);

// Payment Run / Batch Payment (11.1.6) — selects every qualifying open
// invoice within the given criteria and creates one Payment per vendor.
router.post(
  "/batch",
  asyncHandler(async (req, res) => {
    const { dueBefore, modeOfPayment } = req.body;
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["APPROVED", "MATCHED"] },
        dueDate: dueBefore ? { lte: new Date(dueBefore) } : undefined,
      },
      include: { vendor: { include: { holds: { where: { active: true } } } } },
    });

    const byVendor = new Map();
    for (const inv of invoices) {
      if (inv.vendor.holds.some((h) => h.holdType === "PAYMENTS" || h.holdType === "ALL")) continue;
      const list = byVendor.get(inv.vendorId) || [];
      list.push(inv);
      byVendor.set(inv.vendorId, list);
    }

    const results = [];
    for (const [vendorId, vendorInvoices] of byVendor) {
      const paymentNumber = await nextNumber(prisma, "payment", "PAY");
      const payment = await prisma.payment.create({
        data: {
          paymentNumber,
          vendorId,
          paymentType: "PAY",
          amount: vendorInvoices.reduce((s, i) => s + Number(i.totalAmount), 0),
          modeOfPayment: modeOfPayment || "BANK_TRANSFER",
          allocations: {
            create: vendorInvoices.map((i) => ({ invoiceId: i.id, allocatedAmount: i.totalAmount })),
          },
        },
      });
      await prisma.invoice.updateMany({
        where: { id: { in: vendorInvoices.map((i) => i.id) } },
        data: { status: "PAID" },
      });
      results.push(payment);
    }

    res.status(201).json({ paymentsCreated: results.length, payments: results });
  })
);

module.exports = router;
