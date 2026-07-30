import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";
import { usePagination, TableFooter } from "../components/Pagination.jsx";

export default function Rfqs() {
  const { data: rfqs, error, loading, reload } = useApi(() => api.get("/rfqs"), []);
  const { page, setPage, pageCount, total, start, pageItems } = usePagination(rfqs);
  const { data: vendors } = useApi(() => api.get("/vendors?status=SPEND_AUTHORIZED"), []);
  const [form, setForm] = useState({ title: "", itemName: "", quantity: "", uom: "", vendorIds: [] });
  const [formError, setFormError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const toggleVendor = (vendorId) => {
    setForm((f) => ({
      ...f,
      vendorIds: f.vendorIds.includes(vendorId) ? f.vendorIds.filter((v) => v !== vendorId) : [...f.vendorIds, vendorId],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.post("/rfqs", {
        title: form.title,
        items: [{ itemName: form.itemName, quantity: Number(form.quantity), uom: form.uom }],
        vendorIds: form.vendorIds,
      });
      setForm({ title: "", itemName: "", quantity: "", uom: "", vendorIds: [] });
      setShowForm(false);
      await reload();
    } catch (e2) {
      setFormError(e2.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>RFQ &amp; Quotations</h1>
        <button className="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ New RFQ"}</button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="muted">Loading...</p>}

      {showForm && (
        <form className="card" onSubmit={submit}>
          {formError && <div className="error-banner">{formError}</div>}
          <div className="field">
            <label>Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-grid">
            <div className="field"><label>Item Name</label><input required value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} /></div>
            <div className="field"><label>Quantity</label><input required type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div className="field"><label>UoM</label><input required value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} /></div>
          </div>
          <div className="field">
            <label>Invite Vendors ({form.vendorIds.length > 1 ? "Multi-vendor / Call for Tenders" : "Single vendor"})</label>
            {vendors?.map((v) => (
              <label key={v.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 12, width: "auto" }}>
                <input type="checkbox" style={{ width: "auto" }} checked={form.vendorIds.includes(v.id)} onChange={() => toggleVendor(v.id)} />
                {v.legalName}
              </label>
            ))}
          </div>
          <button className="primary" type="submit">Send RFQ</button>
        </form>
      )}

      {rfqs && (
        <div className="table-card">
          <table>
            <thead><tr><th>RFQ #</th><th>Title</th><th>Type</th><th>Status</th><th>Quotations</th></tr></thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/rfqs/${r.id}`}>{r.rfqNumber}</Link></td>
                  <td>{r.title}</td>
                  <td>{r.type.replace("_", " ")}</td>
                  <td><Badge status={r.status} /></td>
                  <td>{r.quotations?.length || 0}</td>
                </tr>
              ))}
              {total === 0 && <tr><td colSpan={5} className="muted">No RFQs yet.</td></tr>}
            </tbody>
          </table>
          <TableFooter page={page} setPage={setPage} pageCount={pageCount} total={total} start={start} />
        </div>
      )}
    </div>
  );
}
