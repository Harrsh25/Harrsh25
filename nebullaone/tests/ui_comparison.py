# Builds docs/UI_Comparison_NebullaOne.html — screen-by-screen UI comparison of NebullaOne with
# ERPNext, Odoo, Zoho Books, Oracle Fusion (Redwood) and SAP S/4HANA (Fiori), with screenshots of
# NebullaOne and links to each platform's UI documentation.
# Usage: python3 ui_comparison.py <screenshot dir>
import base64, html, os, sys

SHOTS = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'UI_Comparison_NebullaOne.html')
P = ['ERPNext', 'Odoo', 'Zoho Books', 'Oracle (Redwood)', 'SAP (Fiori)']

SRC = {
 'fiori-list': ('SAP Fiori — List report floorplan', 'https://www.sap.com/design-system/fiori-design-web/v1-148/page-types/floorplans/list-report-floorplan-sap-fiori-element/usage'),
 'fiori-object': ('SAP Fiori — Object page floorplan', 'https://experience.sap.com/fiori-design-web/v1-96/object-page'),
 'redwood-po': ('Oracle Redwood — Manage Purchase Orders', 'https://docs.oracle.com/en/cloud/saas/readiness/scm/25a/proc25a/25A-procurement-wn-f35425.htm'),
 'redwood-filter': ('Oracle Redwood — Search, filter and review purchase orders', 'https://docs.oracle.com/en/cloud/saas/readiness/scm/25b/proc25b/25B-procurement-wn-f36610.htm'),
 'redwood-views': ('Oracle Redwood — Configure search views', 'https://docs.oracle.com/en/cloud/saas/readiness/scm/26a/proc26a/26A-procurement-wn-f41793.htm'),
 'odoo-search': ('Odoo — Search, filter and group records', 'https://www.odoo.com/documentation/saas-18.2/applications/essentials/search.html'),
 'odoo-views': ('Odoo views: form header / status bar / chatter, list, kanban', 'https://ecosire.com/blog/odoo-xml-views-form-list-kanban-search'),
 'frappe-desk': ('Frappe / ERPNext — Desk: list view, form view, sidebar', 'https://docs.frappe.io/framework/user/en/desk'),
 'frappe-filter': ('ERPNext — Filter by (assigned to, tags)', 'https://docs.frappe.io/erpnext/user/manual/en/filter-by'),
 'zoho-views': ('Zoho Books — Custom views (criteria, columns, sharing)', 'https://www.zoho.com/in/books/help/settings/customization/custom-views.md'),
 'zoho-portal': ('Zoho Books — Vendor portal', 'https://www.zoho.com/books/help/vendor-portal/'),
 'oracle-portal': ('Oracle Supplier Portal overview', 'https://www.oracle.com/assets/supplier-portal-1558356.pdf'),
 'erpnext-portal': ('ERPNext — Supplier quotation through the portal', 'https://docs.frappe.io/erpnext/how-to-create-a-supplier-quotation-through-the-supplier-portal.md'),
}

