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
