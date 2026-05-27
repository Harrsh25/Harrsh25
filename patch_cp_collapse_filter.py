#!/usr/bin/env python3
"""
P1 – Collapse WBS rows by default in CP view (open only if explicitly toggled).
P2 – After Run Analysis, show only items on/near the critical path:
     - critical items (float <= 0)
     - their ancestors up to root (so the tree is navigable)
     - "Include Independent Work" still shows all scheduled items.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Collapse by default: !==false  →  ===true
# ──────────────────────────────────────────────────────────────────────────────
OLD1 = 'cp_open=_cpExp[it.id]!==false;'
NEW1 = 'cp_open=_cpExp[it.id]===true;'
if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 collapse by default: OK')
else:
    errors.append('P1'); print('P1 collapse default: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Filter: show only root items that ARE or CONTAIN a critical descendant.
#       "Include Independent Work" widens back to all scheduled items.
# ──────────────────────────────────────────────────────────────────────────────
OLD2 = ('const cp_hasDate=it=>!!it.endDate||z(it.id).some(c2=>cp_hasDate(c2));'
        'const cp_rows=_cpInclInd?ne:ne.filter(it=>cp_hasDate(it));')
NEW2 = ('const cp_hasDate=it=>!!it.endDate||z(it.id).some(c2=>cp_hasDate(c2));'
        'const cp_hasCrit=it=>cp_gfl(it)<=0||(z(it.id).some(c2=>cp_hasCrit(c2)));'
        'const cp_rows=_cpInclInd?ne.filter(it=>cp_hasDate(it)):ne.filter(it=>cp_hasCrit(it));')
if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2 critical-only filter: OK')
else:
    errors.append('P2'); print('P2 filter: FAIL')

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
