#!/usr/bin/env python3
"""
Remove action buttons from lower toolbar sections (they now live in the project title row):
1. Baseline list toolbar: remove "+ Create Baseline" (keep only Compare)
2. CP Row-1 toolbar: remove "Run Analysis" button (keep title + Dependencies Valid)
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# P1 – Remove "+ Create Baseline" from baseline list header toolbar
# ══════════════════════════════════════════════════════════════════════════════
OLD1 = ('" Compare"]}),e.jsxs("button",{onClick:()=>Ft("create"),'
        'style:{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",'
        'borderRadius:8,border:"none",background:"#1a56db",'
        'fontSize:12,fontWeight:600,color:"#fff",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:[e.jsx("span",{style:{fontSize:16,lineHeight:1},children:"+"}),'
        '" Create Baseline"]})')
NEW1 = '" Compare"]})'

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 baseline lower Create btn removed: OK')
else:
    errors.append('P1'); print('P1 baseline lower Create btn: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# P2 – Remove "Run Analysis" button from CP Row-1 toolbar
# ══════════════════════════════════════════════════════════════════════════════
OLD2 = (',e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:6,'
        'padding:"7px 16px",borderRadius:8,border:"none",'
        'background:"#1a56db",fontSize:12,fontWeight:600,'
        'color:"#fff",fontFamily:"Inter,sans-serif",'
        'cursor:"pointer",flexShrink:0},'
        'children:[e.jsx("span",{children:"▶"})," Run Analysis"]})'
        ']}),')
NEW2 = ']}),\n'

if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2 CP Row1 Run Analysis btn removed: OK')
else:
    errors.append('P2'); print('P2 CP Row1 Run Analysis btn: FAIL')

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
