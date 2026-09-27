# NebullaOne WFM — web app

A standalone rebuild of the NebullaOne workforce-management screens, written from scratch.
It has **no backend and no outside connections**: sign-in is demo-only and every page uses built-in demo data (`src/data/demo.ts`).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Build for production: `npm run build` (output in `dist/`), preview with `npm run preview`.

Sign in with any username and password.

## What's inside

| Area | Pages |
|---|---|
| Auth | Login, Sign up, Choose product |
| Projects | Project Center, My Assignment, Goals & Milestones, Timesheets, Approvals, My View dashboard (`/productivity/home`) |
| Cost Center | BOQ Workspace, Bill of Quantities, BOQ Approval, Quantity Management, Material Lifecycle Tracking, Cost Control, Project Accounting, Document Repository |
| Approvals | Approval Management |
| Reports | Assigned vs Completed, Quantity Wise Tracking, Cost Wise Tracking |
| Organization | Organization Setup, Organization Details, Legal Entities, Business Units |
| Configuration | Organization / Branch / Department, Locations, Client, Industry |
| Activity Orbit | Tower Schedule Upload & Approval, Foundation Matrix, L2 Schedule (Gantt), Tower Progress, Visual Chart |
| HRMS | Attendance Report |

Pages that need a project show the "Select a project" state first; pick one from the **Select project** menu to load demo data.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · React Router · lucide-react icons · Inter font (bundled locally).

## Layout

```
src/
  components/ui.tsx     shared pieces: buttons, page card, tabs, toolbar, empty states, stat cards, tables
  components/Shell.tsx  sidebar + top bar
  data/nav.ts           sidebar menus for each product
  data/demo.ts          demo data (swap for real API calls later)
  data/auth.ts          demo sign-in (browser only)
  pages/                one file per module
  App.tsx               routes
```
