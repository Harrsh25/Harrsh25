# INVENTIA HR MOBILE APPLICATION
## Business Requirement Document

---

| Version No. | Title | Date of Issue | Prepared By | Review By | Changes Made |
|-------------|-------|---------------|-------------|-----------|--------------|
| 1.0 | Inventia HR Mobile Application | 02-July-2026 | Harsh Singh | — | Initial Release |

---

## Table of Contents

1. Introduction
2. Login & Authentication
   - 2.1 Process Flow
3. Home Dashboard
   - 3.1 Header Section
   - 3.2 Attendance Card
   - 3.3 Upcoming Events
   - 3.4 Summary Card
   - 3.5 Today's Focus Section
   - 3.6 Assigned vs Completed
   - 3.7 Project Status
4. Navigation Structure
   - 4.1 Bottom Navigation Bar
   - 4.2 Quick Action Menu (+)
5. My Assignments
   - 5.1 Panel Header
   - 5.2 Filter Panel
   - 5.3 Assignment Detail Page
   - 5.4 Progress Tracking Tab
   - 5.5 Daily Report Tab
   - 5.6 Milestones Tab
   - 5.7 Attachments & Documents
6. Projects
   - 6.1 Project List View
   - 6.2 Filter Controls
   - 6.3 Create New Project
   - 6.4 Project Detail Page
   - 6.5 Work Breakdown Structure (WBS)
   - 6.6 Baselines
   - 6.7 Inventory Tracking
7. Approvals
   - 7.1 Access & Navigation
   - 7.2 Approval Categories
   - 7.3 Approval Detail Page
   - 7.4 Approval Workflow
8. Attendance
   - 8.1 Access & Navigation
   - 8.2 Punch In / Punch Out
   - 8.3 Attendance History
   - 8.4 Request Regularisation
9. Leave Management
   - 9.1 Leave Balance
   - 9.2 Apply for Leave
   - 9.3 My Applications
   - 9.4 Process Flow
10. Timesheets
    - 10.1 Access & Navigation
    - 10.2 Create Timesheet
    - 10.3 Timesheet List View
    - 10.4 Approval Status Workflow
11. Travel & Expenses
    - 11.1 Travel Requests
    - 11.2 Expense Claims
12. Payroll
    - 12.1 Payslip
    - 12.2 Tax Declarations
    - 12.3 Salary Structure
13. Performance
    - 13.1 My Productivity
    - 13.2 Performance Trend
    - 13.3 Feedback
    - 13.4 Goals & OKRs
14. Learning & Development
    - 14.1 Courses
    - 14.2 Certifications
    - 14.3 Achievements & Rewards
15. Recruitment
    - 15.1 Open Positions
    - 15.2 Hiring Pipeline
    - 15.3 Referrals
16. Onboarding & Offboarding
    - 16.1 Onboarding Profile
    - 16.2 Offboarding & Exit
17. Manager Hub
    - 17.1 Team Overview
    - 17.2 Team Performance
    - 17.3 Pending Approvals & Escalations
18. Shifts
    - 18.1 My Shift
    - 18.2 Shift Swap Requests
    - 18.3 Swap History
19. Documents
    - 19.1 Folder Structure
    - 19.2 Upload & Filter
    - 19.3 Export
20. Grievances
    - 20.1 Raise a Grievance
    - 20.2 Grievance Tracking
21. Compliance
22. Benefits
    - 22.1 Pension
    - 22.2 Claims
23. HR Helpdesk
24. Directory & Org Chart
25. AI Assistant
26. Sprint Board
27. Analytics & Reports
28. Asset Management
29. Employee Wellness
30. Notifications
31. Profile & Settings

---

## 1. Introduction

This Business Requirement Document (BRD) describes the complete functional requirements of the **Inventia HR Mobile Application**. The application is a comprehensive, mobile-first HR management platform delivered as a single self-contained application targeting smartphones and tablets (max viewport width 390 px).

The system enables organizations to manage their complete workforce lifecycle from a mobile device — covering daily attendance, assignments, project tracking, approvals, payroll, recruitment, performance management, learning, and beyond.

**Functional Areas covered:**

- Employee self-service (attendance, leave, payroll, assets)
- Work management (assignments, projects, WBS, timesheets)
- People management (directory, org chart, onboarding, offboarding)
- Talent management (performance, learning, goals, recruitment)
- Manager operations (approvals, team oversight, escalations)
- HR operations (helpdesk, grievances, compliance, benefits)
- Intelligence (AI assistant, analytics, sprint board)

---

## 2. Login & Authentication

The Login page provides secure access to the platform. It supports credential-based authentication for all user types (Employee, Manager, HR Admin).

**Form Fields:**
- Email / User ID
- Password

### 2.1 Process Flow

```
User opens app
  → Enters Email/User ID and Password
  → System validates credentials
  → If valid: User is authenticated and redirected to Home Dashboard
  → If invalid: Error message is displayed ("Incorrect email or password")
```

---

## 3. Home Dashboard

The Home Dashboard is the main landing screen of the application. It provides an at-a-glance summary of the employee's attendance status, work progress, and focus areas for the day and week.

### 3.1 Header Section

The app header contains:
- **App Name** – "Inventia" displayed prominently at the top left
- **Settings Icon** – Quick access to app settings (top right)
- **Notification Bell** – Access to the notification centre (top right)

### 3.2 Attendance Card

The attendance card displays the employee's check-in status for the current day.

| Field | Description |
|-------|-------------|
| Employee Name | "Good morning, {Name}" personalized greeting |
| Location Badge | Current office location (e.g., Mumbai HQ) |
| Geofence Badge | Indicates geofenced status (active/inactive) |
| Check In Time | Time of the day's first punch-in |
| Check Out Time | Time of the day's last punch-out |
| Status | "Not started", "Checked In", "Checked Out" |
| Punch In Button | Initiates attendance check-in |
| QR Code Button | Opens QR scanner for location-based check-in |

### 3.3 Upcoming Events

