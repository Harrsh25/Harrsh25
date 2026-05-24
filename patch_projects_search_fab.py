#!/usr/bin/env python3
"""
Projects module:
- Remove search toggle button from header
- Remove collapsible search bar (it was a sibling in screen div)
- Add persistent search input left of Filters button
- Add FAB "+" button at bottom to create a project
"""

import sys

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

original = content
patches = []

# ── 1. Remove search toggle button from header right-side div ──
patches.append(('Remove search toggle btn',
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("button",{onClick:()=>I(c=>!c),style:{width:34,height:34,borderRadius:10,border:"1px solid #e5e7eb",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},children:e.jsx(Ha,{style:{width:16,height:16,color:"#374151"}})}),e.jsx("button",{onClick:()=>p(!0),style:{width:34,height:34,borderRadius:10,background:"#1a56db",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},children:e.jsx(ro,{style:{width:18,height:18,color:"#fff"}})})]})' ,
    'e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8},children:e.jsx("button",{onClick:()=>p(!0),style:{width:34,height:34,borderRadius:10,background:"#1a56db",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},children:e.jsx(ro,{style:{width:18,height:18,color:"#fff"}})})})'))

# ── 2. Remove collapsible search bar (second child of sticky header div) ──
# Preceded by comma (array separator) - remove the comma too
COLL_OLD = (
    ',i&&e.jsx("div",{style:{padding:"0 16px 10px"},children:e.jsxs("div",{style:{position:"relative"},'
    'children:[e.jsx(Ha,{style:{width:13,height:13,position:"absolute",left:10,top:"50%",'
    'transform:"translateY(-50%)",color:"#9ca3af"}}),e.jsx("input",{autoFocus:!0,value:f,'
    'onChange:c=>j(c.target.value),placeholder:"Search projects…",style:{width:"100%",'
    'paddingLeft:30,paddingRight:10,paddingTop:8,paddingBottom:8,borderRadius:10,'
    'border:"1px solid #1a56db",background:"#ffffff",fontSize:12,fontFamily:"Inter,sans-serif",'
    'color:"#111827",outline:"none",boxSizing:"border-box"}})]})}'
    ')'
)
patches.append(('Remove collapsible search', COLL_OLD, ''))

# ── 3. Replace filter-only row with search + filter row ──
FILTER_OLD = (
    'e.jsx("div",{style:{padding:"8px 16px 4px",display:"flex",justifyContent:"flex-end"},'
    'children:e.jsxs("button",{onClick:()=>h(!0),style:{display:"flex",alignItems:"center",'
    'gap:5,padding:"6px 14px",borderRadius:8,border:`1px solid ${g.length||T.length||S.length?'
    '"#1a56db":"#e5e7eb"}`,background:g.length||T.length||S.length?"#EFF4FF":"#fff",fontSize:11,'
    'fontWeight:500,color:g.length||T.length||S.length?"#1a56db":"#374151",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},children:[e.jsx(As,{style:{width:12,height:12}}),'
    '" Filters",g.length+T.length+S.length>0&&e.jsx("span",{style:{width:15,height:15,'
    'borderRadius:"50%",background:"#1a56db",color:"#fff",fontSize:8,fontWeight:700,display:"flex",'
    'alignItems:"center",justifyContent:"center"},children:g.length+T.length+S.length})]})}'
    ')'
)
FILTER_NEW = (
    'e.jsxs("div",{style:{padding:"8px 16px 4px",display:"flex",alignItems:"center",gap:8},'
    'children:[e.jsxs("div",{style:{position:"relative",flex:1},children:['
    'e.jsx(Ha,{style:{width:12,height:12,position:"absolute",left:9,top:"50%",'
    'transform:"translateY(-50%)",color:"#9ca3af",pointerEvents:"none"}}),'
    'e.jsx("input",{value:f,onChange:c=>j(c.target.value),placeholder:"Search projects…",'
    'style:{width:"100%",paddingLeft:27,paddingRight:10,paddingTop:7,paddingBottom:7,'
    'borderRadius:10,border:"1px solid #e5e7eb",background:"#f9fafb",fontSize:12,'
    'fontFamily:"Inter,sans-serif",color:"#111827",outline:"none",boxSizing:"border-box"}})'
    ']}),e.jsxs("button",{onClick:()=>h(!0),style:{display:"flex",alignItems:"center",'
    'gap:5,padding:"6px 14px",borderRadius:8,border:`1px solid ${g.length||T.length||S.length?'
    '"#1a56db":"#e5e7eb"}`,background:g.length||T.length||S.length?"#EFF4FF":"#fff",fontSize:11,'
    'fontWeight:500,color:g.length||T.length||S.length?"#1a56db":"#374151",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer",flexShrink:0},children:['
    'e.jsx(As,{style:{width:12,height:12}})," Filters",'
    'g.length+T.length+S.length>0&&e.jsx("span",{style:{width:15,height:15,'
    'borderRadius:"50%",background:"#1a56db",color:"#fff",fontSize:8,fontWeight:700,display:"flex",'
    'alignItems:"center",justifyContent:"center"},children:g.length+T.length+S.length})]})]}'
    ')'
)
patches.append(('Search + filter row', FILTER_OLD, FILTER_NEW))

# ── 4. Add FAB "+" button before closing of screen div ──
FAB = (
    'e.jsx("div",{style:{position:"fixed",bottom:82,left:"50%",transform:"translateX(-50%)",'
    'width:"min(100vw,448px)",maxWidth:448,pointerEvents:"none",display:"flex",'
    'justifyContent:"flex-end",paddingRight:20,zIndex:50},'
    'children:e.jsx("button",{type:"button",onClick:()=>p(!0),'
    'style:{pointerEvents:"auto",width:54,height:54,borderRadius:"50%",background:"#1a56db",'
    'border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",'
    'boxShadow:"0 4px 20px rgba(26,86,219,0.45)"},'
    'children:e.jsx("span",{style:{color:"#fff",fontSize:28,lineHeight:1,fontWeight:300,'
    'marginTop:-2},children:"+"})})})'
)
patches.append(('Projects FAB',
    'm&&e.jsx(xm,{onClose:()=>p(!1),showToast:ye})]})' ,
    'm&&e.jsx(xm,{onClose:()=>p(!1),showToast:ye}),' + FAB + ']})'))

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
    print('FATAL: paren imbalance!')
    sys.exit(1)

# Bracket balance check
sq = content.count('[') - content.count(']')
orig_sq = original.count('[') - original.count(']')
print(f'Bracket balance: {sq} (was {orig_sq})')
if sq != orig_sq:
    print('FATAL: bracket imbalance!')
    sys.exit(1)

with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone. {len(patches)} patches applied.')
