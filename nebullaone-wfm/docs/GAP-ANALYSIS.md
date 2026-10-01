# Gap analysis: prototype vs master architecture

Legend: ✅ in prototype · 🟡 partial · ❌ missing · **➕ added in rebuild**

| ID | Architecture stage | Prototype screen | Status | Rebuild |
|---|---|---|---|---|
| 01 | Registration & Master | Vendor Registry (6-step wizard) | ✅ | Ported; server-side GSTIN/PAN/IFSC validation |
| 02 | Qualification | Vendor Approvals + qualification rule sets | 🟡 | Ported; scoring stored on vendor, decision drives vendor status |
| 03 | Category & Rate Master | Labour Rate Mgmt + Vendor Price Lists | ✅ | Ported; min-wage enforcement (B1) |
| 04 | Requirement | Purchase Requisitions | ✅ | Ported |
| 05–06 | RFQ & Quotation | RFQ & Quotations | ✅ | Ported; award creates PO |
| 07 | PO / Contract / WO | Purchase Orders, Blanket Orders, Contracts, Work Orders | ✅ | Ported; PBG coverage check (B4) |
| 08 | Contract Kickoff | — | ❌ | **➕ Kickoff checklist per contract** (scope, BOQ, drawings, site handover, schedule, rates, FS terms, contacts) |
| 09 | Mobilisation | Contractor Onboarding checklist | ✅ | Ported |
| 10 | Work Package & Planning | Work Orders + WBS budgets | 🟡 | Work orders act as work packages |
| 11 | Labour | Labour Attendance | ✅ | Ported; rates looked up from rate cards |
| 12 | Material | Material issues (free issue, recovered in RA bill) | 🟡 | Ported |
| 13 | Execution | DPRs / daily progress | ✅ | Ported |
| 14 | Quality & Safety | Inspections & NCRs in Measurement Book | 🟡 | **➕ Safety Incident register** (incident / near miss / unsafe act, severity, CAPA, LTI) |
| 15 | Measurement | Measurement Book, JMS, QC | ✅ | Ported |
| 16 | Progress Certification | Performance & Progress (SPI) | ✅ | Ported |
| 17 | Change / Variation | Change orders nested inside contracts, no screen | 🟡 | **➕ Change & Variations screen** (raise, review, approve/reject; approved COs update contract value and end date) |
| 18 | Claims | Contractor claims tab | ✅ | Ported |
| 19A | Goods Receipt | Receipts nested inside POs, no screen | 🟡 | **➕ Goods Receipts screen** (record GRN, accepted/rejected qty, QC) |
| 19B | Service Receipt | — | ❌ | **➕ Service Receipts / SES** (period, measure, acceptance) for service POs; used in 3-way match |
| 20A/B | Invoice / RA Bill | Invoices & Payments, RA Bills | ✅ | Ported; GST column (B5) |
| 21 | Approval | Approval routes for vendors and contracts | ✅ | Ported |
| 22 | Payment | Payment run, advances | ✅ | Ported; holds enforced server-side |
| 23 | Performance | Vendor Scorecard, contractor ratings, CAPs | ✅ | Ported; band fix (B6) |
| 24 | Work Completion | Close-out (punch list, final inspection) | ✅ | Ported |
| 25 | Final Settlement | — | ❌ | **➕ Final Settlement** per contract: final value incl. COs, total billed, FS balances, final claims, LD, final payable |
| 26 | Handover & Closeout | Close-out & Handover | ✅ | Ported |
| 27 | DLP / Warranty | DLP end date, retention release | 🟡 | Ported with correct DLP maths (B2, B3) |
| 28 | Contractor Release | — | ❌ | **➕ Contractor Release checklist** (site, labour, equipment, material reconciliation, access revoked, FS balance = 0, no open NCR/claims/holds) |
| 29 | Lifecycle status | Vendor/contract statuses | 🟡 | Contract status now moves forward and is stored (B9) |
| 30 | Requalification | Requalification flags | 🟡 | Ported |
| H | Unified Hold record | Three separate mechanisms | 🟡 | **➕ Holds register** (B7) |
| QI | Inspection record | MB QC + final inspection | 🟡 | Ported |
| FS | Financial Security ledger | Retention & advances ledger, BGs on contract | 🟡 | **➕ Security Deposit** as its own deduction type + **BG coverage** in the ledger; capped advance recovery (B8) |
| C | Configuration | Procurement Settings | ✅ | Ported |
