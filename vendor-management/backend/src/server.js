require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { coerceDateStrings } = require("./middleware/coerceDates");
const vendorsRouter = require("./routes/vendors");
const approvalsRouter = require("./routes/approvals");
const rfqsRouter = require("./routes/rfqs");
const laborRouter = require("./routes/labor");
const contractsRouter = require("./routes/contracts");
const purchaseOrdersRouter = require("./routes/purchaseOrders");
const goodsReceiptsRouter = require("./routes/goodsReceipts");
const invoicesRouter = require("./routes/invoices");
const paymentsRouter = require("./routes/payments");
const scorecardsRouter = require("./routes/scorecards");

const app = express();
app.use(cors());
app.use(express.json());
app.use(coerceDateStrings);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/vendors", vendorsRouter);
app.use("/api/approvals", approvalsRouter);
app.use("/api/rfqs", rfqsRouter);
app.use("/api/labor", laborRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/purchase-orders", purchaseOrdersRouter);
app.use("/api/goods-receipts", goodsReceiptsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/scorecards", scorecardsRouter);

// Prisma error codes: https://www.prisma.io/docs/orm/reference/error-reference
const PRISMA_STATUS_BY_CODE = {
  P2025: 404, // record not found
  P2002: 409, // unique constraint violation
  P2003: 400, // foreign key constraint violation (e.g. bad vendorId)
};
const PRISMA_MESSAGE_BY_CODE = {
  P2025: "Record not found",
  P2002: "A record with that value already exists",
  P2003: "Referenced record does not exist",
};

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = PRISMA_STATUS_BY_CODE[err.code] || (err.name === "PrismaClientValidationError" ? 400 : 500);
  // Prisma's validation/query errors embed the full query text in err.message —
  // fine to log, never fine to hand back to a client. Only pass through
  // messages we raised ourselves (plain Error, no Prisma code/name).
  const isOurs = !err.code && err.name !== "PrismaClientValidationError";
  const message = PRISMA_MESSAGE_BY_CODE[err.code] || (isOurs && err.message) || "Internal server error";
  res.status(status).json({ error: message });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Vendor management API listening on :${port}`));
