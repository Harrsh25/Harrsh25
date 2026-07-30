import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const { data: po, error, loading, reload } = useApi(() => api.get(`/purchase-orders/${id}`), [id]);
  const [receiptForm, setReceiptForm] = useState({ poItemId: "", quantityDelivered: "", quantityAccepted: "", quantityRejected: "0", rejectionReason: "" });
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
  if (!po) return null;

  const submitReceipt = async (e) => {
    e.preventDefault();
    await runAction(() =>
      api.post("/goods-receipts", {
        poId: po.id,
        items: [
          {
            poItemId: receiptForm.poItemId,
            quantityDelivered: Number(receiptForm.quantityDelivered),
            quantityAccepted: Number(receiptForm.quantityAccepted),
            quantityRejected: Number(receiptForm.quantityRejected || 0),
            rejectionReason: receiptForm.rejectionReason || undefined,
          },
        ],
      })
    );
    setReceiptForm({ poItemId: "", quantityDelivered: "", quantityAccepted: "", quantityRejected: "0", rejectionReason: "" });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{po.poNumber}</h1>
          <p className="muted">{po.vendor.legalName} · Revision {po.revisionNumber}</p>
        </div>
        <Badge status={po.status} />
      </div>
      {actionError && <div className="error-banner">{actionError}</div>}

      {po.status === "DRAFT" && (
        <div className="card">
          <button className="primary" onClick={() => runAction(() => api.post(`/purchase-orders/${po.id}/submit`, {}))}>
            Submit for Approval
          </button>
        </div>
      )}

      <div className="card">
        <h2>Line Items</h2>
        <table>
          <thead><tr><th>Item</th><th>UoM</th><th>Ordered</th><th>Received</th><th>Unit Price</th></tr></thead>
          <tbody>
            {po.items.map((i) => (
              <tr key={i.id}>
                <td>{i.itemName}</td><td>{i.uom}</td><td>{i.orderedQty}</td><td>{i.receivedQty}</td><td>{Number(i.unitPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED") && (
        <div className="card">
          <h2>Record Goods Receipt</h2>
          <form onSubmit={submitReceipt}>
            <div className="form-grid">
              <div className="field">
                <label>Line Item</label>
                <select required value={receiptForm.poItemId} onChange={(e) => setReceiptForm({ ...receiptForm, poItemId: e.target.value })}>
                  <option value="">Select item...</option>
                  {po.items.map((i) => <option key={i.id} value={i.id}>{i.itemName}</option>)}
                </select>
              </div>
              <div className="field"><label>Qty Delivered</label><input required type="number" value={receiptForm.quantityDelivered} onChange={(e) => setReceiptForm({ ...receiptForm, quantityDelivered: e.target.value })} /></div>
              <div className="field"><label>Qty Accepted</label><input required type="number" value={receiptForm.quantityAccepted} onChange={(e) => setReceiptForm({ ...receiptForm, quantityAccepted: e.target.value })} /></div>
              <div className="field"><label>Qty Rejected</label><input type="number" value={receiptForm.quantityRejected} onChange={(e) => setReceiptForm({ ...receiptForm, quantityRejected: e.target.value })} /></div>
              <div className="field"><label>Rejection Reason</label><input value={receiptForm.rejectionReason} onChange={(e) => setReceiptForm({ ...receiptForm, rejectionReason: e.target.value })} /></div>
            </div>
            <button className="primary" type="submit">Record Receipt</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Goods Receipts</h2>
        <table>
          <thead><tr><th>GR #</th><th>Date</th><th>Accepted</th><th>Rejected</th></tr></thead>
          <tbody>
            {po.goodsReceipts.map((gr) => (
              <tr key={gr.id}>
                <td>{gr.grNumber}</td>
                <td>{new Date(gr.receivedDate).toLocaleDateString()}</td>
                <td>{gr.items.reduce((s, i) => s + Number(i.quantityAccepted), 0)}</td>
                <td>{gr.items.reduce((s, i) => s + Number(i.quantityRejected), 0)}</td>
              </tr>
            ))}
            {po.goodsReceipts.length === 0 && <tr><td colSpan={4} className="muted">No deliveries recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Invoices Against This PO</h2>
        <table>
          <thead><tr><th>Invoice #</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>
            {po.invoices.map((inv) => (
              <tr key={inv.id}><td>{inv.invoiceNumber}</td><td><Badge status={inv.status} /></td><td>{Number(inv.totalAmount).toFixed(2)}</td></tr>
            ))}
            {po.invoices.length === 0 && <tr><td colSpan={3} className="muted">No invoices submitted yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
