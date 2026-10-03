# Master Prompt — Vendor & Contractor Center: Validation, Benchmarking and Gap Closure

## Master prompt (consolidated)
Treat `NebullaOne-WFM.html` (built from `nebullaone/src/*.jsx`) as the system under test. In an iterative loop
— **read source → derive workflow → run the HTML in a real browser → map screens / fields / actions → compare with
the workflow and the reference sources → log gaps → fix → retest the fix through the UI → regression → repeat** —
prove that every screen, field, table, button, approval and status in the Vendor & Contractor Center works
dynamically and end-to-end, that every list shows **exactly 5 important default columns** with all other
columns available under **Customize Columns** (enable / disable / reset / apply / cancel / persist / correct
header→data mapping), and that the module matches what real vendor modules (ERPNext, Odoo, Zoho, SAP Ariba,
Oracle, Procore, …) provide. Keep **ACTUAL vendor module ↔ MY vendor module** (section 24) separate from
**MY module ↔ BENCHMARK platforms**. Never claim a gap without searching the whole HTML/JS (tabs, modals,
drawers) first; never claim a fix without retesting it in the browser. Mark anything without evidence
**EVIDENCE INSUFFICIENT**. Standing decisions are respected: no "Acting as" role switcher / role-per-step check /
one-person-per-step; no saved views, group-by, status bar, form jump bar, removed vendor-form sections, ID/code
columns on lists, ⋯ menu, or footer bar.

Deliverables: corrected HTML, an updated Excel workbook (all sheets below), final findings in chat.

## Task list — step by step

### Phase 0 — Setup
- [ ] 0.1 Sync branch, build, open the HTML in Chromium, capture console errors from first load.
- [ ] 0.2 Collect the reference material in the repo (docs/*.xlsx, earlier benchmark, tests/README).

### Phase 1 — Inventory (run in the browser, not static reading)
- [ ] 1.1 Screen map: every route, tab, drawer and modal (sections 2, 24.1–24.2).
- [ ] 1.2 Field inventory: every field — label, name, id, type, required, default, options, validation, conditional, dependency, data source, workflow impact (section 3).
- [ ] 1.3 Table inventory: every list — default columns, optional columns, search, filters, sort, pagination, page size, row/bulk actions, empty state, export (sections 5–6).
- [ ] 1.4 Action inventory: every button → event → validation → data change → status change → next screen; a button that does nothing = FUNCTIONAL GAP (section 24.10).
- [ ] 1.5 Console-error log for every screen.

### Phase 2 — Tables: 5 default columns + Customize Columns
- [ ] 2.1 Reduce every list to exactly 5 important default columns; move the rest to Customize Columns.
- [ ] 2.2 Customize Columns tests 1–7 on every list: open, enable, disable, reset to default, apply, cancel, persistence after reload, header→data mapping.
- [ ] 2.3 Table audit: search, filter, sort, pagination, page size, empty state, export.

### Phase 3 — Fields & forms
- [ ] 3.1 Dynamic field tests: dropdowns, dependent fields, conditional fields, defaults.
- [ ] 3.2 Validation tests (required, formats: GSTIN/PAN/IFSC/CIN, duplicates).
- [ ] 3.3 Form-to-data mapping: every saved field lands in the store and shows in the record panel.

### Phase 4 — Workflow, approval, status
- [ ] 4.1 Workflow mapping table (vendor + contractor).
- [ ] 4.2 Approval mapping: approve / reject / return / resubmit at each step.
- [ ] 4.3 Status mapping incl. invalid transitions (must be blocked).
- [ ] 4.4 Exception workflows: registration, document, qualification, work rework, measurement, billing.
- [ ] 4.5 Data continuity across documents (requisition → RFQ → PO → GRN → bill → payment; contract → WO → MB → RA bill → payment → retention → close-out).
- [ ] 4.6 Vendor end-to-end and contractor end-to-end runs in the browser.

### Phase 5 — Quality
- [ ] 5.1 Smoke test (every route loads, no console error).
- [ ] 5.2 Regression: repair outdated suites (search icon, footer, quick-register form) and run all.
- [ ] 5.3 Code audit: duplicate IDs, console errors, dead handlers, unlabeled controls, CSS overflow.
- [ ] 5.4 UAT per persona: vendor, procurement, contractor, approver.

### Phase 6 — Comparisons
- [ ] 6.1 Source comparison matrix (MATCH / PARTIAL / GAP / N/A / EVIDENCE INSUFFICIENT).
- [ ] 6.2 Platform benchmark table.
- [ ] 6.3 "What others have that I don't" sheet (Required / Useful / Optional / N/A / Evidence insufficient).
- [ ] 6.4 Differentiation ("Not found in reviewed sources").
- [ ] 6.5 Section 24: ACTUAL vs MY vendor module — screen, field, function, workflow, approval, status, document lifecycle, data continuity, tables, actions; Master Vendor Gap Matrix + summary counts.

### Phase 7 — Gap-fix loop
- [ ] 7.1 Fix gaps by severity (Critical → High → Medium → Low), retest each in the browser, regression after each batch.
- [ ] 7.2 Final completeness check (16 questions of 24.20 with evidence).

### Phase 8 — Deliverables
- [ ] 8.1 Final QA dashboard (Smoke … Source Comparison).
- [ ] 8.2 Updated Excel workbook with every sheet: screens, fields, tables, actions, workflow & data mapping, test cases, smoke, regression, code audit, UAT, source & platform comparison, gap & fix trackers, QA summary.
- [ ] 8.3 Final findings; corrected HTML built, committed, pushed and sent.
