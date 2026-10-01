# Workflow test suites

Playwright scripts that drive `../../NebullaOne-WFM.html` end to end. Each run starts from fresh demo data.

```bash
cd nebullaone/tests
npm i playwright && node final.js   # full vendor + contractor lifecycle (33 steps)
node fix1.js    # vendor gates, roles, segregation of duties
node fix23.js   # approvals, award → contract, contract approval, BG, WO gates, change orders
node fix4.js    # inspection / NCR, over-quantity, material, equipment, DPR, JMS co-sign, WBS
node fix5.js    # close-out & handover, final bill, retention, portal invoices
node lifecycle.js  # A → F lifecycle: masters, direct award, notifications, integrations, closure, requalification
```

Results are written to `out/res-<suite>.json` (screenshots of failures to `out/`). Set `CHROMIUM=/path/to/chrome` if Chromium isn't at `/opt/pw-browsers/chromium`.

## Benchmark fields (Vendor_Module_Benchmark.xlsx)

- `bench.js` — BF-01…BF-19: fields added from the benchmark workbook (vendor master extras, contacts and addresses, bank settings, qualification limits and question library, requisitions → RFQ, RFQ questions, vendor price lists, PO controls, receiving, bill TDS and payment at entry, cheque payments, scorecard criteria, TDS categories, contract terms, worker details, portal price list).
- `benchmark_compare.py <benchmark.xlsx> <out.xlsx>` — writes the benchmark back with the prototype's current coverage per field (status now, where it is, note, test ID) and a "Coverage Now" summary. Output: `docs/Vendor_Module_Benchmark_NebullaOne.xlsx`.

## Registers and wiring

- `wire.js` — every menu page loads without errors; clicking a row opens its record; every record link inside a drawer opens that same record on its page; `?open=`, `?contract=`, `?wo=`, `?fromReq=` and `?module=` deep links; public pages (supplier sign-in, self-registration, quote link). Writes `out/res-wire.json`.
- `flow.js` — W-01…W-06: requisition → RFQ → award → PO → goods receipt (Goods Receipts register, requisition % ordered / received); hold placed and released from the Holds Register stops and restores POs and payments; a change order shows in Change & Variations and its approval raises the contract value; each step is in the Audit Log with a working link.

## Lifecycle (A → F)

The sidebar follows the lifecycle — Lifecycle (map and overviews) · A Onboarding · B Sourcing · C Commitment · D Execution · E Bill & Pay · F Closure · Cross-cutting — and every page shows its stage, its step and a **Next step** link (the last page of a stage links to the first page of the next).

- `lifecycle.js` — L-01…L-17: sidebar order and next-step walk; Lifecycle Map counts and gates; Category master feeding the vendor form; standard-rate check on POs (Warn / Stop); direct award from a requisition → approval → PO linked to award and requisition; direct-award limit; notifications (open → record, mark read); integrations (bank payment file once per payment, GST check, connector off); state machines; goods warranty and claim; DLP defect blocking closure; final settlement (statement, send, agreement); contractor release with the closing evaluation → requalification flag → contract closed; requalification blocking a PO until cleared; termination → final account → blacklist decision; audit trail.
- `wire.js` also covers the 11 new pages, `direct-awards?fromReq=`, and follows the next-step link from every A–F page.
