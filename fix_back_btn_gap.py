#!/usr/bin/env python3
"""Fix gap between back button and title in all screen headers."""

import sys

BTN = 'e.jsx("button",{onClick:()=>le("dashboard"),className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})})'

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

original = content
patches = []

def flex_wrap(btn, h1_jsx):
    return f'e.jsxs("div",{{className:"flex items-center gap-3",children:[{btn},{h1_jsx}]}})'

def flex_wrap_inline(btn, h1_jsx):
    return f'e.jsxs("div",{{style:{{display:"flex",alignItems:"center",gap:8}},children:[{btn},{h1_jsx}]}})'

# ── screen-header screens: back-btn + h1 are block siblings → wrap in flex row ──

H1 = {
    'Payroll':   'e.jsx("h1",{className:"text-base font-bold truncate",children:"Payroll"})',
    'Wallet':    'e.jsx("h1",{className:"text-base font-bold truncate",children:"My Wallet"})',
    'Skills':    'e.jsx("h1",{className:"text-base font-bold truncate",children:"Skills & Talent"})',
    'Profile':   'e.jsx("h1",{className:"text-base font-bold truncate",children:"Digital Worker Profile"})',
    'Analytics': 'e.jsx("h1",{className:"text-base font-bold truncate",children:"Analytics"})',
    'Shifts':    'e.jsx("h1",{className:"text-base font-bold truncate",children:"My Shifts"})',
    'Travel':    'e.jsx("h1",{className:"text-base font-bold truncate",children:"Travel & Expense"})',
    'Comm':      'e.jsx("h1",{className:"text-base font-bold truncate",children:"Communication"})',
}

# bm Payroll
patches.append(('bm Payroll',
    BTN + ',' + H1['Payroll'],
    flex_wrap(BTN, H1['Payroll'])))

# Om Wallet
patches.append(('Om Wallet',
    BTN + ',' + H1['Wallet'],
    flex_wrap(BTN, H1['Wallet'])))

# Hm Skills
patches.append(('Hm Skills',
    BTN + ',' + H1['Skills'],
    flex_wrap(BTN, H1['Skills'])))

# qm Profile
patches.append(('qm Profile',
    BTN + ',' + H1['Profile'],
    flex_wrap(BTN, H1['Profile'])))

# ── justify-between screens: wrap [back-btn + h1] to group them on the left ──

# Um Analytics: [back, h1, filter-btn]
patches.append(('Um Analytics',
    BTN + ',' + H1['Analytics'] + ',e.jsx("button",',
    flex_wrap(BTN, H1['Analytics']) + ',e.jsx("button",'))

# gm Shifts: [back, h1, add-btn]
patches.append(('gm Shifts',
    BTN + ',' + H1['Shifts'] + ',e.jsxs("button",',
    flex_wrap(BTN, H1['Shifts']) + ',e.jsxs("button",'))

# jm Travel: [back, h1, add-btn]
patches.append(('jm Travel',
    BTN + ',' + H1['Travel'] + ',e.jsxs("button",',
    flex_wrap(BTN, H1['Travel']) + ',e.jsxs("button",'))

# Em Communication: [back, h1, div]
patches.append(('Em Communication',
    BTN + ',' + H1['Comm'] + ',e.jsxs("div",',
    flex_wrap(BTN, H1['Comm']) + ',e.jsxs("div",'))

# Zm Notifications: [back, nested-div(h1+badge), right-div]
# Use COMPLETE nested div so parens stay balanced
ZM_NESTED = (
    'e.jsxs("div",{className:"flex items-center gap-2",children:['
    'e.jsx("h1",{className:"text-base font-bold truncate",children:"Notifications"}),'
    'p>0&&e.jsx("span",{className:"w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center",children:p})'
    ']})'
)
patches.append(('Zm Notifications',
    BTN + ',' + ZM_NESTED + ',',
    'e.jsxs("div",{className:"flex items-center gap-3",children:[' + BTN + ',' + ZM_NESTED + ']}),'))

# Vm Wellness: [back, title-div(h1+subtitle), checkin-btn]
# Use COMPLETE title div so parens stay balanced
VM_TITLE = (
    'e.jsxs("div",{children:['
    'e.jsx("h1",{className:"text-lg font-bold",children:"Employee Wellness"}),'
    'e.jsx("p",{className:"text-slate-300 text-xs mt-0.5",children:"Holistic health & engagement dashboard"})'
    ']})'
)
patches.append(('Vm Wellness',
    BTN + ',' + VM_TITLE + ',',
    'e.jsxs("div",{className:"flex items-center gap-3",children:[' + BTN + ',' + VM_TITLE + ']}),'))

# ── custom-style space-between screens ──

# cm Tasks: [back, h1("My Assignments"), div]
H1_TASKS = 'e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",letterSpacing:"-0.3px"},children:"My Assignments"})'
patches.append(('cm Tasks',
    BTN + ',' + H1_TASKS + ',e.jsxs("div",{style:{position:"relative"',
    flex_wrap_inline(BTN, H1_TASKS) + ',e.jsxs("div",{style:{position:"relative"'))

# hm Approvals: [back, h1("Approvals"), filter-div]
H1_APV = 'e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",letterSpacing:"-0.3px"},children:"Approvals"})'
patches.append(('hm Approvals',
    BTN + ',' + H1_APV + ',e.jsxs("div",{style:{display:"flex",gap:6',
    flex_wrap_inline(BTN, H1_APV) + ',e.jsxs("div",{style:{display:"flex",gap:6'))

# ym Timesheet: [back, h1("Timesheets"), add-btn]
H1_TIME = 'e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:0},children:"Timesheets"})'
patches.append(('ym Timesheet',
    BTN + ',' + H1_TIME + ',e.jsxs("button",',
    flex_wrap_inline(BTN, H1_TIME) + ',e.jsxs("button",'))

# ── Bm Manager Hub: move standalone back-btn inside conditional Fragment ──
# Old: [back-btn, conditional(main:Fragment([h1, tabs]))...]
# New: [conditional(main:Fragment([flex(back+h1), tabs]))...]
BM_OLD = (
    BTN + ','
    '_mhView==="main"?e.jsxs(e.Fragment,{children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Manager Hub"}),'
)
BM_NEW = (
    '_mhView==="main"?e.jsxs(e.Fragment,{children:['
    'e.jsxs("div",{className:"flex items-center gap-3 mb-2",children:['
    + BTN + ','
    'e.jsx("h1",{className:"text-base font-bold truncate",children:"Manager Hub"})]}),'
)
patches.append(('Bm Manager Hub', BM_OLD, BM_NEW))

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

# Apply
for name, old, new in patches:
    content = content.replace(old, new, 1)
    print(f'  OK: {name}')

# Paren balance check
d_open  = content.count('(') - original.count('(')
d_close = content.count(')') - original.count(')')
print(f'\nParen delta: open={d_open:+d}, close={d_close:+d}')
if d_open != d_close:
    print('FATAL: paren imbalance introduced!')
    sys.exit(1)

with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone. {len(patches)} patches applied.')
