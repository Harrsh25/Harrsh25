#!/usr/bin/env python3
"""
1. Baseline: Remove "+ Create Baseline" CTA from empty state (keep only header button)
2. Critical Path: Remove "Run Analysis" from toolbar left + empty state;
   add "Run Analysis" to toolbar top-right corner
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# P1 – Remove "+ Create Baseline" CTA button from baseline empty state
# ══════════════════════════════════════════════════════════════════════════════
OLD1 = ('compare and future better."}),e.jsx("button",{onClick:()=>Ft("create"),'
        'style:{marginTop:4,padding:"10px 28px",borderRadius:10,'
        'border:"none",background:"#1a56db",'
        'fontSize:13,fontWeight:600,color:"#fff",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:"+ Create Baseline"})')
NEW1 = 'compare and future better."})'

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 baseline empty-state CTA removed: OK')
else:
    errors.append('P1'); print('P1 baseline empty-state CTA: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# P2 – Remove "Run Critical Path Analysis" button from CP toolbar LEFT side
# ══════════════════════════════════════════════════════════════════════════════
OLD2 = ('e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:6,'
        'padding:"7px 14px",borderRadius:8,border:"none",'
        'background:"#1a56db",fontSize:12,fontWeight:600,'
        'color:"#fff",fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:[e.jsx("span",{children:"▶"})," Run Critical Path Analysis"]}),')
NEW2 = ''

if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2 CP toolbar Run btn removed: OK')
else:
    errors.append('P2'); print('P2 CP toolbar Run btn: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# P3 – Add "Run Analysis" button to CP toolbar RIGHT side (after Export)
# ══════════════════════════════════════════════════════════════════════════════
OLD3 = ('children:["↓"," Export"]})'
        ']})'   # close right div
        ']})')  # close toolbar outer div

NEW3 = ('children:["↓"," Export"]})'
        ','
        'e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:6,'
        'padding:"7px 16px",borderRadius:8,border:"none",'
        'background:"#1a56db",fontSize:12,fontWeight:600,'
        'color:"#fff",fontFamily:"Inter,sans-serif",cursor:"pointer",flexShrink:0},'
        'children:[e.jsx("span",{children:"▶"})," Run Analysis"]})'
        ']})'   # close right div
        ']})')  # close toolbar outer div

if OLD3 in content:
    content = content.replace(OLD3, NEW3, 1)
    print('P3 CP toolbar Run btn added right: OK')
else:
    errors.append('P3'); print('P3 CP toolbar add right: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# P4 – Remove "Run Analysis" button from CP empty state
# ══════════════════════════════════════════════════════════════════════════════
OLD4 = (',e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:6,'
        'padding:"10px 24px",borderRadius:10,border:"none",'
        'background:"#1a56db",fontSize:13,fontWeight:600,'
        'color:"#fff",fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:[e.jsx("span",{children:"▶"})," Run Analysis"]})')
NEW4 = ''

if OLD4 in content:
    content = content.replace(OLD4, NEW4, 1)
    print('P4 CP empty-state Run Analysis removed: OK')
else:
    errors.append('P4'); print('P4 CP empty-state Run Analysis: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# Verify & write
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
    print(f'{{ delta: {ob},  ( delta: {op},  [ delta: {sq}')

    if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
