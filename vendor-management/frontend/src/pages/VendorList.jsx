import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useApi } from "../useApi.js";
import { Badge } from "../components/Badge.jsx";

export default function VendorList() {
  const [search, setSearch] = useState("");
  const { data: vendors, error, loading } = useApi(() => api.get(`/vendors${search ? `?search=${encodeURIComponent(search)}` : ""}`), [search]);

  return (
    <div>
      <div className="page-header">
        <h1>Vendors</h1>
        <Link to="/vendors/new"><button className="primary">+ Register Vendor</button></Link>
      </div>

      <div className="card">
        <input placeholder="Search by name or vendor code..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="muted">Loading...</p>}

      {vendors && (
        <div className="card">
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
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td><Link to={`/vendors/${v.id}`}>{v.vendorCode}</Link></td>
                  <td>{v.legalName}{v.preferredSupplier && <span className="badge badge-accent" style={{ marginLeft: 6 }}>Preferred</span>}</td>
                  <td>{v.vendorType}</td>
                  <td><Badge status={v.status} /></td>
                  <td>{v.tradeTags?.map((t) => t.tradeCategory.name).join(", ") || "—"}</td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr><td colSpan={5} className="muted">No vendors found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