Displays the next 2–3 upcoming calendar events for the employee. Each event shows:
- Event title
- Date and time
- **View All** link to the full Team Calendar

### 3.4 Summary Card

Provides a pill-based selector view for Assignments and Projects.

**Assignments Pills:**
- Done | Ongoing | Not Started (with count per status)

**Projects Pills:**
- Active | Ongoing | Completed | Not Started (with count per status)

Tapping a pill filters the respective list. Both pill rows display count badges without colored dot indicators.

### 3.5 Today's Focus Section

The "Today's Focus" section contains four metric cards arranged in a 2×2 grid.

#### 3.5.1 Due Today Card
- Count of tasks due on the current date
- Breakdown by priority (e.g., "5 high priority")
- Mini horizontal bar chart showing priority distribution

#### 3.5.2 Overdue Card
- Count of overdue tasks
- Delta since yesterday (e.g., "+2 since yesterday")
- "Review now →" call-to-action link

#### 3.5.3 Completion Card
- **Metric:** Weekly completion percentage (circular ring chart)
- **Formula:** `completed non-recurring tasks / total non-recurring tasks × 100`
- **Sub-label:** "this week"
- **Assignment Count:** `{completed}/{total} assignments` displayed below "this week"

#### 3.5.4 Productivity Card
- **Metric:** Daily completion percentage (large numeric display)
- **Formula:** `assignments completed today / assignments due today × 100`
- **Sub-label:** `{completed}/{total} assignments completed today`
- **Progress Bar:** Horizontal bar (height: 4 px) filled to the daily percentage width, colored with the warning accent color
- **Focus Score:** Label showing "Focus score" with value (High / Medium / Low)
- *Fallback:* If no task due-date data is available for the current date, defaults to example values (3 completed of 5 due = 60%)

### 3.6 Assigned vs Completed

A bar chart grouped by entity type:
- Activity
- Task
- Sub-Task

Each group shows assigned count vs. completed count with percentage labels.
A **All Projects** dropdown filter allows switching the view by project.

### 3.7 Project Status

Displays three status buckets:
- On Track
- At Risk
- Behind

Each bucket shows count with a color-coded indicator. Export options: PDF, CSV.

### 3.8 Completion by Project

Horizontal bar chart with one row per project showing progress percentage (e.g., Office Relocation 62%, HR Orbit 100%, Productivity Suite 45%).

### 3.9 Project Priority

Priority distribution display:
- Critical / High / Medium counts with visual breakdown

---

## 4. Navigation Structure

### 4.1 Bottom Navigation Bar

The application uses a persistent bottom navigation bar with five items:

| Tab | Label | Description |
|-----|-------|-------------|
| 1 | Home | Dashboard |
| 2 | My Assignments | Personal assignment list |
| 3 | + (More) | Central quick-action launcher |
| 4 | Approvals | Approval inbox |
| 5 | Profile | User profile & settings |

### 4.2 Quick Action Menu (+)

Tapping the central "+" button opens a radial/grid menu of quick actions:
- Apply Leave
- Log Time
- New Task
- New Travel
- New Expense
- All Modules

"All Modules" expands to the full module grid, giving access to every section of the app.

---

## 5. My Assignments

The My Assignments module is the employee's personal task inbox. It lists all assignments allocated to the logged-in user across all projects.

### 5.1 Panel Header

- Screen title: "My Assignments"
- Search bar for real-time filtering by assignment name
- Filter icon to open the filter panel
- Sort control

### 5.2 Filter Panel

The filter panel slides in from the right side. It is positioned within the mobile frame (position: absolute, not fixed) to avoid overflow outside the app boundary.

**Filter Fields:**
- Status (All / Not Started / Ongoing / Completed)
- Priority (All / High / Medium / Low)
- Date Range (From – To)
- Project (multi-select)
- Assignee

**Key Actions:**
- **Apply Filters** – Applies selected criteria to the assignment list
- **Clear All** – Resets all filters to default

### 5.3 Assignment Detail Page

Tapping an assignment opens the Assignment Detail Panel (right-side slide-in). It contains:

#### 5.3.1 Header Section
- Assignment Name
- Status badge (Not Started / Ongoing / Completed)
- Priority badge (High / Medium / Low)
- Three-dot menu for additional actions
- Close button

#### 5.3.2 Information Section
| Field | Description |
|-------|-------------|
| Created On | Date the assignment was created |
| Created By | Name of the user who created it |
| Assignees | Avatar list of assigned team members |
| Timeline | Start date – End date range |
| Time Logged | Total hours tracked against this assignment |
| Completed On | Date of completion (if applicable) |
| Description | Detailed description of work required |

#### 5.3.3 Tabs in Assignment Detail
- **Overview** – Summary information as described above
- **Comments** – Threaded discussion on the assignment
- **Live Flow** – Real-time activity log (Created, Updated, Completed entries grouped by date)
- **Progress** – Progress tracking forms
- **Daily Report** – Daily progress reports
- **Milestones** – Milestones associated with this assignment
- **Attachments** – Uploaded files
- **Documents** – Document repository linked to this assignment
- **Scope** – Scope entry and definition

### 5.4 Progress Tracking Tab

Three types of progress tracking are available:

#### 5.4.1 Manual Entry
User enters a progress percentage with a remark.

| Field | Description |
|-------|-------------|
| Progress % | Slider or numeric input |
| Remark | Free-text comment |
| Save Progress | Submit the entry |

#### 5.4.2 Quantity Based
Used for material or physical quantity tracking.

| Column | Description |
|--------|-------------|
| Material | Material name (Cement, Steel Bars, Sand, etc.) |
| Unit | Unit of measurement (Bags, Bars, etc.) |
| Planned | Target quantity |
| Achieved | Quantity completed |
| Weight | Weighting factor |

Key Actions: **Save Entry**

#### 5.4.3 Scope Entry
User defines or updates the scope of work.

| Field | Description |
|-------|-------------|
| Scope | Text description of scope |
| Key Actions | **Save Scope** button to commit scope definition |

