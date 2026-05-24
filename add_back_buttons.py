#!/usr/bin/env python3
"""Add back button to all screen headers except dashboard/home."""

import sys

BACK_BTN = 'e.jsx("button",{onClick:()=>le("dashboard"),className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})})'

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

patches = []

# ── 1. wm (HR Orbit) ── single children:e.jsx("h1",...) → flex row with back btn
old1 = 'className:"screen-header px-4 pt-11 pb-2",children:e.jsx("h1",{className:"text-base font-bold truncate",children:"HR Orbit"})'
new1 = 'className:"screen-header px-4 pt-11 pb-2",children:e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[' + BACK_BTN + ',e.jsx("h1",{className:"text-base font-bold truncate",children:"HR Orbit"})]})'
patches.append(('wm HR Orbit', old1, new1))

# ── 2. bm (Payroll) ── children:[e.jsx("h1",...), ...] → prepend back btn
old2 = 'className:"screen-header px-4 pt-11 pb-2",children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Payroll"}),'
new2 = 'className:"screen-header px-4 pt-11 pb-2",children:[' + BACK_BTN + ',e.jsx("h1",{className:"text-base font-bold truncate",children:"Payroll"}),'
patches.append(('bm Payroll', old2, new2))

# ── 3. Om (Wallet) ──
old3 = 'className:"screen-header px-4 pt-11 pb-2",children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"My Wallet"}),'
new3 = 'className:"screen-header px-4 pt-11 pb-2",children:[' + BACK_BTN + ',e.jsx("h1",{className:"text-base font-bold truncate",children:"My Wallet"}),'
patches.append(('Om Wallet', old3, new3))

# ── 4. Hm (Skills) ──
old4 = 'className:"screen-header px-4 pt-11 pb-2",children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Skills & Talent"}),'
new4 = 'className:"screen-header px-4 pt-11 pb-2",children:[' + BACK_BTN + ',e.jsx("h1",{className:"text-base font-bold truncate",children:"Skills & Talent"}),'
patches.append(('Hm Skills', old4, new4))

# ── 5. qm (Profile) ──
old5 = 'className:"screen-header px-4 pt-11 pb-2",children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Digital Worker Profile"}),'
new5 = 'className:"screen-header px-4 pt-11 pb-2",children:[' + BACK_BTN + ',e.jsx("h1",{className:"text-base font-bold truncate",children:"Digital Worker Profile"}),'
patches.append(('qm Profile', old5, new5))

# ── 6. Bm (Manager Hub) ── conditional children, prepend back btn before condition
old6 = 'className:"screen-header px-4 pt-11 pb-2",children:[_mhView==="main"?e.jsxs(e.Fragment,{children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Manager Hub"}),'
new6 = 'className:"screen-header px-4 pt-11 pb-2",children:[' + BACK_BTN + ',_mhView==="main"?e.jsxs(e.Fragment,{children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Manager Hub"}),'
patches.append(('Bm Manager Hub', old6, new6))

# ── 7. Um (Analytics) ── h1 inside flex justify-between div
old7 = 'className:"flex items-center justify-between",children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Analytics"}),e.jsx("button",'
new7 = 'className:"flex items-center justify-between",children:[' + BACK_BTN + ',e.jsx("h1",{className:"text-base font-bold truncate",children:"Analytics"}),e.jsx("button",'
patches.append(('Um Analytics', old7, new7))

# ── 8. gm (Shifts) ── h1 inside flex justify-between mb-2 div
old8 = 'className:"flex items-center justify-between mb-2",children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"My Shifts"}),'
new8 = 'className:"flex items-center justify-between mb-2",children:[' + BACK_BTN + ',e.jsx("h1",{className:"text-base font-bold truncate",children:"My Shifts"}),'
patches.append(('gm Shifts', old8, new8))

# ── 9. jm (Travel) ── h1 inside flex justify-between div
old9 = 'className:"flex items-center justify-between",children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Travel & Expense"}),'
new9 = 'className:"flex items-center justify-between",children:[' + BACK_BTN + ',e.jsx("h1",{className:"text-base font-bold truncate",children:"Travel & Expense"}),'
patches.append(('jm Travel', old9, new9))

