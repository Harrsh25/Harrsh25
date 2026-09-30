# Workflow test suites

Playwright scripts that drive `../../NebullaOne-WFM.html` end to end. Each run starts from fresh demo data.

```bash
cd nebullaone/tests
npm i playwright && node final.js   # full vendor + contractor lifecycle (33 steps)
node fix1.js    # vendor gates, roles, segregation of duties
node fix23.js   # approvals, award → contract, contract approval, BG, WO gates, change orders
node fix4.js    # inspection / NCR, over-quantity, material, equipment, DPR, JMS co-sign, WBS
node fix5.js    # close-out & handover, final bill, retention, portal invoices
```

Results are written to `out/res-<suite>.json` (screenshots of failures to `out/`). Set `CHROMIUM=/path/to/chrome` if Chromium isn't at `/opt/pw-browsers/chromium`.

## Benchmark fields (Vendor_Module_Benchmark.xlsx)

- `bench.js` — BF-01…BF-19: fields added from the benchmark workbook (vendor master extras, contacts and addresses, bank settings, qualification limits and question library, requisitions → RFQ, RFQ questions, vendor price lists, PO controls, receiving, bill TDS and payment at entry, cheque payments, scorecard criteria, TDS categories, contract terms, worker details, portal price list).
- `benchmark_compare.py <benchmark.xlsx> <out.xlsx>` — writes the benchmark back with the prototype's current coverage per field (status now, where it is, note, test ID) and a "Coverage Now" summary. Output: `docs/Vendor_Module_Benchmark_NebullaOne.xlsx`.
