#!/usr/bin/env python3
"""
- Add back buttons: Attendance, Performance, Workforce Directory, HR Orbit
- Normalize header font sizes (18→15, 20→15)
- Timesheet card redesign: parent name / title / date·hours in column 1
- Timesheet detail view when card tapped
"""

import sys

BTN = 'e.jsx("button",{onClick:()=>le("dashboard"),className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})})'

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

original = content
patches = []

# ─────────────────────────────────────────────────────────────
# 1. BACK BUTTONS
# ─────────────────────────────────────────────────────────────

# Attendance (om) – wrap [back-btn + title-div] inside justify-between
patches.append(('Attendance back btn',
    'className:"flex items-center justify-between mb-2",children:'
    '[e.jsxs("div",{children:[e.jsx("h1",{className:"text-base font-bold text-neutral-900",children:"Attendance"}),'
    'e.jsx("p",{className:"text-[10px] text-neutral-400",children:"Track your daily attendance"})]})',

    'className:"flex items-center justify-between mb-2",children:'
    '[e.jsxs("div",{className:"flex items-center gap-3",children:['
    + BTN +
    ',e.jsxs("div",{children:[e.jsx("h1",{className:"text-base font-bold text-neutral-900",children:"Attendance"}),'
    'e.jsx("p",{className:"text-[10px] text-neutral-400",children:"Track your daily attendance"})]})]}'
    ')'
))

# Performance (vm) – wrap [back-btn + h1] inside justify-between
patches.append(('Performance back btn',
    'className:"flex items-center justify-between",children:'
    '[e.jsx("h1",{className:"text-base font-bold truncate",children:"Performance"}),'
    'e.jsxs("div",{className:"flex items-center gap-1.5",',

    'className:"flex items-center justify-between",children:'
    '[e.jsxs("div",{className:"flex items-center gap-3",children:['
    + BTN +
    ',e.jsx("h1",{className:"text-base font-bold truncate",children:"Performance"})]}),'
    'e.jsxs("div",{className:"flex items-center gap-1.5",'
))

# Workforce Directory (Xm) – replace conditional btn with smart back btn
patches.append(('Directory back btn',
    'className:"flex items-center gap-3",children:'
    '[m?e.jsx("button",{onClick:()=>p(null),className:"p-1",children:e.jsx(ke,{size:24})}):null,'
    'e.jsx("h1",{className:"text-base font-bold truncate",children:m?"Profile":"Workforce Directory"})',

    'className:"flex items-center gap-3",children:'
    '[e.jsx("button",{onClick:()=>m?p(null):le("dashboard"),className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})}),'
    'e.jsx("h1",{className:"text-base font-bold truncate",children:m?"Profile":"Workforce Directory"})'
))

# HR Orbit hub (Xhr) – add back btn inside existing flex container
patches.append(('HR Orbit back btn',
    'children:[e.jsx("h1",{style:{fontSize:20,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},children:"HR Orbit"})]',

    'children:[' + BTN + ','
    'e.jsx("h1",{style:{fontSize:15,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},children:"HR Orbit"})]'
))

# ─────────────────────────────────────────────────────────────
# 2. NORMALIZE HEADER FONT SIZES (18→15)
# ─────────────────────────────────────────────────────────────

patches.append(('cm fontSize 18→15',
    'fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",letterSpacing:"-0.3px"},children:"My Assignments"',
    'fontSize:15,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",letterSpacing:"-0.3px"},children:"My Assignments"'))

patches.append(('hm fontSize 18→15',
    'fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",letterSpacing:"-0.3px"},children:"Approvals"',
    'fontSize:15,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",letterSpacing:"-0.3px"},children:"Approvals"'))

patches.append(('ym fontSize 18→15',
    'fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:0},children:"Timesheets"',
    'fontSize:15,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:0},children:"Timesheets"'))

# ─────────────────────────────────────────────────────────────
# 3. TIMESHEET: add _selTs state
# ─────────────────────────────────────────────────────────────

patches.append(('ym _selTs state',
    'const[_myTimesheet,_setMyTimesheet]=b.useState(false);',
    'const[_myTimesheet,_setMyTimesheet]=b.useState(false);const[_selTs,_setSelTs]=b.useState(null);'))

