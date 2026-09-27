import {
  FolderOpen, UserCheck, Target, Timer, ClipboardCheck, LayoutPanelLeft, FileText, CircleCheck,
  Boxes, PackageSearch, Scale, FileSpreadsheet, FolderClosed,
  ListChecks, BarChart3, TrendingUp, FilePlus2, ClipboardList, Grid3x3, AlignLeft, Activity, Map,
  CalendarClock, Layers, MapPin, Users, Factory, LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; to: string; icon: LucideIcon };
export type NavGroup = { label?: string; items: NavItem[] };
export type NavModule = { groups: NavGroup[]; back?: { label: string; to: string } };

const P = "/productivity";

export const productivityNav: NavModule = {
  groups: [
    {
      label: "Projects",
      items: [
        { label: "Project Center", to: `${P}/project-planning/project`, icon: FolderOpen },
        { label: "My Assignment", to: `${P}/project-planning/my-assignment`, icon: UserCheck },
        { label: "Goals & Milestones", to: `${P}/project-planning/goals-milestones`, icon: Target },
        { label: "Timesheets", to: `${P}/project-planning/timesheets`, icon: Timer },
        { label: "Approvals", to: `${P}/project-planning/approvals`, icon: ClipboardCheck },
      ],
    },
    {
      label: "Cost Center",
      items: [
        { label: "BOQ Workspace", to: `${P}/cost-center/boq-management`, icon: LayoutPanelLeft },
        { label: "Bill of Quantities (BOQ)", to: `${P}/cost-center/boq`, icon: FileText },
        { label: "BOQ Approval", to: `${P}/cost-center/boq-approval`, icon: CircleCheck },
        { label: "Quantity Management", to: `${P}/cost-center/quantity-management`, icon: Boxes },
        { label: "Material Lifecycle Tracking", to: `${P}/cost-center/material-lifecycle-tracking`, icon: PackageSearch },
        { label: "Cost Control", to: `${P}/cost-center/cost-control`, icon: Scale },
        { label: "Project Accounting", to: `${P}/cost-center/project-accounting`, icon: FileSpreadsheet },
        { label: "Document Repository", to: `${P}/cost-center/document-repository`, icon: FolderClosed },
      ],
    },
    {
      label: "Approvals",
      items: [{ label: "Approval Management", to: `${P}/approvals/approval-management`, icon: ClipboardCheck }],
    },
    {
      label: "Reports",
      items: [
        { label: "Assigned vs Completed Report", to: `${P}/reports/assigned-vs-completed`, icon: ListChecks },
        { label: "Quantity Wise Tracking Report", to: `${P}/reports/quantity-wise-tracking`, icon: BarChart3 },
        { label: "Cost Wise Tracking Report", to: `${P}/reports/cost-wise-tracking`, icon: TrendingUp },
      ],
    },
  ],
};

const A = "/activity-orbit";
export const activityNav: NavModule = {
  groups: [
    {
      label: "Tower Lifecycle Center",
      items: [
        { label: "Tower Schedule Upload", to: `${A}/tower-schedule-upload`, icon: FilePlus2 },
        { label: "Tower Schedule Approval", to: `${A}/tower-schedule-approval`, icon: ClipboardList },
        { label: "Foundation Matrix", to: `${A}/foundation-matrix-upload`, icon: Grid3x3 },
        { label: "L2 Schedule", to: `${A}/l2-schedule-gantt-chart`, icon: AlignLeft },
        { label: "Tower Progress", to: `${A}/tower-progress`, icon: Activity },
        { label: "Visual Chart", to: `${A}/visual-chart`, icon: Map },
      ],
    },
  ],
};

export const hrmsNav: NavModule = {
  groups: [{ label: "People", items: [{ label: "Attendance Report", to: "/hrms/attendance-report", icon: CalendarClock }] }],
};

const C = "/productivity/configuration";
export const configNav: NavModule = {
  back: { label: "Configuration", to: `${P}/project-planning/project` },
  groups: [
    {
      items: [
        { label: "Organization Setup", to: `${C}/organization-setup`, icon: Layers },
        { label: "Locations", to: `${C}/location`, icon: MapPin },
        { label: "Client", to: `${C}/client`, icon: Users },
        { label: "Industry", to: `${C}/industry`, icon: Factory },
      ],
    },
  ],
};