# UI pattern matrix: pattern, NebullaOne (status, text), then one cell per platform, sources
Y, PART, N = 'yes', 'part', 'no'
PATTERNS = [
 ('Navigation', (Y, 'Left sidebar, modules → pages'), ['Workspace sidebar', 'Top app menu per app', 'Left sidebar', 'Navigator / springboard', 'Launchpad spaces & tiles'], ['frappe-desk', 'fiori-list']),
 ('List header: title + primary "New" action', (Y, 'Title, primary button top-right, ⋯ menu'), ['Yes', 'Yes', 'Yes', 'Yes', 'Yes (header toolbar)'], ['fiori-list']),
 ('Document number as first column', (Y, 'Added in this round (PO, RFQ, bill)'), ['Yes (ID)', 'Yes (Reference)', 'Yes (#)', 'Yes (Order)', 'Yes (key field)'], []),
 ('Status as coloured badge', (Y, 'Dot + coloured pill on every list'), ['Indicator pill', 'Badge / row decoration', 'Coloured status text', 'Badge', 'Semantic object status'], ['odoo-views', 'fiori-list']),
 ('Search box always visible', (Y, 'Search box always shown above every list'), ['Field filters on top', 'Search bar always shown', 'Search in list header', 'Keyword search always shown', 'Search field in filter bar'], ['odoo-search', 'redwood-filter', 'fiori-list']),
 ('Filters', (Y, 'Right-side Filters panel, chips, multi-select, Reset / Apply'), ['Filter row + sidebar group counts', 'Filters dropdown in search bar', 'Custom view criteria', 'Smart filter chips + Filters panel', 'Filter bar + Adapt Filters dialog'], ['frappe-filter', 'odoo-search', 'zoho-views', 'redwood-filter', 'fiori-list']),
 ('Saved views / favourites', (Y, 'Saved views: name a search + filters + sort + group + layout, re-apply from the Views menu'), ['Saved filters / report views', 'Favorites (personal or shared)', 'Custom views (shared by role)', 'Saved searches', 'Variant management'], ['odoo-search', 'zoho-views', 'redwood-po', 'fiori-list']),
 ('Group by', (Y, 'Group by any filter column, collapsible group headers with counts'), ['Group-by sidebar & report view', 'Group By (nested)', '—', '—', 'Table grouping in personalization'], ['odoo-search', 'frappe-filter']),
 ('Other views: kanban / calendar / chart', (Y, 'List, Board (kanban by status) and Calendar layouts; dashboards on Overview'), ['Report, Kanban, Calendar, Gantt', 'Kanban, pivot, graph, calendar', '—', 'Metrics tiles on the page', 'Charts in analytical list page'], ['frappe-desk', 'odoo-views']),
 ('Choose columns', (Y, 'Customize columns (+ default hidden columns)'), ['List view settings', 'Optional columns', 'Customize columns', 'Configure search views', 'Table personalization'], ['zoho-views', 'redwood-views']),
 ('Export to Excel / CSV', (Y, 'CSV of what is on screen'), ['Yes', 'Yes (xlsx)', 'Yes', 'Download to Excel', 'Export to spreadsheet'], ['redwood-po']),
 ('Select many rows + bulk action', (PART, 'Vendor registry (hold) and bills (Select payable) only'), ['Yes, every list', 'Yes, every list', 'Yes, bulk actions', 'Yes', 'Yes (table toolbar)'], []),
 ('Paging for large lists', (Y, 'Pager: 25 / 50 / 100 rows per page'), ['Paging (20 / 100 / 500)', 'Pager', 'Paging', 'Load more', 'Growing list / paging'], ['frappe-desk']),
 ('KPI tiles on the list page', (Y, 'Tiles on most pages'), ['Dashboards separately', '— (separate dashboards)', '—', 'Metrics on Manage Purchase Orders', 'KPI tags / analytical list page'], ['redwood-po']),
 ('Record opens as', (Y, 'Side drawer over the list'), ['Full-page form', 'Full-page form', 'Detail page beside the list', 'Full page or drawer', 'Object page (full screen / columns)'], ['frappe-desk', 'fiori-object']),
 ('Record header: ID, status, key facts, main actions', (Y, 'Title, status pills, key facts, actions top-right'), ['Yes', 'Status bar + action buttons', 'Yes', 'Yes', 'Dynamic header with KPIs & actions'], ['fiori-object', 'odoo-views']),
 ('Status / stage flow on every document', (Y, 'Status bar on vendor, requisition, RFQ, blanket order, PO, bill, contract, work order; stepper on RA bill'), ['Status indicator', 'Status bar on every document', 'Status timeline', 'Status + progress', 'Process flow / status'], ['odoo-views']),
 ('Sections & navigation inside a record', (Y, 'Tabs + sections'), ['Tabs / sections', 'Notebook tabs', 'Tabs', 'Sections', 'Anchor bar + sections'], ['fiori-object']),
 ('Related documents with counts', (Y, 'Related-document buttons with counts open the filtered list'), ['Connections dashboard', 'Smart buttons with counts', 'Related tabs', 'Related documents', 'Related apps / document flow'], ['odoo-views']),
 ('Comments, @mentions and activity on a record', (Y, 'Comments with @mention on every document; mentions go to the audit log'), ['Comments + timeline', 'Chatter (messages, activities, followers)', 'Comments & history', 'Comments', 'Notes'], ['odoo-views', 'frappe-desk']),
 ('Attachments on any record', (PART, 'Vendor documents, bill copy, RFQ files only'), ['Sidebar attachments', 'Chatter attachments', 'Attach files', 'Attachments', 'Attachments'], ['frappe-desk']),
 ('Print / PDF of documents', (PART, 'RFQ, handover and release certificates; no PO / bill print'), ['Print formats', 'Print / send', 'PDF & e-mail', 'Print', 'Output management'], []),
 ('Supplier-facing portal', (Y, 'Full portal incl. contractor screens'), ['Supplier portal (RFQ, PO, invoices)', 'Vendor portal', 'Vendor portal (accept PO, upload invoices)', 'Supplier Portal', 'Ariba Network'], ['erpnext-portal', 'zoho-portal', 'oracle-portal']),
 ('Phone / tablet use', (Y, 'Phone layout: menu button, slide-in sidebar, wrapping toolbars and grids'), ['Responsive + app', 'Responsive + app', 'Mobile apps', 'Responsive Redwood', 'Responsive Fiori'], []),
]

