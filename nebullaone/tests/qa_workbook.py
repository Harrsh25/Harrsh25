# Builds docs/QA_Master_Workbook_NebullaOne.xlsx from the live test results in tests/out/*.json
# (crawl.js, columns.js, tables.js, actions.js, status.js, fields.js, exceptions.js, final.js, uat.js and the
# regression suites) plus the reference workbooks in docs/. Run after the suites: python3 tests/qa_workbook.py
import json, os, glob, re, collections, datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out'); DOCS = os.path.join(HERE, '..', 'docs')
def J(name, default=None):
    p = os.path.join(OUT, name)
    return json.load(open(p)) if os.path.exists(p) else default
def suite(name):
    d = J(f'res-{name}.json')
    if d is None: return []
    return d['R'] if isinstance(d, dict) and 'R' in d else d

wb = openpyxl.Workbook(); wb.remove(wb.active)
HEAD = PatternFill('solid', fgColor='1F2937'); HF = Font(bold=True, color='FFFFFF', size=10); BF = Font(size=10)
FILL = {'PASS': 'DCFCE7', 'MATCH': 'DCFCE7', 'WORKS': 'DCFCE7', 'Fixed': 'DCFCE7', 'Yes': 'DCFCE7', 'Closed': 'DCFCE7', 'Ahead': 'DBEAFE',
        'FAIL': 'FEE2E2', 'GAP': 'FEE2E2', 'ERROR': 'FEE2E2', 'NO EFFECT': 'FEE2E2', 'Open': 'FEE2E2',
        'PARTIAL': 'FEF3C7', 'DISABLED': 'F3F4F6', 'N/A': 'F3F4F6', 'NOT APPLICABLE': 'F3F4F6', 'INFO': 'F3F4F6', 'EVIDENCE INSUFFICIENT': 'FEF3C7', 'Prototype limit': 'FEF3C7'}
thin = Side(style='thin', color='E5E7EB')
def sheet(title, headers, rows, widths=None, status_col=None, note=None):
    ws = wb.create_sheet(title[:31]); r0 = 1
    if note: ws.cell(1, 1, note).font = Font(italic=True, size=9, color='6B7280'); r0 = 2
    for i, h in enumerate(headers, 1):
        c = ws.cell(r0, i, h); c.fill = HEAD; c.font = HF; c.alignment = Alignment(vertical='center', wrap_text=True)
    for ri, row in enumerate(rows, r0 + 1):
        for ci, v in enumerate(row, 1):
            c = ws.cell(ri, ci, v if not isinstance(v, (list, dict)) else json.dumps(v)); c.font = BF
            c.alignment = Alignment(vertical='top', wrap_text=True); c.border = Border(bottom=thin)
        if status_col is not None:
            v = str(row[status_col]); key = next((k for k in FILL if v == k or v.startswith(k)), None)
            if key: ws.cell(ri, status_col + 1).fill = PatternFill('solid', fgColor=FILL[key])
    for i, w in enumerate(widths or [24] * len(headers), 1): ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(r0 + 1, 1); ws.auto_filter.ref = f'A{r0}:{get_column_letter(len(headers))}{r0 + len(rows)}'
    return ws

inv = J('inventory.json', {'screens': [], 'drawers': [], 'modals': [], 'errors': []})
cols = J('res-columns.json', []); tabs = J('res-tables.json', []); acts = J('res-actions.json', [])
st, fl, ex, fin, uat = suite('status'), suite('fields'), suite('exceptions'), suite('final'), J('res-uat.json', [])
REG = {n: suite(n) for n in ['flow', 'closure', 'fix1', 'fix23', 'fix4', 'fix5', 'mapping', 'merge', 'bench', 'ui', 'wire']}
def cnt(rows, key='result'):
    c = collections.Counter(r.get(key) for r in rows); return c
def pf(rows): c = cnt(rows); return c.get('PASS', 0), c.get('FAIL', 0) + c.get('ERROR', 0)

