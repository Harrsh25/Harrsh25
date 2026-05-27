#!/usr/bin/env python3
"""
Move the Critical Path stat cards (CRITICAL ENTITIES, ZERO FLOAT, AVG FLOAT,
TOTAL FLOAT, LONGEST CHAIN, PROJECT DURATION, DELAYED CRITICAL) from the
bottom of the CP view to the top (between toolbar and the data rows / empty state).
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# Locate the stat cards block precisely
# ──────────────────────────────────────────────────────────────────────────────
stat_start = content.find(
    ',e.jsxs("div",{style:{display:"flex",gap:0,borderTop:"1px solid #e5e7eb"'
)
sub_idx = content.find('children:s.sub}', stat_start)
stat_end = sub_idx + 22          # exclusive; verified balanced ob=0 op=0 sq=0
STAT_BLOCK = content[stat_start:stat_end]   # starts with leading ','
STAT_JSX   = STAT_BLOCK[1:]                 # strip leading ',' for top insertion

# Quick sanity
ob = STAT_BLOCK.count('{') - STAT_BLOCK.count('}')
op = STAT_BLOCK.count('(') - STAT_BLOCK.count(')')
sq = STAT_BLOCK.count('[') - STAT_BLOCK.count(']')
print(f'Stat block balance: ob={ob} op={op} sq={sq}')
if ob or op or sq:
    errors.append('balance'); print('Stat block NOT balanced – aborting'); exit(1)

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Remove stat cards from the bottom of the analyzed content
# ──────────────────────────────────────────────────────────────────────────────
if STAT_BLOCK in content:
    content = content.replace(STAT_BLOCK, '', 1)
    print('P1 stat cards removed from bottom: OK')
else:
    errors.append('P1'); print('P1 stat cards removal: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Insert stat cards at the top (right before !_cpAnalyzed? ternary),
#       wrapped in _cpAnalyzed&& so they only show after analysis runs.
#       The stat card strip gets a slightly different style: borderBottom
#       instead of borderTop, no top-border gap.
# ──────────────────────────────────────────────────────────────────────────────
# Replace borderTop with borderBottom in the moved version
STAT_TOP = STAT_JSX.replace(
    'borderTop:"1px solid #e5e7eb"',
    'borderBottom:"1px solid #e5e7eb"',
    1
)

OLD2 = 'children:["↓"," Export"]})]})]}),_cpAnalyzed&&(()=>{'
NEW2 = ('children:["↓"," Export"]})]})]}),_cpAnalyzed&&'
        + STAT_TOP
        + ',_cpAnalyzed&&(()=>{')

if OLD2 in content:
    ob_d = (NEW2.count('{')-NEW2.count('}')) - (OLD2.count('{')-OLD2.count('}'))
    op_d = (NEW2.count('(')-NEW2.count(')')) - (OLD2.count('(')-OLD2.count(')'))
    sq_d = (NEW2.count('[')-NEW2.count(']')) - (OLD2.count('[')-OLD2.count(']'))
    print(f'P2 delta: ob={ob_d} op={op_d} sq={sq_d}')
    content = content.replace(OLD2, NEW2, 1)
    print('P2 stat cards inserted at top: OK')
else:
    errors.append('P2'); print('P2 stat cards insertion: FAIL')

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
