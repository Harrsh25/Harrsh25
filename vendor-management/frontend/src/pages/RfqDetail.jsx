import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";

// Vendor Comparison Sheet (4.1.4 / 6.2): quotation lines for each RFQ item,
// cheapest first — supports the selection decision without automating it,
// except for the explicit "Select as winner" action which converts the
// chosen line(s) straight into a draft PO (Best Price Auto-Selection, 6.1).
export default function RfqDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: rfq, error, loading, reload } = useApi(() => api.get(`/rfqs/${id}`), [id]);
  const { data: comparison } = useApi(() => api.get(`/rfqs/${id}/comparison`), [id]);
  const [quoteForm, setQuoteForm] = useState({ vendorId: "", unitPrice: "", quantity: "", validUntil: "" });
  const [actionError, setActionError] = useState(null);

  if (loading) return <p className="muted">Loading...</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!rfq) return null;

  const submitQuote = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.post(`/rfqs/${id}/quotations`, {
        vendorId: quoteForm.vendorId,
        validUntil: quoteForm.validUntil || undefined,
        lines: [{ rfqItemId: rfq.items[0].id, unitPrice: Number(quoteForm.unitPrice), quantity: Number(quoteForm.quantity) }],
      });
      setQuoteForm({ vendorId: "", unitPrice: "", quantity: "", validUntil: "" });
      await reload();
    } catch (e2) {
      setActionError(e2.message);
    }
  };

  const selectWinner = async (lineId, vendorId) => {
    setActionError(null);
    try {
      const po = await api.post(`/rfqs/${id}/select`, { quotationLineIds: [lineId], vendorId });
      navigate(`/purchase-orders/${po.id}`);
    } catch (e2) {
      setActionError(e2.message);
    }
  };

  return (
    <div>
      <h1>{rfq.title}</h1>
      <p className="muted">{rfq.rfqNumber} · <Badge status={rfq.status} /></p>
      {actionError && <div className="error-banner">{actionError}</div>}

      <div className="card">
        <h2>Requested Items</h2>
        <table>
          <thead><tr><th>Item</th><th>Quantity</th><th>UoM</th></tr></thead>
          <tbody>{rfq.items.map((i) => <tr key={i.id}><td>{i.itemName}</td><td>{i.quantity}</td><td>{i.uom}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="card">
        <h2>Invited Vendors</h2>
        <table>
          <thead><tr><th>Vendor</th><th>Status</th></tr></thead>
          <tbody>{rfq.invites.map((inv) => <tr key={inv.id}><td>{inv.vendor.legalName}</td><td>{inv.status}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="card">
        <h2>Submit Vendor Quotation</h2>
        <form onSubmit={submitQuote}>
          <div className="form-grid">
            <div className="field">
              <label>Vendor</label>
              <select required value={quoteForm.vendorId} onChange={(e) => setQuoteForm({ ...quoteForm, vendorId: e.target.value })}>
                <option value="">Select vendor...</option>
                {rfq.invites.map((inv) => <option key={inv.vendorId} value={inv.vendorId}>{inv.vendor.legalName}</option>)}
              </select>
            </div>
            <div className="field"><label>Unit Price</label><input required type="number" value={quoteForm.unitPrice} onChange={(e) => setQuoteForm({ ...quoteForm, unitPrice: e.target.value })} /></div>
            <div className="field"><label>Quantity</label><input required type="number" value={quoteForm.quantity} onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })} /></div>
            <div className="field"><label>Valid Until</label><input type="date" value={quoteForm.validUntil} onChange={(e) => setQuoteForm({ ...quoteForm, validUntil: e.target.value })} /></div>
          </div>
          <button className="primary" type="submit">Submit Quotation</button>
        </form>
      </div>

      <div className="card">
        <h2>Vendor Comparison Sheet</h2>
        {comparison?.map((item) => (
          <div key={item.id} style={{ marginBottom: 16 }}>
            <h3>{item.itemName} ({item.quantity} {item.uom})</h3>
            <table>
              <thead><tr><th>Vendor</th><th>Unit Price</th><th>Qty Quoted</th><th>Valid Until</th><th></th></tr></thead>
              <tbody>
                {item.quotationLines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.quotation.vendor.legalName}</td>
                    <td>{Number(line.unitPrice).toFixed(2)}</td>
                    <td>{line.quantity}</td>
                    <td>{line.quotation.validUntil ? new Date(line.quotation.validUntil).toLocaleDateString() : "—"}</td>
                    <td>
                      {line.accepted ? (
                        <span className="badge badge-ok">Selected</span>
                      ) : (
                        <button onClick={() => selectWinner(line.id, line.quotation.vendorId)}>Select as winner</button>
                      )}
                    </td>
                  </tr>
                ))}
                {item.quotationLines.length === 0 && <tr><td colSpan={5} className="muted">No quotations yet.</td></tr>}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