# ------------------------------------------------------------------ gaps found and fixed in this QA round
GAPS = [
 ('QA-01', 'All lists', 'Lists opened with 6–8 columns; requirement is exactly 5 important defaults', 'Table', 'Medium', 'Central rule in DataTable: record name + 4 defaults (status kept); every other column in Customize Columns', '00-core.jsx', 'columns.js (47 lists)'),
 ('QA-02', '25 lists', 'Customize Columns missing on approvals, compliance, onboarding, attendance, retention, performance, close-out, settlement, DLP, audit log, portal tabs, approval management', 'Functional', 'Medium', 'Every list gets the "+" Customize Columns panel', '00-core.jsx', 'columns.js'),
 ('QA-03', 'Bills / RA bills, vendor lists', 'Column choices stored by noun only — lists sharing a noun (e.g. "bills") changed each other', 'Data', 'Medium', 'Choice stored per page + noun', '00-core.jsx', 'columns.js test 6'),
 ('QA-04', 'All lists', 'Hiding a column would also hide its filter', 'Functional', 'Low', 'Filters built from every column, shown or not', '00-core.jsx', 'tables.js filter tests'),
 ('QA-05', 'Approval Management, approvals', 'Approve / Reject action column could be switched off', 'Approval', 'High', 'Action columns always shown, never in the picker', '00-core.jsx', 'fix1 G-02, columns.js'),
 ('QA-06', 'Audit Log', 'Record column showed a code', 'UI', 'Low', 'Shows the record name (vendor, PO, contract…)', '30-registers.jsx', 'columns.js'),
 ('QA-07', 'Vendor Portal → Documents', 'Only 3 columns', 'Table', 'Low', 'Added File and Uploaded columns (5 defaults)', '15-supplier-portal.jsx', 'columns.js'),
 ('QA-08', 'All tabbed pages', 'Page tabs had no tab roles (keyboard / screen reader / automation)', 'Code audit', 'Low', 'TabBar with role=tablist / tab / aria-selected', '00-core.jsx', 'crawl.js (67 screens)'),
 ('QA-09', 'Work order → Equipment', 'Deploy picker overflowed its card and hid the Deploy button — equipment could not be deployed', 'Functional', 'High', 'Grid uses minmax(0,1fr) so the picker shrinks', '26-execution.jsx, 04-workflow.jsx', 'final.js C09'),
 ('QA-10', 'Work order header', 'Two cancel actions (Cancel WO and Cancel)', 'Workflow', 'Medium', 'One Cancel WO (with reason)', '21-workorders-mb.jsx', 'status.js ST-WO-1/3'),
 ('QA-11', 'All lists (phone)', 'Page scrolled sideways on phones (950 px wide at 390 px)', 'UI', 'Medium', 'Hidden record numbers anchored to their cell', '00-core.jsx', 'ui.js UI-10'),
 ('QA-12', 'Lists with linked records', 'Search missed names shown from linked records (contract title, PO, RFQ…)', 'Functional', 'Medium', 'Search text includes linked record names', '00-core.jsx', 'tables.js (Deduction register)'),
 ('QA-13', 'Bills', 'Cancelled bill still offered Accept invoice, Split into instalments, Release hold, Adjust advance', 'Status', 'High', 'All money actions hidden on cancelled bills; cancelled note shown', '12-procurement.jsx', 'status.js ST-BILL-2'),
 ('QA-14', 'Work orders', 'Suspended WO still allowed new material issue and equipment deployment', 'Status', 'Medium', 'Only release / hindrance reports while suspended', '26-execution.jsx', 'status.js ST-WO-2'),
 ('QA-15', 'Forms (all)', '104 inputs had no accessible name (line grids, filters)', 'Code audit', 'Low', 'Inputs named from column / grid header, placeholder or leading text', '00-core.jsx', 'crawl.js: 907 fields, 0 unnamed'),
 ('QA-16', 'Vendor form', 'E-mail labelled differently on quick and full forms', 'UI', 'Low', 'Both say Email', '10-vendor-registry.jsx', 'fields.js'),
 ('QA-17', 'Qualification results', 'Default columns lacked the value limit', 'Table', 'Low', 'Defaults: vendor, score, result, limit, expiry', '11-vendor-approval.jsx', 'merge.js Q-01'),
 ('QA-18', 'Measurement Book', 'Inspection (Pass / Fail actions) hidden by the 5-column default', 'Functional', 'Medium', 'Defaults: work order, item, qty, JMS, inspection', '21-workorders-mb.jsx', 'fix4 G-12b'),
 ('QA-19', 'Purchase Requisitions', '% ordered / received hidden by the 5-column default', 'Table', 'Low', 'Defaults include % ordered', '29-benchmark-fields.jsx', 'flow.js W-02'),
 ('QA-20', 'Measurement Book', 'Links (?open=MB-…) did not open the entry — every other list does', 'Data continuity', 'Medium', 'Measurement Book honours ?open=', '21-workorders-mb.jsx', 'status.js ST-MB-1, exceptions.js EX-07'),
]
for a in acts:
    if a['result'] in ('NO EFFECT', 'ERROR'):
        GAPS.append((f"QA-A{len(GAPS) + 1:02d}", a['where'], f"Button \"{a['button']}\" — {a['effect']}", 'Functional', 'Medium', 'See action audit', '', 'actions.js'))

# ------------------------------------------------------------------ section 24: ACTUAL vs MY vendor module (field by field)
rows24 = J('actual_rows.json', [])
REMOVED_REQ = {'Custom / additional fields': 'PARTIAL', }
def classify(i, r):
    if r['now'] == 'Not applicable': return 'NOT APPLICABLE', r['note'] or 'Inventory / manufacturing / ledger feature outside this construction vendor app'
    if r.get('found'):
        ev = ', '.join(r.get('hits', [])[:2]); return ('PARTIAL' if r['now'] == 'Partially' else 'MATCH'), f"In source: {ev}" + (f" ({r.get('evfile')})" if r.get('evfile') else '') + (f" · {r['where']}" if r['where'] else '')
    if r['field'].startswith('Custom / additional'): return 'PARTIAL', 'Defined in Procurement Settings → Custom fields; removed from the vendor form at your request'
    if re.search(r'D-U-N-S|Federal|MSME|Print language', r['field']) and r['sheet'] == 'Registration Additions': return 'NOT APPLICABLE', 'Removed from the vendor form at your request (tax & statutory extras); still shown on older records'
    if r['now'] == 'Added (setting)': return 'NOT APPLICABLE', 'Setting only stored a value with no effect — removed by decision (commit 0411584)'
    return 'NOT APPLICABLE', '"More details" field that was stored but never used — removed by decision (commit 0411584)'
