import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";

export default function VendorDetail() {
  const { id } = useParams();
  const { data: vendor, error, loading, reload } = useApi(() => api.get(`/vendors/${id}`), [id]);
  const [actionError, setActionError] = useState(null);

  const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", accountHolder: "", ifscOrSwift: "" });
  const [taxForm, setTaxForm] = useState({ taxIdType: "GST", taxIdNumber: "" });
  const [docForm, setDocForm] = useState({ docType: "", fileUrl: "" });
  const [holdForm, setHoldForm] = useState({ holdType: "ALL", reason: "" });
  const [tradeTag, setTradeTag] = useState("");

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
  if (!vendor) return null;

  const activeHold = vendor.holds?.find((h) => h.active);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{vendor.legalName}</h1>
          <p className="muted">{vendor.vendorCode} · {vendor.vendorType}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge status={vendor.status} />
        </div>
      </div>

      {actionError && <div className="error-banner">{actionError}</div>}

      <div className="stat-row">
        <div className="stat"><div className="value">{vendor.currency}</div><div className="label">Currency</div></div>
        <div className="stat"><div className="value">{vendor.paymentTermsTemplate || "—"}</div><div className="label">Payment Terms</div></div>
        <div className="stat"><div className="value">{vendor.withholdingTaxRate ? `${vendor.withholdingTaxRate}%` : "—"}</div><div className="label">Withholding Tax</div></div>
        <div className="stat">
          <div className="value" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label className="toggle">
              <input
                type="checkbox"
                checked={vendor.preferredSupplier}
                onChange={(e) => runAction(() => api.patch(`/vendors/${id}`, { preferredSupplier: e.target.checked }))}
              />
              <span className="track" />
            </label>
          </div>
          <div className="label">Preferred Supplier</div>
        </div>
      </div>

      {(vendor.status === "PROSPECTIVE" || vendor.status === "PENDING_APPROVAL") && (
        <div className="card">
          <h2>Promote to Spend-Authorized</h2>
          <p className="muted">Requires a tax ID and at least one bank account. Submits the vendor into the onboarding approval workflow.</p>
          <div className="form-grid">
            <div className="field">
              <label>Tax ID Type</label>
              <select value={taxForm.taxIdType} onChange={(e) => setTaxForm({ ...taxForm, taxIdType: e.target.value })}>
                <option>GST</option><option>VAT</option><option>PAN</option>
              </select>
            </div>
            <div className="field">
              <label>Tax ID Number</label>
              <input value={taxForm.taxIdNumber} onChange={(e) => setTaxForm({ ...taxForm, taxIdNumber: e.target.value })} />
            </div>
          </div>
          <button
            onClick={() =>
              runAction(async () => {
                if (taxForm.taxIdNumber) await api.patch(`/vendors/${id}`, taxForm);
                await api.post(`/vendors/${id}/promote`, {});
              })
            }
          >
            Save Tax ID &amp; Submit for Promotion
          </button>
        </div>
      )}

      <div className="card">
        <h2>Contacts</h2>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead>
          <tbody>
            {vendor.contacts?.map((c) => (
              <tr key={c.id}><td>{c.name}{c.isPrimary && <span className="badge badge-accent" style={{ marginLeft: 6 }}>Primary</span>}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.role || "—"}</td></tr>
            ))}
            {!vendor.contacts?.length && <tr><td colSpan={4} className="muted">No contacts.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Bank Accounts</h2>
        <table>
          <thead><tr><th>Bank</th><th>Account #</th><th>IFSC/SWIFT</th><th>Default</th></tr></thead>
          <tbody>
            {vendor.bankAccounts?.map((b) => (
              <tr key={b.id}><td>{b.bankName}</td><td>{b.accountNumber}</td><td>{b.ifscOrSwift}</td><td>{b.isDefault ? "Yes" : ""}</td></tr>
            ))}
            {!vendor.bankAccounts?.length && <tr><td colSpan={4} className="muted">No bank accounts on file.</td></tr>}
          </tbody>
        </table>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <input placeholder="Bank name" value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} />
          <input placeholder="Account number" value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} />
          <input placeholder="Account holder" value={bankForm.accountHolder} onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })} />
          <input placeholder="IFSC / SWIFT" value={bankForm.ifscOrSwift} onChange={(e) => setBankForm({ ...bankForm, ifscOrSwift: e.target.value })} />
        </div>
        <button
          style={{ marginTop: 8 }}
          onClick={() =>
            runAction(async () => {
              await api.post(`/vendors/${id}/bank-accounts`, { ...bankForm, isDefault: !vendor.bankAccounts?.length });
              setBankForm({ bankName: "", accountNumber: "", accountHolder: "", ifscOrSwift: "" });
            })
          }
        >
          Add Bank Account
        </button>
      </div>

      <div className="card">
        <h2>Compliance Documents</h2>
        <table>
          <thead><tr><th>Type</th><th>Status</th><th>Expiry</th></tr></thead>
          <tbody>
            {vendor.documents?.map((d) => (
              <tr key={d.id}>
                <td>{d.docType}</td>
                <td><Badge status={d.status} /></td>
                <td>{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {!vendor.documents?.length && <tr><td colSpan={3} className="muted">No documents uploaded.</td></tr>}
          </tbody>
        </table>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <input placeholder="Document type (e.g. Insurance COI)" value={docForm.docType} onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })} />
          <input placeholder="File URL" value={docForm.fileUrl} onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })} />
        </div>
        <button
          style={{ marginTop: 8 }}
          onClick={() =>
            runAction(async () => {
              await api.post(`/vendors/${id}/documents`, docForm);
              setDocForm({ docType: "", fileUrl: "" });
            })
          }
        >
          Upload Document
        </button>
      </div>

      <div className="card">
        <h2>Trade Categories</h2>
        <p>{vendor.tradeTags?.map((t) => t.tradeCategory.name).join(", ") || "None assigned"}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Trade category name" value={tradeTag} onChange={(e) => setTradeTag(e.target.value)} />
          <button onClick={() => runAction(async () => { await api.post(`/vendors/${id}/trade-tags`, { tradeCategoryName: tradeTag }); setTradeTag(""); })}>
            Add Trade Tag
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Holds</h2>
        {activeHold ? (
          <div>
            <p><Badge status="ON_HOLD" /> {activeHold.holdType} — {activeHold.reason}</p>
            <button onClick={() => runAction(() => api.post(`/vendors/holds/${activeHold.id}/release`, {}))}>Release Hold</button>
          </div>
        ) : (
          <div>
            <div className="form-grid">
              <select value={holdForm.holdType} onChange={(e) => setHoldForm({ ...holdForm, holdType: e.target.value })}>
                <option value="ALL">All</option>
                <option value="INVOICES">Invoices</option>
                <option value="PAYMENTS">Payments</option>
              </select>
              <input placeholder="Reason" value={holdForm.reason} onChange={(e) => setHoldForm({ ...holdForm, reason: e.target.value })} />
            </div>
            <button style={{ marginTop: 8 }} onClick={() => runAction(() => api.post(`/vendors/${id}/holds`, holdForm))}>Place Hold</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Scorecards</h2>
        <table>
          <thead><tr><th>Period</th><th>Composite Score</th></tr></thead>
          <tbody>
            {vendor.scorecards?.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.evaluationPeriodStart).toLocaleDateString()} – {new Date(s.evaluationPeriodEnd).toLocaleDateString()}</td>
                <td>{Number(s.compositeScore).toFixed(1)}</td>
              </tr>
            ))}
            {!vendor.scorecards?.length && <tr><td colSpan={2} className="muted">No scorecards yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {vendor.status !== "BLACKLISTED" && vendor.status !== "DEACTIVATED" && (
        <div className="card">
          <h2>Offboarding</h2>
          <button onClick={() => runAction(() => api.post(`/vendors/${id}/deactivate`, { reason: "Manual deactivation", blacklist: false }))}>
            Deactivate Vendor
          </button>{" "}
          <button onClick={() => runAction(() => api.post(`/vendors/${id}/deactivate`, { reason: "Manual blacklist", blacklist: true }))}>
            Blacklist Vendor
          </button>
        </div>
      )}
    </div>
  );
}
