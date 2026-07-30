import { useState } from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";

const TABS = ["Job Postings", "Rate Cards", "Workers & Timesheets"];

export default function Labor() {
  const [tab, setTab] = useState(TABS[0]);
  return (
    <div>
      <h1>Labor Sourcing</h1>
      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "primary" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Job Postings" && <JobPostingsTab />}
      {tab === "Rate Cards" && <RateCardsTab />}
      {tab === "Workers & Timesheets" && <WorkersTab />}
    </div>
  );
}

// --- Job Postings (4.2.1) + Candidate Submission / Shortlisting (4.2.2) ---

function JobPostingsTab() {
  const { data: postings, error, loading, reload } = useApi(() => api.get("/labor/job-postings"), []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", siteLocation: "", costCenter: "", startDate: "", endDate: "", currency: "INR" });
  const [formError, setFormError] = useState(null);
  const [openPostingId, setOpenPostingId] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.post("/labor/job-postings", { ...form, endDate: form.endDate || undefined });
      setForm({ title: "", siteLocation: "", costCenter: "", startDate: "", endDate: "", currency: "INR" });
      setShowForm(false);
      await reload();
    } catch (e2) {
      setFormError(e2.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Job Postings</h2>
        <button className="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ New Job Posting"}</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="muted">Loading...</p>}

      {showForm && (
        <form className="card" onSubmit={submit}>
          {formError && <div className="error-banner">{formError}</div>}
          <div className="field"><label>Title</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="form-grid">
            <div className="field"><label>Site Location</label><input required value={form.siteLocation} onChange={(e) => setForm({ ...form, siteLocation: e.target.value })} /></div>
            <div className="field"><label>Cost Center</label><input required value={form.costCenter} onChange={(e) => setForm({ ...form, costCenter: e.target.value })} /></div>
            <div className="field"><label>Start Date</label><input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="field"><label>End Date</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <button className="primary" type="submit">Post Job</button>
        </form>
      )}

      {postings?.map((p) => (
        <div className="card" key={p.id}>
          <div className="page-header" style={{ marginBottom: 8 }}>
            <div>
              <h3>{p.title}</h3>
              <p className="muted">{p.siteLocation} · {p.costCenter} · {new Date(p.startDate).toLocaleDateString()}{p.endDate ? ` – ${new Date(p.endDate).toLocaleDateString()}` : ""}</p>
            </div>
            <button onClick={() => setOpenPostingId(openPostingId === p.id ? null : p.id)}>
              {openPostingId === p.id ? "Hide" : `Candidates (${p.submissions.length})`}
            </button>
          </div>
          {openPostingId === p.id && <CandidatesPanel posting={p} onChanged={reload} />}
        </div>
      ))}
      {postings?.length === 0 && <p className="muted">No job postings yet.</p>}
    </div>
  );
}