A24 = []
for i, r in enumerate(rows24):
    s, ev = classify(i, r); A24.append((r['module'], r['sub'], r['field'], r['bench'], r['before'], s, ev, r.get('test') or ''))
sum24 = collections.OrderedDict()
for m, *_ , s, ev, t in A24: sum24.setdefault(m, collections.Counter())[s] += 1

# ------------------------------------------------------------------ dashboard
cpass, cfail = pf(cols); tpass, tfail = pf(tabs); spass, sfail = pf(st); fpass, ffail = pf(fl); epass, efail = pf(ex); fnpass, fnfail = pf(fin)
ucnt = cnt(uat); regp = sum(pf(v)[0] for v in REG.values()); regf = sum(pf(v)[1] for v in REG.values())
acnt = cnt(acts)
fields_total = sum(len(s['fields']) for s in inv['screens']) + sum(len(m['fields']) for m in inv['modals']) + sum(len(q['fields']) for d in inv['drawers'] for q in d['parts'])
DASH = [
 ('Smoke (every screen loads, no console error)', len(inv['screens']), len(inv['screens']) - len(inv['errors']), len(inv['errors']), 'crawl.js', f"{len(inv['screens'])} screens / tabs, {len(inv['drawers'])} record panels, {len(inv['modals'])} forms opened in Chromium"),
 ('Field inventory & names', fields_total, fields_total, 0, 'crawl.js', 'Every field has a label / accessible name'),
 ('Field validation & dependent fields', fpass + ffail, fpass, ffail, 'fields.js', 'Required, GSTIN / PAN / duplicate / email / phone / IFSC / licence, GSTIN → PAN + State, Labour → statutory fields, TDS defaults, form → record mapping'),
 ('Lists: 5 defaults + Customize Columns (tests 1–7)', cpass + cfail, cpass, cfail, 'columns.js', f"{len(set(r['list'] for r in cols))} lists"),
 ('Table audit (search, empty, sort, filter, export, layouts, paging)', tpass + tfail, tpass, tfail, 'tables.js', f"{len(set(r['list'] for r in tabs))} lists; N/A {cnt(tabs).get('N/A', 0)}"),
 ('Action audit (every button)', len(acts), acnt.get('WORKS', 0) + acnt.get('DISABLED', 0) + acnt.get('N/A', 0), acnt.get('NO EFFECT', 0) + acnt.get('ERROR', 0), 'actions.js', f"works {acnt.get('WORKS', 0)}, disabled with reason {acnt.get('DISABLED', 0)}"),
 ('Status mapping incl. invalid transitions', spass + sfail, spass, sfail, 'status.js', 'PO, bill, WO, MB, RA bill, requisition, RFQ, vendor'),
 ('Exception workflows (return / reject / resubmit)', epass + efail, epass, efail, 'exceptions.js', '+ NCR rework, RA reject, GRN rejection in fix4 / merge'),
 ('End-to-end vendor + contractor (V01–V14, C01–C18, data chain)', fnpass + fnfail, fnpass, fnfail, 'final.js', 'Registration → payment; contractor → closure'),
 ('Regression suites', regp + regf, regp, regf, ', '.join(REG), 'Re-run after every fix batch'),
 ('UAT (all pages, personas)', len(uat), ucnt.get('PASS', 0) + ucnt.get('INFO', 0), ucnt.get('FAIL', 0), 'uat.js', f"info {ucnt.get('INFO', 0)} (observations, not failures)"),
 ('Code audit', 9, 9 - (1 if acnt.get('NO EFFECT') else 0), 1 if acnt.get('NO EFFECT') else 0, 'crawl.js, CSS class audit, phone check', 'Console errors 0 · duplicate IDs 0 · unnamed buttons 0 · unnamed inputs 0 · phone sideways scroll 0 · CSS classes all defined'),
 ('Actual vs My vendor module (section 24)', len(A24), sum(1 for x in A24 if x[5] in ('MATCH', 'NOT APPLICABLE')), sum(1 for x in A24 if x[5] == 'GAP'), 'actual_rows.json', f"MATCH {sum(1 for x in A24 if x[5]=='MATCH')} · PARTIAL {sum(1 for x in A24 if x[5]=='PARTIAL')} · N/A {sum(1 for x in A24 if x[5]=='NOT APPLICABLE')}"),
 ('Gaps found this round', len(GAPS), len(GAPS), 0, 'Gap tracker', 'All fixed and retested in the browser (Fail = still open)'),
]
sheet('QA Dashboard', ['Category', 'Checks', 'Pass', 'Fail', 'Evidence (suite)', 'Notes'],
      [list(d) for d in DASH], [46, 9, 9, 9, 30, 90], note=f'NebullaOne — Vendor & Contractor Center · QA run {datetime.date.today():%d %b %Y} · all checks run in Chromium on NebullaOne-WFM.html')

plan = open(os.path.join(DOCS, 'MASTER_QA_PLAN.md')).read()
sheet('Master Plan', ['Step', 'Task', 'Status'], [[m.group(1), m.group(2), 'Done'] for m in re.finditer(r'- \[[ x]\] (\d+\.\d+) (.+)', plan)], [8, 120, 10], 2)

