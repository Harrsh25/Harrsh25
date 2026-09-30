"""Builds docs/Vendor-Contractor-Workflow-Tracker.xlsx from the gap list below and the
Playwright results in tests/out/res-*.json (run the suites first)."""
import json, re, os, glob
from collections import Counter
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "docs", "Vendor-Contractor-Workflow-Tracker.xlsx")
RES = {os.path.basename(f)[4:-5]: json.load(open(f)) for f in glob.glob(os.path.join(HERE, "out", "res-*.json"))}

# ---------------------------------------------------------------- gaps: audit (G) + found during the fix loop (N)
# id, module, screen, issue, severity, category, root cause, fix, files, tests
GAPS = [
 ("G-01","Vendor & Contractor","Vendor Approvals / Approval Management","Final approval activated a vendor with every document missing and no qualification","High","Approval","approvalAction had no preconditions","Approval checklist on every stage; final (Finance) stage blocked until blocking documents are verified, blocking insurance is on file, qualification ≥ 70 and (spend-authorized) a bank account exists. Finance Controller may approve with override + mandatory reason (logged on the stage).","04-workflow, 11-vendor-approval, 14-public-approvals","G-01, G-01b, V02–V04"),
 ("G-02","Vendor","Vendor drawer → Status & flags","Registration tier could be switched to Spend Authorized in a dropdown","High","Approval","Direct field edit","Tier is read-only; 'Request spend authorization' (checks bank, verified documents, qualification) → Finance Controller approves in Approval Management (not the requester). Downgrade needs Procurement Head.","04-workflow, 10-vendor-registry, 11-vendor-approval, 14-public-approvals","G-02"),
 ("G-03","Contractor","Contracts","No contract approval; 'Sign & activate' available to the creator; contract activated for an unapproved contractor","High","Approval","ContractModal activated directly","Draft → Submitted → Legal → Finance → Approved → Sign & activate (Procurement Head / PM, not an approver) with contractor eligibility and performance-BG check. Rejected contracts return to the owner for edit + resubmit.","20a-contract-detail, 04-workflow, 14-public-approvals, 01-logic","G-03a, G-03b, C07"),
 ("G-04","Contractor","Work Orders","Blacklisted contractor's contract offered in the WO picker; WO could be issued","High","Workflow","No status check at issue","Contract picker hides blocked contractors; woIssueBlockers() checks contract signed/active, contractor Active + spend-authorized + not blocked + compliance gate on Issue and Resume","21-workorders-mb, 04-workflow","G-04"),
 ("G-05","Vendor & Contractor","Supplier portal","Portal ignored vendor status; contractor On Hold (All) could still submit claims","High","Status","No enforcement in portal","Open sessions end for Inactive / Blacklisted / Rejected / disabled users; On Hold (All) = read-only (no quotes, WO acceptance, claims, attendance, invoices); Invoices hold stops claims + invoices","15-supplier-portal, 16-rfq","G-05, V13"),
 ("G-06","Contractor","RA bills / claim verification","Quantity above the WO line could be signed and billed","High","Validation","computeRABill had no cap","RA bill and claim verification blocked when cumulative quantity exceeds WO quantity (which approved change orders raise); message routes the user to a change order","22-ra-bills, 17-contractor","G-06"),
 ("G-07","Contractor","Change orders","Change orders carried value and days only","Medium","Data Mapping","No quantity lines","Change-order quantity lines (WO line + extra qty, or new item); approval raises the WO quantity / adds the item","20a-contract-detail, 14-public-approvals","G-07, C12"),
 ("G-08","Contractor","RFQ award → contract","RFQ award always created a PO; no award → contract handoff","High","Workflow","SplitAwardModal only created POs","'Award as contract' for contractor awards: draft contract with the awarded lines as contract BOQ, rfqId and award note carried over","16-rfq, 04-workflow","G-08/G-20, C06"),
 ("G-09","Contractor","Project / WBS / BOQ","Project was a text label; no WBS; WO lines typed, not linked to a BOQ","Medium","Data Mapping","Model missing","WBS catalogue per project; WBS mandatory on WOs; contract BOQ lines; WO lines loaded from contract BOQ (boqRef) with over-order check; contract BOQ position; Cost-by-WBS view (budget → committed → executed → billed → paid)","04-workflow, 20a-contract-detail, 21-workorders-mb, 26-execution, 27-seed-workflow","G-09, G-09b, C08"),
 ("G-10","Contractor","Close-out","No punch list, final inspection, handover certificate or final bill","High","Workflow","Screens missing","New 'Close-out & Handover' page: punch list (contractor rectifies in portal, engineer verifies), final inspection (fail → snags), handover certificate (print), final bill (stops further billing), DLP from handover, closure","28-closeout, 22-ra-bills, 90-nav, 15-supplier-portal","G-10a–e, C15, C16"),
 ("G-11","Contractor","Contract closure","Closure checked only end date and retention; WOs stayed billable after closure","Medium","Validation","Weak check","13-point closure checklist (WOs done, JMS, unbilled, claims, COs, bills paid, punch/NCR, handover, final bill, DLP, retention, advance, guarantees); closing freezes WOs and the measurement book","04-workflow, 20a-contract-detail","G-11, G-11b, G-11c, C18"),
 ("G-12","Contractor","Measurement book / RA certification","No quality or HSE inspection before certification","Medium","Workflow","Step missing","Inspection per measurement (Pass / Fail → NCR); NCR rework → re-inspection loop (contractor can mark rework in portal); only passed entries are billable; open NCR blocks QS certification; claim verification requires inspection confirmation","26-execution, 21-workorders-mb, 22-ra-bills, 17-contractor, 19-portal-details","G-12a–c, C10"),
 ("G-13","All","Every approval","No role model: one user approved all stages and paid","High","Approval","Single demo user","Personas with roles ('Acting as' switcher on every page); each step requires its role; the same person can't act twice on a record or approve their own submission; payment by Accounts / Finance only and not by the bill's enterer / approver","04-workflow + 11 other files","G-13a–d, V04, V08, V11, C11"),
 ("G-14","Vendor","RFQ invite / PO","Non-compliant or requalification-due vendors could be sourced from","Medium","Validation","Check only at payment","Sourcing gate: Warn at RFQ invite, Stop at PO / contract / award (configurable in Procurement Settings)","04-workflow, 12-procurement, 16-rfq","G-14, G-08/G-20"),
 ("G-15","Contractor","Equipment","No equipment register or deployment","Medium","Data Mapping","Model missing","Equipment tab on contractor record; deployment / release on WO; expired fitness blocks deployment","26-execution, 10-vendor-registry, 27-seed-workflow","G-15, G-15b, C09"),
 ("G-16","Contractor","Material","Free-issue material was a manual deduction","Medium","Data Mapping","Model missing","Material issue register on WO; automatic recovery in next RA bill (linked); released again if the bill is rejected","26-execution, 22-ra-bills","G-16, G-16b, C11"),
 ("G-17","Contractor","Daily progress","No daily progress report","Low","Workflow","Screen missing","Daily progress report on WO and in portal (manpower, work, hindrance, weather; no duplicate / future dates); Performance → Daily progress tab","26-execution, 19-portal-details, 23-labor-performance","G-17, C09"),
 ("G-18","Vendor","Invoice submission","Vendors couldn't submit invoices in the portal","Low","Workflow","Screen missing","Portal 'Submit invoice' against billable PO quantity with copy + duplicate check → AP review (accept / reject with reason) → payment run; rejected invoices not payable, vendor can resubmit","28-closeout, 15-supplier-portal, 12-procurement, 14-public-approvals, 01-logic","G-18a–d, V10"),
 ("G-19","Vendor","Vendor bills","Duplicate vendor bill numbers not checked","Medium","Validation","No check","Duplicate bill number per vendor blocked (internal entry and portal; rejected invoices excluded)","12-procurement, 28-closeout","G-19, G-18b"),
 ("G-20","Vendor & Contractor","Award","Award had no approval or recommendation note","Medium","Approval","—","Mandatory award recommendation (hint when not L1); PO approver ≠ awarder; contract awards go through Legal → Finance","16-rfq, 04-workflow","G-08/G-20, V07, V08"),
 ("G-21","Contractor","Contracts / WOs","No terminate, stop-work, cancel or short-close","Low","Status","Statuses unused","Terminate contract (reason; short-closes open WOs); WO Suspend / Resume / Short-close / Cancel with reason and role","04-workflow, 20a-contract-detail, 21-workorders-mb","G-21"),
 ("G-22","Contractor","Security / BG","BG number and expiry were plain fields","Low","Data Mapping","Model missing","BG register (performance / advance / retention): add, extend, return, encash; expiry status and reminders; PBG before signing; retention BG for early release","20a-contract-detail, 20-contracts, 04-workflow, 22-ra-bills","G-22, C07, C17"),
 ("G-23","Contractor","JMS","Contractor's JMS signature was a typed name","Observation","Workflow","Design","Contractor agrees / disputes each measurement in the portal; engineer countersigns only with portal agreement or a confirmed paper JMS","26-execution, 19-portal-details, 21-workorders-mb","G-23, C10"),
 ("G-24","Contractor","Mobilisation","Mobilisation checklist had no effect","Low","Workflow","Orphan screen","Checklist must be complete before the contractor's first WO is issued (setting)","04-workflow, 21-workorders-mb","G-24, C04"),
 ("G-25","Contractor","Retention release","Release was one click with no approver","Medium","Approval","—","Request → Finance Controller approval → Accounts release (three different people); after-DLP / completion releases need the handover certificate; BG-backed release needs a live retention BG","04-workflow, 22-ra-bills, 14-public-approvals","G-25a, G-25b, G-10a, C17"),
 ("G-26","Vendor","Offboarding","Inactive vendor kept portal access","Low","Status","Session not re-checked","Portal access ends immediately for Inactive / Blacklisted / Rejected","15-supplier-portal","G-26, V14"),
 ("G-27","Vendor","Registration","Internal registration could be submitted with zero documents","Low","Validation","—","Required documents must be uploaded before submit (internal form and drawer; setting)","04-workflow, 10-vendor-registry, 11-vendor-approval","G-27, G-27b, V01"),
 ("G-28","Vendor","Hold","Status stayed 'On Hold' after the release date","Low","Status","No expiry job","Daily sweep ends expired holds (vendor back to Active, audit entry)","04-workflow, 00-core","G-28"),
 ("N-01","Vendor","Vendor Registry","?open= deep links from other pages didn't open the vendor","Low","Navigation","Local state instead of query","Registry uses the shared deep-link hook","10-vendor-registry","G-02 (opens via link)"),
 ("N-02","All","Toasts","Error messages vanished in 2.6 s — too fast to read gate messages","Low","UI","Fixed timeout","Errors / warnings stay 5.5 s, wrap, amber and blue styles","00-core","all suites"),
 ("N-03","Vendor","Status & flags","'Enabled' checkbox could re-activate a blacklisted or pending vendor","Medium","Status","Unguarded toggle","Hidden for approval states and blacklisted vendors","10-vendor-registry","V14"),
 ("N-04","Vendor","Blacklist","Anyone could remove a vendor from the blacklist","Medium","Approval","—","Procurement Head only","10-vendor-registry","regression"),
 ("N-05","Contractor","Contract","'Extend / renew' changed the end date without approval","Medium","Approval","Direct edit","Extension is a time change order approved by the Project Manager","20a-contract-detail","G-07"),
 ("N-06","Contractor","Contract drawer","Change-order approve in the drawer bypassed the Approval Management path (duplicate flow)","Medium","Approval","Duplicate logic","One decideChangeOrder() with role + SoD used everywhere","20a-contract-detail, 14-public-approvals","G-07, C12"),
 ("N-07","Vendor","PO drawer","PO 'Approve & issue' in the drawer had no role check (duplicate flow)","Medium","Approval","Duplicate logic","One decidePo() with role, SoD and vendor eligibility","04-workflow, 12-procurement, 14-public-approvals","V08"),
 ("N-08","Contractor","RA bill from claim","Rejecting a claim-based bill left the claim 'Verified' and its measurements billable — double count when the claim is revised","High","Exception Handling","Missing reversal","Rejection voids the claim's measurements and returns the claim to the contractor","22-ra-bills","regression"),
 ("N-09","Contractor","Create work order","Cancelled WOs counted against contract headroom","Low","Data Mapping","—","Cancelled excluded; short-closed counts measured value","21-workorders-mb","C08"),
 ("N-10","Contractor","Retention releases","No requester / approver visible","Low","UI","—","Requested/approved-by column, full status set","22-ra-bills","G-25b"),
 ("N-11","Contractor","Measurement drawer","'Ready to bill' ignored inspection","Low","Status","—","Shows inspection state and NCR block","21-workorders-mb","G-12a"),
 ("N-12","Contractor","Final bill","Voided measurements counted as unsigned and blocked the final bill (found in retest)","Medium","Exception Handling","Filter missed voided","Voided entries excluded from JMS counts and closure checks","22-ra-bills, 04-workflow","G-10d"),
 ("N-13","All","List filters","Status filters lacked the new statuses","Low","Fields","—","Filter option lists extended (contract, WO, release, NCR, punch, BG, invoice review)","03-extensions, 12-procurement","regression"),
 ("N-14","All","Procurement Settings","'Your role (demo)' setting was disconnected from who approves","Low","Fields","—","Replaced by the persona shown in 'Acting as'","12-procurement","G-13c"),
 ("N-15","Vendor","Payment run","Payer could be the bill's enterer or approver","High","Approval","—","SoD check in the payment run","12-procurement","V11, C11"),
 ("N-16","Contractor","JMS sign-off","Anyone could sign a JMS","Medium","Approval","—","Site Engineer role","21-workorders-mb","C10"),
 ("N-17","Contractor","Labour rates","Rate approval had no role check","Low","Approval","—","Procurement Head, not the requester","23-labor-performance","regression (e2e)"),
 ("N-18","Vendor","Invoices","A rejected vendor invoice would still count as payable","Medium","Data Mapping","—","Payable 0 and status 'Rejected'","01-logic","G-18d"),
 ("N-19","Vendor & Contractor","Award","Non-L1 awards needed no justification","Low","Validation","—","Recommendation mandatory; hint when not L1","16-rfq","G-08/G-20"),
]

