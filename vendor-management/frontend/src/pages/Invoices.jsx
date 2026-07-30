import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";
import { usePagination, TableFooter } from "../components/Pagination.jsx";

export default function Invoices() {
  const { data: invoices, error, loading } = useApi(() => api.get("/invoices"), []);
  const { page, setPage, pageCount, total, start, pageItems } = usePagination(invoices);

  return (
    <div>
      <h1>Invoices</h1>
      <p className="muted">Invoices are created from a PO, or auto-generated from an approved timesheet / SOW milestone — see Purchase Orders and Payments for those flows.</p>
      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="muted">Loading...</p>}
      {invoices && (
        <div className="table-card">
          <table>
            <thead><tr><th>Invoice #</th><th>Vendor</th><th>Status</th><th>Source</th><th>Total</th><th>Due</th></tr></thead>
            <tbody>
              {pageItems.map((inv) => (
                <tr key={inv.id}>
                  <td><Link to={`/invoices/${inv.id}`}>{inv.invoiceNumber}</Link></td>
                  <td>{inv.vendor.legalName}</td>
                  <td><Badge status={inv.status} /></td>
                  <td>{inv.source.replace("_", " ")}</td>
                  <td>{inv.currency} {Number(inv.totalAmount).toFixed(2)}</td>
                  <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {total === 0 && <tr><td colSpan={6} className="muted">No invoices yet.</td></tr>}
            </tbody>
          </table>
          <TableFooter page={page} setPage={setPage} pageCount={pageCount} total={total} start={start} />
        </div>
      )}
    </div>
  );
}
