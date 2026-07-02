# Inventia HR Mobile App — Product Documentation

## Overview

**Inventia** is a comprehensive HR mobile application built as a single-page React application (`hrmobileapp.html`). It provides end-to-end workforce management for employees, managers, and HR teams — covering everything from daily attendance and assignments to payroll, recruitment, performance, and beyond.

The app is designed with a mobile-first layout (max-width 390px) and uses a bottom navigation bar + a central "+" quick-action button for navigation.

---

## Navigation Structure

### Bottom Navigation Bar
| Tab | Icon | Description |
|-----|------|-------------|
| Home | Home | Dashboard / Today's Focus |
| My Assignments | Clipboard | Personal assignment list |
| + (More) | Plus | Quick actions popup |
| Approvals | Check | Approval inbox |
| Profile | Person | User profile & settings |

---

## Modules

### 1. Home Dashboard
The main dashboard gives an at-a-glance view of the employee's day and week.

**Sections:**
- **Header** — App name (Inventia), geofence badge, notification bell
- **Greeting card** — User name, location (Mumbai HQ), geofenced status, Check In / Check Out times with Punch In button and QR Code
- **Upcoming Events** — Client meetings, design reviews, etc.
- **Summary card** — Assignments (Done / Ongoing / Not Started) and Projects (Active / Ongoing / Completed / Not Started) pill selectors
- **Today's Focus**
  - **Due today** — Count of tasks due today with priority breakdown and a mini bar chart
  - **Overdue** — Count of overdue tasks with delta vs. yesterday; "Review now" CTA
  - **Completion** — Circular progress ring showing weekly completion percentage; displays `completed/total assignments` below "this week"
  - **Productivity** — Daily completion percentage (e.g., 60%), `X/Y assignments completed today`, a progress bar filled to that percentage, and Focus score (High/Medium/Low)
- **Assigned vs Completed** — Bar chart broken down by Activity / Task / Sub-Task
- **Project Status** — On Track / At Risk / Behind counts with filter
- **Completion by project** — Horizontal bar chart per project
- **Project Priority** — Priority distribution donut/count

---

### 2. My Assignments
Personal assignment list with full detail view.

**Features:**
- List of assignments with status, priority, and dates
- Assignment detail view:
  - Overview (description, assignees, dates, timeline)
  - Activity feed (comments, updates, completions)
  - Progress logging:
    - **Manual Entry** — Enter percentage progress with remark
    - **Quantity Based** — Log material quantities (Cement, Steel Bars, Sand, etc.) with planned vs. achieved
    - **Scope Entry** — Define scope and save with "Save Scope" button
  - **Milestones** — List milestones, mark as done, add remarks
  - **Attachments** — Upload files
  - **Reports** — Add / export daily progress reports (PDF, CSV)
  - **Documents** — Upload and manage assignment-related documents with folder structure and type filters
  - **Progress Log** — Historical log of progress entries

---

### 3. Projects
Full project management module.

**Features:**
- Project list with search and filter (by status, priority, industry, location)
- Create new project (Core Info, Cost, Industry, Stakeholders, Owner, Members, Client, Code, Structure)
- Project detail view:
  - Overview (Team Size, Budget, Utilized Budget, Overall Progress, Recent Activity)
  - Work Distribution chart
  - Progress Trends
  - Critical Path
  - Delayed Work
  - AI Summary
  - WBS (Work Breakdown Structure) — phases, tasks, sub-tasks with assignees, dates, status, dependencies, progress
  - Baseline management — Create, compare, and view version history
  - Milestones
  - Goals / Key Results (OKR-linked)
  - Gantt / Timeline view
  - Inventory tracking (Materials with planned vs. achieved quantities)

---

### 4. Approvals
Centralized approval inbox for managers and employees.

**Approval Categories:**
| Category | Description |
|----------|-------------|
| Timesheets | Review and approve submitted timesheets |
| Leave | Approve or reject leave applications |
| Expense Claims | Approve reimbursement claims |
| Travel Requests | Approve business travel |
| Shift Swaps | Approve shift change requests |
| Daily Progress Reports | Review field reports |
| Quality Checks | Review quality check submissions |

**Features:**
- Filter by category, team, status
- Approval decision flow (Approve / Reject) with comments
- Approval chain visibility

---

### 5. Attendance
Track and manage daily attendance.

**Features:**
- Punch In / Punch Out with QR code
- Geofenced check-in validation (Mumbai HQ)
- Attendance history calendar
- Request regularisation for missed punches
- Team on leave view
- Your schedule
- Working hours breakdown (Regular / Overtime)

---

### 6. Leave Management
Full leave lifecycle management.

**Features:**
- Leave balance display (Earned, Casual, Maternity, Paternity, Unpaid, Sick)
- Apply for leave (From Date, To Date, Reason, Supporting Document)
- My Applications — View status (Pending / Approved / Rejected)
- Modify or discard applications
- Team on-leave visibility