### 5.5 Daily Report Tab

Allows employees to submit a daily progress report for the assignment.

**Form Fields:**
- Date (auto-populated)
- Report summary / remarks
- Attachments

**Key Actions:**
- **Add Report** – Opens the report form
- **Export Report** – Exports as PDF or CSV

### 5.6 Milestones Tab

Displays milestones linked to the assignment.

| Column | Description |
|--------|-------------|
| Milestone Name | Name of the milestone |
| Status | Not Started / In Progress / Completed |
| Due Date | Target completion date |
| Progress | Completion percentage |

**Key Actions:**
- **Mark Milestone as Done** – Closes the milestone
- **Add Remark** – Attaches a note to the milestone

### 5.7 Attachments & Documents

**Attachments Tab:**
- Upload files directly from the device
- View uploaded files as downloadable cards (file name + size)

**Documents Tab:**
- Folder-based structure
- Upload document (select folder, document type, name)
- Filter by type and date range
- Export as PDF / CSV

---

## 6. Projects

The Projects module provides full project lifecycle management from the mobile device.

### 6.1 Project List View

Displays all projects assigned to or visible by the logged-in user.

**List Columns:**
| Column | Description |
|--------|-------------|
| Project Name | Name of the project |
| Status | Ongoing / Completed / Not Started / At Risk |
| Progress | Visual progress bar with percentage |
| Owner | Project owner avatar |
| Team Size | Count of assigned members |
| Timeline | Start – End date range |

### 6.2 Filter Controls

**Filter Fields:**
- Status (multi-select)
- Priority (High / Medium / Low)
- Industry
- Location
- Owner
- Date Range

**Key Actions:**
- **Filter Projects** – Applies selected filters
- **Clear Filters** – Resets to default

### 6.3 Create New Project

Tapping **Create Project** opens the creation form.

**Sections:**

**Core Info:**
| Field | Description |
|-------|-------------|
| Project Name | Name of the project |
| Location | Select from location list |
| Timeline | Start date – End date |
| Description | Project overview |

**Project Cost:** Budget / estimated value

**Industry:** Select industry classification

**Stakeholders:**
| Field | Description |
|-------|-------------|
| Owner | Person responsible |
| Members | Team members (multi-select) |
| Client | Associated client |
| Code | Internal project code |

**Structure:**
- Enable **Break into phases** toggle to add sub-projects/phases

### 6.4 Project Detail Page

Tapping a project opens its full detail view.

#### 6.4.1 Header Section
- Project Name
- Status Badge
- Active / Inactive Toggle
- Star icon (mark as favourite)

#### 6.4.2 Overview Tab
| Field | Description |
|-------|-------------|
| Team Size | Number of team members |
| Budget | Total project budget |
| Utilized Budget | Amount spent to date |
| Overall Progress | Percentage complete |

**Analytics within Overview:**
- Work Distribution chart
- Progress Trends chart
- Critical Path view
- Delayed Work list
- AI Summary panel
- Recent Activity feed

#### 6.4.3 Tabs in Project Detail
- **Overview** – Summary and analytics as above
- **WBS** – Work Breakdown Structure (see §6.5)
- **Milestones** – Project milestones
- **Goals** – OKR-linked goals
- **Gantt** – Timeline/Gantt chart
- **Inventory** – Material tracking
- **Baselines** – Baseline management (see §6.6)
- **Documents** – Project documents

### 6.5 Work Breakdown Structure (WBS)

The WBS is the core project execution view. It displays the hierarchical breakdown of a project into Activities, Tasks, and Sub-Tasks.

#### 6.5.1 WBS Navigation Views
| View | Description |
|------|-------------|
| List | Hierarchical table with Activities → Tasks → Sub-Tasks |
| Board | Kanban-style view grouped by Status / Priority / Assignee |
| Gantt | Timeline-based chart showing durations and schedules |

#### 6.5.2 WBS List View Columns
| Column | Description |
|--------|-------------|
| Structure Name | Activity / Task / Sub-Task in parent-child hierarchy |
| Timeline | Start date – End date |
| Assignee | Responsible person (avatar with assign icon) |
| Status | Ongoing / Completed / Not Started |
| Progress | Visual bar with percentage |
| Dependency | Predecessor/successor links |
| Recurrence | Repeat schedule (Daily / Weekly / Monthly / Quarterly) |
| Priority | High / Medium / Low |

**Key Actions:**
- **+ Add Activity** – Creates a new parent-level activity
- **Search WBS** – Real-time filter by name
- **Upload** – Import WBS from Excel/CSV
- **Export** – Download WBS data
- **Filter WBS** – Advanced filter panel
- **Customize Columns** – Add/remove columns (Duration, Time Logged, Dependency, Recurrence, Inventory, Scope, Shift, Skill, Priority, Completion Date, Location)

#### 6.5.3 WBS Detail Panel (Activity / Task / Sub-Task)
Tapping any row opens the right-side detail panel.

**Header Section:**
- Item name
- Owner
- Status badge
- Three-dot menu

**Information Panel:**
| Field | Description |
|-------|-------------|
| Assignee | Responsible user |
| Timeline | Start – End dates |
| Duration | Time span |
| Priority | Urgency level |
| Skill | Required competencies |
| Shift | Assigned work shift |
| Daily Target | Target quantity per day |

**Tabs:**
- Task (sub-tasks list)
- Live Flow (activity log)
- Comments

#### 6.5.4 Dependency Configuration
- **Dependency Type:** Blocking / Blocked
- **Entity Selection Panel:** Search and select tasks this item depends on or blocks
- **Dependency Rules:** A task cannot depend on itself; circular dependencies are prevented
- **Dependency Indicators:** Visual indicator on WBS row when dependency exists

#### 6.5.5 Recurrence Configuration
| Field | Description |
|-------|-------------|
| Define By | Daily / Weekly / Monthly / Quarterly |
| Frequency | Interval between occurrences |
| Generation Mode | Auto-generate instances in advance |
| Calendar Preview | Visual preview of recurrence pattern |

