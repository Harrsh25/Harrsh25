import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";
import { usePagination, TableFooter } from "../components/Pagination.jsx";
import { IconFilter, IconSearch } from "../components/Icons.jsx";

export default function VendorList() {
  const [search, setSearch] = useState("");
  const { data: vendors, error, loading } = useApi(() => api.get(`/vendors${search ? `?search=${encodeURIComponent(search)}` : ""}`), [search]);
  const { page, setPage, pageCount, total, start, pageItems } = usePagination(vendors);

  return (
    <div>
      <div className="page-header">
        <h1>Vendors</h1>
        <Link to="/vendors/new"><button className="primary">+ Register Vendor</button></Link>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <span className="icon-btn"><IconSearch /></span>
          <input placeholder="Search by name or vendor code..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }} />
        </div>
        <button className="icon-btn"><IconFilter /></button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="muted">Loading...</p>}

      {vendors && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Vendor Code</th>
                <th>Legal Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Trades</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((v) => (
                <tr key={v.id}>
                  <td><Link to={`/vendors/${v.id}`}>{v.vendorCode}</Link></td>
                  <td>{v.legalName}{v.preferredSupplier && <span className="badge badge-accent" style={{ marginLeft: 6 }}>Preferred</span>}</td>
                  <td>{v.vendorType}</td>
                  <td><Badge status={v.status} /></td>
                  <td>{v.tradeTags?.map((t) => t.tradeCategory.name).join(", ") || "—"}</td>
                </tr>
              ))}
              {total === 0 && (
                <tr><td colSpan={5} className="muted">No vendors found.</td></tr>
              )}
            </tbody>
          </table>
          <TableFooter page={page} setPage={setPage} pageCount={pageCount} total={total} start={start} />
        </div>
      )}
    </div>
  );
}
