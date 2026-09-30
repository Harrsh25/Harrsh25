import sys, json, copy, collections
sys.path.insert(0, '.')
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from data import SRC, VM, RA, NB

IN = '/root/.claude/uploads/e11915f8-4458-5fee-ad0b-7b8c350da851/3127b381-Vendor_Module_Benchmark_3.xlsx'
OUT = '/home/user/Harrsh25/Vendor_Module_Benchmark_3_Reviewed.xlsx'
wb = openpyxl.load_workbook(IN)

HDR = PatternFill('solid', fgColor='1F3864'); HF = Font(bold=True, color='FFFFFF')
FILL = {'ok': PatternFill('solid', fgColor='E2EFDA'), 'warn': PatternFill('solid', fgColor='FFF2CC'),
        'bad': PatternFill('solid', fgColor='F8CBAD'), 'info': PatternFill('solid', fgColor='DDEBF7')}
WR = Alignment(wrap_text=True, vertical='top'); thin = Side(style='thin', color='BFBFBF')
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)

def hdr(ws, col, text, width):
    c = ws.cell(1, col, text); c.fill = HDR; c.font = HF; c.alignment = Alignment(wrap_text=True, vertical='center'); c.border = BOX
    ws.column_dimensions[get_column_letter(col)].width = width

def put(ws, r, c, v, tone=None):
    x = ws.cell(r, c, v); x.alignment = WR; x.border = BOX
    if tone: x.fill = FILL[tone]
    return x

def src_label(k):
    t, u = SRC[k]
    return f'{t}' + (f' <{u}>' if u else '')

def review_benchmark(d, plats):
    """returns (verdict, tone, per-platform text, evidence text)"""
    per, ev, issues, weak, prior = [], [], [], [], []
    for p in plats:
        if p in d.get('BAD', {}):
            per.append(f'{p}: NOT SUPPORTED'); issues.append(f'{p} – {d["BAD"][p]}'); continue
        if p == 'ERPNext' and d.get('E'):
            per.append('ERPNext: verified in source'); ev.append('ERPNext v16 doctype: ' + ', '.join(d['E'].split(',')))
        elif p == 'Odoo' and d.get('O'):
            per.append('Odoo: verified in source'); ev.append('Odoo 18 model field: ' + ', '.join(d['O'].split(',')))
        elif p in d.get('P', {}):
            k = d['P'][p]
            if k == 'PRIOR':
                per.append(f'{p}: not re-verified'); prior.append(p)
            else:
                per.append(f'{p}: verified in vendor docs'); ev.append(f'{p}: ' + src_label(k))
        else:
            per.append(f'{p}: NO EVIDENCE MAPPED'); issues.append(f'{p} – no evidence mapped')
        if p in d.get('W', {}):
            weak.append(f'{p} – {d["W"][p]}')
    if issues:
        return 'Incorrect', 'bad', per, ev, issues + weak
    if weak:
        return 'Correct, but weak match', 'warn', per, ev, weak
    if prior and len(prior) == len(plats):
        return 'Not re-verified (search-excerpt evidence)', 'info', per, ev, []
    if prior:
        return 'Correct (partly re-verified)', 'ok', per, ev, []
    return 'Correct', 'ok', per, ev, []

corrections = []   # (sheet,row,module,sub,field,what,old,new,reason)
cov = collections.OrderedDict()   # module -> Counter for original & current

