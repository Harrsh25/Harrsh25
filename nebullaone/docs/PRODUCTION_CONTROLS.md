# NebullaOne WFM — Production Controls Specification

The HTML prototype shows **what the UI allows**. This document says **what the server must enforce**,
so every rule in the prototype holds even if someone calls the API directly. Nothing here is visible as a
"role switcher" in the prototype; it is the contract for the backend team.

## 1. Architecture: five connected engines

| Engine | Owns | Key records |
|---|---|---|
| Supplier | Registration, qualification, compliance, risk, scorecard, bank details, duplicates | Vendor, Document, BankAccount, Qualification, RiskAction, DuplicateDecision |
| Procurement | Requisition, RFQ, evaluation, BAFO, award, PO, GRN, invoice, payment | RFQ, Quote, TechEval, Clarification, PO, Receipt, Invoice, Payment |
| Contractor | Onboarding, contract, subcontract, work order, workers, attendance, measurement | Contract, Subcontract, WorkOrder, Worker, Attendance, Measurement |
| Commercial | RA billing, retention, deductions, settlement, DLP, release, termination | RABill, RetentionRelease, FinalAccount, Guarantee |
| Control | Approvals + SLA, escalation, approval limits, exceptions, audit, permissions | ApprovalStep, Escalation, AuditEvent, Permission, Role |

Each engine exposes commands (e.g. `ApproveVendorStage`, `ReleasePayment`) — never raw record updates.

## 2. Permissions (RBAC)

User → Role(s) → Permission, scoped by **organisation → project → entity**. A user only sees and acts on
projects they are assigned to.

| Permission | Typical role |
|---|---|
| Vendor.Create / Vendor.Edit (draft only) | Procurement Executive |
| Vendor.ApproveStage:{stage} | Stage owner (Procurement / Legal / Finance) |
| Vendor.Block / Vendor.Blacklist / Vendor.Freeze | Procurement Head |
| Bank.RequestChange | Procurement Executive, Vendor (portal) |
| Bank.Verify | Finance – Treasury |
| Bank.ApproveChange | Finance Controller |
| RFQ.Create / RFQ.Send | Buyer |
| RFQ.TechnicalScore | Technical evaluator (not the buyer) |
| RFQ.Recommend | Buyer |
| PO.Approve:{level} | Per approval-limit level |
| Contract.ApproveStage:{stage} | Legal Counsel / Finance Controller |
| Subcontract.Approve | Project Manager |
| Worker.Manage | Contractor (portal) / Site HR |
| Attendance.Verify | Site Engineer |
| Measurement.Verify | Site Engineer / QS |
| RABill.Certify | QS |
| RABill.ApproveForPayment | Project Manager |
| Invoice.Review | Accounts Payable |
| Payment.Release | Accounts / Treasury |
| Retention.ApproveRelease | Finance Controller |
| Settings.Edit | System administrator |
| Audit.Read | Internal audit (read only) |

## 3. Segregation of duties (enforced on the server)

The same person may not perform two linked steps on one record:

| Step A | ≠ Step B |
|---|---|
| Vendor submitted by | Any vendor approval stage |
| One vendor approval stage | Another stage on the same vendor |
| Bank change requested by | Bank verification **and** Finance approval of that change |
| RFQ buyer | Technical evaluator of the same RFQ |
| PO created / awarded by | Any PO approval level |
| PO approver at one level | The next level |
| Goods received by | Invoice reviewer for that PO |
| Measurement recorded by | Measurement verifier |
| RA bill certifier | RA bill payment approver |
| Invoice entered / reviewed / RA approved by | Payment releaser |
| Retention release requested by | Retention release approver / releaser |

Exceptions require an explicit, time-boxed delegation record (who, for what, until when, approved by) and are audited.

## 4. Approval limits (delegation of authority)