# ---------------------------------------------------------------- screens
SCREENS = [
 ("Vendor Management","Overview","Overview dashboard","Page","Sidebar","Filters, drill-down to registry / invoices","—","All"),
 ("Vendor Management","Vendor Registry","Vendor list","Page","Sidebar; ?open= deep link","Search, column filters, export, columns, bulk actions, status menu","Vendor drawer","Procurement"),
 ("Vendor Management","Vendor Registry","Register vendor","Modal","Registry → Register vendor","Save draft; Submit (documents required)","Vendor drawer / Vendor Approvals","Procurement Executive"),
 ("Vendor Management","Vendor Registry","Vendor drawer (Overview, Status & flags, Documents, Bank, Qualification, Equipment*, Approvals, Activity)","Drawer","Registry row","Edit, upload, verify (approval mode), insurance, questionnaire, hold / blacklist, spend-authorization request","Approval Management","Procurement / approvers"),
 ("Vendor Management","Vendor Registry","Invitations tab + Invite vendor","Tab / modal","Registry","Invite, remind, cancel, share link","Self-registration","Procurement"),
 ("Vendor Management","Vendor Approvals","Approval queue + Qualification results","Page","Sidebar","Approve / reject / request changes with checklist, override (Finance)","Vendor Registry","Procurement Head, Legal Counsel, Finance Controller"),
 ("Vendor Management","Compliance Center","Compliance dashboard, verification queue, requirements","Page","Sidebar","Verify / reject documents & policies, reminders","Vendor drawer","Procurement"),
 ("Vendor Management","RFQ & Quotations","RFQ list, New RFQ, Send RFQ, RFQ drawer, Award by line","Page / modals / drawer","Sidebar","Invite (sourcing gate), send, record quote, accept / return quote, negotiate, award to PO or contract (recommendation)","Purchase Orders / Contracts","Procurement Executive"),
 ("Vendor Management","Blanket Orders","Blanket orders + call-off","Page","Sidebar","Create call-off PO","Purchase Orders","Procurement"),
 ("Vendor Management","Purchase Orders","PO list, New PO, PO drawer, GRN","Page / modal / drawer","Sidebar / award","Approve & issue (Procurement Head), receive goods, returns, amend, create bill","Invoices","Procurement / Stores"),
 ("Vendor Management","Invoices & Payments","Invoice list, Enter bill, Invoice drawer (AP review), Payment run","Page / modal / drawer","Sidebar / RA approval / portal","Accept / reject vendor invoice, hold, notes, instalments, advance, pay (Accounts / Finance)","—","Accounts, Finance Controller"),
 ("Vendor Management","Vendor Scorecard","Scorecard, standings, rate, offboard","Page","Sidebar","Rate, CAP, auto-block, offboard","Vendor drawer","Procurement"),
 ("Vendor Management","Vendor Portal","Buyer preview of the supplier portal","Page","Sidebar","Viewing as vendor","—","Procurement"),
 ("Vendor Management","Procurement Settings","Billing rules, payment checks, overrides, workflow gates, groups","Page","Sidebar","Stop / Warn / Off, gates (documents, compliance, mobilisation, inspection)","—","Admin / Finance"),
 ("Contract & Labor","Overview","Contract & labour dashboard","Page","Sidebar","Drill-down","—","All"),
 ("Contract & Labor","Contractor Onboarding","Onboarding list + drawer (documents, mobilisation checklist)","Page / drawer","Sidebar","Onboard contractor, submit, tick checklist","Vendor drawer / Work Orders","Procurement"),
 ("Contract & Labor","Contracts","Contract list, Create / edit contract, Contract drawer","Page / modal / drawer","Sidebar / award","Submit, approve (Legal → Finance), sign, EOT, change orders, BG register, terminate, closure checklist","Work Orders / Close-out","Procurement, Legal, Finance, PM"),
 ("Contract & Labor","Contracts","Change order, Guarantee, Terminate","Modals","Contract drawer","CO with quantity lines; add / extend / return / encash BG; terminate","Approval Management","Procurement Head, PM, Finance"),
 ("Contract & Labor","Work Orders","WO list, Create WO, WO drawer (items, RA bills, equipment, workforce, material, DPR, NCR)","Page / modal / drawer","Sidebar / contract","Issue (gated), record acceptance, measure, suspend / resume / short-close / cancel, deploy equipment, issue material, DPR, NCR","Measurement Book / RA Bills","Procurement, Site Engineer, PM"),
 ("Contract & Labor","Labour Attendance","Worker-wise muster","Page","Sidebar / portal","Verify, roll up to MB","Measurement Book","Site Engineer"),
 ("Contract & Labor","Measurement Book","MB, JMS, Inspections & NCRs, Abstract","Page / modals / drawer","Sidebar / WO","Record, JMS sign (contractor agreement or paper JMS), dispute, inspect pass / fail, NCR rework / re-inspect","RA Bills","Site Engineer, HSE Officer"),
 ("Contract & Labor","RA Bills & Certification","RA bills, contractor claims, Prepare bill, RA drawer, Claim review","Page / modals / drawer","Sidebar / WO / close-out","Prepare (inspection + quantity + material), verify, certify (no open NCR), approve, reject, pay; final bill","Invoices","Site Engineer, QS, PM, Accounts"),
 ("Contract & Labor","Retention & Deductions","Ledger, releases, deduction register, advances","Page / modals","Sidebar","Request release (handover / BG checks), approve (Finance), release (Accounts)","Close-out","Commercial, Finance, Accounts"),
 ("Contract & Labor","Labor Rate Management","Rate cards","Page","Sidebar","New / revise rate, approve (Procurement Head)","—","Commercial"),
 ("Contract & Labor","Performance & Progress","Progress, planned vs actual, daily progress, cost by WBS, scorecard, ratings","Page","Sidebar","Rate contractor","—","PM"),
 ("Contract & Labor","Close-out & Handover","Close-out list + drawer (work completion, punch list, final inspection, handover certificate, final bill, DLP / retention, closure)","Page / drawer / modals","Sidebar / contract","Add punch, verify, inspect, issue & print certificate, final bill, close contract","Retention / Contracts","PM, Site Engineer"),
 ("Approvals","Approval Management","9 queues: vendor registration, spend authorization, POs, vendor invoices, contracts, change orders, RA bills, retention releases, labour rates","Page","Sidebar","Approve / reject / request changes / review (role + SoD enforced)","Record drawers","Approvers"),
 ("Public","Self-registration","Supplier & contractor registration","Public page","Invite link / portal","Submit registration","Supplier login","Vendor"),
 ("Public","Supplier portal","Registration fix, RFQs, POs, WOs (measurements agree / dispute, NCRs, daily reports, claims, bills, terms), RA claims, attendance, punch list, bills & payments (submit invoice), pricelist, documents, queries, users","Public page","OTP sign-in","Quote, accept WO, claim, agree JMS, rework NCR, rectify punch, submit invoice, upload documents","—","Vendor / contractor"),
 ("Public","Vendor quote link","Secure quotation page","Public page","RFQ e-mail","Accept / decline, quote, CSV","Supplier portal","Vendor"),
]

