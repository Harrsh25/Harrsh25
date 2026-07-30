import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";

export default function InvoiceDetail() {
  const { id } = useParams();
  const { data: invoice, error, loading, reload } = useApi(() => api.get(`/invoices/${id}`), [id]);
  const [matchResult, setMatchResult] = useState(null);
  const [holdReason, setHoldReason] = useState("");
  const [noteForm, setNoteForm] = useState({ type: "CREDIT", amount: "", reason: "" });
  const [actionError, setActionError] = useState(null);

  const runAction = async (fn) => {
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setActionError(e.message);
    }
  };

  if (loading) return <p className="muted">Loading...</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!invoice) return null;

  const activeHold = invoice.vendor.holds?.find((h) => h.holdType === "INVOICES" || h.holdType === "ALL");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{invoice.invoiceNumber}</h1>
          <p className="muted">{invoice.vendor.legalName} · Due {new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
        <Badge status={invoice.status} />
      </div>
      {actionError && <div className="error-banner">{actionError}</div>}
      {activeHold && <div className="error-banner">Vendor hold active ({activeHold.holdType}): {activeHold.reason}</div>}

      <div className="stat-row">
        <div className="stat"><div className="value">{invoice.currency} {Number(invoice.subtotal).toFixed(2)}</div><div className="label">Subtotal</div></div>
        <div className="stat"><div className="value">{invoice.currency} {Number(invoice.taxAmount).toFixed(2)}</div><div className="label">Tax</div></div>
        <div className="stat"><div className="value">{invoice.currency} {Number(invoice.totalAmount).toFixed(2)}</div><div className="label">Total</div></div>
      </div>

      <div className="card">
        <h2>Lines</h2>
        <table>
          <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id}><td>{l.description}</td><td>{l.quantity}</td><td>{Number(l.unitPrice).toFixed(2)}</td><td>{Number(l.amount).toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoice.po && (
        <div className="card">
          <h2>3-Way Match</h2>
          <p className="muted">Compares invoiced quantity/price against the linked PO and its goods receipts.</p>
          <button className="primary" onClick={() => runAction(async () => setMatchResult(await api.post(`/invoices/${id}/match`, {})))}>
            Run Match
          </button>
          {matchResult && (
            <div style={{ marginTop: 12 }}>
              <p><Badge status={matchResult.status} /></p>
              {matchResult.discrepancies.length > 0 && (
                <table>
                  <thead><tr><th>Item</th><th>Invoiced Qty</th><th>Received Qty</th><th>Qty Variance %</th><th>Price Variance %</th></tr></thead>
                  <tbody>
                    {matchResult.discrepancies.map((d) => (
                      <tr key={d.lineId}><td>{d.itemName}</td><td>{d.invoicedQty}</td><td>{d.receivedQty}</td><td>{d.qtyVariancePct}%</td><td>{d.priceVariancePct}%</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2>Hold / Dispute</h2>
        {invoice.holdReasonCode ? (
          <p>On hold: {invoice.holdReasonCode}</p>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Hold reason code (e.g. PRICE_VARIANCE)" value={holdReason} onChange={(e) => setHoldReason(e.target.value)} />
              <button onClick={() => runAction(() => api.post(`/invoices/${id}/hold`, { reasonCode: holdReason }))}>Place Hold</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Credit / Debit Notes</h2>
        <table>
          <thead><tr><th>Type</th><th>Amount</th><th>Reason</th></tr></thead>
          <tbody>
            {invoice.creditDebitNotes.map((n) => <tr key={n.id}><td>{n.type}</td><td>{Number(n.amount).toFixed(2)}</td><td>{n.reason}</td></tr>)}
            {invoice.creditDebitNotes.length === 0 && <tr><td colSpan={3} className="muted">None issued.</td></tr>}
          </tbody>
        </table>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <select value={noteForm.type} onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}>
            <option value="CREDIT">Credit</option>
            <option value="DEBIT">Debit</option>
          </select>
          <input placeholder="Amount" type="number" value={noteForm.amount} onChange={(e) => setNoteForm({ ...noteForm, amount: e.target.value })} />
          <input placeholder="Reason" value={noteForm.reason} onChange={(e) => setNoteForm({ ...noteForm, reason: e.target.value })} />
        </div>
        <button
          style={{ marginTop: 8 }}
          onClick={() => runAction(() => api.post(`/invoices/${id}/credit-debit-notes`, { ...noteForm, amount: Number(noteForm.amount) }))}
        >
          Issue Note
        </button>
      </div>

      <div className="card">
        <h2>Payment Allocations</h2>
        <table>
          <thead><tr><th>Payment #</th><th>Allocated Amount</th></tr></thead>
          <tbody>
            {invoice.paymentAllocations.map((a) => <tr key={a.id}><td>{a.payment.paymentNumber}</td><td>{Number(a.allocatedAmount).toFixed(2)}</td></tr>)}
            {invoice.paymentAllocations.length === 0 && <tr><td colSpan={2} className="muted">Not yet paid.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
