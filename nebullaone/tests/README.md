# Workflow test suites

Playwright scripts that drive `../../NebullaOne-WFM.html` end to end. Each run starts from fresh demo data.

```bash
cd nebullaone/tests
npm i playwright && node final.js   # full vendor + contractor lifecycle (33 steps)
node fix1.js    # vendor gates, roles, segregation of duties
node fix23.js   # approvals, award → contract, contract approval, BG, WO gates, change orders
node fix4.js    # inspection / NCR, over-quantity, material, equipment, DPR, JMS co-sign, WBS
node fix5.js    # close-out & handover, final bill, retention, portal invoices
node closure.js # final settlement, DLP & warranty, contractor release, termination path, requalification
```

Results are written to `out/res-<suite>.json` (screenshots of failures to `out/`). Set `CHROMIUM=/path/to/chrome` if Chromium isn't at `/opt/pw-browsers/chromium`.

## Benchmark fields (Vendor_Module_Benchmark.xlsx)

- `bench.js` — BF-01…BF-19: fields added from the benchmark workbook (vendor master extras, contacts and addresses, bank settings, qualification limits and question library, requisitions → RFQ, RFQ questions, vendor price lists, PO controls, receiving, bill TDS and payment at entry, cheque payments, scorecard criteria, TDS categories, contract terms, worker details, portal price list).
- `benchmark_compare.py <benchmark.xlsx> <out.xlsx>` — writes the benchmark back with the prototype's current coverage per field (status now, where it is, note, test ID) and a "Coverage Now" summary. Output: `docs/Vendor_Module_Benchmark_NebullaOne.xlsx`.

## Registers and wiring

- `wire.js` — every menu page loads without errors; clicking a row opens its record; every record link inside a drawer opens that same record on its page; `?open=`, `?contract=`, `?wo=`, `?fromReq=` and `?module=` deep links; public pages (supplier sign-in, self-registration, quote link). Writes `out/res-wire.json`.
- `flow.js` — W-01…W-06: requisition → RFQ → award → PO → goods receipt (requisition % ordered / received); vendor hold stops and release restores POs and payments; a change order's approval raises the contract value; each step is in the Audit Log with a working link.

## UAT (every page, every small thing)

- `uat.js` — walks every page of both modules, the supplier portal (contractor and goods supplier) and the public pages: page loads without script errors; no undefined / NaN / Invalid Date on screen; no sideways scroll (also at 1280 px); sidebar label = page title; every page tab; every list (sort on every column, search hit and no-match state, Filters panel apply / reset, CSV export row count, Customize columns, footer count); every header button and form (Save state on an untouched form, Esc closes); the first record of every list (drawer, every drawer tab, every drawer button and the forms they open). Writes `out/res-uat.json`.
- `uat_report.py [fixed.json]` — builds `docs/UAT_Report_NebullaOne.xlsx` (Summary, Issues, All checks, End-to-end suites).