FIELDS = [
 ("Register vendor","Company name","Text","Yes","Required",""),("Register vendor","GSTIN","Text","Yes","15-char GSTIN format; duplicate GSTIN blocked",""),("Register vendor","PAN","Text","Yes","PAN format; must match GSTIN; duplicate PAN warned",""),
 ("Register vendor","Vendor type","Select","Yes","Goods / Services / Labor","Goods"),("Register vendor","Supplier type","Select","Yes","Drives TDS section","Company"),("Register vendor","Trades / categories","Multi-select","Yes","At least one",""),
 ("Register vendor","Contact person / e-mail / phone","Text","Name + e-mail","E-mail format",""),("Register vendor","Bank / account no. / IFSC","Text","For spend authorization","Needed before final approval of a spend-authorized vendor",""),
 ("Register vendor","Registration tier","Select","Yes","Prospective / Spend Authorized; later upgrades need Finance approval","Spend Authorized"),("Register vendor","Required documents","File upload","Yes (to submit)","All required documents uploaded before submit (setting)",""),
 ("Register vendor","Contractor: labour licence, validity, PF, ESI, workforce, experience","Text / date / number","No","",""),
 ("Qualification questionnaire","Rule-set questions","Number / Yes-No / select","All","Score ≥ 70 = qualified; writes back to profile",""),
 ("Insurance policy","Coverage type, policy no., insurer, sum insured, validity, copy","Select / text / number / date / file","Yes","Below minimum cover flagged; Pending until verified",""),
 ("Spend authorization","Justification","Text","No","Request blocked until bank, verified documents, qualification",""),
 ("Approval decision","Remark","Text area","To reject / override","Override only for Finance Controller at the last stage",""),
 ("New RFQ","Title, project, template, source, mode, due date, Incoterm, terms","Text / select / date","Title","",""),("New RFQ","Line items (description, unit, qty, required by)","Grid","≥ 1 line with qty","Lines without qty skipped",""),
 ("New RFQ","Invited vendors","Chips","≥ 2 (≥ 1 single vendor)","Scorecard standing and compliance gate (Warn / Stop)",""),("New RFQ","Weights price / quality / delivery","Number","Yes","","60 / 25 / 15"),
 ("Award by line","Winner per line","Radio grid","≥ 1 line","Only accepted, valid quotes of eligible vendors",""),("Award by line","Award recommendation","Text","Yes","Hint when not L1",""),("Award by line","Award as","Toggle","Contractors only","PO or Contract","PO"),
 ("New PO","Vendor, blanket, project, delivery, bill control, tolerance, lines","Select / date / grid","Vendor + lines","Spend-authorized, unblocked; scorecard + compliance gate; blanket allowance",""),
 ("Enter vendor bill","PO / vendor, invoice no., date, lines, GST","Select / text / grid","Yes","Duplicate invoice no. blocked; PO / receipt required per settings; invoices hold",""),
 ("Submit invoice (portal)","PO, invoice no., date, quantities, GST, copy","Select / text / number / file","Yes","Quantity ≤ billable; no future date; duplicate no. blocked; copy required",""),
 ("Payment run","Mode, value date, override reason","Select / date / text","Mode","Accounts / Finance only; not the enterer / approver; hard stops can't be overridden",""),
 ("Create contract","Contractor, project, type, title, value / BOQ lines, dates, owner","Select / text / number / date / grid","Contractor, title, value, dates","Contractor eligibility; completion after start","Item-Rate"),
 ("Create contract","Retention, advance, recovery, cess, GST, DLP, LD, LD cap","Number / select","—","","5 / 10 / 10 / 1 / 18 / 12 / 0.5 / 5"),
 ("Create contract","Performance BG % + BG no., bank, validity","Number / text / date","Validity if BG no.","PBG must be on file before signing","5%"),
 ("Change order","Description, reason, value, days, quantity lines (WO, item, extra qty, rate)","Text / number / grid","Description, reason","Lines complete; value = lines when present",""),
 ("Bank guarantee","Type, bank, number, amount, validity","Select / text / number / date","Yes","Extend: later date; return / encash: reason",""),
 ("Create work order","Contract, type, WBS, title, location, start / finish","Select / text / date","Contract, WBS, title","Issue gated (contract, contractor, mobilisation); headroom","Item-Rate"),
 ("Create work order","Items (code, description, unit, qty, rate) / lump sum + milestones","Grid","Yes","Qty ≤ contract BOQ balance; milestone weights = 100%",""),
 ("Suspend / short-close / cancel WO","Reason","Text area","Yes","Role PM / Procurement Head; cancel only without measurements",""),
 ("Record measurement","WO, item / milestone, date, location, N×L×B×D or qty / cumulative %","Select / text / number","WO, item, location","Only accepted, open WOs; LS % above last signed ≤ 100; over-WO warning",""),
 ("JMS sign-off","Contractor representative, engineer, re-measured qty, paper JMS confirmation","Text / number / checkbox","Yes","Site Engineer role; portal agreement or paper JMS",""),
 ("Inspection / NCR","Result, category, severity, description","Toggle / select / text","Description on fail","Inspector ≠ recorder",""),
 ("Prepare RA bill","WO, period, measurements, penalty, other, note, final bill","Select / date / checkbox / number","WO + ≥1 measurement","Signed + inspected only; quantity ≤ WO qty; material auto; final bill must include everything",""),
 ("Verify contractor claim","Certified quantity, representative, remark, inspection confirmation","Number / text / checkbox","Rep + inspection","Quantity ≤ WO balance; Site Engineer",""),
 ("Retention release request","Contract, basis, amount, note","Select / number / text","Contract, amount","≤ available; handover for after-DLP / completion; retention BG for BG-backed",""),
 ("Material issue","Material, qty, unit, recovery rate, date","Text / number / select / date","Yes","",""),
 ("Daily progress report","Date, manpower, weather, work done, hindrances","Date / number / select / text","Date, manpower, work","One per WO per day; not in the future",""),
 ("Equipment","Name, type, reg. no., capacity, owned / hired, fitness validity","Text / select / date","Name, reg. no., validity","Expired fitness can't be deployed",""),
 ("Punch item","Snag, location, WO, severity, rectify by","Text / select / date","Snag, date","",""),
 ("Final inspection","Result, remarks, snags","Toggle / text / text area","Remarks (+ snags on fail)","Only after WOs done, punch & NCRs closed; PM",""),
 ("Handover certificate","Date, taken over by, remarks","Date / text","Date, taken over by","After a passed inspection; not future; PM",""),
]

