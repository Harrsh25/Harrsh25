# NebullaOne - final audit checklist

Status key: **Complete** = built, wired and covered by an automated test · **Incomplete** = works, with a limit noted · **Broken** = fails · **Missing** = not built.

## Record pages (all detail drawers)
| Item | Status | Evidence |
|---|---|---|
| Actions on the title row, right side; one main button, the rest under ⋯ | Complete | status, reqflow, click audit (31 ⋯ items clicked) |
| Long titles cut to one line with the full title on hover | Complete | ui suite |
| Prev / next arrows cycle | Complete | ui suite |

## Gap items built this round
| # | Item | Status | Test |
|---|---|---|---|
| 1 | PO acknowledgment by supplier (accept / propose new date), buyer accepts or rejects, overdue-ack exception | Complete | CT-01 |
| 2 | Project budget check (Stop / Warn / Off) on requisitions and POs; requisition reject → correct & resubmit, cancel | Complete | CT-02, reqflow |
| 3 | Approver-away delegation (settings + note on approval steps) | Complete | CT-03 |
| 4 | Document waiver (≤ 90 days) and issuing authority on documents | Complete | CT-04 |
| 5 | Contract correspondence log (duplicate reference check, reply-by) + key dates; overdue reply exception | Complete | CT-05 |
| 6 | Claims: event date, notice time-bar, evidence, engineer review → assessment → settlement | Complete | gaps GP-02 |
| 7 | Termination reason category; measurements frozen after termination | Complete | CT-06, closure |
| 8 | Attendance day type, absent reason, verified day locked, reopen with reason, holiday / night pay | Complete | CT-07, workers |
| 9 | Retention cap % of contract; staged retention release capped at half on completion | Complete | CT-08, fix5 |
| 10 | Demobilisation checks (workers exited, equipment off site, material reconciled) block contractor release | Complete | CT-09 |
| 11 | RFQ award above a limit waits for approval; approve creates the POs, reject needs a reason; 5 evaluation criteria | Complete | CT-10, rfqeval |
| 12 | Scorecard: invoice accuracy, responsiveness, claims; supplier "My performance" in the portal | Complete | CT-11 |
| 13 | Vendor statement (bills, notes, retention, payments, advances, running balance, CSV) in registry and portal | Complete | CT-12 |
| 14 | Supplier sites: site GSTIN, payment terms, remit-to bank; site state drives CGST+SGST vs IGST | Complete | CT-13 |

## Whole-application checks
| Check | Result |
|---|---|
| Every route loads (34 pages) | Complete - no broken route |
| Page errors / console errors while clicking 325 actions | None |
| Dead buttons | None real (flags were already-active tabs and print buttons that open a new window) |
| Disabled buttons without a reason | Fixed - empty-list Export now says why |
| Forms open with nothing pre-selected | Complete - goods-receipt quality inspection now starts blank and is required |
| Regression: 31 suites, 442 scenarios | All pass |
| UI rules audit (33 pages) | 0 findings |
| Phone / tablet layout (300 checks at 5 sizes) | All pass |
| Create forms opened (52) | 4 open with the record they were started from (call-off PO from its blanket order, measurement from its work order) - intended |
| Form text audit | Only section headings and document names; no hints or subtitles |

## Not done, by your earlier instruction
| Item | Status | Why |
|---|---|---|
| Roles and permissions (who may do what) | Missing on purpose | You asked for the "Acting as" switcher and role checks to be removed and never re-added. Approvals still go through stages, value limits and delegation, but no screen is hidden per user. |
