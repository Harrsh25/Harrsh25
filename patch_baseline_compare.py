#!/usr/bin/env python3
"""
Baseline compare enhancements:
P1  – Add _blView / _blType state vars
P2  – Compare button: move to right side of toolbar
P3  – Remove spurious "Live" badge from saved baselines in list
P4  – compare-select: cap selection at 4 versions
P5  – compare-result: add js_all (all selected items with data)
P6  – Dynamic COMPARING row + working Timeline dropdown
P7  – Dynamic main-row bars (one per selected version)
P8  – Dynamic child bars
P9  – Dynamic legend
P10 – Type filter (Activity / Task / Sub-Task) in filter panel + applied
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Add _blView / _blType state variables
# ──────────────────────────────────────────────────────────────────────────────
OLD1 = '[Ut,Ox]=b.useState([]),[wa,id]=b.useState([])'
NEW1 = '[Ut,Ox]=b.useState([]),[wa,id]=b.useState([]),[_blView,_setBlView]=b.useState("monthly"),[_blType,_setBlType]=b.useState([])'
if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 state vars: OK')
else:
    errors.append('P1'); print('P1 state vars: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Compare button to right side of baseline list toolbar
# ──────────────────────────────────────────────────────────────────────────────
OLD2 = ('display:"flex",justifyContent:"space-between",alignItems:"center",'
        'padding:"12px 16px",background:"#fff",borderBottom:"1px solid #e5e7eb"},'
        'children:[e.jsxs("button",{onClick:()=>{Ut.length>0&&Ft("compare-select")}')
NEW2 = ('display:"flex",justifyContent:"flex-end",alignItems:"center",'
        'padding:"12px 16px",background:"#fff",borderBottom:"1px solid #e5e7eb"},'
        'children:[e.jsxs("button",{onClick:()=>{Ut.length>0&&Ft("compare-select")}')
if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2 Compare btn right: OK')
else:
    errors.append('P2'); print('P2 Compare btn right: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P3 – Remove "Live" badge from saved baselines in list view
# ──────────────────────────────────────────────────────────────────────────────
OLD3 = ('W.isLive&&e.jsx("span",{style:{fontSize:10,fontWeight:600,'
        'color:"#1a56db",background:"#EFF4FF",borderRadius:6,padding:"2px 8px",'
        'fontFamily:"Inter,sans-serif"},children:"Live"}),')
NEW3 = ''
if OLD3 in content:
    content = content.replace(OLD3, NEW3, 1)
    print('P3 Live badge removed: OK')
else:
    errors.append('P3'); print('P3 Live badge: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P4 – compare-select: cap at 4 versions
#      Also update counter display
# ──────────────────────────────────────────────────────────────────────────────
OLD4a = 'onClick:()=>id(_e=>_e.includes(W.id)?_e.filter(Ae=>Ae!==W.id):[..._e,W.id])'
NEW4a = 'onClick:()=>id(_e=>_e.includes(W.id)?_e.filter(Ae=>Ae!==W.id):_e.length>=4?_e:[..._e,W.id])'
if OLD4a in content:
    content = content.replace(OLD4a, NEW4a)   # replace all (both panels)
    print('P4a 4-version limit: OK')
else:
    errors.append('P4a'); print('P4a 4-version limit: FAIL')

OLD4b = 'children:[wa.length,"/",Ut.length+1," selected"]'
NEW4b = 'children:[wa.length," / 4 selected"]'
if OLD4b in content:
    content = content.replace(OLD4b, NEW4b, 1)
    print('P4b counter display: OK')
else:
    errors.append('P4b'); print('P4b counter display: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P5 – Add js_all (all selected items) variable in compare-result IIFE
# ──────────────────────────────────────────────────────────────────────────────
OLD5 = ('Ts=["#1a56db","#059669","#7c3aed","#d97706","#dc2626"],'
        'js=Ut.find(me=>wa.includes(me.id));return')
NEW5 = ('Ts=["#1a56db","#059669","#7c3aed","#d97706","#dc2626"],'
        'js=Ut.find(me=>wa.includes(me.id)),'
        'js_all=[{id:"current",name:"Current",version:"Live",isLive:!0},...Ut]'
        '.filter(x=>wa.includes(x.id));return')
if OLD5 in content:
    content = content.replace(OLD5, NEW5, 1)
    print('P5 js_all variable: OK')
else:
    errors.append('P5'); print('P5 js_all variable: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P6 – Dynamic COMPARING row + working Timeline dropdown
# ──────────────────────────────────────────────────────────────────────────────
OLD6 = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'justifyContent:"space-between"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:5},'
    'children:['
    'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",'
    'background:"#1a56db",display:"block"}}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#1a56db",'
    'borderBottom:"2px solid #1a56db",fontFamily:"Inter,sans-serif"},'
    'children:"Current"})]}),'
    'e.jsx("span",{style:{fontSize:12,color:"#9ca3af",'
    'fontFamily:"Inter,sans-serif"},children:"vs"}),'
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:5},'
    'children:['
    'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",'
    'background:"#dc2626",display:"block"}}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#dc2626",'
    'borderBottom:"2px solid #dc2626",fontFamily:"Inter,sans-serif"},'
    'children:js?`${js.name} (${js.version})`:"v1 (V0)"}'
    ')]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,'
    'border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 10px",'
    'background:"#fff",cursor:"pointer"},'
    'children:['
    'e.jsx("span",{style:{fontSize:11,fontWeight:500,color:"#374151",'
    'fontFamily:"Inter,sans-serif"},children:"Timeline View"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},children:"Monthly"}),'
    'e.jsx(qe,{size:11,style:{color:"#6b7280"}})'
    ']})]})]}),')

NEW6 = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'justifyContent:"space-between"},children:['
    'e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"},'
    'children:js_all.flatMap((x,xi)=>['
    '...(xi>0?[e.jsx("span",{style:{fontSize:12,color:"#9ca3af",'
    'fontFamily:"Inter,sans-serif"},children:"vs"},`vs${xi}`)]:[]),'
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:5},'
    'key:xi,children:['
    'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",'
    'background:Ts[xi],display:"block"}}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:Ts[xi],'
    'borderBottom:"2px solid "+Ts[xi],fontFamily:"Inter,sans-serif"},'
    'children:x.isLive?"Current":x.name+" ("+x.version+")"})'
    ']})])}),'
    'e.jsxs("div",{onClick:()=>_setBlView(v=>{const o=["weekly","monthly","quarterly","yearly"];return o[(o.indexOf(v)+1)%o.length];}),style:{display:"flex",alignItems:"center",gap:6,'
    'border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 10px",'
    'background:"#fff",cursor:"pointer"},'
    'children:['
    'e.jsx("span",{style:{fontSize:11,fontWeight:500,color:"#374151",'
    'fontFamily:"Inter,sans-serif"},children:"Timeline"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},children:_blView.charAt(0).toUpperCase()+_blView.slice(1)}),'
    'e.jsx(qe,{size:11,style:{color:"#6b7280"}})'
    ']})]})]}),')

if OLD6 in content:
    content = content.replace(OLD6, NEW6, 1)
    print('P6 dynamic comparing row + timeline: OK')
else:
    errors.append('P6'); print('P6 dynamic comparing row: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P7 – Dynamic main-row bars (one per selected version in js_all)
# ──────────────────────────────────────────────────────────────────────────────
OLD7 = (
    'Pe&&e.jsx("div",{style:{position:"relative",height:18,zIndex:2},'
    'children:e.jsxs("div",{style:{position:"absolute",left:Pe.left,'
    'width:Pe.width,height:18,borderRadius:4,background:"#1a56db",'
    'display:"flex",alignItems:"center",gap:2,paddingLeft:4,overflow:"hidden"},'
    'children:[Pe.width>50&&e.jsxs("span",{style:{fontSize:9,fontWeight:600,'
    'color:"#fff",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"},'
    'children:[new Date(me.startDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})," – ",'
    'new Date(me.endDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})]})]})}),'
    'Pe&&e.jsx("div",{style:{position:"relative",height:18,zIndex:2},'
    'children:e.jsxs("div",{style:{position:"absolute",left:Pe.left+2,'
    'width:Pe.width-4,height:18,borderRadius:4,background:"#e11d48",'
    'display:"flex",alignItems:"center",gap:2,paddingLeft:4,overflow:"hidden"},'
    'children:[Pe.width>50&&e.jsxs("span",{style:{fontSize:9,fontWeight:600,'
    'color:"#fff",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"},'
    'children:[new Date(me.startDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})," – ",'
    'new Date(me.endDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})]})]})})]})]')

NEW7 = (
    '...js_all.map((blv,vi)=>Pe?e.jsx("div",{style:{position:"relative",'
    'height:18,zIndex:2},key:vi,children:e.jsxs("div",{style:{position:"absolute",'
    'left:Pe.left+(vi*2),width:Math.max(8,Pe.width-(vi*4)),'
    'height:18,borderRadius:4,background:Ts[vi],'
    'display:"flex",alignItems:"center",gap:2,paddingLeft:4,overflow:"hidden"},'
    'children:[Pe.width>50&&e.jsxs("span",{style:{fontSize:9,fontWeight:600,'
    'color:"#fff",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"},'
    'children:[new Date(me.startDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})," – ",'
    'new Date(me.endDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})]})]})}):null)]})]')

if OLD7 in content:
    content = content.replace(OLD7, NEW7, 1)
    print('P7 dynamic main bars: OK')
else:
    errors.append('P7'); print('P7 dynamic main bars: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P8 – Dynamic child bars
# ──────────────────────────────────────────────────────────────────────────────
OLD8 = (
    'chPe&&e.jsx("div",{style:{position:"relative",height:12,zIndex:2},'
    'children:e.jsx("div",{style:{position:"absolute",left:chPe.left,'
    'width:chPe.width,height:12,borderRadius:3,background:"#1a56db",opacity:0.7}})}),'
    'chPe&&e.jsx("div",{style:{position:"relative",height:12,zIndex:2},'
    'children:e.jsx("div",{style:{position:"absolute",left:chPe.left+1,'
    'width:chPe.width-2,height:12,borderRadius:3,background:"#e11d48",opacity:0.7}})})]})]')

NEW8 = (
    '...js_all.map((blv,vi)=>chPe?e.jsx("div",{style:{position:"relative",'
    'height:12,zIndex:2},key:vi,children:e.jsx("div",{style:{position:"absolute",'
    'left:chPe.left+(vi*1),width:Math.max(6,chPe.width-(vi*2)),'
    'height:12,borderRadius:3,background:Ts[vi],opacity:0.8}})}):null)]})]')

if OLD8 in content:
    content = content.replace(OLD8, NEW8, 1)
    print('P8 dynamic child bars: OK')
else:
    errors.append('P8'); print('P8 dynamic child bars: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P9 – Dynamic legend
# ──────────────────────────────────────────────────────────────────────────────
OLD9 = ('[{color:"#1a56db",label:"Current Baseline"},'
        '{color:"#e11d48",label:`${js?`${js.name} (${js.version})`:"v1 (V0)"} Baseline`}]')
NEW9 = ('js_all.map((x,xi)=>({color:Ts[xi],label:x.isLive?"Current":x.name+" ("+x.version+")"}))')
if OLD9 in content:
    content = content.replace(OLD9, NEW9, 1)
    print('P9 dynamic legend: OK')
else:
    errors.append('P9'); print('P9 dynamic legend: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P10 – Type filter section in filter panel + apply to row filter
# ──────────────────────────────────────────────────────────────────────────────
# 10a: apply _blType in row filter expression
OLD10a = 'ne.filter(me=>bfa.length===0||bfa.includes(me.assignee)).map'
NEW10a = ('ne.filter(me=>'
          '(bfa.length===0||bfa.includes(me.assignee))&&'
          '(_blType.length===0||_blType.includes(me.type||"Activity"))).map')
if OLD10a in content:
    content = content.replace(OLD10a, NEW10a, 1)
    print('P10a type filter in row filter: OK')
else:
    errors.append('P10a'); print('P10a type filter in row filter: FAIL')

# 10b: add Type section in filter panel (before Apply button)
OLD10b = (
    'fontFamily:"Inter,sans-serif"},children:W.name})]},W.name)})})]})})  ,'
    'e.jsx("div",{style:{padding:"12px 16px",borderTop:"1px solid #f0f1f4"},'
    'children:e.jsx("button",{onClick:()=>sbf(!1)')
NEW10b = (
    'fontFamily:"Inter,sans-serif"},children:W.name})]},W.name)})})]})}),'
    'e.jsxs("div",{style:{padding:"0 0 4px"},children:['
    'e.jsx("p",{style:{padding:"13px 16px 8px",fontSize:13,fontWeight:700,'
    'color:"#111827",fontFamily:"Inter,sans-serif"},children:"Type"}),'
    'e.jsx("div",{style:{padding:"0 16px 12px",display:"flex",flexWrap:"wrap",gap:7},'
    'children:["Activity","Task","Sub-Task"].map((tp,tpi)=>{'
    'const sel=_blType.includes(tp);return e.jsxs("button",'
    '{onClick:()=>_setBlType(t=>sel?t.filter(v=>v!==tp):[...t,tp]),'
    'style:{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",'
    'borderRadius:20,border:"1.5px solid "+(sel?"#1a56db":"#e5e7eb"),'
    'background:sel?"#EFF4FF":"#fff",cursor:"pointer"},'
    'children:[e.jsx("span",{style:{width:6,height:6,borderRadius:"50%",'
    'background:"#1a56db"}}),e.jsx("span",{style:{fontSize:11,'
    'fontWeight:sel?700:400,color:sel?"#1a56db":"#374151",'
    'fontFamily:"Inter,sans-serif"},children:tp})]},tpi)})})]})'
    '  ,e.jsx("div",{style:{padding:"12px 16px",borderTop:"1px solid #f0f1f4"},'
    'children:e.jsx("button",{onClick:()=>sbf(!1)')
if OLD10b in content:
    content = content.replace(OLD10b, NEW10b, 1)
    print('P10b type filter panel: OK')
else:
    errors.append('P10b'); print('P10b type filter panel: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# Verify & write
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
    print(f'{{ delta: {ob},  ( delta: {op},  [ delta: {sq}')

    if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
