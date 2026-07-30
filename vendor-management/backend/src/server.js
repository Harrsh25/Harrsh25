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

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.code === "P2025" ? 404 : 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Vendor management API listening on :${port}`));
