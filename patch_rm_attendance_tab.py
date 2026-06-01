#!/usr/bin/env python3
"""Remove Attendance tab: tab bar entry + content block + fix KPI card onClick"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ── F1: remove attendance entry from tab bar ──────────────────────────────────
OLD_F1 = ',{key:"attendance",label:"Attend.",icon:e.jsx(Ns,{size:12})}'
NEW_F1 = ''
if OLD_F1 in content:
    content = content.replace(OLD_F1, NEW_F1, 1)
    print('F1 tab bar: OK')
else:
    errors.append('F1'); print('F1: FAIL not found')

# ── F2: remove TAB_ATTENDANCE content block ───────────────────────────────────
# The block starts with _tab==="attendance"&&e.jsxs( and ends with )}),
# Find it in the file
OLD_F2_START = '_tab==="attendance"&&e.jsxs("div",{className:"space-y-3",children:['
si = content.find(OLD_F2_START)
if si == -1:
    errors.append('F2-find'); print('F2: FAIL start not found')
else:
    # Find the matching end: the && expression closes when the e.jsxs call closes
    # We need to find the closing ) of e.jsxs("div",{...}) then the comma after
    depth = 0
    start_paren = content.find('(', si + len('_tab==="attendance"&&e.jsxs'))
    pos = start_paren
    for k in range(start_paren, start_paren + 100000):
        if content[k] == '(': depth += 1
        elif content[k] == ')':
            depth -= 1
            if depth == 0:
                pos = k
                break
    # OLD_F2 = from si to pos+1 (inclusive of closing ), then the comma after
    OLD_F2 = content[si:pos+2]  # +2 to include '),'
    print('F2 found: len=%d ob=%d op=%d sq=%d' % (
        len(OLD_F2),
        OLD_F2.count('{') - OLD_F2.count('}'),
        OLD_F2.count('(') - OLD_F2.count(')'),
        OLD_F2.count('[') - OLD_F2.count(']')))
    if OLD_F2 in content:
        content = content.replace(OLD_F2, '', 1)
        print('F2 content block: OK')
    else:
        errors.append('F2'); print('F2: FAIL replace failed')

# ── F3: remove onClick from attendance KPI card (keep card as static display) ──
OLD_F3 = 'e.jsxs("button",{onClick:function(){_setTab("attendance");},className:"card p-3 text-left"'
NEW_F3 = 'e.jsxs("div",{className:"card p-3"'
if OLD_F3 in content:
    content = content.replace(OLD_F3, NEW_F3, 1)
    # Also need to remove the closing }) for button and add div closing
    # find the closing of this element: the button ends with ]}) (children close + props close + call close)
    # since we changed button to div, the JSX is still valid but it's now a div not a button
    # Actually e.jsxs("div",{...children:[...]}) is fine as-is
    print('F3 attendance KPI card: OK')
else:
    errors.append('F3'); print('F3: FAIL not found')

# ── Validate ──────────────────────────────────────────────────────────────────
print()
if errors:
    print('FAILED:', errors)
else:
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    with open('/tmp/chk_rm_att.js', 'w') as f:
        f.write(scripts[0])
    r = subprocess.run(
        ['node', '-e',
         'try{new Function(require("fs").readFileSync("/tmp/chk_rm_att.js","utf8"));'
         'process.stdout.write("OK");}catch(e){process.stdout.write("ERR:"+e.message);}'],
        capture_output=True, text=True)
    print('Node check:', r.stdout)
    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    sq = content.count('[') - content.count(']')
    print('File delta: ob=%d op=%d sq=%d' % (ob, op, sq))
    if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
        if r.stdout != 'OK':
            print('Node error:', r.stdout[:400])