function CandidatesPanel({ posting, onChanged }) {
  const { data: vendors } = useApi(() => api.get("/vendors?vendorType=LABOR"), []);
  const [form, setForm] = useState({ vendorId: "", candidateName: "", proposedRate: "" });
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/labor/job-postings/${posting.id}/submissions`, {
        vendorId: form.vendorId,
        candidateName: form.candidateName,
        proposedRate: Number(form.proposedRate),
      });
      setForm({ vendorId: "", candidateName: "", proposedRate: "" });
      await onChanged();
    } catch (e2) {
      setError(e2.message);
    }
  };

  const setStatus = async (id, status) => {
    setError(null);
    try {
      await api.patch(`/labor/submissions/${id}`, { status });
      await onChanged();
    } catch (e2) {
      setError(e2.message);
    }
  };

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      <table>
        <thead><tr><th>Candidate</th><th>Vendor</th><th>Proposed Rate</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {posting.submissions.map((s) => (
            <tr key={s.id}>
              <td>{s.candidateName}</td>
              <td>{s.vendor.legalName}</td>
              <td>{Number(s.proposedRate).toFixed(2)}</td>
              <td><Badge status={s.status} /></td>
              <td>
                {s.status === "SUBMITTED" && (
                  <>
                    <button onClick={() => setStatus(s.id, "SHORTLISTED")}>Shortlist</button>{" "}
                    <button onClick={() => setStatus(s.id, "REJECTED")}>Reject</button>
                  </>
                )}
                {s.status === "SHORTLISTED" && <button className="primary" onClick={() => setStatus(s.id, "SELECTED")}>Select / Award</button>}
              </td>
            </tr>
          ))}
          {posting.submissions.length === 0 && <tr><td colSpan={5} className="muted">No candidates submitted yet.</td></tr>}
        </tbody>
      </table>
      <form onSubmit={submit} className="form-grid" style={{ marginTop: 12 }}>
        <select required value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
          <option value="">Submitting vendor...</option>
          {vendors?.map((v) => <option key={v.id} value={v.id}>{v.legalName}</option>)}
        </select>
        <input required placeholder="Candidate name" value={form.candidateName} onChange={(e) => setForm({ ...form, candidateName: e.target.value })} />
        <input required type="number" placeholder="Proposed rate" value={form.proposedRate} onChange={(e) => setForm({ ...form, proposedRate: e.target.value })} />
        <button className="primary" type="submit">Submit Candidate</button>
      </form>
    </div>
  );
}

// --- Rate Card / Rate Grid (4.3.1) ---

function RateCardsTab() {
  const { data: rateCards, error, loading, reload } = useApi(() => api.get("/labor/rate-cards"), []);
  const { data: vendors } = useApi(() => api.get("/vendors?vendorType=LABOR"), []);
  const [form, setForm] = useState({ vendorId: "", role: "", siteLocation: "", payRate: "", currency: "INR", effectiveFrom: "" });
  const [formError, setFormError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.post("/labor/rate-cards", { ...form, payRate: Number(form.payRate) });
      setForm({ vendorId: "", role: "", siteLocation: "", payRate: "", currency: "INR", effectiveFrom: "" });
      await reload();
    } catch (e2) {
      setFormError(e2.message);
    }
  };

  return (
    <div>
      <h2>Rate Cards</h2>
      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="muted">Loading...</p>}

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
          <div className="field"><label>Role</label><input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
          <div className="field"><label>Site Location</label><input required value={form.siteLocation} onChange={(e) => setForm({ ...form, siteLocation: e.target.value })} /></div>
          <div className="field"><label>Pay Rate</label><input required type="number" value={form.payRate} onChange={(e) => setForm({ ...form, payRate: e.target.value })} /></div>
          <div className="field"><label>Currency</label><input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
          <div className="field"><label>Effective From</label><input required type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></div>
        </div>
        <button className="primary" type="submit">Add Rate Card</button>
      </form>

      <div className="card">
        <table>
          <thead><tr><th>Vendor</th><th>Role</th><th>Site</th><th>Pay Rate</th><th>Effective From</th></tr></thead>
          <tbody>
            {rateCards?.map((rc) => (
              <tr key={rc.id}>
                <td>{rc.vendor.legalName}</td>
                <td>{rc.role}</td>
                <td>{rc.siteLocation}</td>
                <td>{rc.currency} {Number(rc.payRate).toFixed(2)}</td>
                <td>{new Date(rc.effectiveFrom).toLocaleDateString()}</td>
              </tr>
            ))}
            {rateCards?.length === 0 && <tr><td colSpan={5} className="muted">No rate cards yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Worker Profile (9.2.1) + Timesheet Submission/Approval (9.2.3) ---
// Approval here is what unlocks auto-invoicing (module 10.1.3).

function WorkersTab() {
  const { data: workers, error, loading, reload } = useApi(() => api.get("/labor/worker-profiles"), []);
  const { data: vendors } = useApi(() => api.get("/vendors?vendorType=LABOR"), []);
  const { data: rateCards } = useApi(() => api.get("/labor/rate-cards"), []);
  const [form, setForm] = useState({ vendorId: "", name: "", siteLocation: "", costCenter: "", rateCardId: "", startDate: "", billable: true });
  const [formError, setFormError] = useState(null);
  const [openWorkerId, setOpenWorkerId] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.post("/labor/worker-profiles", { ...form, rateCardId: form.rateCardId || undefined });
      setForm({ vendorId: "", name: "", siteLocation: "", costCenter: "", rateCardId: "", startDate: "", billable: true });
      await reload();
    } catch (e2) {
      setFormError(e2.message);
    }
  };

  return (
    <div>
      <h2>Worker Profiles</h2>
      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="muted">Loading...</p>}

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
          <div className="field"><label>Worker Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Site Location</label><input required value={form.siteLocation} onChange={(e) => setForm({ ...form, siteLocation: e.target.value })} /></div>
          <div className="field"><label>Cost Center</label><input required value={form.costCenter} onChange={(e) => setForm({ ...form, costCenter: e.target.value })} /></div>
          <div className="field">
            <label>Rate Card</label>
            <select value={form.rateCardId} onChange={(e) => setForm({ ...form, rateCardId: e.target.value })}>
              <option value="">None</option>
              {rateCards?.filter((rc) => rc.vendorId === form.vendorId).map((rc) => (
                <option key={rc.id} value={rc.id}>{rc.role} — {rc.currency} {Number(rc.payRate).toFixed(2)}</option>
              ))}
            </select>
          </div>
          <div className="field"><label>Start Date</label><input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, width: "auto" }}>
            <input type="checkbox" style={{ width: "auto" }} checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} />
            Billable
          </label>
        </div>
        <button className="primary" type="submit">Add Worker</button>
      </form>

      {workers?.map((w) => (
        <div className="card" key={w.id}>
          <div className="page-header" style={{ marginBottom: 8 }}>
            <div>
              <h3>{w.name} {!w.billable && <span className="badge badge-warn">Non-billable</span>}</h3>
              <p className="muted">{w.vendor.legalName} · {w.siteLocation} · {w.costCenter}{w.rateCard ? ` · ${w.rateCard.role} (${w.rateCard.currency} ${Number(w.rateCard.payRate).toFixed(2)})` : ""}</p>
            </div>
            <button onClick={() => setOpenWorkerId(openWorkerId === w.id ? null : w.id)}>
              {openWorkerId === w.id ? "Hide Timesheets" : "Timesheets"}
            </button>
          </div>
          {openWorkerId === w.id && <TimesheetsPanel worker={w} />}
        </div>
      ))}
      {workers?.length === 0 && <p className="muted">No workers yet.</p>}
    </div>
  );
}

function TimesheetsPanel({ worker }) {
  const { data: timesheets, reload } = useApi(() => api.get(`/labor/timesheets?workerId=${worker.id}`), [worker.id]);
  const [form, setForm] = useState({ periodStart: "", periodEnd: "", hours: "" });
  const [error, setError] = useState(null);
  const [invoiced, setInvoiced] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/labor/timesheets", { workerId: worker.id, periodStart: form.periodStart, periodEnd: form.periodEnd, hours: Number(form.hours) });
      setForm({ periodStart: "", periodEnd: "", hours: "" });
      await reload();
    } catch (e2) {
      setError(e2.message);
    }
  };

  const decide = async (id, approve) => {
    setError(null);
    try {
      await api.post(`/labor/timesheets/${id}/approve`, { approverUserId: "site-supervisor-1", approve });
      await reload();
    } catch (e2) {
      setError(e2.message);
    }
  };

  const generateInvoice = async (id) => {
    setError(null);
    try {
      const invoice = await api.post(`/invoices/auto-generate/from-timesheet/${id}`, {});
      setInvoiced(invoice.invoiceNumber);
      await reload();
    } catch (e2) {
      setError(e2.message);
    }
  };

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      {invoiced && <p className="muted">Generated invoice {invoiced}.</p>}
      <table>
        <thead><tr><th>Period</th><th>Hours</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {timesheets?.map((t) => (
            <tr key={t.id}>
              <td>{new Date(t.periodStart).toLocaleDateString()} – {new Date(t.periodEnd).toLocaleDateString()}</td>
              <td>{t.hours}</td>
              <td><Badge status={t.status} /></td>
              <td>
                {t.status === "SUBMITTED" && (
                  <>
                    <button onClick={() => decide(t.id, true)}>Approve</button>{" "}
                    <button onClick={() => decide(t.id, false)}>Reject</button>
                  </>
                )}
                {t.status === "APPROVED" && <button className="primary" onClick={() => generateInvoice(t.id)}>Generate Invoice</button>}
                {t.status === "INVOICED" && <span className="muted">Invoiced</span>}
              </td>
            </tr>
          ))}
          {timesheets?.length === 0 && <tr><td colSpan={4} className="muted">No timesheets submitted.</td></tr>}
        </tbody>
      </table>
      <form onSubmit={submit} className="form-grid" style={{ marginTop: 12 }}>
        <input required type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
        <input required type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
        <input required type="number" placeholder="Hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
        <button className="primary" type="submit">Submit Timesheet</button>
      </form>
    </div>
  );
}