### 6.6 Baselines

**Access:** Project Detail → Baselines tab

**Features:**
- **Create Baseline** – Snapshots the current WBS plan with a version name and date
- **Version History** – List of all baselines created for the project
- **Compare Baselines** – Side-by-side comparison of two baseline versions
- **Legend** – Color coding for baseline vs. actuals

### 6.7 Inventory Tracking

**Access:** Project Detail → Inventory tab

**Inventory Table Columns:**
| Column | Description |
|--------|-------------|
| Material | Material name (e.g., Cement, Mild Steel) |
| Structure | Associated WBS structure |
| Planned | Planned quantity |
| Achieved | Quantity consumed/used |
| Remaining | Planned – Achieved |
| Unit | Unit of measurement |

---

## 7. Approvals

The Approvals module is the centralized inbox for all approval requests. Accessible via the bottom navigation bar (4th tab).

### 7.1 Access & Navigation

- **Screen Title:** "Approvals"
- **Filter Controls:** Category, Team, Status
- Two sub-tabs: **My Approvals** / **Team Approvals**

### 7.2 Approval Categories

| Category | Description |
|----------|-------------|
| Timesheets | Employee timesheet submissions for time-period review |
| Leave | Leave applications (Earned, Sick, Casual, Maternity, Paternity, Unpaid) |
| Expense Claims | Reimbursement claim approvals |
| Travel Requests | Business travel requests |
| Shift Swaps | Shift change/swap requests |
| Daily Progress Reports | Field daily progress report submissions |
| Quality Checks | Quality check form submissions |

### 7.3 Approval Detail Page

Tapping any approval item opens its detail panel.

**Information Section:**
| Field | Description |
|-------|-------------|
| Category | Type of approval |
| Submitted By | Employee name and avatar |
| Submitted On | Submission date and time |
| Status | Pending / Approved / Rejected / Resubmitted |
| Approved By | Approver name (once actioned) |
| Week Period / Date Range | Applicable period |

**Approval Chain:** Visual chain showing all approvers in sequence with their status.

### 7.4 Approval Workflow

```
Employee submits request
  → Approval appears in approver's inbox (Pending)
  → Approver opens detail, reviews content
  → Approver clicks Approve or Reject
  → If Rejected: Employee is notified; may Resubmit (becomes "Resubmitted" status)
  → If Approved: Status becomes "Approved"
```

**Approval Status Types:**
- Pending
- Approved
- Rejected
- Resubmitted
- Sent for Rework
- Under Review

---

## 8. Attendance

### 8.1 Access & Navigation

Accessible via the **+** quick action menu → Attendance, or the Home Dashboard attendance card.

### 8.2 Punch In / Punch Out

**Process Flow:**
```
User taps "Punch In" button on Home Dashboard
  → System checks geofence status (Mumbai HQ / other registered office)
  → If within geofence: Check-in recorded with timestamp and location
  → Alternatively: User scans QR code for location verification
  → "Punch Out" button becomes available
  → User taps "Punch Out" at end of shift
  → Total working hours calculated
```

**Attendance Card Fields:**
| Field | Description |
|-------|-------------|
| Check In Time | Timestamp of first punch |
| Check Out Time | Timestamp of last punch |
| Status | Not Started / Checked In / Checked Out |
| Working Hours | Calculated hours for the day |

### 8.3 Attendance History

Displays a calendar view with attendance status per day.

**Status Indicators:**
- Present (green)
- Absent (red)
- On Leave (blue)
- Work From Home (purple)
- Late Arrival (yellow)

### 8.4 Request Regularisation

Allows employees to request correction of missed or incorrect punches.

**Form Fields:**
| Field | Description |
|-------|-------------|
| Selected Date | Date requiring correction |
| Punch In | Corrected check-in time |
| Punch Out | Corrected check-out time |
| Working Hours | Auto-calculated |
| Reason | Justification for regularisation |

**Key Actions:** **Submit Request**

---

## 9. Leave Management

### 9.1 Leave Balance

Displays current leave balance by type:
- Earned Leave
- Casual Leave
- Sick Leave
- Maternity Leave
- Paternity Leave
- Unpaid Leave

### 9.2 Apply for Leave

**Process Flow:**
```
Employee taps "Apply Leave"
  → Selects Leave Type
  → Enters From Date and To Date
  → Writes Reason
  → Optionally attaches Supporting Document
  → Taps Submit
  → Application moves to Approver's inbox
```

**Form Fields:**
| Field | Description |
|-------|-------------|
| Leave Type | Dropdown (Earned / Casual / Sick / Maternity / Paternity / Unpaid) |
| From Date | Start date of leave |
| To Date | End date of leave |
| Available Balance | Shown for selected leave type |
| Reason | Free-text reason |
| Supporting Document | Optional file attachment |

### 9.3 My Applications

List view of all submitted leave applications.

**List Columns:**
| Column | Description |
|--------|-------------|
| Leave Type | Type of leave applied |
| From Date | Start date |
| To Date | End date |
| Status | Pending / Approved / Rejected |
| Applied On | Date of submission |
| Approved By | Approver name |

**Key Actions:**
- **Modify Application** – Edit pending applications (From Date, To Date, Reason)
- **Discard** – Cancel a pending application

### 9.4 Process Flow

```
Employee applies for leave
  → Manager receives notification
  → Manager approves or rejects
  → Employee receives notification of decision
  → Approved leave reflects in attendance calendar and leave balance
```

---

## 10. Timesheets

### 10.1 Access & Navigation

- Accessible via **+ Quick Action → Log Time** or **All Modules → Timesheets**
- **Screen Title:** "My Timesheets"
- Filter, search, and create controls in the header

### 10.2 Create Timesheet

Tapping **Create Timesheet** opens the creation form.

**Form Fields:**
| Field | Description |
|-------|-------------|
| Entity Type | Project / Task / Sub-Task |
| Select Entity | Search and select the specific item |
| Timesheet Duration | Date range covered |
| Hours Per Day | Daily hour allocation |
| Members | Add additional members to the timesheet |
| Remarks | Optional notes |
| Attachments | Supporting files |

