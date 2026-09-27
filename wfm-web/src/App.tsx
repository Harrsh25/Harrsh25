import { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, Link } from "react-router-dom";
import Shell from "./components/Shell";
import { PageCard } from "./components/ui";
import { activityNav, configNav, hrmsNav, productivityNav } from "./data/nav";
import { auth } from "./data/auth";
import { Login, Signup } from "./pages/Auth";
import Products from "./pages/Products";
import { Dashboard, Goals, MyAssignment, ProjectApprovals, ProjectCenter, Timesheets } from "./pages/Projects";
import { AssignedVsCompleted, CostTracking, QuantityTracking } from "./pages/Reports";
import {
  ApprovalManagement, Boq, BoqApproval, BoqManagement, CostControl, DocumentRepository, MaterialLifecycle,
  ProjectAccounting, QuantityManagement,
} from "./pages/CostCenter";
import {
  BusinessUnits, ConfigClients, ConfigIndustries, ConfigLocations, ConfigOrgSetup, LegalEntities,
  OrganizationProfile, OrganizationSetup,
} from "./pages/Organization";
import {
  Attendance, FoundationMatrix, L2Schedule, TowerProgress, TowerScheduleApproval, TowerScheduleUpload, VisualChart,
} from "./pages/Towers";

function RequireAuth({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return auth.isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}

function NotFound() {
  return (
    <PageCard>
      <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="text-[40px] font-bold text-gray-300">404</p>
        <p className="mt-2 text-[14px] text-ink-soft">This page doesn't exist.</p>
        <Link to="/products" className="mt-4 text-[13px] font-medium text-brand">Back to products</Link>
      </div>
    </PageCard>
  );
}

const P = "/productivity";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={auth.isLoggedIn() ? "/products" : "/login"} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/products" element={<RequireAuth><Products /></RequireAuth>} />

      <Route path={`${P}/configuration`} element={<RequireAuth><Shell module={configNav} /></RequireAuth>}>
        <Route index element={<Navigate to="organization-setup" replace />} />
        <Route path="organization-setup" element={<ConfigOrgSetup />} />
        <Route path="location" element={<ConfigLocations />} />
        <Route path="client" element={<ConfigClients />} />
        <Route path="industry" element={<ConfigIndustries />} />
      </Route>

      <Route path={P} element={<RequireAuth><Shell module={productivityNav} /></RequireAuth>}>
        <Route index element={<Navigate to="project-planning/project" replace />} />
        <Route path="home" element={<Dashboard />} />
        <Route path="project-planning/project" element={<ProjectCenter />} />
        <Route path="project-planning/my-assignment" element={<MyAssignment />} />
        <Route path="project-planning/goals-milestones" element={<Goals />} />
        <Route path="project-planning/timesheets" element={<Timesheets />} />
        <Route path="project-planning/approvals" element={<ProjectApprovals />} />
        <Route path="reports/assigned-vs-completed" element={<AssignedVsCompleted />} />
        <Route path="reports/quantity-wise-tracking" element={<QuantityTracking />} />
        <Route path="reports/cost-wise-tracking" element={<CostTracking />} />
        <Route path="cost-center/boq-management" element={<BoqManagement />} />
        <Route path="cost-center/boq" element={<Boq />} />
        <Route path="cost-center/boq-approval" element={<BoqApproval />} />
        <Route path="cost-center/quantity-management" element={<QuantityManagement />} />
        <Route path="cost-center/material-lifecycle-tracking" element={<MaterialLifecycle />} />
        <Route path="cost-center/cost-control" element={<CostControl />} />
        <Route path="cost-center/project-accounting" element={<ProjectAccounting />} />
        <Route path="cost-center/document-repository" element={<DocumentRepository />} />
        <Route path="approvals/approval-management" element={<ApprovalManagement />} />
        <Route path="organization" element={<OrganizationSetup />} />
        <Route path="organization/configuration/profile" element={<OrganizationProfile />} />
        <Route path="organization/configuration/legal-entities" element={<LegalEntities />} />
        <Route path="organization/configuration/business-units" element={<BusinessUnits />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/activity-orbit" element={<RequireAuth><Shell module={activityNav} /></RequireAuth>}>
        <Route index element={<Navigate to="tower-schedule-upload" replace />} />
        <Route path="tower-schedule-upload" element={<TowerScheduleUpload />} />
        <Route path="tower-schedule-approval" element={<TowerScheduleApproval />} />
        <Route path="foundation-matrix-upload" element={<FoundationMatrix />} />
        <Route path="l2-schedule-gantt-chart" element={<L2Schedule />} />
        <Route path="tower-progress" element={<TowerProgress />} />
        <Route path="visual-chart" element={<VisualChart />} />
      </Route>

      <Route path="/hrms" element={<RequireAuth><Shell module={hrmsNav} /></RequireAuth>}>
        <Route index element={<Navigate to="attendance-report" replace />} />
        <Route path="attendance-report" element={<Attendance />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