# ─────────────────────────────────────────────────────────────
# 4. TIMESHEET CARDS: new layout
# ─────────────────────────────────────────────────────────────

OLD_CARD = (
    '_filtered.map(function(d){return e.jsxs("div",{key:d.id,'
    'style:{background:"#fff",borderRadius:14,padding:"14px 16px",border:"1px solid #f0f1f4",'
    'boxShadow:"0 1px 3px rgba(0,0,0,0.04)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",'
    'marginBottom:8},children:[e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif",margin:0,flex:1,paddingRight:8},children:d.name}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:_stColor(d.approvalStatus),'
    'background:_stBg(d.approvalStatus),borderRadius:20,padding:"3px 10px",'
    'fontFamily:"Inter,sans-serif",flexShrink:0,whiteSpace:"nowrap"},'
    'children:_stLabel(d.approvalStatus)})]}),e.jsxs("div",{style:{display:"flex",'
    'flexWrap:"wrap",gap:6,marginBottom:8},children:[e.jsxs("span",{style:{display:"inline-flex",'
    'alignItems:"center",gap:4,fontSize:11,color:"#6b7280",background:"#f3f4f6",borderRadius:6,'
    'padding:"3px 8px",fontFamily:"Inter,sans-serif"},children:[e.jsx(Ns,{size:11,'
    'style:{color:"#9ca3af"}}),d.duration]}),d.parentNames.map(function(n,idx){return e.jsx("span",'
    '{key:idx,style:{fontSize:11,color:"#1a56db",background:"#eff6ff",borderRadius:6,'
    'padding:"3px 8px",fontFamily:"Inter,sans-serif"},children:n})})]}),e.jsxs("div",{style:{'
    'display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:8,'
    'borderTop:"1px solid #f9fafb"},children:[e.jsxs("div",{style:{display:"flex",'
    'alignItems:"center",gap:4},children:[e.jsx(Ms,{size:12,style:{color:"#9ca3af"}}),'
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:"Inter,sans-serif"},'
    'children:"Logged:"}),e.jsxs("span",{style:{fontSize:13,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},children:[d.loggedHours,"h"]})]}),e.jsxs("div",'
    '{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx("span",{style:{'
    'fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"By"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#374151",'
    'fontFamily:"Inter,sans-serif"},children:d.addedBy})]})]})]})})})'
)

NEW_CARD = (
    '_filtered.map(function(d){return e.jsxs("div",{key:d.id,'
    'onClick:function(){_setSelTs(d)},'
    'style:{background:"#fff",borderRadius:14,padding:"14px 16px",border:"1px solid #f0f1f4",'
    'boxShadow:"0 1px 3px rgba(0,0,0,0.04)",cursor:"pointer"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between"},'
    'children:['
    'e.jsxs("div",{style:{flex:1,paddingRight:12},children:['
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:"Inter,sans-serif",margin:"0 0 2px 0"},'
    'children:d.parentNames.join(", ")}),'
    'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",'
    'margin:"0 0 4px 0"},children:d.name}),'
    'e.jsxs("p",{style:{fontSize:11,color:"#6b7280",fontFamily:"Inter,sans-serif",margin:0},'
    'children:[d.duration," · ",d.loggedHours,"h logged"]})'
    ']}),e.jsx("span",{style:{fontSize:11,fontWeight:700,color:_stColor(d.approvalStatus),'
    'background:_stBg(d.approvalStatus),borderRadius:20,padding:"3px 10px",'
    'fontFamily:"Inter,sans-serif",flexShrink:0,whiteSpace:"nowrap",marginTop:2},'
    'children:_stLabel(d.approvalStatus)})'
    ']})]})})})'
)

patches.append(('Timesheet card layout', OLD_CARD, NEW_CARD))

# ─────────────────────────────────────────────────────────────
# 5. TIMESHEET DETAIL VIEW (injected before filter overlay)
# ─────────────────────────────────────────────────────────────