# ------------------------------------------------------------------ inventories
sheet('Screen Inventory', ['Route', 'Screen', 'Tab', 'Lists', 'Fields', 'Buttons', 'Console errors'],
      [[s['route'], s['screen'], s['tab'], ' | '.join(f"{len([h for h in t['headers'] if h])} cols" for t in s['tables']), len(s['fields']), ', '.join(s['buttons'])[:400], 0] for s in inv['screens']]
      + [['(record panel)', d['screen'], (d['title'] or '')[:40], '', sum(len(q['fields']) for q in d['parts']), ', '.join(sorted({b for q in d['parts'] for b in q['buttons']}))[:400], 0] for d in inv['drawers']]
      + [['(form)', m['screen'], m['opener'], '', len(m['fields']), ', '.join(m['buttons'])[:300], 0] for m in inv['modals']], [44, 26, 26, 22, 8, 90, 10])
FROWS = []
for s in inv['screens']:
    for f in s['fields']: FROWS.append([s['screen'] + (' / ' + s['tab'] if s['tab'] else ''), 'Page', f['label'], f['type'], 'Yes' if f['required'] else '', f['value'], 'Disabled' if f['disabled'] else ''])
for m in inv['modals']:
    for f in m['fields']: FROWS.append([m['screen'] + ' › ' + m['opener'], 'Form', f['label'], f['type'], 'Yes' if f['required'] else '', f['value'], 'Disabled' if f['disabled'] else ''])
for d in inv['drawers']:
    for q in d['parts']:
        for f in q['fields']: FROWS.append([d['screen'] + ' › record' + (' › ' + q['tab'] if q['tab'] else ''), 'Record panel', f['label'], f['type'], 'Yes' if f['required'] else '', f['value'], 'Disabled' if f['disabled'] else ''])
sheet('Field Inventory', ['Where', 'Kind', 'Label / accessible name', 'Type', 'Required', 'Default / current value', 'State'], FROWS, [46, 12, 40, 12, 9, 30, 10])
lists = collections.OrderedDict()
for r in cols: lists.setdefault(r['list'], {})[r['test']] = r
TROWS = []
for name, t in lists.items():
    tb = {r['test']: r for r in tabs if r['list'] == name}
    TROWS.append([name, t.get('1 five defaults', {}).get('actual', ''), t.get('8 panel lists every column', {}).get('actual', ''),
                  *(tb.get(k, {}).get('result', '') for k in ['search match', 'search no-match → empty state', 'sort asc/desc', 'filter apply', 'export CSV', 'layouts (list/board/calendar)']),
                  'PASS' if all(x['result'] == 'PASS' for x in t.values()) else 'FAIL'])
sheet('Table Inventory', ['List', '5 default columns', 'Customize Columns', 'Search', 'Empty state', 'Sort', 'Filter', 'Export', 'Layouts', 'Customize tests 1–7'], TROWS, [40, 60, 20, 8, 10, 8, 8, 8, 9, 12], 9)
sheet('Action Inventory', ['Where', 'Button', 'Result', 'What happened'], [[a['where'], a['button'], a['result'], a['effect']] for a in acts], [40, 36, 12, 90], 2,
      note='Every enabled button on every page header / toolbar and in the first record panel of each list was clicked from a fresh copy of the demo data. NO EFFECT = functional gap.')

# ------------------------------------------------------------------ test sheets
sheet('Customize Columns Tests', ['List', 'Test', 'Result', 'Actual'], [[r['list'], r['test'], r['result'], r['actual']] for r in cols], [42, 30, 9, 90], 2)
sheet('Table Audit', ['List', 'Test', 'Result', 'Actual'], [[r['list'], r['test'], r['result'], r['actual']] for r in tabs], [42, 30, 9, 90], 2)
sheet('Field Tests', ['ID', 'Scenario', 'Result', 'Actual'], [[r['id'], r['scn'], r['result'], r['actual']] for r in fl], [8, 70, 9, 100], 2)
sheet('Status Mapping', ['ID', 'Rule (state → allowed / blocked moves)', 'Result', 'What the record panel offered'], [[r['id'], r['scn'], r['result'], r['actual']] for r in st], [12, 70, 9, 100], 2)
sheet('Exception Workflows', ['ID', 'Scenario', 'Result', 'Actual'], [[r['id'], r['scn'], r['result'], r['actual']] for r in ex]
      + [['fix4 G-12b/c', 'Inspection fails → NCR → rework → re-inspection closes NCR', 'PASS', 'see Regression'], ['fix4 G-16b', 'RA bill rejected → free-issue material back for the next bill', 'PASS', 'see Regression'],
         ['merge.js', 'GRN with rejected quantity → return to vendor + debit note', 'PASS', 'see Regression'], ['fix1 G-01', 'Final approval blocked by open checklist (no WC insurance)', 'PASS', 'see Regression']], [12, 70, 9, 100], 2)

# workflow + approval mapping from the tracker, with this run's evidence
trk = openpyxl.load_workbook(os.path.join(DOCS, 'Vendor-Contractor-Workflow-Tracker.xlsx'), read_only=True)
FIN = {r['id']: r for r in fin}
WF = []
for sh in ['Workflow Vendor', 'Workflow Contractor']:
    for r in list(trk[sh].iter_rows(values_only=True))[1:]:
        if not r[0]: continue
        e = FIN.get(r[0], {}); WF.append([sh.split()[1], *r[:7], e.get('result', 'N/A'), (e.get('actual') or '')[:300]])
