import { useState } from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";

export default function Payments() {
  const { data: payments, error, loading, reload } = useApi(() => api.get("/payments"), []);
  const { data: vendors } = useApi(() => api.get("/vendors"), []);
  const [vendorId, setVendorId] = useState("");
  const { data: openInvoices } = useApi(
    () => (vendorId ? api.get(`/invoices?vendorId=${vendorId}`) : Promise.resolve([])),
    [vendorId]
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("BANK_TRANSFER");
  const [actionError, setActionError] = useState(null);
  const [batchDueBefore, setBatchDueBefore] = useState("");
  const [batchResult, setBatchResult] = useState(null);

  const payableInvoices = (openInvoices || []).filter((i) => !["PAID"].includes(i.status));

  const createPayment = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.post("/payments", {
        vendorId,
        modeOfPayment: mode,
        invoiceAllocations: [{ invoiceId: selectedInvoiceId, amount: Number(amount) }],
      });
      setAmount("");
      setSelectedInvoiceId("");
      await reload();
    } catch (e2) {
      setActionError(e2.message);
    }
  };

  const runBatch = async () => {
    setActionError(null);
    try {
      setBatchResult(await api.post("/payments/batch", { dueBefore: batchDueBefore || undefined }));
      await reload();
    } catch (e2) {
      setActionError(e2.message);
    }
  };

  return (
    <div>
      <h1>Payments</h1>
      {error && <div className="error-banner">{error}</div>}
      {actionError && <div className="error-banner">{actionError}</div>}

      <div className="card">
        <h2>Payment Entry</h2>
        <form onSubmit={createPayment}>
          <div className="form-grid">
            <div className="field">
              <label>Vendor</label>
              <select required value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                <option value="">Select vendor...</option>
                {vendors?.map((v) => <option key={v.id} value={v.id}>{v.legalName}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Invoice</label>
              <select required value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)}>
                <option value="">Select invoice...</option>
                {payableInvoices.map((i) => (
                  <option key={i.id} value={i.id}>{i.invoiceNumber} — {i.currency} {Number(i.totalAmount).toFixed(2)} ({i.status})</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Amount</label><input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="field">
              <label>Mode of Payment</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHECK">Check</option>
                <option value="WIRE">Wire</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>
          <button className="primary" type="submit">Record Payment</button>
        </form>
      </div>

      <div className="card">
        <h2>Batch Payment Run</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Pay invoices due before</label>
            <input type="date" value={batchDueBefore} onChange={(e) => setBatchDueBefore(e.target.value)} />
          </div>
          <button onClick={runBatch}>Run Batch</button>
        </div>
        {batchResult && <p className="muted" style={{ marginTop: 8 }}>Created {batchResult.paymentsCreated} payment(s).</p>}
      </div>

      {loading && <p className="muted">Loading...</p>}
      {payments && (
        <div className="card">
          <h2>Payment History</h2>
          <table>
            <thead><tr><th>Payment #</th><th>Vendor</th><th>Amount</th><th>Mode</th><th>Date</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.paymentNumber}</td>
                  <td>{p.vendor.legalName}</td>
                  <td>{Number(p.amount).toFixed(2)}</td>
                  <td>{p.modeOfPayment.replace("_", " ")}</td>
                  <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={5} className="muted">No payments recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