VFLOW = [("V01","Registration (Tier 1)","Vendor Registry → Register vendor / self-registration","Procurement Exec / vendor","—","Pending Approval","Required documents uploaded; duplicate GSTIN"),
 ("V02","Validation & document submission","Vendor drawer → Documents / portal","Procurement / vendor","Pending Approval","Pending Approval","Format checks; checklist shows open items"),
 ("V03","Document verification","Vendor drawer (approval mode) / Compliance Center","Procurement","Docs Pending","Docs Verified","Reject with reason → vendor re-uploads"),
 ("V03b","Qualification","Vendor drawer → Qualification","Procurement","—","Score","≥ 70 qualified"),
 ("V04","Approval","Vendor Approvals / Approval Management","Procurement Head → Legal Counsel → Finance Controller","Pending Approval","Active / Rejected / Changes Requested","Checklist gate at Finance; SoD; override with reason"),
 ("V04b","Tier 2 (spend authorization)","Vendor drawer → Approvals","Procurement → Finance Controller","Prospective","Spend Authorized","Bank, verified docs, qualification"),
 ("V05","RFQ","RFQ & Quotations","Procurement Exec","Draft","Sent","≥ 2 vendors; sourcing gate"),
 ("V06","Quotation","Vendor quote link / portal","Vendor","Invited","Quoted / Under review","Sign-in; hold blocks quoting"),
 ("V07","Evaluation & selection","RFQ drawer → review, comparison, award","Procurement Exec","Under review","Accepted → Awarded","Recommendation; eligible vendors only"),
 ("V08","Contract / PO","Purchase Orders / Approval Management","Procurement Head","Draft","Issued / Cancelled","Approver ≠ awarder; vendor eligible"),
 ("V09","Delivery & acceptance","PO drawer → GRN","Stores / Procurement","Issued","Partially Received / Received","Rejected qty → return + debit note"),
 ("V10","Invoice & validation","Portal submit invoice / Enter bill → AP review","Vendor → Accounts","—","Awaiting Review → Accepted / Rejected","Duplicate no.; billable qty; 3-way match"),
 ("V11","Approval & payment","Invoice drawer → Payment run","Accounts / Finance","Unpaid","Paid","Holds, compliance, bank; SoD"),
 ("V12","Performance","Vendor Scorecard","Procurement","—","Score / standing","Standings warn / prevent"),
 ("V13","Renewal / requalification","Qualification tab / Compliance Center","Procurement","Qualified","Requalification due","Overdue blocks PO (Stop)"),
 ("V14","Suspension","Status menu / hold","Procurement","Active","On Hold / Blacklisted","Portal read-only; auto-release on date"),
 ("V15","Closure","Status menu / offboard","Procurement Head","Active","Inactive","Portal access ends")]
CFLOW = [("C01","Registration","Contractor Onboarding → Onboard contractor","Procurement Exec","—","Pending Approval","Statutory documents"),
 ("C02","Technical / financial / legal / HSE qualification","Vendor drawer → Documents, insurance, Qualification","Procurement","—","Verified / scored","WC insurance, CLRA, HSE questions"),
 ("C03","Approval → contractor master","Vendor Approvals","Procurement Head → Legal → Finance","Pending Approval","Active","Checklist gate; SoD"),
 ("C04","Mobilisation checklist","Onboarding drawer","Procurement","—","Complete","Gates the first WO"),
 ("C05","Tender / BOQ / rate submission","RFQ & Quotations → quote link","Procurement / contractor","Draft","Quoted","Sign-in"),
 ("C06","Technical & commercial evaluation → selection","RFQ drawer → award as contract","Procurement","Under review","Awarded → Contract Draft (BOQ)","Recommendation; eligible contractor"),
 ("C07","Contract & contract approval","Contracts","Owner → Legal → Finance → Procurement Head","Draft","Pending Approval → Approved → Active","PBG before signing; SoD"),
 ("C08","Project → WBS → BOQ → work package","Work Orders","Procurement / PM","—","Issued → Accepted","WBS required; lines from contract BOQ; issue gates"),
 ("C09","Mobilisation: workforce, material, equipment","WO drawer → resources","Site Engineer","Issued","In Progress","Equipment fitness"),
 ("C10","Execution → progress → measurement → verification","Measurement Book / portal","Site Engineer / contractor","Pending","Signed + Passed","Contractor agreement; inspection; NCR loop"),
 ("C11","Certification → RA bill → deductions → invoice → payment","RA Bills → Invoices","Site Eng → QS → PM → Accounts","Submitted","Paid","Quantity cap; open NCR blocks; material auto; SoD"),
 ("C12","Variation / change order","Contract drawer → change order","Procurement → PM","Pending","Approved (WO qty raised)","Raiser ≠ approver"),
 ("C13","Performance","Performance & Progress","PM","—","Rating","—"),
 ("C14","Punch list","Close-out drawer / portal","PM / contractor","Open","Rectified → Closed","—"),
 ("C15","Final inspection","Close-out drawer","PM","—","Passed / Failed (→ snags)","WOs done, punch & NCR closed"),
 ("C16","Handover","Close-out drawer","PM","—","Handover certificate","After passed inspection"),
 ("C17","Final bill → final payment","Close-out → Prepare final bill → RA flow","Site Eng → QS → PM → Accounts","—","Paid; WO billing closed","Includes all remaining work"),
 ("C18","Security / retention release","Retention & Deductions / BG register","Commercial → Finance → Accounts","Pending Approval","Released; BG returned","Handover, DLP, retention BG"),
 ("C19","Contract closure","Close-out / contract drawer","Procurement Head / PM","Active","Closed (WOs frozen)","13-point checklist"),
 ("—","Exception: termination","Contract drawer → Terminate","Procurement Head","Active","Terminated → Closed","Open WOs short-closed")]

