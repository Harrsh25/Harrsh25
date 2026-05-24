#!/usr/bin/env python3
"""
WBS view: make read-only
- Remove three-dot menu (and Create Baseline button) from header
- Remove inline edit (double-click + edit button) from rows
- Remove Add sub-item button from rows
- Remove inline add-sub-item row that expands under a row
- Remove Delete column from rows and header
- Remove "Add WBS Item" button at bottom
"""

import sys

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

original = content
patches = []

# ── 1. Remove three-dot menu + Create Baseline button from WBS header ──
THREE_DOT_OLD = (
    'I==="baseline"?e.jsxs("button",{onClick:()=>Ft("create"),style:{display:"flex",'
    'alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,border:"none",'
    'background:"#1a56db",fontSize:12,fontWeight:600,color:"#fff",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
    'children:[e.jsx(Ve,{size:13})," Create Baseline"]})'
    ':e.jsxs("div",{style:{position:"relative",flexShrink:0},children:['
    'e.jsxs("button",{onClick:()=>ss(!On),style:{width:32,height:32,borderRadius:8,'
    'border:"1px solid #e5e7eb",background:"#fff",display:"flex",flexDirection:"column",'
    'alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer"},'
    'children:[e.jsx("span",{style:{width:3,height:3,borderRadius:"50%",'
    'background:"#6b7280",display:"block"}}),e.jsx("span",{style:{width:3,height:3,'
    'borderRadius:"50%",background:"#6b7280",display:"block"}}),e.jsx("span",'
    '{style:{width:3,height:3,borderRadius:"50%",background:"#6b7280",display:"block"}})]})'
    ',On&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{position:"fixed",inset:0,'
    'zIndex:50},onClick:()=>ss(!1)}),e.jsx("div",{style:{position:"absolute",top:36,'
    'right:0,zIndex:51,background:"#fff",borderRadius:12,boxShadow:"0 8px 24px '
    'rgba(0,0,0,0.14),0 0 0 1px rgba(0,0,0,0.06)",minWidth:200,overflow:"hidden",'
    'animation:"scaleIn 0.12s ease-out"},children:[{label:"Upload Excel (.xlsx)",'
    'icon:"\U0001f4ca",action:()=>{ye("Upload Excel — select file"),ss(!1)}},'
    '{label:"Upload CSV (.csv)",icon:"\U0001f4c4",action:()=>{ye("Upload CSV — select file"),'
    'ss(!1)}},{label:"Export WBS",icon:"\U0001f4e5",action:()=>{ye("Exporting WBS…"),'
    'ss(!1)}}].map((W,pe)=>e.jsxs("button",{onClick:W.action,style:{width:"100%",'
    'display:"flex",alignItems:"center",gap:10,padding:"12px 16px",border:"none",'
    'background:"none",cursor:"pointer",textAlign:"left",'
    'borderBottom:pe<2?"1px solid #f3f4f6":"none"},children:[e.jsx("span",'
    '{style:{fontSize:15},children:W.icon}),e.jsx("span",{style:{fontSize:13,'
    'fontWeight:600,color:"#111827",fontFamily:"Inter,sans-serif"},'
    'children:W.label})]},pe))})]})]}'
    ')'
)
patches.append(('Remove three-dot + Create Baseline', THREE_DOT_OLD, ''))

# ── 2. Remove inline edit, edit btn, add sub-item btn from Nn row ──
EDIT_OLD = (
    'Ue?e.jsx("input",{autoFocus:!0,value:Me,onChange:ze=>nt(ze.target.value),'
    'onBlur:()=>De(null),onKeyDown:ze=>{(ze.key==="Enter"||ze.key==="Escape")&&De(null)},'
    'style:{flex:1,border:"1px solid #1a56db",borderRadius:6,padding:"3px 6px",'
    'fontSize:12,fontFamily:"Inter,sans-serif",outline:"none",background:"#fff",'
    'minWidth:0}}):e.jsx("span",{onDoubleClick:()=>{De(W.id),nt(W.name)},'
    'style:{fontSize:pe===0?13:12,fontWeight:pe===0?700:500,color:"#111827",'
    'fontFamily:"Inter,sans-serif",overflow:"hidden",textOverflow:"ellipsis",'
    'whiteSpace:"nowrap",cursor:"default",flex:1,minWidth:0},title:W.name,children:W.name})'
    ',e.jsx("button",{onClick:()=>{De(W.id),nt(W.name)},style:{background:"none",'
    'border:"none",cursor:"pointer",padding:"0 3px",flexShrink:0,opacity:0.5},'
    'title:"Edit",children:e.jsx(sy,{style:{width:11,height:11,color:"#6b7280"}})})'
    ',e.jsx("button",{onClick:()=>{D(W.id),Dt("")},style:{background:"none",border:"none",'
    'cursor:"pointer",padding:"0 3px",flexShrink:0,opacity:0.6},title:"Add sub-item",'
    'children:e.jsx(ro,{style:{width:11,height:11,color:"#1a56db"}})})'
)
EDIT_NEW = (
    'e.jsx("span",{style:{fontSize:pe===0?13:12,fontWeight:pe===0?700:500,'
    'color:"#111827",fontFamily:"Inter,sans-serif",overflow:"hidden",'
    'textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0},'
    'title:W.name,children:W.name})'
)
patches.append(('Remove inline edit + edit/add btns', EDIT_OLD, EDIT_NEW))