**Key Actions:**
- **Save Draft** – Saves without submitting for approval
- **Submit** – Sends for manager approval

### 10.3 Timesheet List View

**List Columns:**
| Column | Description |
|--------|-------------|
| Project / Task | Entity the timesheet is logged against |
| Logged Hours | Total hours submitted |
| Status | Draft / Submitted / Approved / Rejected |
| Submitted On | Submission date |
| Approved On | Approval date (if applicable) |

**Timesheet Detail View:**
- Information Section (entity, period, added by)
- Daily Breakdown table (date, hours, regular vs. overtime)
- Time Distribution chart (Development, Testing, Meetings, Documentation)
- Activity Timeline (Submitted / Approved events with user and timestamp)
- Reviewer Comments

### 10.4 Approval Status Workflow

```
Employee submits timesheet
  → Status: "Submitted"
  → Manager receives in Approvals inbox
  → Manager reviews daily breakdown and remarks
  → Approve → Status: "Approved"
  → Reject → Status: "Rejected"; employee notified with comments
```

---

## 11. Travel & Expenses

### 11.1 Travel Requests

#### 11.1.1 Raise New Travel Request

**Form Fields:**
| Field | Description |
|-------|-------------|
| Type of Travel | Business / Client Visit / Training |
| Select Project | Associated project (optional) |
| Destination | City/location selection |
| Departure Date | Travel start date |
| Return Date | Travel end date |
| Mode of Travel | Flight / Train / Road |
| Estimated Cost | Estimated travel expenditure |
| Purpose/Notes | Reason for travel |

**Key Actions:** **Save Draft** / **Submit**

#### 11.1.2 Travel Requests Overview
| Metric | Description |
|--------|-------------|
| Active Travel Requests | Count of in-progress requests |
| Total Claims | Total claims associated with travel |
| Policy Compliance | % of requests within travel policy |
| Booking Linkage | Linked bookings |

**Policy Status Indicator:** "Within Policy" / "Outside Policy" shown per request.

### 11.2 Expense Claims

#### 11.2.1 Create New Expense Claim

**Expense Categories:**
- Client Entertainment
- Travel
- Accommodation
- Meals
- Local Transport
- Medical
- Office Supplies
- Miscellaneous

**Form Fields:**
| Field | Description |
|-------|-------------|
| Expense Type | Category dropdown |
| Date of Expense | Date incurred |
| Amount | Claim amount |
| Receipt | Upload receipt photo/file |
| Claim GST | Toggle for GST reclaim |
| Billable | Toggle to mark as billable to client |
| Particular | Specific sub-type (Hotel, Taxi, Meal, etc.) |

**Key Actions:**
- **Add More Expenses** – Add multiple line items in one submission
- **Submit Claim** – Sends for approval
- **Save Draft** – Saves without submitting

---

## 12. Payroll

### 12.1 Payslip

**Latest Payslip Display:**
| Field | Description |
|-------|-------------|
| Gross | Total gross salary |
| Deductions | Total deductions |
| Net Pay | Take-home amount |

**Earnings Breakdown:** Itemized list of salary components (Basic, HRA, Allowances, etc.)

**Payslip History:** Month-by-month list of past payslips, downloadable as PDF.

### 12.2 Tax Declarations

| Field | Description |
|-------|-------------|
| Total TDS Deducted | Cumulative TDS for the financial year |
| Tax Liability | Total computed tax |
| Refund Due | Excess TDS paid |
| Sections Used | Tax declaration sections utilized |
| Proofs Pending | Count of proofs not yet uploaded |

**Key Actions:** **Upload Proof** – Attach investment proof documents

### 12.3 Salary Structure

| Field | Description |
|-------|-------------|
| Monthly Gross | Current monthly gross salary |
| Salary Revision History | Chronological list of past revisions |

---

## 13. Performance

### 13.1 My Productivity

**Metrics Displayed:**
| Metric | Description |
|--------|-------------|
| Productivity Score | Overall score (0–100) |
| Completion Rate | % of assigned tasks completed |
| Daily Assignments | Count of assignments due vs. completed |
| Priority Breakdown | High / Medium / Low task distribution |
| Overall Score | Composite performance score |

**Sub-sections:**
- Output (quantity of work delivered)
- Completion Rate
- Attendance Rate
- Goal Progress

### 13.2 Performance Trend

**Weekly Performance Trend Chart:** Line chart showing performance score over the past weeks.

**Score Breakdown:**
| Dimension | Score |
|-----------|-------|
| Output | Score |
| Completion Rate | Score |
| Attendance Rate | Score |
| Goal Progress | Score |

### 13.3 Feedback

**Give Feedback:**
Employee can provide feedback on team members by rating competencies.

**Competency Ratings:**
- Technical
- Communication
- Teamwork
- Delivery
- Initiative
- Leadership
- Collaboration
- Problem Solving

**Received Feedback:** View feedback given by Manager, Peers, and Direct Reports.

**Feedback Sources:**
| Source | Role |
|--------|------|
| Manager Review | Formal manager assessment |
| Peer | Colleague feedback |
| Self | Self-assessment |

### 13.4 Goals & OKRs

**Goal List View:**
- Goal Name
- Status (In Progress / Completed / Not Started)
- Aligned To (Company Objective)
- Progress

**Goal Detail Page:**
| Section | Description |
|---------|-------------|
| Information | Title, owner, timeline, description |
| Summary | Overall progress percentage |
| Configuration | Parent goal, alignment settings |
| Goal Execution Tab | Key Results and Milestones tracking |
| Contributing Goals | Sub-goals contributing to this goal |

**Key Actions:**
- **Create Goal** – Open goal creation form (Goal Name, Description, Timeline, Parent Goal, Add Milestone)
- **Mark Goal as Completed** – Closes the goal
- **Align to Parent Goal** – Links goal to a company objective

---

## 14. Learning & Development