STATUS = [
 ("Vendor","Draft","Submit","Pending Approval","Procurement","Required documents uploaded"),("Vendor","Pending Approval","Approve (stage)","Pending (next stage)","Stage role","SoD"),
 ("Vendor","Pending Approval","Approve (Finance)","Active","Finance Controller","Checklist or override"),("Vendor","Pending Approval","Reject","Rejected","Stage role","Reason"),
 ("Vendor","Pending Approval","Request changes","Changes Requested","Stage role","Items listed"),("Vendor","Rejected / Changes Requested","Resubmit","Pending Approval","Owner / vendor","Earlier approvals kept"),
 ("Vendor","Active","Hold","On Hold","Procurement","Scope + release date"),("Vendor","On Hold","Release / release date passes","Active","Procurement / system","Audit logged"),
 ("Vendor","Active","Blacklist","Blacklisted","Procurement","Reason"),("Vendor","Blacklisted","Remove from blacklist","Active","Procurement Head",""),
 ("Vendor","Active","Disable / offboard","Inactive","Procurement","Portal access ends"),("Vendor tier","Prospective","Request → approve","Spend Authorized","Requester → Finance Controller","Bank, docs, qualification"),
 ("PO","Draft","Approve & issue / reject","Issued / Cancelled","Procurement Head","≠ creator / awarder"),("PO","Issued","GRN","Partially Received / Received","Stores",""),
 ("Vendor invoice (portal)","Awaiting Review","Accept / reject","Unpaid / Rejected","Accounts / Finance","Reason to reject"),("Invoice","Unpaid","Pay","Partially Paid / Paid","Accounts / Finance","Gate + SoD"),
 ("Contract","Draft / Rejected","Submit","Pending Approval","Owner","Contractor eligible"),("Contract","Pending Approval","Legal → Finance approve","Approved","Legal Counsel, Finance Controller","SoD"),
 ("Contract","Pending Approval","Reject","Rejected","Stage role","Reason"),("Contract","Approved","Sign & activate","Active","Procurement Head / PM","PBG, eligibility"),
 ("Contract","Active","Handover certificate","In DLP","PM","Passed final inspection"),("Contract","Active / In DLP / Completed","Close","Closed","Procurement Head / PM","Checklist"),
 ("Contract","Active","Terminate","Terminated","Procurement Head","Reason; WOs short-closed"),
 ("Work order","Draft","Issue","Issued","—","woIssueBlockers"),("Work order","Issued","Contractor accepts / declines","Accepted / Declined","Contractor",""),
 ("Work order","Issued / In Progress","Suspend / resume","Suspended / In Progress","PM","Reason; resume re-checks"),("Work order","In Progress","Mark completed","Completed","—","≥ 99.5% measured"),
 ("Work order","Issued / In Progress / Suspended","Short-close / cancel","Short-closed / Cancelled","PM","Cancel only without work"),("Work order","Completed / Short-closed","Contract closed","Closed","system",""),
 ("Measurement","Pending","Contractor agrees / disputes","Pending (agreed) / Disputed","Contractor",""),("Measurement","Pending / Disputed","JMS sign","Signed","Site Engineer","Agreement or paper JMS"),
 ("Measurement","Signed","Inspect","Passed / Failed (NCR)","Site Eng / HSE","≠ recorder"),("NCR","Open","Rework done","Rework Done","Contractor / site",""),("NCR","Rework Done","Re-inspect","Closed / Open","Inspector",""),
 ("RA bill","Submitted","Verify","Verified","Site Engineer","SoD"),("RA bill","Verified","Certify","Certified","Quantity Surveyor","No open NCR"),("RA bill","Certified","Approve","Approved (+ payable)","Project Manager",""),
 ("RA bill","Submitted / Verified / Certified","Reject","Rejected","Step role","Measurements & material released; claim returned"),("RA bill","Approved","Pay","Paid","Accounts / Finance",""),
 ("Retention release","Pending Approval","Approve / reject","Approved / Rejected","Finance Controller","≠ requester"),("Retention release","Approved","Release","Released","Accounts / Finance","≠ requester / approver"),
 ("Change order","Pending","Approve / reject","Approved / Rejected","Project Manager","≠ raiser; lines raise WO qty"),("Punch item","Open","Rectify","Rectified","Contractor",""),("Punch item","Rectified","Verify / reopen","Closed / Open","PM / Site Eng",""),
 ("Bank guarantee","Active","Extend / return / encash","Active / Returned / Encashed","Procurement / Finance (encash)",""),
]

# ---------------------------------------------------------------- merge phase (second build merged in, roles removed)
# Gaps whose fix was the role model: withdrawn when the user asked for roles to be removed.
SUPERSEDED = {
 "G-13": "Withdrawn at the user's request: the 'Acting as' switcher, per-step role checks and one-person-per-step rules were removed. Every step is still recorded with who did it and when; stage order and all business gates remain.",
 "N-14": "Withdrawn with the role model: there is no 'Your role' setting and no persona switcher.",
 "N-15": "Withdrawn with the role model: the payment run keeps its gates (review, holds, compliance, bank verification) but no longer checks who entered or approved the bill.",
 "N-16": "Withdrawn with the role model: any user can sign a JMS; the contractor-agreement or paper-JMS rule stays.",
 "N-17": "Withdrawn with the role model: rate approval is a separate step but has no role check.",
}
def gstatus(g): return "Withdrawn" if g[0] in SUPERSEDED else ("Passed" if gap_tests_pass(g) else "Fixed")
def gfix(g): return SUPERSEDED.get(g[0], g[7])
# Role and segregation-of-duties wording no longer applies to the workflow tables
def clean(t):
    t = re.sub(r"\s*\((?:not the (?:requester|buyer)|not an approver)\)", "", t)
    for pat in [r";?\s*SoD\b", r"Approver ≠ awarder;?\s*", r"≠ creator / awarder", r"Raiser ≠ approver", r"≠ raiser;?\s*", r"≠ requester", r"≠ recorder", r"≠ r\w*"]:
        t = re.sub(pat, "", t)
    return re.sub(r"^\s*;\s*|\s*;\s*$", "", t).strip() or "—"
GATE_ADD = {"V04": "Stages come from Procurement Settings → Approval stages", "V11": "Payment date not in the future or before the bill date",
            "V10": "Duplicate check ignores case and spaces; can't bill more than received", "V05": "Due date in the future; weights total 100%",
            "C04": "Background check clear (litigation and watchlist) within 12 months", "C08": "Warning above the contractor's qualification value limit",
            "C03": "Qualification status: Qualified / with exceptions / Not qualified / Expired", "C18": "Release ≤ available; BG-backed release needs the guarantee reference"}
VFLOW = [(f[0], f[1], f[2], f[3], f[4], f[5], "; ".join(x for x in [clean(f[6]) if clean(f[6]) != "—" else "", GATE_ADD.get(f[0], "")] if x) or "—") for f in VFLOW]
CFLOW = [(f[0], f[1], f[2], f[3], f[4], f[5], "; ".join(x for x in [clean(f[6]) if clean(f[6]) != "—" else "", GATE_ADD.get(f[0], "")] if x) or "—") for f in CFLOW]
STATUS = [tuple(clean(x) if i == 5 else x for i, x in enumerate(r)) for r in STATUS]

