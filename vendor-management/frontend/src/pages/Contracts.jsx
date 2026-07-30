import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";

const CONTRACT_TYPES = ["MASTER_AGREEMENT", "SOW", "BLANKET_PO", "AMENDMENT"];

export default function Contracts() {
  const navigate = useNavigate();
  const { data: contracts, error, loading } = useApi(() => api.get("/contracts"), []);
  const { data: vendors } = useApi(() => api.get("/vendors?status=SPEND_AUTHORIZED"), []);
  const { data: renewals } = useApi(() => api.get("/contracts/alerts/renewals"), []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendorId: "", type: "MASTER_AGREEMENT", title: "", startDate: "", endDate: "", fileUrl: "" });
  const [milestones, setMilestones] = useState([]);
  const [formError, setFormError] = useState(null);

  const addMilestone = () => setMilestones([...milestones, { name: "", dueDate: "", amount: "" }]);
  const updateMilestone = (idx, key, value) =>
    setMilestones((m) => m.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  const removeMilestone = (idx) => setMilestones((m) => m.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      const contract = await api.post("/contracts", {
        ...form,
        endDate: form.endDate || undefined,
        milestones: form.type === "SOW" && milestones.length
          ? milestones.map((m) => ({ name: m.name, dueDate: m.dueDate, amount: Number(m.amount) }))
          : undefined,
      });
      navigate(`/contracts/${contract.id}`);
    } catch (e2) {
      setFormError(e2.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Contracts</h1>
        <button className="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ New Contract"}</button>
      </div>

      {renewals?.length > 0 && (
        <div className="card" style={{ borderColor: "var(--warn)" }}>
          <h2>Renewal Reminders</h2>
          <table>
            <thead><tr><th>Contract</th><th>Vendor</th><th>Days to Expiry</th></tr></thead>
            <tbody>
              {renewals.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/contracts/${c.id}`}>{c.contractNumber}</Link> — {c.title}</td>
                  <td>{c.vendor.legalName}</td>
                  <td><span className="badge badge-warn">{c.daysToExpiry} days</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="muted">Loading...</p>}

      {showForm && (
        <form className="card" onSubmit={submit}>
          {formError && <div className="error-banner">{formError}</div>}
          <div className="form-grid">
            <div className="field">
              <label>Vendor</label>
              <select required value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
                <option value="">Select vendor...</option>
                {vendors?.map((v) => <option key={v.id} value={v.id}>{v.legalName}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
              </select>
            </div>
            <div className="field"><label>Title</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field"><label>Start Date</label><input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="field"><label>End Date</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            <div className="field"><label>Document URL</label><input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} /></div>
          </div>

          {form.type === "SOW" && (
            <div>
              <h3>Milestones</h3>
              {milestones.map((m, idx) => (
                <div className="form-grid" key={idx} style={{ gridTemplateColumns: "2fr 1fr 1fr auto", alignItems: "end" }}>
                  <input required placeholder="Milestone name" value={m.name} onChange={(e) => updateMilestone(idx, "name", e.target.value)} />
                  <input required type="date" value={m.dueDate} onChange={(e) => updateMilestone(idx, "dueDate", e.target.value)} />
                  <input required type="number" placeholder="Amount" value={m.amount} onChange={(e) => updateMilestone(idx, "amount", e.target.value)} />
                  <button type="button" onClick={() => removeMilestone(idx)}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={addMilestone}>+ Add Milestone</button>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <button className="primary" type="submit">Create Contract</button>
          </div>
        </form>
      )}

      {contracts && (
        <div className="card">
          <table>
            <thead><tr><th>Contract #</th><th>Title</th><th>Vendor</th><th>Type</th><th>Status</th><th>End Date</th></tr></thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/contracts/${c.id}`}>{c.contractNumber}</Link></td>
                  <td>{c.title}</td>
                  <td>{c.vendor.legalName}</td>
                  <td>{c.type.replaceAll("_", " ")}</td>
                  <td><Badge status={c.status} /></td>
                  <td>{c.endDate ? new Date(c.endDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {contracts.length === 0 && <tr><td colSpan={6} className="muted">No contracts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
