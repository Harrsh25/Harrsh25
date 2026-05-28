#!/usr/bin/env python3
"""
Fix My Assignments:
 1. Sub-project filter was ignored in Le task list — add x filter
 2. Replace qe ChevronDown with ▲/▼ text arrows to match Assignments page style
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# Fix 1 – Add sub-project (x) to Le task filter
# ──────────────────────────────────────────────────────────────────────────────
OLD_F = 'De=m==="all"||L.project===m;return xe&&De'
NEW_F = 'De=m==="all"||L.project===m;const _sx=x==="all"||L.activity===x;return xe&&De&&_sx'

if OLD_F in content:
    content = content.replace(OLD_F, NEW_F, 1)
    print('Fix1 sub-project filter: OK')
else:
    errors.append('Fix1'); print('Fix1: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# Fix 2 – Replace qe chevron with ▲/▼ arrows in My Assignments trigger button
# ──────────────────────────────────────────────────────────────────────────────
OLD_Q = 'e.jsx(qe,{size:9,style:{flexShrink:0}})'
NEW_Q = 'e.jsx("span",{style:{fontSize:9,flexShrink:0},children:_mDD?"▲":"▼"})'

idx = content.find(OLD_Q, 408000, 415000)
if idx != -1:
    content = content.replace(OLD_Q, NEW_Q, 1)
    print('Fix2 arrow chevron: OK')
else:
    errors.append('Fix2'); print('Fix2: FAIL idx=%d' % idx)

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