### 14.1 Courses

**Course List View:**
- All available courses with category filter
- Each course card shows: Title, Category, Duration, Score

**Course States:**
| State | Description |
|-------|-------------|
| Enroll Now | Not yet started |
| Continue Learning | In progress |
| Review Course | Completed |

**Learning Summary:**
| Metric | Description |
|--------|-------------|
| Enrolled | Count of enrolled courses |
| Hours Saved | Total learning hours completed |
| Points Earned | Gamification points from learning |

### 14.2 Certifications

**Certification States:**
- Active
- Expiring Soon
- Expired

**Certification Card Details:**
| Field | Description |
|-------|-------------|
| Certification Name | e.g., AWS Solutions Architect, PMP, Azure Fundamentals |
| Issuing Body | e.g., Amazon Web Services, Scrum Alliance, Microsoft |
| Issued Date | Date of certification |
| Expiry Date | Certification expiry |
| Cert ID | Unique certificate identifier |
| Assessment Score | Exam score |

**Key Actions:** **Renew Certification**

### 14.3 Achievements & Rewards

**Badges:**
| Badge | Criteria |
|-------|----------|
| Safety Champion | Zero incidents recorded |
| Training Excellence | Training completion milestone |
| Team Player | Collaboration metric |
| Innovator | Innovation contribution |
| Mentor | Mentoring participation |
| Leader | Leadership score |
| Problem Solver | Issue resolution metric |

**Rewards Snapshot:**
| Field | Description |
|-------|-------------|
| This Month | Points earned in current month |
| Total Points | Cumulative rewards points |
| Recognition Points | Points from peer recognition |
| Safety Milestone Bonus | Points from safety achievements |
| Training Completion | Points from course completions |

**Key Actions:** **View Leaderboard**

---

## 15. Recruitment

### 15.1 Open Positions

**List View Columns:**
| Column | Description |
|--------|-------------|
| Job Title | Position name |
| Department | Associated team/department |
| Location | Office location (Remote Allowed flag) |
| Urgent | Urgent Hiring flag |
| Total Applicants | Count of applications received |

**Key Actions:** **Create Job Opening** (Job Title, Department, Location, Remote Allowed, Urgent Hiring, Job Description, Required Skills, Referral Bonus)

### 15.2 Hiring Pipeline

**Conversion Rate Metrics:**
| Stage | Metric |
|-------|--------|
| Screening Rate | % screened from applicants |
| Interview Rate | % invited to interview |
| Offer Rate | % given an offer |
| Hire Rate | % converted to hires |

**Time to Hire:**
- Avg Days
- Fastest
- Slowest

### 15.3 Referrals

**Refer Someone Form:**
| Field | Description |
|-------|-------------|
| Position | Job opening being referred for |
| Relationship | Former Colleague / Friend / Other |
| Candidate Name | Full name |
| Contact Information | Email / Phone |

**Referral Bonus Program:**
- Bonus amount displayed per position
- Payable after (e.g., 90 days post-joining)

---

## 16. Onboarding & Offboarding

### 16.1 Onboarding Profile

**Onboarding Progress Tracker:**
Visual progress indicator showing completion of onboarding steps.

**Sections:**
| Section | Description |
|---------|-------------|
| Job Details | Role, department, joining date |
| Contact Information | Personal and emergency contacts |
| Bank Account | Bank details for payroll |
| Statutory Details | PAN, Aadhaar, PF, ESI numbers |
| Nominee | Nominee declaration |
| Required Documents | Upload mandatory documents (ID proof, address proof, degree certificates, etc.) |

**Key Actions:**
- **Upload** – Submit required documents
- **Save Changes** – Save partial data

**Admin View:**
- Total Joinees count
- Upcoming joiners list
- Buddy assignment per joinee
- Pending Docs counter

### 16.2 Offboarding & Exit

**Exit Progress Tracker:**
| Step | Description |
|------|-------------|
| Last Working Day | Displayed prominently |
| NOC – HR | No Objection Certificate from HR |
| NOC – IT | No Objection Certificate from IT |
| NOC – Finance | No Objection Certificate from Finance |
| NOC – Admin | No Objection Certificate from Admin |

**Mark as Cleared:** Each department NOC can be marked cleared individually.

**Net Settlement:**
| Field | Description |
|-------|-------------|
| Total Credits | Final salary, leave encashment, etc. |
| Total Deductions | Notice period shortfall, assets, etc. |
| Net Settlement Amount | Credits minus deductions |
| Settlement Breakdown | Line-item breakdown |

**Exit Interview Feedback:**
- Overall experience rating
- Open-text feedback
- **Submit Feedback** button

---

## 17. Manager Hub

Dedicated section for people managers to oversee their direct team.

### 17.1 Team Overview

**Attendance Summary (Today):**
| Status | Count |
|--------|-------|
| Present | Count |
| On Leave | Count |
| Absent | Count |
| Work From Home | Count |

**Team Calendar:** Month view with event indicators per day. No-events-on-this-day message shown for empty days.

**Add Event Form:**
| Field | Description |
|-------|-------------|
| Event Type | Meeting / Training / Event / Milestone |
| Title | Event name |
| Date | Event date |
| Time | Start time |
| Attendees | Multi-select team members |

### 17.2 Team Performance

| Metric | Description |
|--------|-------------|
| Avg Attendance | Team average attendance percentage |
| Avg Efficiency | Team average efficiency score |
| Task Completion | Team task completion rate |
| Avg Rating | Overall performance rating average |
| Total Overtime | Team cumulative overtime hours |

**Work Overview:**
- Assigned Work per member (with View All link)
- Aligned Projects per member

**Employee Performance Card:**
| Field | Description |
|-------|-------------|
| Tasks Done | Completed task count |
| Daily Output | Output metric |
| Rating | Current rating |
| Annual Leave Balance | Remaining annual leave |
| Sick Leave Balance | Remaining sick leave |
| Efficiency Score | Efficiency percentage |

### 17.3 Pending Approvals & Escalations