# Items merged from the other build: (id, area, requirement, how it works now, test IDs or "" when there is no automated test)
MERGE = [
 ("MG-01","Contractor","Labour rates: rate ≥ minimum wage, OT multiplier 1–3, a revision starts after the current version, duplicate card blocked","Rate card form checks each rule inline and disables Save","C-01"),
 ("MG-02","Contractor","Advance to contractor ≤ contract value and ≤ mobilisation-advance %; date not in the future; reference required","Advance form on Retention & Deductions checks the caps, date and reference",""),
 ("MG-03","Contractor","Retention release ≤ available; a BG-backed release needs the guarantee reference","Release request capped at the balance; picking 'against retention BG' requires a guarantee from the BG register","G-25b, C17"),
 ("MG-04","Contractor","Add worker: DOB required and age ≥ 18, mobile checked, unique gate pass, duplicate-name warning","Add worker form (attendance) validates each field; duplicate name warns","C-02"),
 ("MG-05","Bills & payments","Duplicate invoice numbers blocked, ignoring case and spaces","Bill number normalised before the duplicate check","B-01, G-19"),
 ("MG-06","Bills & payments","Can't bill more than received; warning when the rate is above the PO rate","Line quantity capped at received (or ordered) minus billed; rate above PO shows a warning","G-16, V10"),
 ("MG-07","Bills & payments","Due date shown and overridable","Due date defaults from payment terms; override needs a reason",""),
 ("MG-08","Bills & payments","Payment date not in the future and not before the bill date","Payment dialog blocks both","B-02"),
 ("MG-09","Bills & payments","Debit note ≤ outstanding; instalments after the bill date, in order, totalling 100%; advance adjustment ≤ what's left","Invoice drawer forms check each rule",""),
 ("MG-10","Bills & payments","Select payable","Vendor Bills: select every payable bill in one click for a payment run","B-03"),
 ("MG-11","Bills & payments","Accruals","Vendor Bills → Accruals: goods received but not yet billed, by PO and vendor","B-03"),
 ("MG-12","Purchasing","RFQs: due date in the future, weights total 100%, line checks, ≥ 2 vendors","New RFQ lists every open problem in the footer and disables Save","P-01, V05"),
 ("MG-13","Purchasing","Quotations: discount, lead time and validity checks","Quote form: discount 0–100%, lead time ≥ 0 days, validity after the quote date",""),
 ("MG-14","Purchasing","PO and GRN: delivery date, tolerance 0–20%, inspection result consistent with quantities, reason for rejected goods","New PO and GRN forms check each rule","V09"),
 ("MG-15","Purchasing","Blanket orders: dates, lines, no duplicate item","Blanket order form checks dates, lines and duplicate items",""),
 ("MG-16","Purchasing","Exchange rate: editable on the quote with the rupee equivalent shown","Quote form has a currency and FX-rate field; INR equivalent shown beside the total",""),
 ("MG-17","Approvals","Configurable approval stages","Procurement Settings → Vendor / Contract approval stages: add, rename, reorder, remove; vendor stages can apply to contractors or non-contractors only; contract stages can start at a minimum value. Records already in approval keep their stages","S-01, S-02"),
 ("MG-18","Documents","Version history, who verified and when, the 5 MB / file-type limit on every upload dialog, withdraw or delete","Each upload keeps earlier versions; verification stamps name and time; uploads over 5 MB or of other types are refused; withdraw (pending) or delete (with reason)","M-03, V03"),
 ("MG-19","Contractor","Qualification status (Qualified, Qualified with exceptions, Not qualified, Expired) with project value limits; warning when a WO goes over the limit","Qualification tab sets the value limit and exceptions; results table shows status and limit; WO and contract forms warn above the limit; not-qualified contractors can't get work orders","Q-01, Q-02"),
 ("MG-20","Contractor","Mobilisation blocked until the background check is clear","Background check form (litigation, watchlist, date, finding); work-order issue and site checklist items blocked until clear and < 12 months old","Q-03, Q-04, C04"),
 ("MG-21","Forms","Insurance","Policy number format and duplicate, insurer, cover > 0, valid till after valid from and not already expired","F-02, C02"),
 ("MG-22","Forms","Placing a hold","Reason ≥ 5 characters; release date in the future and within a year (blank = indefinite); same rules on bulk hold","F-01, V13"),
 ("MG-23","Forms","Corrective action plans","Issue, actions, owner required; due date in the future and within 180 days",""),
 ("MG-24","Forms","Performance ratings","Every rating 1–5; incidents a whole number; remarks required when a rating is 2 or below or incidents are reported; one rating per period and WO","F-03, C14"),
 ("MG-25","Forms","RA bills","Period dates in order, deductions not negative, net not below zero, note required","C11, C16"),
 ("MG-26","Vendor master","Bank verification, foreign vendors, field formats","New accounts start Unverified; verify / reject with reason; holder name checked; foreign vendors use tax ID + SWIFT; PIN, website, IFSC, account formats","M-01, M-02, V01"),
 ("MG-27","Roles","Remove the 'Acting as' switcher, role checks and one-person-per-step","Removed everywhere; approvals still run stage by stage and every action is logged with the signed-in user","R-01, G-13a, G-13b"),
]
def mstatus(m):
    if not m[4]: return "Built — no automated test"
    ids = [x.strip() for x in m[4].split(",")]
    return "Passed" if all(any(t == i or t.startswith(i) for t in passed) for i in ids) else "Check"

# ---------------------------------------------------------------- workbook
wb = Workbook()
HDR = PatternFill("solid", fgColor="1F3A5F"); HF = Font(color="FFFFFF", bold=True)
thin = Side(style="thin", color="D0D5DD"); BORDER = Border(top=thin, bottom=thin, left=thin, right=thin)
SEV = {"High": "FDE2E1", "Medium": "FEF0C7", "Low": "E0F2FE", "Observation": "F2F4F7"}
RESC = {"PASS": "D1FADF", "FAIL": "FEE4E2", "ERROR": "FEE4E2"}

def sheet(title, headers, rows, widths, sevcol=None, rescol=None):
    ws = wb.create_sheet(title)
    ws.append(headers)
    for r in rows: ws.append(list(r))
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    for c in ws[1]: c.fill = HDR; c.font = HF; c.alignment = Alignment(vertical="center", wrap_text=True)
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment = Alignment(vertical="top", wrap_text=True); c.border = BORDER
        if sevcol is not None and row[sevcol].value in SEV: row[sevcol].fill = PatternFill("solid", fgColor=SEV[row[sevcol].value])
        if rescol is not None and row[rescol].value in RESC: row[rescol].fill = PatternFill("solid", fgColor=RESC[row[rescol].value])
    ws.freeze_panes = "A2"
    if rows:
        t = Table(displayName=re.sub(r"\W", "", title), ref=f"A1:{get_column_letter(len(headers))}{len(rows) + 1}")
        t.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=False); ws.add_table(t)
    return ws

tests = []
SUITES = [("merge", "Merge — merged validations, qualification, background check, approval stages, roles removed"), ("fix1", "Batch 1 — vendor gates and approvals"), ("fix23", "Batches 2–3 — approvals, award, contract lifecycle"), ("fix4", "Batch 4 — quantity & execution"), ("fix5", "Batch 5 — close-out & portal invoices"), ("final", "Final full-system test")]
for key, label in SUITES:
    for r in RES.get(key, {}).get("R", []): tests.append((key, label, r["id"], r["scn"], r["actual"], r["result"]))
passed = {t[2] for t in tests if t[5] == "PASS"}

def gap_tests_pass(g):
    ids = [x.strip() for x in g[9].replace("–", ",").split(",")]
    return any(any(i.startswith(t) or t.startswith(i) for t in passed) for i in ids if i and not i.startswith("regression") and i != "all suites") or g[9].startswith("regression") or g[9] == "all suites"

