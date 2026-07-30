// Seeds a realistic EPC scenario: a cement supplier (goods) and an
// electrical subcontractor (labor/services), taken through registration,
// approval workflows, a PO, delivery, invoicing, and payment.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding vendor management data...");

  await prisma.approvalWorkflow.create({
    data: {
      name: "Vendor Onboarding Approval",
      entityType: "VENDOR",
      stages: {
        create: [
          { sequence: 1, name: "Procurement Review", approverRole: "PROCUREMENT_MANAGER" },
          { sequence: 2, name: "Finance Review", approverRole: "FINANCE_MANAGER" },
        ],
      },
    },
  });

  await prisma.approvalWorkflow.create({
    data: {
      name: "PO Approval (Standard)",
      entityType: "PURCHASE_ORDER",
      stages: { create: [{ sequence: 1, name: "Procurement Sign-off", approverRole: "PROCUREMENT_MANAGER" }] },
    },
  });

  await prisma.approvalWorkflow.create({
    data: {
      name: "Invoice Hold Release",
      entityType: "INVOICE",
      stages: { create: [{ sequence: 1, name: "AP Review", approverRole: "AP_LEAD" }] },
    },
  });

  const civil = await prisma.tradeCategory.create({ data: { name: "Civil" } });
  const electrical = await prisma.tradeCategory.create({ data: { name: "Electrical" } });

  const cementVendor = await prisma.vendor.create({
    data: {
      vendorCode: "VEN-2026-000001",
      legalName: "Shree Cement Supply Co.",
      vendorType: "GOODS",
      status: "SPEND_AUTHORIZED",
      taxIdType: "GST",
      taxIdNumber: "27AAECS1234F1Z5",
      countryOfRegistration: "India",
      currency: "INR",
      paymentTermsTemplate: "Net 30",
      preferredSupplier: true,
      contacts: { create: [{ name: "Ramesh Iyer", email: "ramesh@shreecement.example", phone: "+91-9800000001", isPrimary: true }] },
      bankAccounts: {
        create: [
          { bankName: "HDFC Bank", accountNumber: "50100123456789", accountHolder: "Shree Cement Supply Co.", ifscOrSwift: "HDFC0000123", isDefault: true },
        ],
      },
      tradeTags: { create: [{ tradeCategoryId: civil.id }] },
    },
  });

  const electricalVendor = await prisma.vendor.create({
    data: {
      vendorCode: "VEN-2026-000002",
      legalName: "Voltline Electrical Contractors Pvt Ltd",
      vendorType: "LABOR",
      status: "SPEND_AUTHORIZED",
      taxIdType: "GST",
      taxIdNumber: "29AAFCV5678G1Z2",
      countryOfRegistration: "India",
      currency: "INR",
      paymentTermsTemplate: "Net 15",
      withholdingTaxRate: 2,
      contacts: { create: [{ name: "Priya Nair", email: "priya@voltline.example", phone: "+91-9800000002", isPrimary: true }] },
      bankAccounts: {
        create: [
          { bankName: "ICICI Bank", accountNumber: "60200987654321", accountHolder: "Voltline Electrical Contractors Pvt Ltd", ifscOrSwift: "ICIC0000456", isDefault: true },
        ],
      },
      tradeTags: { create: [{ tradeCategoryId: electrical.id }] },
    },
  });

  // Compliance document, one expiring soon to exercise the alert path.
  await prisma.vendorDocument.create({
    data: {
      vendorId: electricalVendor.id,
      docType: "Insurance Certificate (COI)",
      fileUrl: "https://example.com/docs/voltline-coi.pdf",
      status: "APPROVED",
      expiryDate: new Date(Date.now() + 25 * 86400000),
    },
  });

  // RFQ -> quotation -> PO for the cement vendor.
  const rfq = await prisma.rfq.create({
    data: {
      rfqNumber: "RFQ-2026-000001",
      title: "OPC 43 Grade Cement — Tower Foundation Phase 1",
      type: "SINGLE_VENDOR",
      status: "RESPONSES_RECEIVED",
      responseDueDate: new Date(Date.now() + 7 * 86400000),
      deliveryLocation: "Site A — Foundation Yard",
      items: { create: [{ itemName: "OPC 43 Grade Cement (50kg bag)", quantity: 5000, uom: "BAG" }] },
      invites: { create: [{ vendorId: cementVendor.id, status: "RESPONDED" }] },
    },
    include: { items: true },
  });

  const quotation = await prisma.vendorQuotation.create({
    data: {
      quotationNumber: "QUO-2026-000001",
      rfqId: rfq.id,
      vendorId: cementVendor.id,
      currency: "INR",
      validUntil: new Date(Date.now() + 14 * 86400000),
      status: "ACCEPTED",
      lines: { create: [{ rfqItemId: rfq.items[0].id, unitPrice: 380, quantity: 5000, accepted: true }] },
    },
  });

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-000001",
      vendorId: cementVendor.id,
      quotationId: quotation.id,
      status: "APPROVED",
      currency: "INR",
      deliveryLocation: "Site A — Foundation Yard",
      items: { create: [{ itemName: "OPC 43 Grade Cement (50kg bag)", uom: "BAG", orderedQty: 5000, unitPrice: 380, receivedQty: 4800 }] },
    },
    include: { items: true },
  });

  const goodsReceipt = await prisma.goodsReceipt.create({
    data: {
      grNumber: "GR-2026-000001",
      poId: po.id,
      warehouseOrCostCode: "SITE-A-FOUNDATION",
      items: {
        create: [
          {
            poItemId: po.items[0].id,
            quantityDelivered: 4850,
            quantityAccepted: 4800,
            quantityRejected: 50,
            rejectionReason: "Damaged bags on arrival",
            qualityInspectionResult: "PASS",
          },
        ],
      },
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-000001",
      vendorId: cementVendor.id,
      poId: po.id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      currency: "INR",
      subtotal: 4800 * 380,
      taxAmount: 4800 * 380 * 0.18,
      totalAmount: 4800 * 380 * 1.18,
      status: "SUBMITTED",
      source: "MANUAL",
      lines: {
        create: [
          {
            poItemId: po.items[0].id,
            description: "OPC 43 Grade Cement (50kg bag)",
            quantity: 4800,
            unitPrice: 380,
            amount: 4800 * 380,
          },
        ],
      },
    },
  });

  // Labor sourcing + rate card + worker + timesheet for the electrical vendor.
  const rateCard = await prisma.rateCard.create({
    data: {
      vendorId: electricalVendor.id,
      role: "Electrician (Skilled)",
      siteLocation: "Site A",
      payRate: 650,
      currency: "INR",
      effectiveFrom: new Date("2026-01-01"),
    },
  });

  const worker = await prisma.workerProfile.create({
    data: {
      vendorId: electricalVendor.id,
      name: "Suresh Kumar",
      siteLocation: "Site A",
      costCenter: "CC-ELEC-01",
      rateCardId: rateCard.id,
      billable: true,
      startDate: new Date("2026-03-01"),
    },
  });

  await prisma.timesheet.create({
    data: {
      workerId: worker.id,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-07"),
      hours: 48,
      status: "APPROVED",
      approverUserId: "site-supervisor-1",
      approvedAt: new Date(),
    },
  });

  // Scorecard for the cement vendor — comfortably above the auto-block threshold.
  await prisma.vendorScorecard.create({
    data: {
      vendorId: cementVendor.id,
      evaluationPeriodStart: new Date("2026-04-01"),
      evaluationPeriodEnd: new Date("2026-06-30"),
      evaluatorUserId: "procurement-lead-1",
      compositeScore: 84.5,
      metrics: {
        create: [
          { metricName: "On-time Delivery %", weight: 40, score: 90 },
          { metricName: "Quality / Rejection Rate", weight: 30, score: 82 },
          { metricName: "Responsiveness", weight: 30, score: 78 },
        ],
      },
    },
  });

  console.log("Seed complete:");
  console.log({ cementVendor: cementVendor.vendorCode, electricalVendor: electricalVendor.vendorCode, po: po.poNumber, invoice: invoice.invoiceNumber });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
