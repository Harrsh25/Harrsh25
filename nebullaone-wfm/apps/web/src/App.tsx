import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';
import { useAuth } from './lib/auth';
import { Audit } from './pages/Audit';
import { FinancialSecurity, LaborRates, RaBills } from './pages/cl/Billing';
import { ClOverview, Closeout, ContractorRelease, FinalSettlement } from './pages/cl/Closeout';
import { ChangeOrders, Contracts, Kickoff } from './pages/cl/Contracts';
import { Attendance, MeasurementBook, Onboarding, Performance, Safety, WorkOrders } from './pages/cl/Execution';
import { Login } from './pages/Login';
import { PortalPreview, VendorPortalShell } from './pages/portal/Portal';
import { Approvals } from './pages/vm/Approvals';
import { Compliance } from './pages/vm/Compliance';
import { Holds } from './pages/vm/Holds';
import { Invoices } from './pages/vm/Invoices';
import { VmOverview } from './pages/vm/Overview';
import { GoodsReceipts, PurchaseOrders, ServiceReceipts } from './pages/vm/Purchasing';
import { Registry } from './pages/vm/Registry';
import { Scorecard } from './pages/vm/Scorecard';
import { ProcurementSettings } from './pages/vm/Settings';
import { BlanketOrders, PriceLists, Requisitions, Rfqs } from './pages/vm/Sourcing';

const ROUTES: [string, JSX.Element][] = [
  ['/vm/overview', <VmOverview />], ['/vm/registry', <Registry />], ['/vm/approvals', <Approvals />], ['/vm/compliance', <Compliance />],
  ['/vm/holds', <Holds />], ['/vm/requisitions', <Requisitions />], ['/vm/rfq', <Rfqs />], ['/vm/blanket-orders', <BlanketOrders />],
  ['/vm/price-lists', <PriceLists />], ['/vm/purchase-orders', <PurchaseOrders />], ['/vm/goods-receipts', <GoodsReceipts />],
  ['/vm/service-receipts', <ServiceReceipts />], ['/vm/invoices', <Invoices />], ['/vm/scorecard', <Scorecard />],
  ['/vm/portal', <PortalPreview />], ['/vm/settings', <ProcurementSettings />],
  ['/cl/overview', <ClOverview />], ['/cl/onboarding', <Onboarding />], ['/cl/contracts', <Contracts />], ['/cl/kickoff', <Kickoff />],
  ['/cl/work-orders', <WorkOrders />], ['/cl/change-orders', <ChangeOrders />], ['/cl/attendance', <Attendance />],
  ['/cl/measurement-book', <MeasurementBook />], ['/cl/ra-bills', <RaBills />], ['/cl/financial-security', <FinancialSecurity />],
  ['/cl/labor-rates', <LaborRates />], ['/cl/performance', <Performance />], ['/cl/safety', <Safety />], ['/cl/closeout', <Closeout />],
  ['/cl/final-settlement', <FinalSettlement />], ['/cl/release', <ContractorRelease />], ['/admin/audit', <Audit />],
];

export function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  if (user.role === 'vendor') return <Routes><Route path="*" element={<VendorPortalShell />} /></Routes>;
  return (
    <Routes>
      <Route element={<Layout />}>
        {ROUTES.map(([path, el]) => <Route key={path} path={path} element={el} />)}
        <Route path="*" element={<Navigate to="/vm/overview" replace />} />
      </Route>
    </Routes>
  );
}
