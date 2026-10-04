# 100% Viewport Fit Audit

Every screen was opened at **100% browser zoom** (1 CSS px = 1 device px) at 1280×720, 1366×768, 1440×900, 1536×864 and 1920×1080, together with the first record panel of each list and the Register vendor form. Checks are measured in the browser (`tests/viewport.js`), not judged by eye: page-level sideways scroll, anything sticking out of its page or panel (wide tables scrolling inside their own box are allowed), related-document tiles not in one row, cut-off tab bars, buttons outside the panel, overflowing headings, and panels or dialogs larger than the window.

## Defects found and fixed

| # | Screen | Defect at 100% | Fix |
|---|---|---|---|
| 1 | Every record panel (e.g. Vendor Registry → Shree Balaji Infra) | Related-document tiles (Purchase orders, Bills, Balance due, RFQs, Contracts, Work orders) wrapped to a second row | Tiles are now an equal-width grid that divides the real panel width; long labels wrap inside the tile instead of pushing a tile to a new row |
| 2 | Record panels at 1280 / 1366 wide | Last tab ("Approvals") cut off at the right edge | Tab bar measures the available width; tabs that do not fit go into a **More** menu (the open tab always stays visible) |
| 3 | Register vendor form (and every dialog) | Dialog 2,256 px tall — title and Save / Submit buttons scrolled out of view | Dialogs are limited to the window height: header and footer stay fixed, only the body scrolls |
| 4 | Vendor record body | Uneven gap between the tile row and the first card | One 16 px gap everywhere (tiles → first card → each card) |

## Screen-by-screen result (all five sizes)

| Screen | Part | 100% Fit | Horizontal Overflow | Vertical Overflow | Clipping | Overlap | Card/Grid Issue | Text Issue | Action Issue | Fixed |
|---|---|---|---|---|---|---|---|---|---|---|
| Overview | page | Pass | No | No | No | No | No | No | No | — |
| Overview | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Vendor Registry | page | Pass | No | No | No | No | No | No | No | — |
| Vendor Registry | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Vendor Approvals | page | Pass | No | No | No | No | No | No | No | — |
| Vendor Approvals | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Compliance Center | page | Pass | No | No | No | No | No | No | No | — |
| Compliance Center | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Purchase Requisitions | page | Pass | No | No | No | No | No | No | No | — |
| Purchase Requisitions | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| RFQ & Quotations | page | Pass | No | No | No | No | No | No | No | — |
| RFQ & Quotations | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Blanket Orders | page | Pass | No | No | No | No | No | No | No | — |
| Blanket Orders | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Purchase Orders | page | Pass | No | No | No | No | No | No | No | — |
| Purchase Orders | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Invoices & Payments | page | Pass | No | No | No | No | No | No | No | — |
| Invoices & Payments | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Requalification | page | Pass | No | No | No | No | No | No | No | — |
| Vendor Scorecard | page | Pass | No | No | No | No | No | No | No | — |
| Vendor Scorecard | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Vendor Portal | page | Pass | No | No | No | No | No | No | No | — |
| Procurement Settings | page | Pass | No | No | No | No | No | No | No | — |
| Contractor Onboarding | page | Pass | No | No | No | No | No | No | No | — |
| Contractor Onboarding | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Contracts | page | Pass | No | No | No | No | No | No | No | — |
| Contracts | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Work Orders | page | Pass | No | No | No | No | No | No | No | — |
| Work Orders | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Labour Attendance | page | Pass | No | No | No | No | No | No | No | — |
| Measurement Book | page | Pass | No | No | No | No | No | No | No | — |
| Measurement Book | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| RA Bills & Certification | page | Pass | No | No | No | No | No | No | No | — |
| RA Bills & Certification | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Retention & Deductions | page | Pass | No | No | No | No | No | No | No | — |
| Retention & Deductions | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Labor Rate Management | page | Pass | No | No | No | No | No | No | No | — |
| Labor Rate Management | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Performance & Progress | page | Pass | No | No | No | No | No | No | No | — |
| Performance & Progress | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Close-out & Handover | page | Pass | No | No | No | No | No | No | No | — |
| Close-out & Handover | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Final Settlement | page | Pass | No | No | No | No | No | No | No | — |
| Final Settlement | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| DLP & Warranty | page | Pass | No | No | No | No | No | No | No | — |
| DLP & Warranty | record panel | Pass | No | No | No | No | No | No | No | Yes (#1, #2) |
| Contractor Release | page | Pass | No | No | No | No | No | No | No | — |
| Termination & Final Account | page | Pass | No | No | No | No | No | No | No | — |
| Audit Log | page | Pass | No | No | No | No | No | No | No | — |
| Register vendor | form | Pass | No | No | No | No | No | No | No | Yes (#3) |

**Result:** 260 screen checks, 260 pass, 0 fail.

Re-run with `node tests/viewport.js` (results in `tests/out/res-viewport.json`).