# ── 3. Remove delete column (width:36 with delete button) from rows ──
DELETE_COL_OLD = (
    'e.jsx("div",{style:{width:36,flexShrink:0,display:"flex",alignItems:"center",'
    'justifyContent:"center"},children:e.jsx("button",{onClick:()=>ye("Deleted: "+W.name),'
    'style:{background:"none",border:"none",cursor:"pointer",padding:"0 4px",opacity:0.4},'
    'title:"Delete",children:e.jsx(mt,{style:{width:13,height:13,color:"#dc2626"}})})})'
)
patches.append(('Remove delete column from rows', DELETE_COL_OLD, ''))

# ── 4. Remove inline add-sub-item row (Et===W.id row) ──
ADD_ROW_OLD = (
    'Et===W.id&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,'
    'paddingLeft:8+Ae+18,paddingRight:10,paddingTop:6,paddingBottom:6,'
    'background:"#EFF4FF",borderBottom:"1px solid #dbeafe"},children:['
    'e.jsx("input",{autoFocus:!0,value:ae,onChange:ze=>Dt(ze.target.value),'
    'placeholder:`New sub-item under "${W.name}"…`,'
    'onKeyDown:ze=>{ze.key==="Enter"&&(ye(`Created: ${ae}`),D(null)),'
    'ze.key==="Escape"&&D(null)},style:{flex:1,border:"1px solid #1a56db",'
    'borderRadius:6,padding:"5px 8px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'outline:"none",background:"#fff"}}),e.jsx("button",{onClick:()=>{'
    'ye(`Created: ${ae}`),D(null)},style:{padding:"5px 10px",borderRadius:6,'
    'border:"none",background:"#1a56db",fontSize:11,fontWeight:600,color:"#fff",'
    'cursor:"pointer",fontFamily:"Inter,sans-serif"},children:"Add"}),'
    'e.jsx("button",{onClick:()=>D(null),style:{padding:"5px 8px",borderRadius:6,'
    'border:"1px solid #e5e7eb",background:"#fff",fontSize:11,color:"#6b7280",'
    'cursor:"pointer"},children:"✕"})]})'
    ','
)
patches.append(('Remove inline add-sub-item row', ADD_ROW_OLD, ''))

# ── 5. Remove "Add WBS Item" button section at bottom ──
ADD_WBS_OLD = (
    ',e.jsx("div",{style:{padding:"10px 16px",borderTop:"1px solid #f0f1f4",'
    'background:"#fff"},children:Et==="root"?e.jsxs("div",{style:{display:"flex",'
    'alignItems:"center",gap:6},children:[e.jsx("input",{autoFocus:!0,value:ae,'
    'onChange:W=>Dt(W.target.value),placeholder:"New WBS item name…",'
    'onKeyDown:W=>{W.key==="Enter"&&(ye(`Created: ${ae}`),D(null)),'
    'W.key==="Escape"&&D(null)},style:{flex:1,border:"1px solid #1a56db",'
    'borderRadius:8,padding:"7px 10px",fontSize:13,fontFamily:"Inter,sans-serif",'
    'outline:"none"}}),e.jsx("button",{onClick:()=>{ye(`Created: ${ae}`),D(null)},'
    'style:{padding:"7px 14px",borderRadius:8,border:"none",background:"#1a56db",'
    'fontSize:12,fontWeight:600,color:"#fff",cursor:"pointer",'
    'fontFamily:"Inter,sans-serif"},children:"Add"}),e.jsx("button",'
    '{onClick:()=>D(null),style:{padding:"7px 10px",borderRadius:8,'
    'border:"1px solid #e5e7eb",background:"#fff",fontSize:12,color:"#6b7280",'
    'cursor:"pointer"},children:"✕"})]})'
    ':e.jsxs("button",{onClick:()=>{D("root"),Dt("")},style:{display:"flex",'
    'alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",'
    'padding:0},children:[e.jsx(ro,{style:{width:14,height:14,color:"#1a56db"}}),'
    'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#1a56db",'
    'fontFamily:"Inter,sans-serif"},children:"Add WBS Item"})]})})'
)
patches.append(('Remove Add WBS Item button', ADD_WBS_OLD, ''))

# ── 6. Remove empty header column placeholder for delete (width:36) ──
patches.append(('Remove delete header col',
    'e.jsx("div",{style:{width:36,flexShrink:0}})',
    ''))

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

# Balance checks
d_open  = content.count('(') - original.count('(')
d_close = content.count(')') - original.count(')')
print(f'\nParen delta: open={d_open:+d}, close={d_close:+d}')
if d_open != d_close:
    print('FATAL: paren imbalance!')
    sys.exit(1)

sq_new  = content.count('[') - content.count(']')
sq_orig = original.count('[') - original.count(']')
print(f'Bracket balance: {sq_new} (was {sq_orig})')
if sq_new != sq_orig:
    print('FATAL: bracket imbalance!')
    sys.exit(1)

with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone. {len(patches)} patches applied.')