def do_bench_sheet(name, D):
    ws = wb[name]
    base = ws.max_column
    cols = [('Benchmark check', 22), ('Per-platform verification', 36), ('Benchmark evidence (field / source)', 60),
            ('Also offered by (missing from BENCHMARK)', 30), ('Benchmark issue / note', 40),
            ('NebullaOne check (original HTML)', 18), ('NebullaOne – verified value (original HTML)', 16),
            ('NebullaOne – current build (after gap work)', 16), ('NebullaOne evidence / remark', 60)]
    for i, (t, w) in enumerate(cols, 1): hdr(ws, base + i, t, w)
    mod = sub = ''
    for r in range(2, ws.max_row + 1):
        m, s, f, bm, neb = [ws.cell(r, c).value for c in range(1, 6)]
        mod = m or mod; sub = s or sub
        if not f: continue
        d = D.get(r)
        if d is None:
            raise SystemExit(f'{name} row {r} missing review data: {f}')
        plats = [p.strip() for p in (bm or '').split(',') if p.strip()]
        verdict, tone, per, ev, notes = review_benchmark(d, plats)
        put(ws, r, base + 1, verdict, tone)
        put(ws, r, base + 2, '\n'.join(per))
        put(ws, r, base + 3, '\n'.join(ev))
        put(ws, r, base + 4, d.get('X', ''), 'warn' if d.get('X') else None)
        put(ws, r, base + 5, '\n'.join(notes))
        newv = d.get('N', neb); cur = d.get('C', newv)
        okn = newv == neb
        put(ws, r, base + 6, 'Correct' if okn else 'Incorrect', 'ok' if okn else 'bad')
        put(ws, r, base + 7, newv, None if okn else 'bad')
        put(ws, r, base + 8, cur, 'info' if cur != newv else None)
        put(ws, r, base + 9, d.get('R', ''))
        if verdict == 'Incorrect':
            corrections.append((name, r, mod, sub, f, 'Benchmark platform', bm, bm, '; '.join(notes)))
        elif d.get('W'):
            corrections.append((name, r, mod, sub, f, 'Benchmark (weak match)', bm, bm, '; '.join(notes)))
        if d.get('X'):
            corrections.append((name, r, mod, sub, f, 'Benchmark (missing platform)', bm, bm + ' + ' + d['X'], 'Also offered by: ' + d['X']))
        if not okn:
            corrections.append((name, r, mod, sub, f, 'NebullaOne value', neb, newv, d.get('R', '')))
        if name != 'Vendor Module': continue
        c = cov.setdefault(mod, {'orig_sheet': collections.Counter(), 'orig': collections.Counter(), 'cur': collections.Counter()})
        c['orig_sheet'][neb] += 1; c['orig'][newv] += 1; c['cur'][cur] += 1
    ws.freeze_panes = 'D2'

do_bench_sheet('Vendor Module', VM)
do_bench_sheet('Registration Additions', RA)

# ---- NebullaOne sheet
ws = wb['NebullaOne']; base = ws.max_column
for i, (t, w) in enumerate([('Coverage check', 16), ('Verified COVERAGE', 16), ('Verified BENCHMARK (also in)', 36),
                            ('Evidence', 60), ('Reason / note', 60)], 1): hdr(ws, base + i, t, w)
expand = {}
for r0, d in NB.items():
    if 'rng' in d:
        for r in range(d['rng'][0], d['rng'][1] + 1): expand[r] = d
    else: expand[r0] = d
mod = sub = ''
nb_cov = collections.OrderedDict()
for r in range(2, ws.max_row + 1):
    m, s, f, covv, bm = [ws.cell(r, c).value for c in range(1, 6)]
    mod = m or mod; sub = s or sub
    if not f: continue
    d = expand.get(r, {})
    fix = d.get('fix')
    ok = not fix or fix == covv
    put(ws, r, base + 1, 'Correct' if ok else 'Incorrect', 'ok' if ok else 'bad')
    put(ws, r, base + 2, fix or covv, None if ok else 'bad')
    put(ws, r, base + 3, d.get('bm', bm) if fix else bm)
    evs = [src_label(k) for k in d.get('ev', '').split(';') if k]
    put(ws, r, base + 4, '\n'.join(evs))
    put(ws, r, base + 5, d.get('why', d.get('note', '')))
    if not ok:
        corrections.append(('NebullaOne', r, mod, sub, f, 'COVERAGE', f'{covv} | {bm}', f'{fix} | {d.get("bm", bm)}', d.get('why', '')))
    c = nb_cov.setdefault(mod, [collections.Counter(), collections.Counter()])
    c[0][covv] += 1; c[1][fix or covv] += 1
ws.freeze_panes = 'D2'

# ---- Corrections sheet
wc = wb.create_sheet('Review – Corrections', 0)
H = ['#', 'Sheet', 'Row', 'Module', 'Sub module', 'Entry field', 'What is wrong', 'As written', 'Should be', 'Reason / evidence']
W = [5, 18, 6, 26, 26, 38, 22, 30, 30, 80]
for i, (h, w) in enumerate(zip(H, W), 1): hdr(wc, i, h, w)
for i, row in enumerate(corrections, 1):
    vals = [i, *row]
    for j, v in enumerate(vals, 1):
        tone = 'bad' if j == 7 and row[5] in ('NebullaOne value', 'COVERAGE', 'Benchmark platform') else ('warn' if j == 7 else None)
        put(wc, i + 1, j, v, tone)
wc.freeze_panes = 'A2'; wc.auto_filter.ref = f'A1:J{len(corrections)+1}'

# ---- Corrected coverage sheet
wv = wb.create_sheet('Review – Coverage', 1)
H = ['Module', 'Benchmark fields', 'As in workbook: Yes', 'Partially', 'No', 'Coverage % (Y+P)',
     'Verified (original HTML): Yes', 'Partially', 'No', 'Coverage % (Y+P)', 'Current build: Yes', 'Partially', 'No', 'Coverage % (Y+P)']