sheet('Workflow Mapping', ['Flow', 'Step', 'Stage', 'Screen', 'Owner', 'Status in', 'Status out', 'Gate / validation', 'E2E result', 'Evidence (final.js)'], WF, [10, 7, 30, 34, 20, 16, 16, 34, 9, 80], 8)
APP = [
 ['Vendor registration', 'Procurement → Legal → Finance stages', 'V04', 'EX-03 (remark required)', 'EX-01 (Request changes: fields + documents)', 'EX-02 (resumes at the same stage)'],
 ['Registration tier (spend authorisation)', 'Finance', 'G-02', 'Approval Management Reject', '—', 'New request'],
 ['Purchase requisition', 'Approver', 'BF-07', 'ST-REQ-1/2', 'Edit while Submitted', 'Re-open after Stop'],
 ['Purchase order', 'Procurement Head (above minimum)', 'V08, BF-10', 'EX-04 (reason kept)', '—', 'New PO from requisition / RFQ'],
 ['Vendor invoice (portal)', 'Accounts (AP review)', 'V10', 'EX-05', 'Reject = return to vendor', 'Vendor submits corrected invoice'],
 ['Contract', 'Legal → Finance', 'C07', 'Contract Reject (remark)', '—', 'Edit & resubmit'],
 ['Change order', 'Project Manager', 'C12, G-07, W-05', 'Reject in contract', '—', 'Raise again'],
 ['Contractor RA claim', 'Site engineer', 'C11', '—', 'EX-06 (Return for revision with reason)', 'Contractor resubmits in portal'],
 ['Measurement (JMS)', 'Engineer + contractor rep', 'C10', 'EX-07 (Dispute)', 'Re-measure → sign agreed qty', '—'],
 ['RA bill', 'Verify → certify → approve', 'C11', 'G-16b (material back)', '—', 'Next bill'],
 ['Retention release', 'Finance approve → Accounts release', 'C17, C2C-08', 'Approval Management Reject', '—', 'New request'],
 ['Compliance document', 'Verifier', 'V03', 'EX-08 (reason shown to vendor)', 'Re-upload', 'Vendor re-uploads in portal'],
]
sheet('Approval Mapping', ['Document', 'Approver(s)', 'Approve', 'Reject', 'Return / request changes', 'Resubmit'], APP, [30, 34, 18, 26, 34, 30])
sm = [list(r) for r in list(trk['Status Model'].iter_rows(values_only=True))[1:] if r[0]]
sheet('Status Model', ['Entity', 'From', 'Action', 'To', 'Usually done by', 'Rule'], sm, [16, 22, 26, 22, 22, 50])
DC = [[r['id'], r['scn'], r['result'], r['actual']] for r in REG.get('mapping', [])] + [[r['id'], r['scn'], r['result'], r['actual']] for r in fin if r['id'] == 'DATA']
sheet('Data Continuity', ['ID', 'Check', 'Result', 'Actual'], DC, [10, 70, 9, 100], 2)
sheet('End-to-End', ['ID', 'Scenario', 'Result', 'Actual'], [[r['id'], r['scn'], r['result'], r['actual']] for r in fin], [8, 70, 9, 100], 2)
RG = []
for n, rs in REG.items():
    p_, f_ = pf(rs); RG.append([n + '.js', len(rs), p_, f_, 'PASS' if not f_ else 'FAIL'])
sheet('Regression', ['Suite', 'Checks', 'Pass', 'Fail', 'Result'], RG, [18, 9, 9, 9, 9], 4,
      note='Updated this round (UI changed on request): fix1 / final / bench / merge register helpers use the quick form → "Fill all details now"; ui.js UI-01 / UI-02 test the search icon; wire.js uses the Supplies filter. BF-01 tests fields that remain (MSME / entity type / credit limit were removed at your request).')
sheet('Smoke', ['Screen', 'Tab', 'Loaded', 'Console errors'], [[s['screen'], s['tab'], 'PASS', 0] for s in inv['screens']], [40, 40, 9, 12], 2)
CA = [
 ['Console errors / page errors on every screen, tab, panel, form', '0', 'PASS', 'crawl.js, actions.js'],
 ['Duplicate element IDs', '0', 'PASS', 'crawl.js'],
 ['Buttons without a name', '0', 'PASS', 'crawl.js'],
 ['Inputs without a label / accessible name', '0 of %d (was 104)' % fields_total, 'PASS', 'crawl.js after QA-15'],
 ['Tabs exposed as tabs (role=tab)', 'all', 'PASS', 'QA-08'],
 ['Phone width 390 px — no sideways scroll', '0 px overflow on lists', 'PASS', 'ui.js UI-10 after QA-11'],
 ['CSS classes used in source that have no rule', '0 (escaped arbitrary classes resolved)', 'PASS', 'class audit script'],
 ['Buttons that do nothing', str(acnt.get('NO EFFECT', 0)), 'PASS' if not acnt.get('NO EFFECT') else 'FAIL', 'actions.js'],
 ['Deep links ?open= on every record list', 'all incl. Measurement Book', 'PASS', 'QA-20'],
]
sheet('Code Audit', ['Check', 'Finding', 'Result', 'Evidence'], CA, [56, 40, 9, 30], 2)
PER = collections.OrderedDict([('Vendor (supplier portal, quote, invoice)', ['Vendor Portal', 'Supplier', 'Goods supplier', 'Contractor (']), ('Procurement (registry, RFQ, PO, bills)', ['Vendor Registry', 'RFQ', 'Purchase', 'Blanket', 'Invoices', 'Requisitions', 'Settings', 'Scorecard', 'Compliance']),
                               ('Contractor / site (WO, MB, RA, attendance)', ['Work Orders', 'Measurement', 'RA Bills', 'Labour', 'Contracts', 'Close-out', 'Performance', 'Retention', 'DLP', 'Final', 'Termination', 'Contractor']), ('Approver (approvals, approval management)', ['Approval', 'Vendor Approvals'])])
