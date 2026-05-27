#!/usr/bin/env python3
"""
P1 – Stat cards: keep only 4 (Critical Entities, Project Duration,
     Delayed Critical, Total Dependent Task). Remove the other 3.
P2 – Remove Type column from CP table header.
P3 – Remove Type badge cell from cp_row data rows.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Replace stat cards array with 4 cards only
# ──────────────────────────────────────────────────────────────────────────────
OLD1 = (
    '[{lbl:"CRITICAL ENTITIES",val:cp_crit.length,sub:cp_crit.length+" zero-float",'
    'cl:"#dc2626",bg:"#fff0f0"},'
    '{lbl:"ZERO FLOAT",val:cp_crit.length,sub:"entities",cl:"#dc2626",bg:"#fff"},'
    '{lbl:"AVG FLOAT",val:(cp_all.filter(it=>cp_gfl(it)<999).length>0?Math.round(cp_totfl/cp_all.filter(it=>cp_gfl(it)<999).length):0)+"d",sub:"avg non-critical",cl:"#374151",bg:"#fff"},'
    '{lbl:"TOTAL FLOAT",val:cp_totfl+"d",sub:"across non-critical",cl:"#374151",bg:"#fff"},'
    '{lbl:"LONGEST CHAIN",val:cp_crit.length,sub:"entities",cl:"#374151",bg:"#fff"},'
    '{lbl:"PROJECT DURATION",val:cp_dur+"d",sub:"via CPM",cl:"#374151",bg:"#fff"},'
    '{lbl:"DELAYED CRITICAL",val:cp_overdue,sub:cp_overdue+" overdue",'
    'cl:cp_overdue>0?"#dc2626":"#16a34a",bg:cp_overdue>0?"#fff0f0":"#fff"}]'
)
NEW1 = (
    '[{lbl:"CRITICAL ENTITIES",val:cp_crit.length,sub:cp_crit.length+" items",'
    'cl:"#dc2626",bg:"#fff0f0"},'
    '{lbl:"PROJECT DURATION",val:cp_dur+"d",sub:"via CPM",cl:"#374151",bg:"#fff"},'
    '{lbl:"DELAYED CRITICAL",val:cp_overdue,sub:cp_overdue+" overdue",'
    'cl:cp_overdue>0?"#dc2626":"#16a34a",bg:cp_overdue>0?"#fff0f0":"#fff"},'
    '{lbl:"TOTAL DEPENDENT TASK",val:cp_all.filter(it=>!!it.endDate).length,'
    'sub:"scheduled items",cl:"#1a56db",bg:"#EFF4FF"}]'
)
if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 stat cards trimmed to 4: OK')
else:
    errors.append('P1'); print('P1 stat cards: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Remove Type column header
# ──────────────────────────────────────────────────────────────────────────────
OLD2 = (',e.jsx("div",{style:{width:44,flexShrink:0,textAlign:"center",'
        'fontSize:9,fontWeight:700,color:"#6b7280",textTransform:"uppercase",'
        'letterSpacing:"0.5px",fontFamily:"Inter,sans-serif",padding:"8px 0"},'
        'children:"Type"})')
if OLD2 in content:
    content = content.replace(OLD2, '', 1)
    print('P2 Type column header removed: OK')
else:
    errors.append('P2'); print('P2 Type header: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P3 – Remove Type badge cell from cp_row data rows
# ──────────────────────────────────────────────────────────────────────────────
OLD3 = (',e.jsx("div",{style:{width:44,flexShrink:0,display:"flex",'
        'justifyContent:"center",alignItems:"center"},'
        'children:e.jsx("span",{style:{fontSize:8,fontWeight:700,color:bdgCl,'
        'background:bdgBg,padding:"2px 4px",borderRadius:3,'
        'fontFamily:"Inter,sans-serif"},children:bdg})})')
if OLD3 in content:
    content = content.replace(OLD3, '', 1)
    print('P3 Type badge cell removed: OK')
else:
    errors.append('P3'); print('P3 Type badge cell: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
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
    sq = content.count('[') - content.count(']')
    print('{ delta:', ob, ' ( delta:', op, ' [ delta:', sq)

    if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
