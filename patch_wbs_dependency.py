#!/usr/bin/env python3
"""
WBS list view - add DEPENDENCY column + "+" column + dependency modal
"""
import sys

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()
original = content

HDR = 'fontSize:9,fontWeight:700,color:"#9ca3af",letterSpacing:"0.5px",textTransform:"uppercase",fontFamily:"Inter,sans-serif"'

patches = []

# ── 1. Add state variables ──────────────────────────────────────────────────
patches.append(('Add dep state',
    '[bcs,sbcs]=b.useState(!1),Nn=({item:W,depth:pe})=>{'  ,
    '[bcs,sbcs]=b.useState(!1),'
    '[_depItem,_setDepItem]=b.useState(null),'
    '[_deps,_setDeps]=b.useState({}),'
    '[_depSrch,_setDepSrch]=b.useState(""),'
    '[_depBkOpen,_setDepBkOpen]=b.useState(!0),'
    '[_depBdOpen,_setDepBdOpen]=b.useState(!1),'
    'Nn=({item:W,depth:pe})=>{'))

# ── 2. Increase container minWidth ──────────────────────────────────────────
patches.append(('minWidth 520→760',
    'e.jsx("div",{style:{overflowX:"auto",WebkitOverflowScrolling:"touch"},children:e.jsxs("div",{style:{minWidth:520}',
    'e.jsx("div",{style:{overflowX:"auto",WebkitOverflowScrolling:"touch"},children:e.jsxs("div",{style:{minWidth:760}'))

# ── 3. Add DEPENDENCY + PLUS headers ───────────────────────────────────────
DEP_HDR = (
    'e.jsx("div",{style:{width:100,flexShrink:0,textAlign:"center",'
    + HDR + '},children:"DEPENDENCY"}),'
    'e.jsx("div",{style:{width:36,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"},'
    'children:e.jsx("button",{style:{width:22,height:22,borderRadius:6,'
    'background:"#f0f4ff",border:"1px solid #1a56db",display:"flex",alignItems:"center",'
    'justifyContent:"center",cursor:"pointer",fontSize:14,color:"#1a56db",fontWeight:700},'
    'title:"Add custom column",children:"+"})})'
)
patches.append(('Add DEP+PLUS headers',
    'children:"PROGRESS"}),]})',
    'children:"PROGRESS"}),' + DEP_HDR + ']})'))

# ── 4. Add DEPENDENCY + PLUS cells to each row ─────────────────────────────
DEP_CELL = (
    'e.jsx("div",{style:{width:100,flexShrink:0,display:"flex",alignItems:"center",'
    'justifyContent:"center",gap:5,cursor:"pointer"},onClick:function(){_setDepItem(W);},'
    'children:(function(){'
    'const _d=_deps[W.id]||{blocking:[],blocked:[]};'
    'const _bl=_d.blocking.length,_bd=_d.blocked.length;'
    'if(!_bl&&!_bd)return e.jsx("span",{style:{fontSize:11,color:"#d1d5db",'
    'fontFamily:"Inter,sans-serif"},children:"—"});'
    'return e.jsxs(e.Fragment,{children:['
    '_bl>0&&e.jsxs("span",{style:{fontSize:10,fontWeight:700,color:"#d97706",'
    'fontFamily:"Inter,sans-serif"},children:["↑",_bl]}),'
    '_bd>0&&e.jsxs("span",{style:{fontSize:10,fontWeight:700,color:"#1a56db",'
    'fontFamily:"Inter,sans-serif"},children:["↓",_bd]})]});'
    '})()}),'
    'e.jsx("div",{style:{width:36,flexShrink:0}})'
)
_p4_old = 'children:[W.progress,"%"]})]}),]}),_e&&je.map'
_p4_new = 'children:[W.progress,"%"]})'
_p4_new = _p4_new + ',' + DEP_CELL + ']}),]}),_e&&je.map'
patches.append(('Add DEP+PLUS cells', _p4_old, _p4_new))