# Screen-by-screen: file, title, what NebullaOne shows, how the five do it, verdict, suggestions
SCREENS = [
 ('01-vendor-list', 'Vendor Registry — list', 'Vendor, status, type, trades, tier, registration, compliance, score; star for preferred; tabs Vendors / Invitations; Register & Invite buttons.',
  'All five show suppliers as a list with a search bar and saved filters (ERPNext Supplier list, Odoo Vendors kanban/list, Zoho Vendors, Oracle Manage Suppliers, SAP Manage Business Partner). Odoo opens Vendors as kanban cards by default.',
  'On par', ['Done: search box always visible.', 'Done: saved views.']),
 ('03-filters-panel', 'Filters panel', 'Right-side panel, one section per column, coloured chips, multi-select, Reset / Apply; slim "n filters applied · Edit · Clear" line.',
  'Oracle Redwood is closest (smart filter chips + Filters panel). SAP uses a filter bar with "Adapt Filters". Odoo puts Filters / Group By / Favorites in one dropdown under the search bar. ERPNext uses a filter row plus sidebar counts. Zoho uses saved custom views with criteria.',
  'On par', ['Add "Save as view" at the bottom of the panel (Odoo Favorites, SAP variants, Redwood saved searches).', 'Show the count of records next to each chip (ERPNext sidebar counts).']),
 ('02-vendor-record', 'Vendor record', 'Drawer with header (name, status menu, tags), 7 tabs: Overview (with contacts & addresses), Status & flags, Documents, Bank, Qualification, Equipment (contractors), Approvals (with activity).',
  'ERPNext and Odoo open a full-page form with tabs; Odoo adds smart buttons (POs, bills, on-time rate) and chatter. SAP Fiori uses an object page with header facts and an anchor bar. Zoho shows the vendor detail beside the list with Overview / Transactions / Statements.',
  'On par', ['Add count buttons in the header: POs, bills, contracts, open balance (Odoo smart buttons / ERPNext connections).', 'Add a comments box with @mention on the record.']),
 ('04-approval-record', 'Vendor approval', 'Same vendor drawer opened on Approvals: stages with approve / reject / request changes, blockers listed.',
  'Oracle and SAP Ariba route approvals through a worklist / notifications; Odoo and ERPNext approve on the document (status bar buttons / workflow actions); Zoho approves from the document with an approval banner.',
  'On par', ['Approval Management already gives the worklist; keep the stepper visible at the top of the drawer.']),
 ('05-rfq-record', 'RFQ & quote comparison', 'Invited vendors with invitation / quote status, comparison sheet (L1 highlighted), weighted scoring, Award by line, Print / PDF.',
  'Odoo compares RFQ lines from a call for tenders; ERPNext has a supplier quotation comparison report; Oracle and SAP Ariba have dedicated negotiation / sourcing event screens with line-level award.',
  'Ahead of ERPNext / Odoo / Zoho', ['None needed — the side-by-side sheet with L1 highlight is clearer than ERPNext\'s report.']),
 ('06-po-list', 'Purchase Orders — list', 'PO no., vendor, items · project, source, value, received bar, delivery date, billing status, status.',
  'Oracle Redwood\'s Manage Purchase Orders adds metric tiles (match holds, overdue, drafts) above the list; SAP list report puts KPIs and a filter bar on top; Odoo shows RFQs and POs in one list with status badges.',
  'On par', ['Status and Billing columns fall off-screen at 1440 px — move Status next to PO no.', 'Add tiles like Redwood: overdue deliveries, awaiting approval, bills on hold.']),
 ('07-po-record', 'Purchase order record', 'Header with status pills, tiles (value, accepted %, rejected, billed), lines ordered vs received vs billed, goods receipts, returns, bills, revisions; Receive goods / Unlock & amend.',
  'Odoo shows a status bar (RFQ → RFQ Sent → Purchase Order) and smart buttons (Receipts, Vendor Bills). SAP shows document flow. ERPNext shows a dashboard of connected receipts and invoices. Oracle shows a PO page with schedules and holds.',
  'On par', ['Add a status bar (Draft → Issued → Received → Billed → Closed) at the top.', 'Add Print / PDF for the PO.']),
 ('08-goods-receipt', 'Goods receipt form', 'Modal on the PO: date, inspection result, accepted / rejected per line, stores, inspection template parameters, transport details.',
  'ERPNext Purchase Receipt and Odoo Receipt are full documents with their own list; SAP posts goods receipts in its own app; Oracle uses a Receive Items page.',
  'Different', ['Fine as a modal for site users; the receipts list was removed earlier at your request.']),
 ('09-bills-list', 'Bills — list', 'Select box, Bill no., vendor, vendor bill no., amount, balance, next due, match, status; Select payable for batch payment.',
  'Zoho Bills and Odoo Vendor Bills list with status badges and payment state; SAP Manage Supplier Invoices; Oracle Manage Invoices with hold indicators.',
  'On par', ['Show the hold reason in a column, as Oracle does for holds.']),
 ('10-bill-record', 'Bill record', 'Header with status, tiles (amount, notes, settled, balance), payment schedule, hold, credit / debit notes, payments.',
  'Odoo shows a vendor bill with status bar (Draft → Posted) and "Paid" ribbon; Zoho shows the bill with a payment banner; Oracle shows holds and validation status; SAP shows invoice and payment blocks.',
  'Needs tidy', ['On a paid bill, hide the Hold form and the "should be paid: No" text — show a "Paid" ribbon like Odoo / Zoho.', 'Add Print / PDF.']),
 ('11-contract-record', 'Contract record', 'Header, BOQ, guarantees, approvals, change orders, terms, closure checklist; actions Submit / Sign / Terminate / Raise change order.',
  'Oracle complex-work PO shows pay items, progress schedule and retainage columns; SAP outline agreement object page; ERPNext / Odoo / Zoho have no works-contract screen.',
  'Ahead', ['Add a progress strip: Approved → Signed → Active → Handover → DLP → Closed.']),
 ('12-ra-bill-record', 'RA bill record', 'Bill abstract (prev / this / cumulative), deductions (retention, advance, TDS, cess, material), certification steps, payable link.',
  'Oracle work confirmation shows contract sum, completed value and projected retainage; SAP service entry sheet shows lines and approval; the others have no equivalent.',
  'Ahead', ['None needed.']),
 ('13-overview', 'Overview dashboard', 'Tiles, action centre, expiring items, charts, top vendors.',
  'Odoo and ERPNext have separate dashboards; SAP uses overview pages with cards; Oracle uses landing pages with infolets.',
  'On par', ['Let users pin tiles they care about (SAP / Oracle allow card personalisation).']),
 ('14-supplier-portal', 'Supplier portal', 'Tabs for RFQs, POs, work orders, RA claims, attendance, punch list, bills, price list, documents, queries, users.',
  'Zoho vendor portal: accept PO, upload invoices. ERPNext: RFQ, quotations, orders, invoices. Oracle Supplier Portal: orders, ASNs, invoices, negotiations, profile. SAP: Ariba Network.',
  'Ahead', ['None needed — contractor-side tabs are beyond the others.']),
 ('15-settings', 'Procurement Settings', 'Tabs Rules / Gates & approvals / Masters / Templates; Stop / Warn / Off toggles.',
  'ERPNext Buying Settings (single page of checkboxes); Odoo Purchase settings (sections with toggles); Oracle and SAP use setup / configuration apps.',
  'On par', ['None needed.']),
]