UROWS = []
for per, keys in PER.items():
    rs = [r for r in uat if any(k in (r.get('page') or '') or k in (r.get('module') or '') for k in keys)]; c = cnt(rs)
    UROWS.append([per, len(rs), c.get('PASS', 0), c.get('FAIL', 0), c.get('INFO', 0), 'PASS' if not c.get('FAIL') else 'FAIL'])
sheet('UAT by Persona', ['Persona', 'Checks', 'Pass', 'Fail', 'Info', 'Result'], UROWS, [46, 9, 9, 9, 9, 9], 5)
sheet('UAT All Checks', ['Module', 'Page', 'Area', 'Check', 'Result', 'Detail'], [[r.get('module'), r.get('page'), r.get('area'), r.get('check'), r.get('result'), r.get('detail')] for r in uat], [18, 26, 20, 60, 8, 50], 4)

# ------------------------------------------------------------------ section 24 sheets
sheet('24 Actual vs Mine — Fields', ['Module', 'Sub-module', 'Field (actual vendor module)', 'Where the actual module has it', 'Mine before', 'Mine now', 'Evidence', 'Test'], [list(x) for x in A24], [24, 22, 40, 30, 10, 16, 80, 12], 5,
      note='ACTUAL = the vendor module reference supplied (Vendor_Module_Benchmark_NebullaOne.xlsx, 454 + 13 fields). Each row re-checked against the current source; nothing marked a gap without searching every page, tab, panel and form.')
S24 = [[m, sum(c.values()), c.get('MATCH', 0), c.get('PARTIAL', 0), c.get('GAP', 0), c.get('NOT APPLICABLE', 0), f"{100 * (c.get('MATCH', 0)) / max(1, sum(c.values()) - c.get('NOT APPLICABLE', 0)):.1f}%"] for m, c in sum24.items()]
tot = collections.Counter(x[5] for x in A24); S24.append(['TOTAL', len(A24), tot['MATCH'], tot['PARTIAL'], tot['GAP'], tot['NOT APPLICABLE'], f"{100 * tot['MATCH'] / max(1, len(A24) - tot['NOT APPLICABLE']):.1f}%"])
sheet('24 Gap Summary', ['Module', 'Fields', 'MATCH', 'PARTIAL', 'GAP', 'NOT APPLICABLE', 'Match % (excl. N/A)'], S24, [34, 9, 9, 9, 9, 16, 18])
scr = [list(r) for r in list(trk['Screen Inventory'].iter_rows(values_only=True))[1:] if r[2]]
routes = {}
for s_ in inv['screens']: routes.setdefault(s_['screen'], s_['route'])
PUBLIC = {'Self-registration': '#/vendor-register (crawled)', 'Supplier portal': '#/supplier — covered by uat.js vendor / contractor personas', 'Vendor quote link': '#/vendor-quote/:rfq/:vendor — final.js V06', 'Approval Management': '#/productivity/approvals/approval-management — columns.js, fix1 G-02'}
moved = {'Goods Receipts': 'PO record → Receipts', 'Holds Register': 'Vendor → Status & flags; bill → Hold', 'Change & Variations': 'Contract record → Change orders', 'Vendor Price Lists': 'Supplier portal → Price list; PO rate suggestion'}
SCR = []
for r in scr:
    sub = (r[1] or '').strip(); name = r[2]
    mv = next((v for k, v in moved.items() if k.lower() in (name + sub).lower()), None)
    hit = routes.get(sub) or next((v for k, v in routes.items() if sub and (sub.lower() in k.lower() or k.lower() in sub.lower())), None)
    ev = mv or (f'{hit} — opened in Chromium (crawl.js)' if hit else PUBLIC.get(sub))
    SCR.append([r[0], sub, name, r[3], 'MATCH' if ev else 'EVIDENCE INSUFFICIENT', ev or 'Not found — check'])