# ── 5. Inject dependency modal before filter panel ──────────────────────────
MODAL = (
    '_depItem&&e.jsxs("div",{style:{position:"fixed",inset:0,zIndex:200,'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'background:"rgba(0,0,0,0.45)",padding:"20px"},children:['
    'e.jsx("div",{style:{position:"absolute",inset:0},'
    'onClick:function(){_setDepItem(null);_setDepSrch("");}})'
    ',e.jsxs("div",{style:{position:"relative",background:"#fff",borderRadius:16,'
    'width:"min(90vw,440px)",maxHeight:"80vh",display:"flex",flexDirection:"column",'
    'overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"},children:['
    # Header
    'e.jsxs("div",{style:{padding:"18px 20px 14px",borderBottom:"1px solid #f0f1f4"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between"},children:['
    'e.jsxs("div",{children:['
    'e.jsx("h2",{style:{fontSize:15,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif",margin:0},children:"Dependencies"}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:"Inter,sans-serif",'
    'marginTop:3,marginBottom:0},children:"Define how this entity blocks or is blocked by others"})'
    ']}),'
    'e.jsx("button",{onClick:function(){_setDepItem(null);_setDepSrch("");},style:{'
    'background:"none",border:"none",cursor:"pointer",padding:4,flexShrink:0},'
    'children:e.jsx(mt,{size:16,style:{color:"#9ca3af"}})})'
    ']})]})'
    # Dependency type
    ',e.jsxs("div",{style:{padding:"14px 20px",borderBottom:"1px solid #f0f1f4"},children:['
    'e.jsx("p",{style:{fontSize:9,fontWeight:700,color:"#9ca3af",letterSpacing:"0.5px",'
    'textTransform:"uppercase",fontFamily:"Inter,sans-serif",marginBottom:10},'
    'children:"DEPENDENCY TYPE"}),'
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},children:['
    'e.jsx("button",{style:{padding:"8px 12px",borderRadius:8,border:"2px solid #1a56db",'
    'background:"#EFF4FF",fontSize:12,fontWeight:600,color:"#1a56db",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer",textAlign:"left"},'
    'children:"Finish-to-Start"}),'
    'e.jsxs("button",{style:{padding:"8px 12px",borderRadius:8,border:"1px solid #e5e7eb",'
    'background:"#f9fafb",fontSize:12,fontWeight:500,color:"#9ca3af",'
    'fontFamily:"Inter,sans-serif",cursor:"not-allowed",textAlign:"left",'
    'display:"flex",alignItems:"center",justifyContent:"space-between"},'
    'children:["Finish-to-Finish",e.jsx("span",{children:"\U0001f512"})]}),'
    'e.jsxs("button",{style:{padding:"8px 12px",borderRadius:8,border:"1px solid #e5e7eb",'
    'background:"#f9fafb",fontSize:12,fontWeight:500,color:"#9ca3af",'
    'fontFamily:"Inter,sans-serif",cursor:"not-allowed",textAlign:"left",'
    'display:"flex",alignItems:"center",justifyContent:"space-between"},'
    'children:["Start-to-Start",e.jsx("span",{children:"\U0001f512"})]}),'
    'e.jsxs("button",{style:{padding:"8px 12px",borderRadius:8,border:"1px solid #e5e7eb",'
    'background:"#f9fafb",fontSize:12,fontWeight:500,color:"#9ca3af",'
    'fontFamily:"Inter,sans-serif",cursor:"not-allowed",textAlign:"left",'
    'display:"flex",alignItems:"center",justifyContent:"space-between"},'
    'children:["Start-to-Finish",e.jsx("span",{children:"\U0001f512"})]})]})'
    ',e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:"Inter,sans-serif",'
    'marginTop:8,marginBottom:0},'
    'children:"Only Finish-to-Start is supported in this phase."})'
    ']})'
    # Body
    ',e.jsxs("div",{style:{flex:1,overflowY:"auto"},children:['
    # Blocking section
    'e.jsxs("div",{style:{borderBottom:"1px solid #f0f1f4"},children:['
    'e.jsxs("button",{onClick:function(){_setDepBkOpen(function(o){return!o;});},style:{'
    'width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",'
    'padding:"12px 20px",background:"none",border:"none",cursor:"pointer"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    '_depBkOpen?e.jsx(qe,{size:13,style:{color:"#9ca3af"}}):e.jsx(Oe,{size:13,style:{color:"#9ca3af"}}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},children:"Blocking"}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},'
    'children:"Entities that depend on this one"})]}),'
    'e.jsx("span",{style:{minWidth:20,height:20,borderRadius:"50%",background:"#f0f1f4",'
    'display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,'
    'color:"#374151",fontFamily:"Inter,sans-serif",padding:"0 4px"},'
    'children:(_deps[_depItem.id]||{blocking:[]}).blocking.length})]}),'
    '_depBkOpen&&e.jsxs("div",{style:{padding:"0 20px 12px"},children:['
    'e.jsxs("div",{style:{position:"relative",marginBottom:10},children:['
    'e.jsx(al,{size:13,style:{position:"absolute",left:10,top:"50%",'
    'transform:"translateY(-50%)",color:"#9ca3af"}}),'
    'e.jsx("input",{value:_depSrch,'
    'onChange:function(c){_setDepSrch(c.target.value);},placeholder:"Search entities...",'
    'style:{width:"100%",paddingLeft:30,paddingRight:10,paddingTop:7,paddingBottom:7,'
    'borderRadius:8,border:"1px solid #e5e7eb",fontSize:12,fontFamily:"Inter,sans-serif",'
    'color:"#111827",outline:"none",boxSizing:"border-box"}})]}),'
    'Z.filter(function(it){return it.id!==_depItem.id&&(!_depSrch||it.name.toLowerCase().includes(_depSrch.toLowerCase()));}).map(function(it){'
    'const _isSel=(_deps[_depItem.id]||{blocking:[]}).blocking.includes(it.id);'
    'const _tc=it.type==="Activity"?"#7c3aed":it.type==="Sub-Task"?"#d97706":"#1a56db";'
    'return e.jsxs("div",{onClick:function(){_setDeps(function(prev){'
    'const _cur=prev[_depItem.id]||{blocking:[],blocked:[]};'
    'const _nb=_isSel?_cur.blocking.filter(function(id){return id!==it.id;}):_cur.blocking.concat([it.id]);'
    'return Object.assign({},prev,{[_depItem.id]:Object.assign({},_cur,{blocking:_nb})});});},'
    'style:{display:"flex",alignItems:"center",gap:8,padding:"7px 0",'
    'cursor:"pointer",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsx("div",{style:{width:16,height:16,borderRadius:4,'
    'border:_isSel?"2px solid #1a56db":"2px solid #e5e7eb",'
    'background:_isSel?"#1a56db":"#fff",display:"flex",alignItems:"center",'
    'justifyContent:"center",flexShrink:0},'
    'children:_isSel?e.jsx("span",{style:{color:"#fff",fontSize:9,fontWeight:700},'
    'children:"✓"}):null}),'
    'e.jsx("span",{style:{fontSize:9,fontWeight:600,color:_tc,'
    'background:_tc+"18",borderRadius:4,padding:"1px 5px",flexShrink:0,'
    'fontFamily:"Inter,sans-serif"},children:(it.type||"Task").toUpperCase()}),'
    'e.jsx("span",{style:{fontSize:12,color:"#111827",fontFamily:"Inter,sans-serif",'
    'flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:it.name})'
    ']},it.id);})]})]}),'
    # Blocked section
    'e.jsxs("div",{children:['
    'e.jsxs("button",{onClick:function(){_setDepBdOpen(function(o){return!o;});},style:{'
    'width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",'
    'padding:"12px 20px",background:"none",border:"none",cursor:"pointer"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    '_depBdOpen?e.jsx(qe,{size:13,style:{color:"#9ca3af"}}):e.jsx(Oe,{size:13,style:{color:"#9ca3af"}}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},children:"Blocked"}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},'
    'children:"Entities this one depends on"})]}),'
    'e.jsx("span",{style:{minWidth:20,height:20,borderRadius:"50%",background:"#f0f1f4",'
    'display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,'
    'color:"#374151",fontFamily:"Inter,sans-serif",padding:"0 4px"},'
    'children:(_deps[_depItem.id]||{blocked:[]}).blocked.length})]),'
    '_depBdOpen&&e.jsx("div",{style:{padding:"0 20px 12px"},'
    'children:Z.filter(function(it){return it.id!==_depItem.id&&(!_depSrch||it.name.toLowerCase().includes(_depSrch.toLowerCase()));}).map(function(it){'
    'const _isSel=(_deps[_depItem.id]||{blocked:[]}).blocked.includes(it.id);'
    'const _tc=it.type==="Activity"?"#7c3aed":it.type==="Sub-Task"?"#d97706":"#1a56db";'
    'return e.jsxs("div",{onClick:function(){_setDeps(function(prev){'
    'const _cur=prev[_depItem.id]||{blocking:[],blocked:[]};'
    'const _nb=_isSel?_cur.blocked.filter(function(id){return id!==it.id;}):_cur.blocked.concat([it.id]);'
    'return Object.assign({},prev,{[_depItem.id]:Object.assign({},_cur,{blocked:_nb})});});},'
    'style:{display:"flex",alignItems:"center",gap:8,padding:"7px 0",'
    'cursor:"pointer",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsx("div",{style:{width:16,height:16,borderRadius:4,'
    'border:_isSel?"2px solid #1a56db":"2px solid #e5e7eb",'
    'background:_isSel?"#1a56db":"#fff",display:"flex",alignItems:"center",'
    'justifyContent:"center",flexShrink:0},'
    'children:_isSel?e.jsx("span",{style:{color:"#fff",fontSize:9,fontWeight:700},'
    'children:"✓"}):null}),'
    'e.jsx("span",{style:{fontSize:9,fontWeight:600,color:_tc,'
    'background:_tc+"18",borderRadius:4,padding:"1px 5px",flexShrink:0,'
    'fontFamily:"Inter,sans-serif"},children:(it.type||"Task").toUpperCase()}),'
    'e.jsx("span",{style:{fontSize:12,color:"#111827",fontFamily:"Inter,sans-serif",'
    'flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:it.name})'
    ']},it.id);})})]})]})'
    # Footer
    ',e.jsxs("div",{style:{padding:"12px 20px",borderTop:"1px solid #f0f1f4",'
    'display:"flex",gap:10,justifyContent:"flex-end"},children:['
    'e.jsx("button",{onClick:function(){_setDepItem(null);_setDepSrch("");},style:{'
    'padding:"9px 20px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",'
    'fontSize:13,fontWeight:600,color:"#374151",fontFamily:"Inter,sans-serif",'
    'cursor:"pointer"},children:"Cancel"}),'
    'e.jsx("button",{onClick:function(){_setDepItem(null);_setDepSrch("");},style:{'
    'padding:"9px 20px",borderRadius:8,border:"none",background:"#1a56db",'
    'fontSize:13,fontWeight:600,color:"#fff",fontFamily:"Inter,sans-serif",'
    'cursor:"pointer"},children:"Done"})]})]})]}),'
)

OLD_FILTER_START = 'M&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:60},onClick:()=>c(!1)})'
patches.append(('Inject dep modal', OLD_FILTER_START, MODAL + OLD_FILTER_START))

# ── Validate ────────────────────────────────────────────────────────────────
errors = []
for name, old, new in patches:
    count = content.count(old)
    if count == 0:
        errors.append(f'NOT FOUND: {name}')
    elif count > 1:
        errors.append(f'AMBIGUOUS ({count}): {name}')

if errors:
    print('ERRORS:')
    for e in errors: print(' ', e)
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