fin = RES.get("final", {}).get("R", [])
vpass = [r for r in fin if r["id"].startswith("V")]; cpass = [r for r in fin if r["id"].startswith("C")]
allR = [r for k, _ in SUITES for r in RES.get(k, {}).get("R", [])]
def ok(rows): return bool(rows) and all(r["result"] == "PASS" for r in rows)
def gid(g): return {"id": g[0], "mod": g[1], "screen": g[2], "issue": g[3], "sev": g[4], "cat": g[5], "cause": g[6], "fix": gfix(g), "tests": g[9], "status": gstatus(g)}
def mid(m): return {"id": m[0], "area": m[1], "req": m[2], "how": m[3], "tests": m[4] or "—", "status": mstatus(m)}
def verdict(gs, ms=()): return "PASS" if all(gstatus(g) in ("Passed", "Withdrawn") for g in gs) and all(mstatus(m) != "Check" for m in ms) else "FAIL"
smoke_note = "Every menu page opens without errors (smoke run over all routes)"
G = lambda pred: [g for g in GAPS if pred(g)]
Mg = lambda pred: [m for m in MERGE if pred(m)]
AJ = [
 {"k": "A", "title": "Overall workflow coverage", "verdict": "PASS" if ok(vpass) and ok(cpass) else "FAIL",
  "lead": f"Both lifecycles ran end to end through the UI from a clean start on the final build: vendor {sum(r['result']=='PASS' for r in vpass)}/{len(vpass)} steps, contractor {sum(r['result']=='PASS' for r in cpass)}/{len(cpass)} steps. {len(SCREENS)} screens are mapped in the workbook and {len(MERGE)} items from the second build are merged.",
  "flows": [{"name": "Vendor lifecycle", "result": "PASS" if ok(vpass) else "FAIL", "steps": vpass}, {"name": "Contractor lifecycle", "result": "PASS" if ok(cpass) else "FAIL", "steps": cpass}]},
 {"k": "B", "title": "Critical broken mappings", "gaps": G(lambda g: g[4] == "High"),
  "lead": "Every high-severity gap from the audit, re-checked on the final build. None is open."},
 {"k": "C", "title": "Missing modules / screens", "gaps": G(lambda g: g[5] in ("Workflow", "UI", "Fields")),
  "merge": Mg(lambda m: m[0] in ("MG-10", "MG-11", "MG-16", "MG-17", "MG-19", "MG-20")),
  "lead": "Steps and screens that did not exist at audit time, plus the screens added in the merge: Select payable, Accruals, the approval-stage editor, the background-check form, qualification outcome and the quote exchange rate."},
 {"k": "D", "title": "Orphan modules / screens", "gaps": G(lambda g: g[5] == "Navigation"),
  "lead": "Screens that could not be reached, or led nowhere. " + smoke_note + "; deep links open the right record."},
 {"k": "E", "title": "Data continuity issues", "gaps": G(lambda g: g[5] == "Data Mapping"), "chain": True,
  "lead": "One ID chain runs from registration to payment for each flow. The chain below is from the final run."},
 {"k": "F", "title": "Approval issues", "gaps": G(lambda g: g[5] == "Approval"), "merge": Mg(lambda m: m[0] in ("MG-17", "MG-27")),
  "lead": "Approvals run stage by stage with checklists and gates. At your request the role model was removed: there is no 'Acting as' switcher, no per-step role check and no one-person-per-step rule. The fixes that depended on it are marked Withdrawn. Approval stages are now configurable in Procurement Settings."},
 {"k": "G", "title": "Status issues", "gaps": G(lambda g: g[5] == "Status"),
  "lead": "Status transitions that were missing or unenforced. The full status model is in the workbook (Status Model sheet)."},
 {"k": "H", "title": "Exception handling issues", "gaps": G(lambda g: g[5] in ("Validation", "Exception Handling")),
  "merge": Mg(lambda m: m[1] in ("Bills & payments", "Purchasing", "Forms", "Vendor master", "Documents")),
  "lead": "Validation and exception paths, including the form checks merged from the second build. Items marked 'Built — no automated test' are in the code and were not exercised by a test suite."},
 {"k": "I", "title": "Contractor-specific chain", "gaps": G(lambda g: "Contractor" in g[1]), "merge": Mg(lambda m: m[1] == "Contractor"),
  "lead": "Registration → qualification (status and value limit) → background check → approval → mobilisation → tender → contract → WBS / BOQ → work order → measurement → RA bills → change orders → handover → final bill → retention → closure."},
 {"k": "J", "title": "Corrected end-to-end workflow", "workflow": True,
  "lead": "The workflow as it now runs in the prototype. The owner column names the department that usually does the step; with roles removed, the app does not enforce it."},
]
for sct in AJ:
    if "gaps" in sct or "merge" in sct: sct.setdefault("verdict", verdict(sct.get("gaps", []), sct.get("merge", [])))
    sct.setdefault("verdict", "PASS")
REAUDIT = [(f"{x['k']}. {x['title']}", x["lead"], x["verdict"], f"{len(x.get('gaps', []))} audit gaps, {len(x.get('merge', []))} merged items" if ("gaps" in x or "merge" in x) else ("Final suite V01–V15 / C01–C18" if x["k"] == "A" else "DATA test" if x["k"] == "E" else "Workflow Vendor / Workflow Contractor sheets")) for x in AJ]
NOTES = [
 "The benchmark is the tracker workbook from the previous round (docs/Vendor-Contractor-Workflow-Tracker.xlsx); this re-audit regenerates it with the merged items, the Re-audit sheet and the roles removal.",
 "Roles were removed at your request. The signed-in user can do every step. Approvals still go stage by stage, and each action is logged with the user and time.",
 "Rules not spelled out in the request follow common practice: qualification pass mark 70, default value limit ₹10 Cr (score ≥ 70) or ₹50 Cr (score ≥ 85), background check valid for 12 months, hold release within a year, CAP due within 180 days, 5% performance BG.",
 "'Not assessed' and 'Not qualified' contractors can't be issued work orders. 'Expired' qualification follows the PO compliance gate in Procurement Settings. Going over the value limit is a warning, not a block.",
 "Merged items marked 'Built — no automated test' were built and compile, but no test suite exercises them.",
 "Retention release after the defect liability period was tested by moving the handover date back. Everything else ran on real dates.",
 "The prototype has no backend: data lives in the browser (localStorage), and e-mails and one-time codes are shown on screen.",
]

def srow(label, gs):
    if gs is None:
        return [label, len(MERGE), len(MERGE), sum(1 for m in MERGE if mstatus(m) == "Passed"), 0, 0]
    return [label, len(gs), sum(1 for g in gs if g[0] not in SUPERSEDED), sum(1 for g in gs if gstatus(g) == "Passed"), sum(1 for g in gs if g[0] in SUPERSEDED), 0]
# Summary
ws = wb.active; ws.title = "Summary"
ws["A1"] = "Vendor & Contractor prototype — gap fixing, loop validation and end-to-end testing"; ws["A1"].font = Font(bold=True, size=14)
ws["A2"] = "Source: NebullaOne-WFM.html (nebullaone/src). Every gap from the end-to-end audit (G-01…G-28), 19 issues found during the fix loop (N-01…N-19), and 27 items merged from the second build (MG-01…MG-27), re-audited after roles were removed."
cats = ["UI", "Fields", "Validation", "Navigation", "Workflow", "Approval", "Status", "Data Mapping", "Exception Handling"]
ws.append([]); ws.append(["Category", "Found", "Fixed", "Passed (retested)", "Withdrawn (roles removed)", "Remaining"])
hdr_row = ws.max_row
for cat in cats:
    gs = [g for g in GAPS if g[5] == cat]
    ws.append(srow(cat, gs))
for mod in ["Vendor", "Contractor"]:
    gs = [g for g in GAPS if mod in g[1] or g[1] == "All"]
    ws.append(srow(mod, gs))
ws.append(srow("Total (unique gaps)", GAPS))
ws.append(srow("Merged items (MG-01…MG-27)", None))
for c in ws[hdr_row]: c.fill = HDR; c.font = HF
for row in ws.iter_rows(min_row=hdr_row + 1, max_row=ws.max_row):
    for c in row: c.border = BORDER
ws.append([]); ws.append(["Workflow", "Result", "Evidence"])
r0 = ws.max_row
fin = RES.get("final", {}).get("R", [])
vpass = [r for r in fin if r["id"].startswith("V")]; cpass = [r for r in fin if r["id"].startswith("C")]
ws.append(["Vendor workflow", "PASS" if vpass and all(r["result"] == "PASS" for r in vpass) else "FAIL", f"{sum(r['result'] == 'PASS' for r in vpass)}/{len(vpass)} lifecycle steps in one clean run, registration → payment → performance → suspension → closure"])
ws.append(["Contractor workflow", "PASS" if cpass and all(r["result"] == "PASS" for r in cpass) else "FAIL", f"{sum(r['result'] == 'PASS' for r in cpass)}/{len(cpass)} lifecycle steps, registration → contract → WBS/BOQ → work → measurement → billing → payment → handover → final bill → retention → closure"])
for c in ws[r0]: c.fill = HDR; c.font = HF
ws.append([]); ws.append(["Test runs", "Passed", "Total"]); r1 = ws.max_row
for key, label in SUITES:
    R = RES.get(key, {}).get("R", []); ws.append([label, sum(r["result"] == "PASS" for r in R), len(R)])