DETAIL = (
    '_selTs&&e.jsxs("div",{style:{position:"absolute",inset:0,background:"#f8fafc",zIndex:150,'
    'display:"flex",flexDirection:"column"},children:['
    'e.jsxs("div",{style:{background:"#fff",padding:"44px 16px 16px",borderBottom:"1px solid #f0f1f4",'
    'position:"sticky",top:0,zIndex:40},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    'e.jsx("button",{onClick:function(){_setSelTs(null)},className:"hdr-icon-btn flex-shrink-0",'
    'children:e.jsx(ke,{size:18})}),'
    'e.jsx("h1",{style:{fontSize:15,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",'
    'margin:0,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:"Timesheet Detail"})'
    ']})]}),'
    'e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"16px"},'
    'children:e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",'
    'overflow:"hidden"},children:['
    'e.jsxs("div",{style:{padding:"14px 16px",background:_stBg(_selTs.approvalStatus),'
    'borderBottom:"1px solid #f0f1f4",display:"flex",alignItems:"center",'
    'justifyContent:"space-between"},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:_stColor(_selTs.approvalStatus),'
    'fontFamily:"Inter,sans-serif"},children:_stLabel(_selTs.approvalStatus)}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},'
    'children:"Approval Status"})'
    ']}),e.jsx("div",{style:{padding:"16px"},children:e.jsxs("div",{'
    'style:{display:"flex",flexDirection:"column",gap:20},children:['
    'e.jsxs("div",{children:[e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:"Inter,sans-serif",margin:"0 0 4px 0",textTransform:"uppercase",letterSpacing:"0.6px",fontWeight:700},children:"Project"}),e.jsx("p",{style:{fontSize:14,fontWeight:600,color:"#111827",fontFamily:"Inter,sans-serif",margin:0},children:_selTs.parentNames.join(", ")})]}),'
    'e.jsxs("div",{children:[e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:"Inter,sans-serif",margin:"0 0 4px 0",textTransform:"uppercase",letterSpacing:"0.6px",fontWeight:700},children:"Timesheet"}),e.jsx("p",{style:{fontSize:14,fontWeight:600,color:"#111827",fontFamily:"Inter,sans-serif",margin:0},children:_selTs.name})]}),'
    'e.jsxs("div",{children:[e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:"Inter,sans-serif",margin:"0 0 4px 0",textTransform:"uppercase",letterSpacing:"0.6px",fontWeight:700},children:"Duration"}),e.jsx("p",{style:{fontSize:14,fontWeight:600,color:"#111827",fontFamily:"Inter,sans-serif",margin:0},children:_selTs.duration})]}),'
    'e.jsxs("div",{children:[e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:"Inter,sans-serif",margin:"0 0 4px 0",textTransform:"uppercase",letterSpacing:"0.6px",fontWeight:700},children:"Logged Hours"}),e.jsxs("p",{style:{fontSize:26,fontWeight:700,color:"#1a56db",fontFamily:"Inter,sans-serif",margin:0},children:[_selTs.loggedHours,"h"]})]}),'
    'e.jsxs("div",{children:[e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:"Inter,sans-serif",margin:"0 0 4px 0",textTransform:"uppercase",letterSpacing:"0.6px",fontWeight:700},children:"Added By"}),e.jsx("p",{style:{fontSize:14,fontWeight:600,color:"#111827",fontFamily:"Inter,sans-serif",margin:0},children:_selTs.addedBy})]})'
    ']})]})})]})]})'   # closes: columns, padDiv, card, contentWrapper, mainDiv
    ','
)

# verify DETAIL paren balance before using it
_d_o = DETAIL.count('(')
_d_c = DETAIL.count(')')
assert _d_o == _d_c, f'DETAIL paren imbalance: {_d_o} opens vs {_d_c} closes'

OLD_FILTER = '_showFilter&&e.jsx("div",{style:{position:"absolute",inset:0,zIndex:100,'
patches.append(('Timesheet detail view', OLD_FILTER, DETAIL + OLD_FILTER))

# ─────────────────────────────────────────────────────────────
# VALIDATE + APPLY
# ─────────────────────────────────────────────────────────────

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

d_open  = content.count('(') - original.count('(')
d_close = content.count(')') - original.count(')')
print(f'\nParen delta: open={d_open:+d}, close={d_close:+d}')
if d_open != d_close:
    print('FATAL: paren imbalance!')
    sys.exit(1)

with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone. {len(patches)} patches applied.')