---

### 7. Timesheets
Log and track time against projects and tasks.

**Features:**
- Create timesheet (select entity type: Project / Task)
- Log hours with daily breakdown
- Time distribution (Development, Testing, Meetings, Documentation)
- Activity timeline
- Timesheet summary with logged vs. expected hours
- Submit for approval; view approval status

---

### 8. Travel & Expenses

#### Travel Requests
- Raise new travel request (Destination, Departure/Return dates, Mode of Travel, Estimated Cost)
- Policy compliance check (Within Policy indicator)
- Travel overview (Active Requests, Total Claims, Policy Compliance %)

#### Expense Claims
- Submit claims by category (Client Entertainment, Travel, Accommodation, Meals, Local Transport, Medical, Office Supplies)
- Attach receipts, claim GST, mark as billable
- Multi-expense batch submission
- Expense detail with receipt viewer

---

### 9. Payroll
View pay information and tax declarations.

**Features:**
- Latest payslip (Gross, Deductions, Net Pay) with earnings breakdown
- Payslip history
- Salary structure (Monthly Gross)
- Salary revision history
- Tax declarations — Sections used, proofs pending, upload proof
- TDS deducted, tax liability, refund due

---

### 10. Performance
360-degree performance management.

**Features:**
- **My Productivity** — Completion rate, daily assignments, priority breakdown, overall score
- **Performance Trend** — Weekly trend chart
- **Score Breakdown** — Output, completion rate, attendance rate, goal progress
- **Feedback** — Give and receive feedback from Manager, Peer, Direct Report
  - Rate competencies: Technical, Communication, Teamwork, Delivery, Initiative, Leadership, Collaboration, Problem Solving
- **Goals / OKRs** — Aligned to company objectives, with key results and milestones
- **Manager Review** — Formal review submission

---

### 11. Learning & Development
Employee upskilling and certification tracking.

**Features:**
- All learning courses with search and category filter
- Continue / Review / Enroll in courses
- Learning summary (Hours saved, Points earned, Enrolled count)
- **Certifications** — Active, expiring soon, expired (e.g., AWS Solutions Architect, PMP, Azure Fundamentals)
- Renew certifications
- **Achievements & Badges** — Safety Champion, Training Excellence, Team Player, Innovator, Mentor, Leader, Problem Solver
- **Rewards Snapshot** — Points this month, recognition points, peer recognition

---

### 12. Recruitment
End-to-end hiring pipeline management.

**Features:**
- Open Positions list with filters
- Hiring pipeline (Screening Rate → Interview Rate → Offer Rate → Hire Rate)
- Time to Hire metrics (Avg / Fastest / Slowest days)
- Conversion rates
- **Referrals** — Refer someone for a position (relationship type, referral bonus details)
- Create new job opening (Remote Allowed, Urgent Hiring flags)
- Applicant tracking per position

---

### 13. Onboarding & Offboarding

#### Onboarding
- Onboarding profile with progress tracker
- Required documents upload
- Job details, contact information, bank account, statutory details, nominee
- Buddy assignment
- Total joinees and upcoming joinee tracking

#### Offboarding
- Exit progress tracker
- Last Working Day display
- No Objection Certificates (mark as cleared per department)
- Net Settlement Amount (credits vs. deductions breakdown)
- Exit interview feedback with rating

---

### 14. Manager Hub
Dedicated view for managers to oversee their team.

**Features:**
- **Team Overview** — Present today, on leave, absent, WFH counts
- **Team Performance** — Avg Attendance, Avg Efficiency, Task Completion, Avg Rating
- **Pending Approvals** — Quick access to team's pending items
- **Escalation Alerts** — Flagged issues
- **Team Calendar** — Month view with events
- **Work Overview** — Assigned work, aligned projects per member
- **Employee detail** — Performance overview, tasks done, daily output, annual/sick leave balance, efficiency score
- **Add Member / Manage Team** — Add employees across departments
- **Team by Project** — List/Card view of team allocation

---

### 15. Shifts
Shift scheduling and swap management.

**Features:**
- My Shift details (Morning / Evening / Night)
- Shift history
- **Swap Requests** — Request swap with another member, select desired shift
- **Filter swap requests** — By status (Approved / Pending / Accepted / Declined), member, shift type
- Swap history with full audit trail
- Accept / Decline incoming swap requests

---

### 16. Documents
Centralized document repository.

**Features:**
- Folder structure with create-folder support
- Upload documents (select type, name, folder)
- Filter by document type and date range
- Export as PDF, CSV, Excel
- Open document details

---

### 17. Grievances
Anonymous or identified grievance submission.

**Categories:** Workplace, HR Policy, Interpersonal, Compensation, Safety

**Features:**
- Raise a grievance with subject and details
- Submit anonymously toggle
- Track status with SLA deadline
- View investigation updates
- Escalate or withdraw a grievance

---

### 18. Compliance
Policy and legal obligation tracking.

