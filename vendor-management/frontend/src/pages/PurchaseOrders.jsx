import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";

export default function PurchaseOrders() {
  const { data: pos, error, loading, reload } = useApi(() => api.get("/purchase-orders"), []);
  const { data: vendors } = useApi(() => api.get("/vendors?status=SPEND_AUTHORIZED"), []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendorId: "", itemName: "", uom: "", orderedQty: "", unitPrice: "", deliveryLocation: "" });
  const [formError, setFormError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.post("/purchase-orders", {
        vendorId: form.vendorId,
        deliveryLocation: form.deliveryLocation,
        items: [{ itemName: form.itemName, uom: form.uom, orderedQty: Number(form.orderedQty), unitPrice: Number(form.unitPrice) }],
      });
      setForm({ vendorId: "", itemName: "", uom: "", orderedQty: "", unitPrice: "", deliveryLocation: "" });
      setShowForm(false);
      await reload();
    } catch (e2) {
      setFormError(e2.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Purchase Orders</h1>
        <button className="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ New PO"}</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="muted">Loading...</p>}

      {showForm && (
        <form className="card" onSubmit={submit}>
          {formError && <div className="error-banner">{formError}</div>}
          <div className="field">
            <label>Vendor</label>
            <select required value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
              <option value="">Select vendor...</option>
              {vendors?.map((v) => <option key={v.id} value={v.id}>{v.legalName}</option>)}
            </select>
          </div>
          <div className="form-grid">
            <div className="field"><label>Item Name</label><input required value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} /></div>
            <div className="field"><label>UoM</label><input required value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} /></div>
            <div className="field"><label>Ordered Qty</label><input required type="number" value={form.orderedQty} onChange={(e) => setForm({ ...form, orderedQty: e.target.value })} /></div>
            <div className="field"><label>Unit Price</label><input required type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></div>
            <div className="field"><label>Delivery Location</label><input value={form.deliveryLocation} onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })} /></div>
          </div>
          <button className="primary" type="submit">Create PO (Draft)</button>
        </form>
      )}

      {pos && (
        <div className="card">
          <table>
            <thead><tr><th>PO #</th><th>Vendor</th><th>Status</th><th>Lines</th></tr></thead>
            <tbody>
              {pos.map((po) => (
                <tr key={po.id}>
                  <td><Link to={`/purchase-orders/${po.id}`}>{po.poNumber}</Link></td>
                  <td>{po.vendor.legalName}</td>
                  <td><Badge status={po.status} /></td>
                  <td>{po.items.length}</td>
                </tr>
              ))}
              {pos.length === 0 && <tr><td colSpan={4} className="muted">No purchase orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
