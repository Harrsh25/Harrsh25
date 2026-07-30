import { NavLink, Route, Routes } from "react-router-dom";
import VendorList from "./pages/VendorList.jsx";
import VendorDetail from "./pages/VendorDetail.jsx";
import VendorRegister from "./pages/VendorRegister.jsx";
import Approvals from "./pages/Approvals.jsx";
import Rfqs from "./pages/Rfqs.jsx";
import RfqDetail from "./pages/RfqDetail.jsx";
import PurchaseOrders from "./pages/PurchaseOrders.jsx";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail.jsx";
import Invoices from "./pages/Invoices.jsx";
import InvoiceDetail from "./pages/InvoiceDetail.jsx";
import Payments from "./pages/Payments.jsx";
import Scorecards from "./pages/Scorecards.jsx";

const NAV_ITEMS = [
  { to: "/vendors", label: "Vendors" },
  { to: "/approvals", label: "Approvals" },
  { to: "/rfqs", label: "RFQ & Quotations" },
  { to: "/purchase-orders", label: "Purchase Orders" },
  { to: "/invoices", label: "Invoices" },
  { to: "/payments", label: "Payments" },
  { to: "/scorecards", label: "Scorecards" },
];

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Vendor Management</h1>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<VendorList />} />
          <Route path="/vendors" element={<VendorList />} />
          <Route path="/vendors/new" element={<VendorRegister />} />
          <Route path="/vendors/:id" element={<VendorDetail />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/rfqs" element={<Rfqs />} />
          <Route path="/rfqs/:id" element={<RfqDetail />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/scorecards" element={<Scorecards />} />
        </Routes>
      </main>
    </div>
  );
}