# ── 10. Em (Communication) ── h1 inside flex justify-between div
old10 = 'className:"flex items-center justify-between",children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Communication"}),'
new10 = 'className:"flex items-center justify-between",children:[' + BACK_BTN + ',e.jsx("h1",{className:"text-base font-bold truncate",children:"Communication"}),'
patches.append(('Em Communication', old10, new10))

# ── 11. Zm (Notifications) ── h1 inside nested flex div
old11 = 'className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Notifications"}'
new11 = 'className:"flex items-center justify-between",children:[' + BACK_BTN + ',e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("h1",{className:"text-base font-bold truncate",children:"Notifications"}'
patches.append(('Zm Notifications', old11, new11))

# ── 12. cm (Tasks) ── custom style div
old12 = 'children:[e.jsxs("div",{style:{padding:"44px 16px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827"'
new12 = 'children:[e.jsxs("div",{style:{padding:"44px 16px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[' + BACK_BTN + ',e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827"'
patches.append(('cm Tasks', old12, new12))

# ── 13. hm (Approvals) ── custom style div
old13 = 'children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"44px 16px 10px"},children:[e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",letterSpacing:"-0.3px"},children:"Approvals"}),'
new13 = 'children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"44px 16px 10px"},children:[' + BACK_BTN + ',e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",letterSpacing:"-0.3px"},children:"Approvals"}),'
patches.append(('hm Approvals', old13, new13))

# ── 14. ym (Timesheet) ── custom style div
old14 = 'children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},children:[e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:0},children:"Timesheets"}),'
new14 = 'children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},children:[' + BACK_BTN + ',e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:0},children:"Timesheets"}),'
patches.append(('ym Timesheet', old14, new14))

# ── 15. Vm (Wellness) ── gradient header flex justify-between
old15 = 'className:"flex items-center justify-between mb-2",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-lg font-bold",children:"Employee Wellness"}),'
new15 = 'className:"flex items-center justify-between mb-2",children:[' + BACK_BTN + ',e.jsxs("div",{children:[e.jsx("h1",{className:"text-lg font-bold",children:"Employee Wellness"}),'
patches.append(('Vm Wellness', old15, new15))

# ── 16. um (Docs) ── replace hamburger with back button
old16 = 'e.jsx("button",{type:"button",className:"hdr-icon-btn",style:{flexShrink:0},children:e.jsx(ng,{size:18,style:{color:"#374151"}})})'
new16 = 'e.jsx("button",{type:"button",onClick:()=>le("dashboard"),className:"hdr-icon-btn",style:{flexShrink:0},children:e.jsx(ke,{size:18,style:{color:"#374151"}})})'
patches.append(('um Docs hamburger→back', old16, new16))

# ── 17. pm (Projects) ── add onClick + change icon to ke
old17 = 'e.jsx("button",{className:"w-8 h-8 flex items-center justify-center",children:e.jsx(ry,{style:{width:20,height:20,color:"#111827"}})})'
new17 = 'e.jsx("button",{className:"w-8 h-8 flex items-center justify-center",onClick:()=>le("dashboard"),children:e.jsx(ke,{style:{width:20,height:20,color:"#111827"}})})'
patches.append(('pm Projects icon→back', old17, new17))

errors = []
for name, old, new in patches:
    count = content.count(old)
    if count == 0:
        errors.append(f'NOT FOUND: {name}')
    elif count > 1:
        errors.append(f'AMBIGUOUS ({count} matches): {name}')

if errors:
    print('PATCH ERRORS:')
    for e in errors:
        print(' ', e)
    sys.exit(1)

# Apply all patches
for name, old, new in patches:
    content = content.replace(old, new, 1)
    print(f'  OK: {name}')

# Paren balance check
orig_open = original.count('(')
orig_close = original.count(')')
new_open = content.count('(')
new_close = content.count(')')
delta_open = new_open - orig_open
delta_close = new_close - orig_close
print(f'\nParen delta: open={delta_open:+d}, close={delta_close:+d}')
if delta_open != delta_close:
    print('WARNING: paren imbalance introduced!')
    sys.exit(1)

with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone. Applied {len(patches)} patches.')