def img(n):
    fp = os.path.join(SHOTS, n + '.png')
    return 'data:image/png;base64,' + base64.b64encode(open(fp, 'rb').read()).decode() if os.path.exists(fp) else ''

def cite(keys):
    return ' '.join(f'<a href="{SRC[k][1]}" target="_blank" rel="noopener">[{i+1}]</a>' for i, k in enumerate(keys))

DOT = {Y: ('Has it', 'ok'), PART: ('Partly', 'part'), N: ('Missing', 'no')}
VERD = {'Ahead': 'ok', 'On par': 'ok', 'Different': 'part', 'Needs tidy': 'no'}
e = html.escape
rows = ''.join(f'<tr><th scope="row">{e(pt)}</th><td><span class="pill {DOT[s][1]}">{DOT[s][0]}</span> {e(t)}</td>' + ''.join(f'<td>{e(c)}</td>' for c in cells) + f'<td class="src">{cite(srcs)}</td></tr>' for pt, (s, t), cells, srcs in PATTERNS)
cnt = {k: sum(1 for x in PATTERNS if x[1][0] == k) for k in (Y, PART, N)}
cards = ''
for f, title, ours, theirs, verdict, sugg in SCREENS:
    v = 'ok' if verdict.startswith(('Ahead', 'On par')) else VERD.get(verdict, 'part')
    cards += f'''<section class="screen"><header><h3>{e(title)}</h3><span class="pill {v}">{e(verdict)}</span></header>
<figure><img loading="lazy" src="{img(f)}" alt="NebullaOne — {e(title)}"><figcaption>NebullaOne — {e(title)}</figcaption></figure>
<dl><dt>NebullaOne</dt><dd>{e(ours)}</dd><dt>ERPNext · Odoo · Zoho · Oracle · SAP</dt><dd>{e(theirs)}</dd><dt>Suggested</dt><dd><ul>{''.join(f"<li>{e(s)}</li>" for s in sugg)}</ul></dd></dl></section>'''
srcs = ''.join(f'<li><a href="{u}" target="_blank" rel="noopener">{e(t)}</a></li>' for t, u in SRC.values())

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Screen UI Comparison</title>
<style>
:root{{--bg:#f6f7f9;--card:#fff;--ink:#1d2433;--soft:#5b6476;--line:#e3e6ec;--brand:#0b5ed7;--ok:#e3f4e8;--okt:#1e6b3a;--part:#fff2d6;--partt:#8a5a00;--no:#fbe3e3;--not:#9b1c1c}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#12151b;--card:#1b2029;--ink:#e6e9ef;--soft:#a3abba;--line:#2c3340;--brand:#6ea8ff;--ok:#1e3a29;--okt:#9be0b2;--part:#3d3216;--partt:#f2cf7c;--no:#3f1f22;--not:#f3a5a5}}}}
:root[data-theme="dark"]{{--bg:#12151b;--card:#1b2029;--ink:#e6e9ef;--soft:#a3abba;--line:#2c3340;--brand:#6ea8ff;--ok:#1e3a29;--okt:#9be0b2;--part:#3d3216;--partt:#f2cf7c;--no:#3f1f22;--not:#f3a5a5}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 Inter,system-ui,-apple-system,Segoe UI,sans-serif}}
main{{max-width:1180px;margin:0 auto;padding:28px 16px 60px}}h1{{font-size:24px;margin:0 0 4px}}h2{{font-size:18px;margin:36px 0 10px}}h3{{font-size:15px;margin:0}}
.lead{{color:var(--soft);margin:0 0 18px}}a{{color:var(--brand)}}
.tiles{{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}}.tile{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}}.tile b{{display:block;font-size:22px}}.tile span{{color:var(--soft);font-size:12.5px}}
.tablewrap{{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:10px}}table{{border-collapse:collapse;width:100%;min-width:980px;font-size:12.5px}}
th,td{{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid var(--line)}}thead th{{background:var(--bg);font-size:11.5px;text-transform:uppercase;letter-spacing:.03em;color:var(--soft);position:sticky;top:0}}
tbody th{{font-weight:600;width:170px}}td.src a{{margin-right:4px;font-size:11.5px}}
.pill{{display:inline-block;border-radius:999px;padding:1px 9px;font-size:11.5px;font-weight:600;white-space:nowrap}}.pill.ok{{background:var(--ok);color:var(--okt)}}.pill.part{{background:var(--part);color:var(--partt)}}.pill.no{{background:var(--no);color:var(--not)}}
.screen{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:0 0 16px}}.screen header{{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}}
figure{{margin:0 0 12px}}figure img{{width:100%;height:auto;border:1px solid var(--line);border-radius:8px;display:block}}figcaption{{font-size:12px;color:var(--soft);margin-top:4px}}
dl{{display:grid;grid-template-columns:200px 1fr;gap:6px 14px;margin:0}}dt{{font-weight:600;color:var(--soft)}}dd{{margin:0}}dd ul{{margin:0;padding-left:18px}}
@media (max-width:700px){{dl{{grid-template-columns:1fr}}tbody th{{width:auto}}}}
.note{{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--brand);border-radius:8px;padding:10px 14px;color:var(--soft)}}
</style></head><body><main>
<h1>Screen UI comparison — NebullaOne vs ERPNext, Odoo, Zoho, Oracle, SAP</h1>
<p class="lead">How each NebullaOne screen is laid out compared with the same screen in five platforms, using their published UI guidelines and product documentation. Screenshots are from your HTML (1440 × 860).</p>
<div class="tiles"><div class="tile"><b>{len(PATTERNS)}</b><span>UI patterns compared</span></div><div class="tile"><b>{cnt[Y]}</b><span>NebullaOne has</span></div><div class="tile"><b>{cnt[PART]}</b><span>partly</span></div><div class="tile"><b>{cnt[N]}</b><span>missing</span></div><div class="tile"><b>{len(SCREENS)}</b><span>screens compared</span></div></div>
<h2>Gaps found and closed</h2>
<div class="note">Closed in this round: saved views, status bar on every document, related-document buttons with counts, comments with @mention, paging, group-by, board and calendar layouts, phone layout, always-visible search, paid bill Hold form hidden, PO Status as the 2nd column. <b>Still partly:</b> bulk actions on every list, attachments on every record, PO / bill print.</div>
<h2>UI pattern by pattern</h2>
<div class="tablewrap"><table><thead><tr><th>Pattern</th><th>NebullaOne</th>{''.join(f"<th>{e(x)}</th>" for x in P)}<th>Sources</th></tr></thead><tbody>{rows}</tbody></table></div>
<h2>Screen by screen</h2>{cards}
<h2>Sources</h2><ol>{srcs}</ol>
<p class="lead">Platform descriptions come from the vendors' UI guidelines and documentation listed above. The Odoo views reference is a third-party guide to Odoo's view types; everything else is the vendor's own documentation. Checked October 2026.</p>
</main></body></html>'''
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w').write(page); print('wrote', OUT, round(len(page) / 1e6, 2), 'MB')