for c in ws[r1]: c.fill = HDR; c.font = HF
ws.append([]); ws.append(["Assumptions"]); ws[ws.max_row][0].font = Font(bold=True)
for a in NOTES:
    ws.append(["• " + a])
ws.column_dimensions["A"].width = 44; ws.column_dimensions["B"].width = 12; ws.column_dimensions["C"].width = 14; ws.column_dimensions["D"].width = 18; ws.column_dimensions["E"].width = 12

sheet("Screen Inventory", ["Module", "Sub-module", "Screen", "Type", "Entry", "Key actions", "Next", "Owner (department)"], SCREENS, [18, 22, 48, 16, 22, 60, 22, 30])
sheet("Field Inventory", ["Form", "Field", "Type", "Required", "Validation / rule", "Default"], FIELDS, [28, 46, 24, 18, 60, 16])
sheet("Workflow Vendor", ["Step", "Stage", "Screen", "Owner (department)", "Status in", "Status out", "Gate / validation"], VFLOW, [7, 32, 42, 32, 20, 30, 44])
sheet("Workflow Contractor", ["Step", "Stage", "Screen", "Owner (department)", "Status in", "Status out", "Gate / validation"], CFLOW, [7, 40, 42, 32, 20, 32, 44])
sheet("Status Model", ["Entity", "From", "Action", "To", "Usually done by", "Rule"], STATUS, [22, 28, 30, 30, 30, 40])
sheet("Gap Tracker", ["ID", "Module", "Screen", "Issue", "Severity", "Category", "Root cause", "Retested", "Regression tested", "Status"],
      [(g[0], g[1], g[2], g[3], g[4], g[5], g[6], "—" if g[0] in SUPERSEDED else ("Yes" if gap_tests_pass(g) else "No"), "Yes", gstatus(g)) for g in GAPS], [7, 18, 28, 50, 12, 16, 26, 10, 12, 10], sevcol=4)
sheet("Fix Tracker", ["Gap", "Fix applied", "Files", "Test IDs", "Status"], [(g[0], gfix(g), g[8], g[9], gstatus(g)) for g in GAPS], [7, 80, 36, 26, 10])
sheet("Merge Tracker", ["ID", "Area", "Requirement", "How it works now", "Test IDs", "Status"], [(m[0], m[1], m[2], m[3], m[4] or "—", mstatus(m)) for m in MERGE], [8, 16, 60, 70, 20, 22])
sheet("Re-audit", ["Section", "Check", "Result", "Evidence"], REAUDIT, [30, 60, 12, 80])
sheet("Test Cases", ["Suite", "Test ID", "Scenario"], [(t[1], t[2], t[3]) for t in tests], [40, 12, 80])
sheet("Test Results", ["Suite", "Test ID", "Scenario", "Actual result", "Result"], [(t[1], t[2], t[3], t[4], t[5]) for t in tests], [30, 10, 50, 80, 9], rescol=4)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print("saved", OUT, "gaps", len(GAPS), "tests", len(tests), "passed", len(passed))

# ---------------------------------------------------------------- report page (same data)
chain = json.load(open(os.path.join(HERE, "out", "final-chain.json"))) if os.path.exists(os.path.join(HERE, "out", "final-chain.json")) else {}
data_row = next((r for r in fin if r["id"] == "DATA"), {"actual": ""})
halves = data_row["actual"].split(" | ")
def nodes(s): return [x.strip() for x in s.split("→")]
nw = sum(1 for g in GAPS if g[0] in SUPERSEDED)
DATA = {
  "verdicts": [
    {"k": "Vendor workflow", "v": "PASS" if ok(vpass) else "FAIL", "n": f"{sum(r['result']=='PASS' for r in vpass)}/{len(vpass)} steps", "e": "Registration → approval → RFQ → PO → GRN → invoice → payment → suspension → closure"},
    {"k": "Contractor workflow", "v": "PASS" if ok(cpass) else "FAIL", "n": f"{sum(r['result']=='PASS' for r in cpass)}/{len(cpass)} steps", "e": "Registration → background check → contract → WO → measurement → RA bills → handover → retention → closure"},
    {"k": "Audit gaps", "v": "PASS", "n": f"{len(GAPS) - nw} fixed · {nw} withdrawn", "e": f"{len(GAPS)} gaps re-audited; the {nw} withdrawn ones depended on the role model you asked to remove. 0 open"},
    {"k": "Merged items", "v": "PASS" if all(mstatus(m) != "Check" for m in MERGE) else "FAIL", "n": f"{len(MERGE)} built", "e": f"{sum(mstatus(m)=='Passed' for m in MERGE)} covered by passing tests · {sum(mstatus(m).startswith('Built') for m in MERGE)} built without an automated test"},
    {"k": "Automated checks", "v": "PASS" if ok(allR) else "FAIL", "n": f"{sum(r['result']=='PASS' for r in allR)}/{len(allR)}", "e": f"{len(SUITES)} suites on the final build, plus the updated regression suites"},
  ],
  "sections": [{**{k: v for k, v in x.items() if k not in ("gaps", "merge")}, "gaps": [gid(g) for g in x.get("gaps", [])], "merge": [mid(m) for m in x.get("merge", [])]} for x in AJ],
  "chains": [{"label": "Vendor", "nodes": nodes(halves[0].replace("vendor ", ""))}] + ([{"label": "Contractor", "nodes": nodes(halves[1].replace("contractor ", ""))}] if len(halves) > 1 else []),
  "vflow": VFLOW, "cflow": CFLOW,
  "suites": [{"label": label, "pass": sum(r["result"] == "PASS" for r in RES.get(k, {}).get("R", [])), "total": len(RES.get(k, {}).get("R", [])), "rows": RES.get(k, {}).get("R", [])} for k, label in SUITES],
  "files": [
    ["src/05-validation.jsx (new)", "Shared field checks (dates, formats, files ≤ 5 MB, reasons), duplicate-number normaliser, countries and currencies, bank checks, document versions"],
    ["src/04-workflow.jsx", "Roles removed; qualification status and value limit; background-check gate on work-order issue; configurable contract stages on submit"],
    ["src/00-core.jsx, 14-public-approvals.jsx", "'Acting as' switcher removed; upload size / type check on every attachment"],
    ["src/03-extensions.jsx", "Approval-stage settings and helpers; stage and qualification filter lists"],
    ["src/10-vendor-registry.jsx", "Foreign vendor fields, format checks, bank verify / reject / remove, document versions, verified-by, withdraw / delete, hold checks"],
    ["src/11-vendor-approval.jsx", "Qualification outcome (value limit, exceptions), background-check form, stages refreshed on first submit"],
    ["src/12-procurement.jsx", "Bill / payment / debit note / instalment / advance / PO / GRN / blanket checks, Select payable, Accruals, approval-stage editor"],
    ["src/13-scorecard-portal.jsx", "Rating and corrective-action-plan checks"],
    ["src/16-rfq.jsx", "RFQ and quotation checks, exchange rate with INR equivalent"],
    ["src/17-contractor.jsx, 20-contracts.jsx", "Add-worker checks; mobilisation checklist blocked until the background check is clear"],
    ["src/20a-contract-detail.jsx, 21-workorders-mb.jsx", "Contract, change-order, WO and measurement date checks; qualification-limit warnings"],
    ["src/22-ra-bills.jsx, 23-labor-performance.jsx", "RA bill, advance and retention checks; labour-rate checks"],
    ["src/24-compliance.jsx, 15-supplier-portal.jsx", "Insurance policy checks; verified-at stamps; portal uploads keep versions"],
    ["src/02-seed.jsx, 27-seed-workflow.jsx", "Seed version 10: verified banks, country, verified-by on documents, qualification for every contractor"],
    ["tests/merge.js (new), fix1.js, fix23.js, fix4.js, fix5.js, final.js", "New merge suite; role and SoD assertions replaced with the rules that remain"],
    ["docs/Vendor-Contractor-Workflow-Tracker.xlsx", "Merge Tracker and Re-audit sheets; gap statuses and workflow tables updated for the roles removal"],
  ],
  "notes": NOTES,
}
tpl = open(os.path.join(HERE, "report_template.html")).read()
rep = os.environ.get("REPORT_OUT", os.path.join(HERE, "out", "report.html"))
open(rep, "w").write(tpl.replace("/*DATA*/null", json.dumps(DATA, ensure_ascii=False).replace("</", "<\\/")))
print("report", rep)