**Pending Approvals Widget:**
- Count by category (Leave, Timesheet, Expense, Travel, Shift Swap)
- New Requests count
- New Approval count (awaiting manager action)

**Escalation Alerts:**
- List of flagged issues requiring urgent manager attention
- Urgency indicator (Urgent badge)

---

## 18. Shifts

### 18.1 My Shift

**Display:**
| Field | Description |
|-------|-------------|
| Current Shift | Morning / Evening / Night |
| Shift Date | Date of shift |
| Supervisor | Assigned supervisor |
| From Shift | Shift start time |
| To Shift | Shift end time |

**Key Actions:** **Request Swap** – Initiate a shift swap request

### 18.2 Shift Swap Requests

**Create Swap Request:**
| Field | Description |
|-------|-------------|
| Employee (You) | Logged-in user's current shift |
| Swap With | Select a team member |
| Your Current Shift | Current shift details |
| Desired Shift | Requested shift |
| Note | Optional reason |

**Incoming Swap Requests:**
- Accept / Decline buttons
- Request details: Requester, their current shift, desired shift, note

**Filter Swap Requests:**
| Filter | Options |
|--------|---------|
| Status | All / Approved / Pending / Accepted / Declined |
| Members | All Members / specific name |
| Shifts | All Shifts / Morning / Evening / Night |

### 18.3 Swap History

**History Table Columns:**
| Column | Description |
|--------|-------------|
| Shift Date | Date of the swapped shift |
| Your Shift | Original shift |
| Requested With | Team member involved |
| Updated On | Date the swap was processed |
| Status | Approved / Declined |

**Summary Stats:**
- Total Requests
- Total History
- Approved
- Declined
- Pending

---

## 19. Documents

### 19.1 Folder Structure

- Users can browse documents in a hierarchical folder system
- **Create New Folder** form: Folder Name → Create

### 19.2 Upload & Filter

**Upload Document Form:**
| Field | Description |
|-------|-------------|
| Select Folder | Choose target folder |
| Select Type | Document type classification |
| Document Name | Name for the uploaded file |

**Filter Panel:**
| Field | Options |
|-------|---------|
| Type | All Document Types / specific type |
| Date Range | From – To |

**Key Actions:**
- **Apply** – Apply selected filters
- **Clear** – Reset filters

### 19.3 Export

- **Export as PDF**
- **Export as CSV**
- **Export as Excel**
- **Open Details** – View full document metadata

---

## 20. Grievances

### 20.1 Raise a Grievance

**Grievance Categories:**
- Workplace
- HR Policy
- Interpersonal
- Compensation
- Safety

**Form Fields:**
| Field | Description |
|-------|-------------|
| Category | Select from above categories |
| Subject | Short title of the grievance |
| Details | Full description |
| Submit Anonymously | Toggle for anonymous submission |

**Key Actions:** **Submit**

### 20.2 Grievance Tracking

**Grievance Detail:**
| Field | Description |
|-------|-------------|
| Status | Open / Under Investigation / Resolved / Escalated / Withdrawn |
| Investigator | Assigned investigator name |
| SLA Deadline | Resolution deadline |
| Investigation Updates | Chronological update notes |

**Key Actions:**
- **Escalate** – Escalate to next authority
- **Withdraw** – Cancel the grievance

---

## 21. Compliance

**Sections:**

| Section | Description |
|---------|-------------|
| Pending Actions | List of compliance items requiring employee action |
| Company Policies | Policies for review with Acknowledge CTA |
| Property Statements | Asset declaration statements |
| Active Bonds | Active employment bonds |

---

## 22. Benefits

### 22.1 Pension

| Field | Description |
|-------|-------------|
| PRAN Number | Permanent Retirement Account Number |
| Monthly Contribution | Employee monthly contribution |
| Balance Available | Current pension balance |
| Total Limit | Annual limit |
| Used Amount | Amount used year-to-date |

**Dependent Members:** Add and manage dependent family members.

### 22.2 Claims

**File a Claim Form:**
| Field | Description |
|-------|-------------|
| Date of Expense | Date care/expense occurred |
| Claim Type | Medical / Other |
| Claimant | Self / Spouse / Mother / Father |
| Amount | Claim amount |
| Receipt | Upload receipt |

**Claim Summary List:**
| Column | Description |
|--------|-------------|
| Claim ID | Unique identifier |
| Claim Type | Type of claim |
| Claimant | Who the claim is for |
| Approved Amount | Final approved amount |
| Remarks | Approver notes |
| Status | Pending / Approved / Rejected |

---

## 23. HR Helpdesk

### 23.1 Raise a Ticket

**Ticket Categories:**
- Leave
- ID Card
- Policy Query
- Attendance
- General

**Form Fields:**
| Field | Description |
|-------|-------------|
| Category | Select from above |
| Subject | Brief description |
| Details | Full description |

**Key Actions:** **Submit Ticket**

### 23.2 Ticket List View

**Tabs:** Open | Resolved

**Ticket Detail:**
| Field | Description |
|-------|-------------|
| Status | Open / Resolved |
| Assigned To | HR agent assigned |
| Conversation | Threaded message exchange |

---

## 24. Directory & Org Chart

### 24.1 Employee Directory

**Filter Controls:**
| Filter | Description |
|--------|-------------|
| Department | Engineering / Design / Product / Operations / Marketing |
| Role Type | Filter by role |
| Location | Office location |
| Skills | Filter by skill |

**Summary Stats:**
- Total Employees
- Locations
- Departments

**Key Actions:** **Add Employee**, **Filter Directory**

### 24.2 Individual Profile View

- Full profile with contact info
- Attendance Calendar
- Org Chart position
- Performance overview

### 24.3 Org Chart

Visual hierarchical chart of the organization. Navigate up and down the reporting structure.

---

## 25. AI Assistant

### 25.1 Features