for i, h in enumerate(H, 1): hdr(wv, i, h, 16 if i > 1 else 34)
def pct(c):
    n = sum(c.values()); return round(100 * (c['Yes'] + c['Partially']) / n, 1) if n else '—'
tot = [collections.Counter() for _ in range(3)]
r = 2
for m, c in cov.items():
    n = sum(c['orig'].values())
    row = [m, n]
    for k, t in zip(('orig_sheet', 'orig', 'cur'), tot):
        row += [c[k]['Yes'], c[k]['Partially'], c[k]['No'], pct(c[k])]; t.update(c[k])
    for j, v in enumerate(row, 1): put(wv, r, j, v)
    r += 1
row = ['TOTAL', sum(tot[0].values())]
for t in tot: row += [t['Yes'], t['Partially'], t['No'], pct(t)]
for j, v in enumerate(row, 1): x = put(wv, r, j, v); x.font = Font(bold=True)
r += 2
put(wv, r, 1, 'Sheet "NebullaOne": coverage classes before → after review').font = Font(bold=True); r += 1
for i, h in enumerate(['Module', 'Yes', 'Partially', 'NebullaOne only', 'Yes (verified)', 'Partially (verified)', 'NebullaOne only (verified)'], 1):
    hdr(wv, i, h, None) if False else put(wv, r, i, h, 'info')
r += 1
T0, T1 = collections.Counter(), collections.Counter()
for m, (a, b) in nb_cov.items():
    for j, v in enumerate([m, a['Yes'], a['Partially'], a['NebullaOne only'], b['Yes'], b['Partially'], b['NebullaOne only']], 1): put(wv, r, j, v)
    T0.update(a); T1.update(b); r += 1
for j, v in enumerate(['TOTAL', T0['Yes'], T0['Partially'], T0['NebullaOne only'], T1['Yes'], T1['Partially'], T1['NebullaOne only']], 1):
    put(wv, r, j, v).font = Font(bold=True)
r += 2
notes = ['Coverage counts only sheet "Vendor Module" (454 benchmark rows) – exactly the basis of your "Coverage Summary", so the "As in workbook" columns reproduce it.',
         '"Verified (original HTML)" = your uploaded NebullaOne HTML, checked against its code and a full UI crawl.',
         '"Current build" = the patched prototype on branch claude/brave-cannon-t711iz (country, PIN, website, bank holder/type/verification, due date on bill, quote FX …).']
for n in notes: put(wv, r, 1, n); wv.merge_cells(start_row=r, start_column=1, end_row=r, end_column=10); r += 1

# ---- Sources sheet
wsrc = wb.create_sheet('Review – Sources')
for i, (h, w) in enumerate([('Key', 12), ('What it confirms', 90), ('URL', 90)], 1): hdr(wsrc, i, h, w)
put(wsrc, 2, 1, 'ERPNext'); put(wsrc, 2, 2, 'Field exists in the shipped ERPNext v16 / Frappe doctype JSON (e.g. buying/doctype/supplier/supplier.json)'); put(wsrc, 2, 3, 'https://github.com/frappe/erpnext/tree/version-16/erpnext')
put(wsrc, 3, 1, 'Odoo'); put(wsrc, 3, 2, 'Field exists in the shipped Odoo 18 model / view source (purchase, purchase_stock, purchase_requisition, account, stock, base)'); put(wsrc, 3, 3, 'https://github.com/odoo/odoo/tree/18.0/addons')
put(wsrc, 4, 1, 'NebullaOne'); put(wsrc, 4, 2, 'Your uploaded HTML: bundle code (beautified) + automated crawl of all 21 screens, dialogs and tabs'); put(wsrc, 4, 3, '')
for i, (k, (t, u)) in enumerate(SRC.items(), 5):
    put(wsrc, i, 1, k); put(wsrc, i, 2, t); put(wsrc, i, 3, u)

wb.save(OUT)
print('saved', OUT, 'corrections', len(corrections))
for m, c in cov.items(): print(f"{m[:30]:30} sheet Y{c['orig_sheet']['Yes']:>3} P{c['orig_sheet']['Partially']:>3} N{c['orig_sheet']['No']:>3} | verified Y{c['orig']['Yes']:>3} P{c['orig']['Partially']:>3} N{c['orig']['No']:>3} | current Y{c['cur']['Yes']:>3} P{c['cur']['Partially']:>3} N{c['cur']['No']:>3}")
import collections as C
print('corr types', C.Counter(x[5] for x in corrections))
