#!/usr/bin/env python3
"""
- Timesheet card: put name first, parent name second
- Remove subtitle descriptions from Attendance, Wellness, Wallet headers
"""

import sys

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

original = content
patches = []

# ── 1. Timesheet card: swap name ↔ parent (name first, parent below) ──
patches.append(('Timesheet card order',
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:"Inter,sans-serif",margin:"0 0 2px 0"},children:d.parentNames.join(", ")}),e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:"0 0 4px 0"},children:d.name}),',
    'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:"0 0 2px 0"},children:d.name}),e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:"Inter,sans-serif",margin:"0 0 4px 0"},children:d.parentNames.join(", ")}),'))

# ── 2. Attendance: remove subtitle (unwrap div, keep only h1) ──
patches.append(('Attendance remove subtitle',
    'e.jsxs("div",{children:[e.jsx("h1",{className:"text-base font-bold text-neutral-900",children:"Attendance"}),e.jsx("p",{className:"text-[10px] text-neutral-400",children:"Track your daily attendance"})]})',
    'e.jsx("h1",{className:"text-base font-bold text-neutral-900",children:"Attendance"})'))

# ── 3. Wellness: remove subtitle (unwrap div, keep only h1) ──
patches.append(('Wellness remove subtitle',
    'e.jsxs("div",{children:[e.jsx("h1",{className:"text-lg font-bold",children:"Employee Wellness"}),e.jsx("p",{className:"text-slate-300 text-xs mt-0.5",children:"Holistic health & engagement dashboard"})]})',
    'e.jsx("h1",{className:"text-lg font-bold",children:"Employee Wellness"})'))

# ── 4. Wallet: remove standalone subtitle p below the flex row ──
patches.append(('Wallet remove subtitle',
    'e.jsx("h1",{className:"text-base font-bold truncate",children:"My Wallet"})'
    ']}),e.jsx("p",{className:"text-xs text-neutral-500 mt-1",children:"Digital Service Book"})',
    'e.jsx("h1",{className:"text-base font-bold truncate",children:"My Wallet"})'
    ']})'))

# ── Validate ──
errors = []
for name, old, new in patches:
    count = content.count(old)
    if count == 0:
        errors.append(f'NOT FOUND: {name}')
    elif count > 1:
        errors.append(f'AMBIGUOUS ({count}): {name}')

if errors:
    print('ERRORS:')
    for e in errors:
        print(' ', e)
    sys.exit(1)

for name, old, new in patches:
    content = content.replace(old, new, 1)
    print(f'  OK: {name}')

# Balance checks
sq = content.count('[') - content.count(']')
pr = content.count('(') - content.count(')')
print(f'\nSquare: {sq}, Paren: {pr}')
if sq != 0 or pr != 0:
    print('FATAL: imbalance!')
    sys.exit(1)

with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Done. {len(patches)} patches applied.')