| Feature | Description |
|---------|-------------|
| AI Daily Summary | Auto-generated overview of the employee's work for the day |
| AI Risk Alerts | Flagged risks on projects and tasks |
| AI Standup | "Today at a glance" standup report |
| Quick Actions | AI-powered shortcuts based on user behavior |
| AI Insights | Trend-based insights from work data |
| AI Predictions | Predictive analytics (deadlines at risk, capacity issues) |
| Anomaly Detection | Flags unusual patterns in productivity or attendance |
| Smart Recommendations | Actionable suggestions with "Apply Recommendation" CTA |

---

## 26. Sprint Board

### 26.1 Board View

Kanban-style board with columns:
- To Do
- In Progress
- Complete
- Drop Here

Task cards can be dragged between columns.

**Key Actions:**
- **Complete Sprint** – Marks the sprint as done
- **+ Add Task** – Create a new task in any column

### 26.2 Task Templates

Pre-built task structures for common work patterns.

**Template Card Details:**
- Template Name
- Description
- Preview panel (before applying)

**Key Actions:** **Use Template** – Applies the template to create tasks

---

## 27. Analytics & Reports

### 27.1 Analytics Dashboard

| Metric | Description |
|--------|-------------|
| Productivity Score | Composite score for the period |
| Assignments Completed | Count in selected period |
| Rework Rate | % of tasks requiring rework |
| Completion Rate | % of assigned tasks completed |
| Weekly Activity | Bar chart of daily task completions |

**Attendance Analytics:**
| Metric | Description |
|--------|-------------|
| Attendance Rate | % of days present |
| Days Present | Count of days present |
| Late Arrivals | Count of late check-ins |
| Days Absent | Count of absent days |
| Regularization Rate | % of absences regularized |
| Monthly Attendance Trend | Line chart over current month |

**Leave Utilization:**
- Earned Leave used/available
- Casual Leave used/available
- Breakdown by leave type

### 27.2 Report Center

**Available Reports:**

| Report | Export Format |
|--------|---------------|
| Attendance Report | Excel |
| Leave Utilization Report | Excel |
| Payroll Summary | Excel |
| Tax Declaration Report | Excel |
| Performance Report | Excel |
| Expense Report | Excel |

---

## 28. Asset Management

### 28.1 Asset Summary

| Field | Description |
|-------|-------------|
| Total Assets Assigned | Count of assets in the employee's custody |
| Total Value | Cumulative value of assigned assets |
| Condition | Overall condition status ("All in Good Condition") |

### 28.2 New Asset Request

**Form Fields:**
| Field | Description |
|-------|-------------|
| Asset Type | Laptop / Mobile Phone / Monitor |
| Justification | Reason for the request |
| Priority | Normal / Urgent |

---

## 29. Employee Wellness

### 29.1 Wellness Metrics

| Metric | Description |
|--------|-------------|
| Avg Energy | Average energy level score |
| Avg Stress | Average stress level score |
| Mental Health Score | Composite mental health index |
| Recent History | Trend of past wellness check-ins |

### 29.2 Recommended Actions

List of suggested wellbeing actions based on the employee's wellness scores.

### 29.3 Weekly Physical Activity

Log and view weekly physical activity minutes.

**Health Reminders:** Configurable notifications for hydration, breaks, exercise.

### 29.4 Engagement Index

| Field | Description |
|-------|-------------|
| Engagement Index | Overall engagement score (e.g., "Good") |
| Dimension Breakdown | Individual dimension scores |
| Quick Pulse Survey | Short survey for real-time feedback |

---

## 30. Notifications

### 30.1 Notification Centre

- Full list of notifications with read/unread states
- **Mark All Read** – Marks all notifications as read
- Empty state: "No notifications"

### 30.2 Notification Settings

| Setting | Description |
|---------|-------------|
| Do Not Disturb | Toggle DND mode with "Until" time picker |
| Notification Sound | Toggle sound on/off |
| Vibration | Toggle vibration on/off |

Changes are saved automatically.

---

## 31. Profile & Settings

### 31.1 Profile

**Key Actions:**
- **Edit Profile** – Update name, photo, and contact details
- **Change Password / Update Password**

### 31.2 App Settings

| Setting | Options |
|---------|---------|
| Language | Language selection |
| Timezone | Timezone selection |
| Privacy Settings | Data and privacy preferences |

### 31.3 Support

- **FAQ** – Frequently asked questions
- **Contact Support** – Raise a support inquiry

### 31.4 My Wallet

| Field | Description |
|-------|-------------|
| Total Points | Cumulative rewards points |
| Points Breakdown | Source-wise breakdown |

### 31.5 Skill Gaps

- Gap analysis comparing current skills vs. role requirements
- **View Learning Plan** – Navigates to Learning module with pre-filtered recommendations

### 31.6 Career Roadmap

| Field | Description |
|-------|-------------|
| Current Role | e.g., Senior Project Manager |
| Readiness for Next Role | Percentage readiness |
| Retention Risk | Low / Medium / High |
| Skills to Develop | List of skills required for the next role |
| Opportunities | Internal job openings matching career path |

---

## Appendix A – User Roles

| Role | Access Level |
|------|-------------|
| Employee | Self-service modules (Home, Assignments, Leave, Payroll, Timesheets, Attendance, Profile) |
| Manager | All Employee access + Manager Hub, Team Approvals, Team Performance |
| HR Admin | All access + Recruitment, Onboarding/Offboarding, Directory management, Compliance |

---

## Appendix B – Key Design Principles

| Principle | Detail |
|-----------|--------|
| Mobile-first | Max 390 px viewport, touch-optimised |
| Frame integrity | All panels (filters, drawers, modals) positioned absolutely within the app frame — no viewport-fixed overlays that escape the mobile boundary |
| Bottom navigation | Persistent 5-tab bar with central "+" for quick actions |
| Consistent theming | Surface hierarchy using `surfacePrimary`, `borderSubtle`, warning accent for progress bars |
| Offline-tolerant | Fallback values displayed when live data is unavailable |

---

*Document Version 1.0 — Inventia HR Mobile Application — Prepared by Harsh Singh — 02 July 2026*