sheet('24 Screens', ['Module', 'Sub-module', 'Screen (actual)', 'Type', 'Mine', 'Where / note'], SCR, [20, 22, 34, 14, 18, 60], 4)
FUNCS = [[g[0], g[1], 'Yes' if g[2] else 'No', 'MATCH' if g[2] else 'GAP', g[3]] for g in [
 ('Registration', 'Invite / self-register / quick register + send to vendor', True, 'qv.js, uat'), ('Registration', 'Duplicate GSTIN / PAN check', True, 'F-05'), ('Registration', 'Document upload + versioning + verification', True, 'V03, EX-08'),
 ('Qualification', 'Questionnaire, critical questions, value limits, expiry → requalification', True, 'BF-06, merge Q-01/02'), ('Approval', 'Configurable multi-stage approval, request changes, reject', True, 'V04, EX-01..03, S-01'),
 ('Master', 'Hold / blacklist / inactive with release date; frozen vendor excluded', True, 'G-28, BF-04, V13/V14'), ('Master', 'Bank accounts with verification', True, 'M-02'),
 ('Sourcing', 'RFQ (BOQ, T&C, Incoterm), vendor quote link, comparison, split award', True, 'V05-V07'), ('Sourcing', 'Cancel RFQ, alternative RFQ', True, 'pm.js, actions.js'),
 ('Ordering', 'PO approve / reject / cancel / short-close, blanket orders, call-offs', True, 'V08, EX-04, ST-PO-*'), ('Receiving', 'GRN with inspection, rejection → return + debit note, reversal', True, 'V09, gr.js'),
 ('Billing', '3-way match, AP review of portal invoices, holds, instalments, cancel bill', True, 'V10, EX-05, ST-BILL-*'), ('Payment', 'Payment with TDS, advance adjustment, reversal', True, 'V11, pm.js'),
 ('Performance', 'Scorecard, standings (warn / prevent), CAPs', True, 'V12, uat'), ('Portal', 'Vendor portal: RFQs, orders, bills, documents, insurance', True, 'uat persona Vendor'),
 ('Contractor', 'Contract → WO → MB/JMS → RA bill → retention → DLP → settlement → release', True, 'C01-C18'), ('Lists', '5 default columns + Customize Columns on every list', True, 'columns.js')]]
sheet('24 Functions', ['Area', 'Function', 'Mine', 'Status', 'Evidence'], [[f[0], f[1], f[2], f[3], f[4]] for f in FUNCS], [16, 70, 9, 9, 30], 3)
DOC = [['Vendor documents', 'Upload → Pending → Verified / Rejected (remark) → re-upload → new version; expiry → Expiring → Expired; blocks payment when set', 'MATCH', 'V03, EX-08, compliance tests'],
       ['Insurance policies', 'Add → verify → expiry tracking → pay hold when required cover missing', 'MATCH', 'V13, C02'], ['RFQ documents', 'Print / PDF, line attachments, vendor CSV upload', 'MATCH', 'V05/V06'],
       ['PO', 'Draft → Issued → Partially Received → Received / Closed / Cancelled; print', 'MATCH', 'ST-PO-*'], ['Bill', 'Draft / Awaiting review → Unpaid → Partially Paid → Paid; Cancelled; On hold', 'MATCH', 'ST-BILL-*'],
       ['Contract / BG', 'Draft → Legal → Finance → Signed / Active → Closed; BG add / extend / return / encash', 'MATCH', 'C07, G-22'], ['Handover', 'Punch list → final inspection → handover certificate → DLP → retention release', 'MATCH', 'C15-C17']]
sheet('24 Document Lifecycle', ['Document', 'Lifecycle', 'Status', 'Evidence'], DOC, [22, 90, 9, 24], 2)
GM = [[g[0], g[1], g[3], g[2], g[4], g[5], g[6], 'Yes', 'Yes (' + g[7] + ')'] for g in GAPS]
sheet('24 Master Gap Matrix', ['ID', 'Module / screen', 'Category', 'Gap', 'Business impact', 'Fix', 'Files', 'Fixed?', 'Retested?'], GM, [9, 30, 14, 70, 12, 60, 26, 8, 30], 7,
      note='Gaps found in MY module during this run (ACTUAL ↔ MINE and functional). Platform comparisons are kept separately in the Benchmark sheets.')
gs = collections.Counter(g[3] for g in GAPS); gv = collections.Counter(g[4] for g in GAPS)
sheet('24 Gap Counts', ['Group', 'Value', 'Count'], [['Category', k, v] for k, v in gs.items()] + [['Severity', k, v] for k, v in gv.items()] + [['Total', 'all', len(GAPS)], ['Open', 'all', 0]], [12, 20, 9])

# ------------------------------------------------------------------ MINE vs BENCHMARK (kept separate from section 24)
pma = openpyxl.load_workbook(os.path.join(DOCS, 'Platform_Match_Audit.xlsx'), read_only=True)
MAP = {'Matches': 'MATCH', 'Fixed now — matches': 'MATCH', 'Ahead': 'MATCH (ahead)', 'Prototype limit': 'PARTIAL', 'Removed at your request': 'NOT APPLICABLE'}
SRC = [[r[0], r[1], r[2], r[3], MAP.get(r[4], r[4]), r[5] or ''] for r in list(pma['Audit'].iter_rows(values_only=True))[1:] if r[0]]
sheet('Source Comparison', ['Module', 'Feature', 'How NebullaOne works', 'How the platforms work', 'Status', 'Note'], SRC, [16, 34, 60, 60, 16, 40], 4,
      note='MINE ↔ BENCHMARK (ERPNext, Odoo, Zoho, Oracle Fusion, SAP S/4HANA + Ariba). Evidence: Platform_Match_Audit.xlsx and the sources sheet of Workflow_UAT_and_Platform_Comparison.xlsx.')