- **PO**: levels with an upper limit each (default Procurement Head ≤ ₹50 L → Finance Controller ≤ ₹5 Cr → Managing Director). The server computes the required chain from the **current** PO value; an amendment that raises the value restarts approval at the first level whose limit it exceeds.
- **Contract**: stages apply from a minimum value (Procurement Settings → Contract approval stages).
- **Payment release**: same limit model (recommended: Accounts ≤ ₹25 L, Finance Controller above).
- **Override** of a Stop-mode check needs the override permission, a reason, and is never allowed for hard stops (vendor on hold / blacklisted, bank not verified or in change, invoice on hold).

## 5. Server-side state machines

Every status change is a command validated against the current state **and** its preconditions:

| Record | Allowed transitions (preconditions) |
|---|---|
| Vendor | Draft → Pending Approval (required documents) → stage approvals in order → Active (last stage: approval blockers clear or Finance override with reason); any stage → Rejected / Changes Requested |
| Bank account | Requested → Verified (penny drop name match) → Approved (Finance) → Switched on switch date (cooling period). Only Verified accounts are payable; only the effective default is paid |
| RFQ | Draft → Sent → Quotes Received → (Technical eval) → (BAFO) → Awarded / Cancelled. Award only to technically passed, compliant bidders; non-top-ranked award needs justification |
| PO | Draft → Issued (all required levels approved, vendor eligible) → Partially Received / Received → Closed; Cancelled only when nothing received or billed |
| Subcontract | Proposed → Approved (subcontractor active, compliant, qualified, within sublet limit) / Rejected → Closed (rating) |
| Worker | Active ↔ Not eligible (computed: induction, medical, certificates, subcontract) → Exited. Attendance "present" refused when not eligible on that date |
| Measurement | Recorded → JMS signed / Disputed → billable only when signed and QC passed |
| RA bill | Submitted → Verified → Certified → Approved → Invoiced → Paid; payment reversal returns it to Approved |
| Invoice / payment | Payment refused while any Stop condition holds (see §4) |

## 6. Bank-change workflow (P0)

1. Request (internal or vendor portal) creates a **new** account record — the existing account is never edited.
2. Penny-drop verification by Treasury (name must match the legal name).
3. Finance approval (different person from requester and verifier).
4. Cooling period (default 2 days): the **old** account remains the default and keeps receiving payments.
5. Switch on the switch date by a scheduled job; old account kept as *Replaced*.
6. The vendor's registered e-mail and phone are notified at request, approval and switch (out-of-band confirmation).

## 7. Immutable audit trail

- Append-only `AuditEvent` table: id, timestamp (server clock), actor, IP / device, entity, entity id, command, before → after field diff, reason.
- No UPDATE / DELETE privilege for any application role; hash-chain each event to the previous one (tamper evidence); daily digest stored off-system.
- Audit read access is separate from business roles.

## 8. Integrity, concurrency and API validation

- **Optimistic locking**: every record carries a version; commands include the version they were based on; a mismatch returns 409 and the UI reloads.
- **Transactions**: multi-record commands (award → POs, payment → invoice + RA bill, merge → move documents / bank accounts) run in one database transaction.
- **Idempotency keys** on payment release, PO issue and award, so a retried request never pays or orders twice.
- **Validation in the API**, not only in the UI: formats (GSTIN, PAN, IFSC, UAN, ESI), amounts > 0, dates in order, quantities within PO / BOQ allowances, rates within tolerance.
- **Database constraints**: unique GSTIN, unique bank account (account + IFSC) across vendors, unique gate pass, foreign keys between all linked records, non-negative money columns.
- **Scheduled jobs** (server, not browser): bank switch on cooling-period end, approval SLA overdue + escalation notices, document / worker certificate expiry, receipt reminders, retention due dates.

## 9. What the prototype already demonstrates (UI rules to mirror on the server)

Approval stages with deadlines and escalation · approval limits by PO value · bank change control with cooling period ·
duplicate review (match %, different / same / merge) · supplier risk score with drivers, actions, residual risk and history ·
worker eligibility gate on the muster · subcontract approval checks and sublet limit · RFQ technical pass mark, BAFO,
justified recommendation, award blocked for failed bidders · 3-way match and payment Stop / Warn checks ·
Exception Center as the control tower for all of the above.
