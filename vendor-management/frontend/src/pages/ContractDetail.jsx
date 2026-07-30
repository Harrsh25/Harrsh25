import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";

export default function ContractDetail() {
  const { id } = useParams();
  const { data: contract, error, loading, reload } = useApi(() => api.get(`/contracts/${id}`), [id]);
  const [amendForm, setAmendForm] = useState({ endDate: "", fileUrl: "" });
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
  if (!contract) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{contract.title}</h1>
          <p className="muted">{contract.contractNumber} · {contract.vendor.legalName} · {contract.type.replaceAll("_", " ")} · v{contract.version}</p>
        </div>
        <Badge status={contract.status} />
      </div>
      {actionError && <div className="error-banner">{actionError}</div>}

      <div className="stat-row">
        <div className="stat"><div className="value">{new Date(contract.startDate).toLocaleDateString()}</div><div className="label">Start Date</div></div>
        <div className="stat"><div className="value">{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "—"}</div><div className="label">End Date</div></div>
        <div className="stat"><div className="value">{contract.renewalReminderDays.join(" / ")} days</div><div className="label">Renewal Reminders</div></div>
      </div>

      {contract.parentContract && (
        <p className="muted">Amendment of {contract.parentContract.contractNumber} — {contract.parentContract.title}</p>
      )}

      {contract.milestones.length > 0 && (
        <div className="card">
          <h2>SOW Milestones</h2>
          <table>
            <thead><tr><th>Milestone</th><th>Due Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {contract.milestones.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{new Date(m.dueDate).toLocaleDateString()}</td>
                  <td>{Number(m.amount).toFixed(2)}</td>
                  <td><Badge status={m.status} /></td>
                  <td>
                    {m.status === "PENDING" && (
                      <button onClick={() => runAction(() => api.post(`/contracts/milestones/${m.id}/complete`, {}))}>Mark Complete</button>
                    )}
                    {m.status === "COMPLETED" && (
                      <button className="primary" onClick={() => runAction(() => api.post(`/contracts/milestones/${m.id}/accept`, { acceptedByUserId: "demo-user" }))}>
                        Accept Deliverable
                      </button>
                    )}
                    {m.status === "ACCEPTED" && (
                      <button className="primary" onClick={() => runAction(() => api.post(`/invoices/auto-generate/from-milestone/${m.id}`, {}))}>
                        Generate Invoice
                      </button>
                    )}
                    {m.status === "INVOICED" && <span className="muted">Invoiced</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2>Purchase Orders Against This Contract</h2>
        <table>
          <thead><tr><th>PO #</th><th>Status</th></tr></thead>
          <tbody>
            {contract.purchaseOrders.map((po) => <tr key={po.id}><td>{po.poNumber}</td><td><Badge status={po.status} /></td></tr>)}
            {contract.purchaseOrders.length === 0 && <tr><td colSpan={2} className="muted">No POs linked yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Amendments / Revisions</h2>
        <table>
          <thead><tr><th>Contract #</th><th>Version</th><th>End Date</th></tr></thead>
          <tbody>
            {contract.revisions.map((r) => (
              <tr key={r.id}><td>{r.contractNumber}</td><td>v{r.version}</td><td>{r.endDate ? new Date(r.endDate).toLocaleDateString() : "—"}</td></tr>
            ))}
            {contract.revisions.length === 0 && <tr><td colSpan={3} className="muted">No amendments yet.</td></tr>}
          </tbody>
        </table>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <input type="date" placeholder="New end date" value={amendForm.endDate} onChange={(e) => setAmendForm({ ...amendForm, endDate: e.target.value })} />
          <input placeholder="Updated document URL" value={amendForm.fileUrl} onChange={(e) => setAmendForm({ ...amendForm, fileUrl: e.target.value })} />
        </div>
        <button
          style={{ marginTop: 8 }}
          onClick={() => runAction(() => api.post(`/contracts/${id}/amendments`, amendForm))}
        >
          Create Change Order / Amendment
        </button>
      </div>
    </div>
  );
}