**Features:**
- Pending compliance actions
- Company policies with acknowledge flow
- Property statements
- Active bonds

---

### 19. Benefits
Employee benefits management.

**Features:**
- Pension (PRAN Number, Monthly Contribution)
- Dependent Members management
- File a claim (Self / Spouse / Mother / Father)
- Claim history (Claim ID, Type, Claimant, Approved Amount)
- Balance available / Total Limit / Used Amount

---

### 20. HR Helpdesk
Internal support ticketing.

**Ticket Categories:** Leave, ID Card, Policy Query, Attendance, General

**Features:**
- Raise a ticket with description
- View open and resolved tickets
- Assigned To display
- Conversation thread within ticket

---

### 21. Directory
Employee directory and org chart.

**Features:**
- Filter by department, role type, location, skills
- Add employee
- Total Employees / Locations / Departments stats
- Individual profile view (attendance calendar, org chart position, full profile)

---

### 22. AI Assistant
Intelligent assistant embedded in the app.

**Features:**
- **AI Daily Summary** — Work overview for the day
- **AI Risk Alerts** — Flagged risks on projects/tasks
- **AI Standup** — Automated standup generation ("Today at a glance")
- **Quick Actions** — Shortcuts powered by AI
- **AI Insights** — Trend-based insights
- **AI Predictions** — Predictive analytics
- **Anomaly Detection** — Flags unusual patterns
- **Smart Recommendations** — Actionable suggestions with "Apply Recommendation" CTA

---

### 23. Sprint Board
Agile task management view.

**Features:**
- Kanban-style board (To Do / In Progress / Complete / Drop Here)
- Complete Sprint action
- Task Templates — use pre-built templates with preview

---

### 24. Analytics & Reports
Reporting and data export centre.

**Reports Available:**
| Report | Export Formats |
|--------|---------------|
| Attendance Report | Excel |
| Leave Utilization Report | Excel |
| Payroll Summary | Excel |
| Tax Declaration Report | Excel |
| Performance Report | Excel |
| Expense Report | Excel |

**Analytics Dashboards:**
- Productivity Score
- Assignments Completed / Rework Rate / Completion Rate
- Weekly Activity chart
- Attendance Rate (Days Present, Late Arrivals, Days Absent, Regularization Rate)
- Monthly Attendance Trend
- Leave Utilization breakdown

---

### 25. Asset Management
Company asset tracking per employee.

**Features:**
- Total Assets Assigned / Total Value / Condition status
- New Asset Request (Laptop, Mobile Phone, Monitor — with justification)
- Asset detail view

---

### 26. Safety
Workplace safety tracking.

**Features:**
- Days Since Last Incident counter
- Open Incidents list
- Safety Champion badge (zero incidents achievement)

---

### 27. Employee Wellness
Health and engagement tracking.

**Features:**
- Avg Energy / Avg Stress metrics
- Mental Health Score
- Recommended actions
- Weekly Physical Activity log
- Health Reminders
- **Engagement Index** with dimension breakdown
- Quick Pulse Survey

---

### 28. HRConnect (Digital ID Card)
Digital employee identity.

**Features:**
- Digital Employee ID card
- Active status indicator
- Location, Valid Through date
- QR code for verification

---

### 29. Notifications
In-app notification centre.

**Features:**
- List of notifications (Mark all read)
- Notification Settings:
  - Do Not Disturb (with until-time setting)
  - Notification Sound toggle
  - Vibration toggle

---

### 30. Profile
User account and settings.

**Features:**
- Edit Profile
- Change Password
- Language preference
- Timezone setting
- Privacy Settings
- FAQ / Contact Support
- **My Wallet** — Points balance and rewards
- **Skill Gaps** — Gap analysis with learning plan link
- **Career Roadmap** — Current role, readiness for next role, retention risk, skills to develop

---

## Key Design Principles

| Principle | Detail |
|-----------|--------|
| Mobile-first | 390px max-width, bottom nav |
| Single-file | All React + CSS in one HTML file |
| Offline-friendly | No external API dependencies (mock data) |
| Role-aware | Employee, Manager, HR views |
| Theme | Light mode with subtle surface hierarchy (`surfacePrimary`, `borderSubtle`, `txt3`) |

---

## Data Model Highlights

| Entity | Key Fields |
|--------|-----------|
| Assignment | title, status, priority, endDate/dueDate, progress, assignees, milestones |
| Project | name, status, budget, team, phases, WBS |
| Leave | type, fromDate, toDate, reason, status, approvedBy |
| Timesheet | project, task, hoursLogged, dailyBreakdown, status |
| Expense | type, amount, receipt, GST, billable, claimStatus |
| Goal | name, keyResults, milestones, alignedTo, progress |
| Employee | name, department, role, skills, attendanceCalendar |

---

*Document generated for internal reference — covers all screens and modules present in `hrmobileapp.html` as of the current build.*