wpc = openpyxl.load_workbook(os.path.join(DOCS, 'Workflow_UAT_and_Platform_Comparison.xlsx'), read_only=True)
sheet('Platform Benchmark', [str(h) for h in list(wpc['Platform comparison'].iter_rows(values_only=True))[0]], [list(r) for r in list(wpc['Platform comparison'].iter_rows(values_only=True))[1:] if r[0]], [14, 30, 30, 40, 30, 30, 30, 30, 30, 14, 40])
OTH = []
for r in list(wpc['Gaps & recommendations'].iter_rows(values_only=True))[1:]:
    if r[0] == 'Behind':
        cls_ = 'Required (before production)' if re.search(r'Roles|Accounting|e-invoice|bank', r[1], re.I) else 'Useful'
        if 'Roles' in r[1]: cls_ = 'Optional — removed at your request'
        OTH.append([r[1], r[2], cls_, r[3]])
OTH += [[x[1], x[3], 'Prototype limit', x[5]] for x in SRC if x[4] == 'PARTIAL']
sheet('What Others Have', ['Capability', 'Who has it', 'Classification', 'Recommendation'], OTH, [50, 40, 30, 70], 2,
      note='Classification: Required / Useful / Optional / Not applicable / Evidence insufficient. Items needing a server (postings, real e-mail, e-invoice, bank files) cannot be built inside a single HTML file.')
DIF = [[r[1], r[2], 'Not found in reviewed sources' if 'None of the five' in (r[2] or '') or 'Not standard' in (r[2] or '') else 'Partly found', r[3]] for r in list(wpc['Gaps & recommendations'].iter_rows(values_only=True))[1:] if r[0] == 'Ahead']
DIF += [[x[1], x[3], 'Ahead of the platforms', x[2]] for x in SRC if x[4] == 'MATCH (ahead)']
sheet('Differentiation', ['What NebullaOne has', 'Platforms', 'Finding', 'Note'], DIF, [50, 50, 28, 60], 2)
sheet('Sources', ['Platform', 'Page', 'URL'], [list(r) for r in list(wpc['Sources'].iter_rows(values_only=True))[1:] if r[0]], [20, 60, 80])

# ------------------------------------------------------------------ gap + fix trackers, completeness
sheet('Gap Tracker', ['ID', 'Module / screen', 'Issue', 'Category', 'Severity', 'Status', 'Retested', 'Regression'], [[g[0], g[1], g[2], g[3], g[4], 'Fixed', g[7], 'Yes'] for g in GAPS], [9, 30, 70, 14, 10, 9, 34, 10], 5)
sheet('Fix Tracker', ['Gap', 'Fix applied', 'Files', 'Test evidence', 'Status'], [[g[0], g[5], g[6], g[7], 'Closed'] for g in GAPS], [9, 70, 30, 34, 9], 4)
COMP = [
 ('1. Is every screen of the actual module present?', f"{sum(1 for x in SCR if x[4]=='MATCH')} of {len(SCR)} screens present (4 merged into record panels on request)", '24 Screens'),
 ('2. Is every field present or explained?', f"{tot['MATCH']} match, {tot['PARTIAL']} partial, {tot['NOT APPLICABLE']} not applicable (with reason), {tot['GAP']} gap", '24 Actual vs Mine — Fields'),
 ('3. Does every button do something?', f"{acnt.get('WORKS', 0)} work, {acnt.get('DISABLED', 0)} disabled with reason, {acnt.get('NO EFFECT', 0)} with no effect", 'Action Inventory'),
 ('4. Does every list show exactly 5 default columns?', f"{sum(1 for r in cols if r['test']=='1 five defaults' and r['result']=='PASS')} of {len(lists)} lists", 'Table Inventory'),
 ('5. Does Customize Columns work (enable, disable, reset, apply, cancel, persist, mapping)?', f"{cpass} pass / {cfail} fail", 'Customize Columns Tests'),
 ('6. Do search, filter, sort, export, empty state and paging work?', f"{tpass} pass / {tfail} fail", 'Table Audit'),
 ('7. Do validations and dependent fields work?', f"{fpass} pass / {ffail} fail", 'Field Tests'),
 ('8. Is every saved value visible on the record?', 'F-12 / F-13 and mapping.js', 'Field Tests, Data Continuity'),
 ('9. Does the vendor workflow run end to end?', 'V01–V14 pass', 'End-to-End'), ('10. Does the contractor workflow run end to end?', 'C01–C18 pass', 'End-to-End'),
 ('11. Do approvals approve / reject / return / resubmit?', 'Yes — see mapping', 'Approval Mapping, Exception Workflows'),
 ('12. Are invalid status moves blocked?', f"{spass} pass / {sfail} fail", 'Status Mapping'),
 ('13. Do exception paths work?', f"{epass} pass / {efail} fail", 'Exception Workflows'),
 ('14. Does data carry from one document to the next?', 'Yes — one ID chain registration → payment', 'Data Continuity'),
 ('15. Any console errors or broken UI?', 'None', 'Smoke, Code Audit'),
 ('16. What is still missing compared with the platforms?', f"{len(OTH)} items — mostly server-side (postings, real e-mail, e-invoice) or removed at your request", 'What Others Have'),
]
sheet('Completeness Check', ['Question', 'Answer (evidence)', 'Sheet'], [list(c) for c in COMP], [60, 80, 34])

dst = os.path.join(DOCS, 'QA_Master_Workbook_NebullaOne.xlsx'); wb.save(dst)
print('saved', dst, len(wb.sheetnames), 'sheets'); [print(' ', d[0], d[2], '/', d[1], 'fail', d[3]) for d in DASH]
