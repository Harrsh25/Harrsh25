# Prototype vs research benchmark — gap audit (pass 1)

Source of truth: `Vendor_Platform_UI_Field_Benchmark.xlsx` (research) + code audit of the prototype bundle (`src/app.js`).
Class: **A** must add · **B** recommended · **C** optional/config · **D** do not add. "Existing" = found in code under another name (the Excel crawl missed it).

## Workflow gaps flagged by the Excel

| Workflow step | Existing equivalent in prototype | Class | Decision |
|---|---|---|---|
| Configurable multi-stage approval | Fixed chain Procurement → Legal → Finance (`Kn`) | A | Make stages configurable in Procurement Settings (add/remove/reorder, skip for Prospective) |
| Multi-currency RFQ comparison | Quotes accept USD/EUR/AED but comparison treats them as INR (**defect**) | A | Exchange rate on quotation; comparison + weighted score in INR |
| Supplier response updates profile | **Exists** (`writeBack` on qualification questions) | — | Keep; verify in tests |
| Payment run / batch payment | **Exists** (select bills → Payment run, TDS, gates, override) | B | Add "Select all payable" helper so the run is discoverable |
| Auto-invoice from approved timesheet | **Exists as domain equivalent**: muster → measurement book → RA bill → auto bill | — | Keep (construction flow) |
| Accrual auto-generation | Partial: "Work done, unbilled" KPI on C&L overview only | B | Add Accruals view (received-not-billed GRNs + signed-not-billed measurements) |
| Subcontracting order | Partial: material recovery deduction on RA bills | C | Skip (free-issue material is recovered via RA deductions) |
| Labour job posting / candidate submission / shortlisting | None | D | Staffing-VMS scope, not contractor WFM |
| Competitive bid submission / reverse auction | RFQ with invites, quotes, weighted award | D | RFQ covers sealed competitive bidding; live auctions out of scope |
| Dropship | None | D | Construction sites are the delivery point |
| Non-billable worker tracking | Workers tab | C | Skip |

## Concrete field/control gaps

| Gap | Existing equivalent? | Business value | Evidence | Decision |
|---|---|---|---|---|
| 3-way match / invoice hold | **Yes** (Match column, Stop/Warn settings, holds with reason/until) | High | ERPNext, Odoo | Keep |
| Account holder | No | High (penny-drop name match) | Odoo, Zoho | **Add** to bank accounts + verification |
| Advance adjustment | **Yes** (Record advance, Adjust advance on bill) | High | ERPNext | Keep |
| Alias / display name | Trade name vs registered legal name | Low | ERPNext, Oracle, Zoho | Skip (duplicate) |
| Country | No (India-only address) | Medium (currency list includes USD/EUR/AED) | ERPNext, Odoo, Oracle | **Add** (default India; GST/PAN required only for India) |
| Credit/debit note | **Yes** (Add note on bill) | High | ERPNext | Keep |
| D-U-N-S | No | Low (US-centric) | Oracle | Skip |
| Default / multiple bank accounts | **Yes** (Bank tab, Make default) | High | ERPNext, Odoo | Keep; add verification status |
| Due date | **Derived** (bill date + payment terms), not shown on entry | Medium | ERPNext, Odoo, Zoho | **Show** computed due date, allow override |
| Payment date | **Yes** ("Value date" in payment dialog) | High | ERPNext, Odoo | Keep; validate ≥ bill date |
| Postal code | No | Medium (GST address) | ERPNext, Odoo | **Add** PIN code (6 digits for India) |
| Price list / agreed rates | **Yes** (portal pricelist, blanket rates, PO rate suggestions) | High | ERPNext | Keep |
| Qualification score/status | Score only; status = score ≥ 70 | High | Procore, Oracle | **Add** review workflow: Pending review / Qualified / Qualified with exceptions / Not qualified / Expired, reviewer, date, exceptions, project limits |
| TDS deduction at payment | **Yes** | High | ERPNext | Keep |
| Website | No | Low | ERPNext, Odoo | Add as optional field (cheap) |

## Contractor benchmark capabilities

| Capability | Prototype | Decision |
|---|---|---|
| Prequalification project limits (single / aggregate) | None | **Add** to qualification review; warn when a work order exceeds the limit |
| Qualification status with exceptions | None | **Add** (see above) |
| Timesheet lifecycle | Muster: contractor submit → site verify → post to MB | Keep (domain equivalent) |
| SOW events / payment milestones | Lump-sum milestones with % billing | Keep |
| Background-check gate | Background checks shown; onboarding checklist | **Add** gate: Mobilise blocked until background check clear + checklist complete |
| Commitment compliance gate on payment | **Yes** (compliance gate Stop/Warn) | Keep; also warn on issuing work orders to non-compliant contractors |

## Documents
Existing: checklist per vendor type, upload/replace, verify/reject with reason library, expiry, reminders, payment gate.
**Add:** version history (replace keeps prior versions), verified by/at, file size limit (5 MB) + type validation with error, optional document no. / issue date with issue < expiry check, delete for non-mandatory ("Other") documents and withdraw of pending uploads, view link, history view.

## Validation
Existing: registration (GSTIN/PAN/email/categories/name), IFSC on bank add, a few disabled-button guards.
**Add:** shared validators (phone, PIN, account no., CLRA, PF, ESI, percentages 0–100, amounts ≥ 0/> 0, date ordering) applied to registration/onboarding, bank, insurance, contract, work order, change order, labour rate, measurement, blanket order, PO, RFQ (weights = 100, due date), bill, payment, advance, retention release, CAP.
