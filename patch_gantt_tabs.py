#!/usr/bin/env python3
"""
Convert Gantt overlay toggles → individual tabs: Gantt | Baseline | Critical Path
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ── P1: Replace two separate useState hooks with a single _ganttView state ──
OLD1 = ('[_showBl,_setShowBl]=b.useState(!1),'
        '[_showCp,_setShowCp]=b.useState(!1),')
NEW1 = '[_ganttView,_setGanttView]=b.useState("gantt"),'

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 state: OK')
else:
    errors.append('P1'); print('P1 state: FAIL')

# ── P2: Derive _showBl / _showCp from _ganttView just before return ─────────
OLD2 = ('const cpEnd=Z.reduce((mx,_itm)=>{'
        'if(!_itm.endDate)return mx;'
        'const _d=new Date(_itm.endDate);return _d>mx?_d:mx;'
        '},new Date(0));'
        'const gFl=_itm=>_itm.endDate?'
        'Math.round((cpEnd.getTime()-new Date(_itm.endDate).getTime())/864e5):999;')
NEW2 = (OLD2
        + 'const _showBl=_ganttView==="baseline",_showCp=_ganttView==="cp";')

if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2 derive: OK')
else:
    errors.append('P2'); print('P2 derive: FAIL')

# ── P3: Replace toggle buttons in toolbar with tab row ───────────────────────
# Exact string of the divider + two toggle buttons that were injected
OLD3 = (
    'e.jsx("div",{style:{width:1,height:16,background:"#e5e7eb",flexShrink:0}}),'
    'e.jsx("button",{onClick:()=>_setShowBl(!_showBl),'
    'style:{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",'
    'borderRadius:8,border:"1px solid #e5e7eb",'
    'background:_showBl?"#fff1f2":"#fff",'
    'fontSize:11,fontWeight:_showBl?700:500,'
    'fontFamily:"Inter,sans-serif",'
    'color:_showBl?"#e11d48":"#374151",cursor:"pointer",flexShrink:0},'
    'children:["⬛ Baseline"]}),'
    'e.jsx("button",{onClick:()=>_setShowCp(!_showCp),'
    'style:{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",'
    'borderRadius:8,border:"1px solid #e5e7eb",'
    'background:_showCp?"#f5f3ff":"#fff",'
    'fontSize:11,fontWeight:_showCp?700:500,'
    'fontFamily:"Inter,sans-serif",'
    'color:_showCp?"#7c3aed":"#374151",cursor:"pointer",flexShrink:0},'
    'children:["🔴 Critical Path"]})'
)

# Tab styling helper
def tab_btn(view, label, active_bg, active_fg, active_border):
    return (
        'e.jsx("button",{'
        'onClick:()=>_setGanttView("' + view + '"),'
        'style:{padding:"5px 14px",borderRadius:8,'
        'border:"1px solid "+(_ganttView==="' + view + '"?"' + active_border + '":"#e5e7eb"),'
        'background:_ganttView==="' + view + '"?"' + active_bg + '":"#fff",'
        'fontSize:11,fontWeight:_ganttView==="' + view + '"?700:500,'
        'fontFamily:"Inter,sans-serif",'
        'color:_ganttView==="' + view + '"?"' + active_fg + '":"#374151",'
        'cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"},'
        'children:"' + label + '"})'
    )

NEW3 = (
    'e.jsx("div",{style:{width:1,height:16,background:"#e5e7eb",flexShrink:0}}),'
    + tab_btn('gantt',    '📊 Gantt',         '#eff6ff', '#1d4ed8', '#93c5fd') + ','
    + tab_btn('baseline', '📏 Baseline',       '#fff1f2', '#e11d48', '#fda4af') + ','
    + tab_btn('cp',       '🔴 Critical Path',  '#f5f3ff', '#7c3aed', '#c4b5fd')
)

if OLD3 in content:
    content = content.replace(OLD3, NEW3, 1)
    print('P3 tabs: OK')
else:
    errors.append('P3'); print('P3 tabs: FAIL')
    # Diagnostic: see if partial match
    idx = content.find('e.jsx("button",{onClick:()=>_setShowBl')
    print('  partial search for setShowBl:', idx)

# ── Verify & write ────────────────────────────────────────────────────────────
print()
if errors:
    print('FAILED:', errors)
else:
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    with open('/tmp/chk.js', 'w') as f:
        f.write(scripts[0])
    r = subprocess.run(
        ['node', '-e',
         'try{new Function(require("fs").readFileSync("/tmp/chk.js","utf8"));'
         'process.stdout.write("OK");}catch(e){process.stdout.write("ERR:"+e.message);}'],
        capture_output=True, text=True
    )
    print('Node check:', r.stdout)

    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    print(f'{{ delta: {ob},  ( delta: {op}')

    if ob == 0 and op == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
