import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { usePagination, TableFooter } from "../components/Pagination.jsx";

const DEFAULT_METRICS = [
  { metricName: "On-time Delivery %", weight: 40, score: "" },
  { metricName: "Quality / Rejection Rate", weight: 30, score: "" },
  { metricName: "Responsiveness", weight: 30, score: "" },
];

export default function Scorecards() {
  const { data: scorecards, error, loading, reload } = useApi(() => api.get("/scorecards"), []);
  const { page, setPage, pageCount, total, start, pageItems } = usePagination(scorecards);
  const { data: vendors } = useApi(() => api.get("/vendors"), []);
  const [vendorId, setVendorId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [actionError, setActionError] = useState(null);

  const totalWeight = metrics.reduce((s, m) => s + Number(m.weight || 0), 0);

  const updateMetric = (idx, key, value) => {
    setMetrics((m) => m.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  };

  const submit = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.post("/scorecards", {
        vendorId,
        evaluationPeriodStart: periodStart,
        evaluationPeriodEnd: periodEnd,
        evaluatorUserId: "demo-user",
        metrics: metrics.map((m) => ({ metricName: m.metricName, weight: Number(m.weight), score: Number(m.score) })),
      });
      setVendorId("");
      setPeriodStart("");
      setPeriodEnd("");
      setMetrics(DEFAULT_METRICS);
      await reload();
    } catch (e2) {
      setActionError(e2.message);
    }
  };

  return (
    <div>
      <h1>Vendor Scorecards</h1>
      {error && <div className="error-banner">{error}</div>}
      {actionError && <div className="error-banner">{actionError}</div>}

      <div className="card">
        <h2>New Evaluation</h2>
        <p className="muted">Weights must sum to 100. A composite score below 40 automatically places the vendor on hold.</p>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label>Vendor</label>
              <select required value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                <option value="">Select vendor...</option>
                {vendors?.map((v) => <option key={v.id} value={v.id}>{v.legalName}</option>)}
              </select>
            </div>
            <div className="field"><label>Period Start</label><input required type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
            <div className="field"><label>Period End</label><input required type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
          </div>
          <table>
            <thead><tr><th>Metric</th><th>Weight %</th><th>Score (0-100)</th></tr></thead>
            <tbody>
              {metrics.map((m, idx) => (
                <tr key={idx}>
                  <td>{m.metricName}</td>
                  <td><input type="number" value={m.weight} onChange={(e) => updateMetric(idx, "weight", e.target.value)} /></td>
                  <td><input required type="number" value={m.score} onChange={(e) => updateMetric(idx, "score", e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Total weight: {totalWeight}{totalWeight !== 100 ? " (must equal 100)" : ""}</p>
          <button className="primary" type="submit" disabled={totalWeight !== 100}>Submit Scorecard</button>
        </form>
      </div>

      {loading && <p className="muted">Loading...</p>}
      {scorecards && (
        <div className="table-card">
          <table>
            <thead><tr><th>Vendor</th><th>Period</th><th>Composite Score</th></tr></thead>
            <tbody>
              {pageItems.map((s) => (
                <tr key={s.id}>
                  <td><Link to={`/vendors/${s.vendorId}`}>{s.vendor.legalName}</Link></td>
                  <td>{new Date(s.evaluationPeriodStart).toLocaleDateString()} – {new Date(s.evaluationPeriodEnd).toLocaleDateString()}</td>
                  <td>{Number(s.compositeScore).toFixed(1)}</td>
                </tr>
              ))}
              {total === 0 && <tr><td colSpan={3} className="muted">No scorecards yet.</td></tr>}
            </tbody>
          </table>
          <TableFooter page={page} setPage={setPage} pageCount={pageCount} total={total} start={start} />
        </div>
      )}
    </div>
  );
}
