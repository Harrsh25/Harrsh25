import { NavLink, Route, Routes } from "react-router-dom";
import VendorList from "./pages/VendorList.jsx";
import VendorDetail from "./pages/VendorDetail.jsx";
import VendorRegister from "./pages/VendorRegister.jsx";
import Approvals from "./pages/Approvals.jsx";
import Rfqs from "./pages/Rfqs.jsx";
import RfqDetail from "./pages/RfqDetail.jsx";
import Contracts from "./pages/Contracts.jsx";
import ContractDetail from "./pages/ContractDetail.jsx";
import PurchaseOrders from "./pages/PurchaseOrders.jsx";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail.jsx";
import Labor from "./pages/Labor.jsx";
import Invoices from "./pages/Invoices.jsx";
import InvoiceDetail from "./pages/InvoiceDetail.jsx";
import Payments from "./pages/Payments.jsx";
import Scorecards from "./pages/Scorecards.jsx";
import { ApiStatus } from "./components/ApiStatus.jsx";
import {
  IconApprovals, IconContracts, IconInvoices, IconLabor, IconPO,
  IconPayments, IconRfq, IconScorecards, IconSearch, IconVendors,
} from "./components/Icons.jsx";

const NAV_ITEMS = [
  { to: "/vendors", label: "Vendors", icon: IconVendors },
  { to: "/approvals", label: "Approvals", icon: IconApprovals },
  { to: "/rfqs", label: "RFQ & Quotations", icon: IconRfq },
  { to: "/contracts", label: "Contracts", icon: IconContracts },
  { to: "/purchase-orders", label: "Purchase Orders", icon: IconPO },
  { to: "/labor", label: "Labor Sourcing", icon: IconLabor },
  { to: "/invoices", label: "Invoices", icon: IconInvoices },
  { to: "/payments", label: "Payments", icon: IconPayments },
  { to: "/scorecards", label: "Scorecards", icon: IconScorecards },
];

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" />
          <span className="brand-name">VendorOS</span>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <ApiStatus />
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="topbar-search">
            <IconSearch />
            <span>Search vendors, POs, invoices…</span>
            <kbd>⌘K</kbd>
          </div>
          <div className="topbar-right">
            <span className="avatar" style={{ background: "#7c3aed" }}>A</span>
          </div>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<VendorList />} />
            <Route path="/vendors" element={<VendorList />} />
            <Route path="/vendors/new" element={<VendorRegister />} />
            <Route path="/vendors/:id" element={<VendorDetail />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/rfqs" element={<Rfqs />} />
            <Route path="/rfqs/:id" element={<RfqDetail />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
            <Route path="/labor" element={<Labor />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/scorecards" element={<Scorecards />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
