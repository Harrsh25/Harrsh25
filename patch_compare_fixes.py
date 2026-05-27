#!/usr/bin/env python3
"""
Compare-result fixes:
P1  – Swap button order: Change Selection first, then Filters
P2  – Timeline dropdown: proper open/close dropdown with 4 options
P3  – Fix Type section wrapper: borderBottom so it appears properly
P4  – Add today red line to child rows
P5  – Increase name column width for readability (100→160)
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Swap: Change Selection first, Filters second in header
# ──────────────────────────────────────────────────────────────────────────────
FILTER_BTN = ('e.jsxs("button",{onClick:()=>sbf(!0),style:{display:"flex",'
              'alignItems:"center",gap:5,padding:"6px 10px",borderRadius:8,'
              'border:bfa.length>0?"1px solid #1a56db":"1px solid #e5e7eb",'
              'background:bfa.length>0?"#EFF4FF":"#fff",fontSize:11,fontWeight:500,'
              'color:bfa.length>0?"#1a56db":"#374151",'
              'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
              'children:[e.jsx(As,{style:{width:11,height:11,'
              'color:bfa.length>0?"#1a56db":"#6b7280"}}),bfa.length>0?" Filters ("'
              '+bfa.length+")":" Filters"]})')

CHANGE_BTN = ('e.jsxs("button",{onClick:()=>sbcs(!0),style:{display:"flex",'
              'alignItems:"center",gap:5,padding:"6px 10px",borderRadius:8,'
              'border:"1px solid #e5e7eb",background:"#fff",fontSize:11,fontWeight:500,'
              'color:"#374151",fontFamily:"Inter,sans-serif",cursor:"pointer"},'
              'children:[e.jsx(Vn,{size:11})," Change Selection"]})')

OLD1 = FILTER_BTN + ',' + CHANGE_BTN + ']})'
NEW1 = CHANGE_BTN + ',' + FILTER_BTN + ']})'

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 button order swap: OK')
else:
    errors.append('P1'); print('P1 button order swap: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Timeline dropdown: proper dropdown with 4 options
#      Need to also add [_blDD,_setBlDD]=b.useState(!1) state for open/close
# ──────────────────────────────────────────────────────────────────────────────
# Add _blDD state after _blType state
OLD2a = ('[_blView,_setBlView]=b.useState("monthly"),'
         '[_blType,_setBlType]=b.useState([])')
NEW2a = ('[_blView,_setBlView]=b.useState("monthly"),'
         '[_blType,_setBlType]=b.useState([]),'
         '[_blDD,_setBlDD]=b.useState(!1)')
if OLD2a in content:
    content = content.replace(OLD2a, NEW2a, 1)
    print('P2a _blDD state: OK')
else:
    errors.append('P2a'); print('P2a _blDD state: FAIL')

# Replace static cycle-on-click dropdown with proper open/close dropdown
OLD2b = ('e.jsxs("div",{onClick:()=>_setBlView(v=>{const o=["weekly","monthly","quarterly","yearly"];return o[(o.indexOf(v)+1)%o.length];}),style:{display:"flex",alignItems:"center",gap:6,'
         'border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 10px",'
         'background:"#fff",cursor:"pointer"},'
         'children:['
         'e.jsx("span",{style:{fontSize:11,fontWeight:500,color:"#374151",'
         'fontFamily:"Inter,sans-serif"},children:"Timeline"}),'
         'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#111827",'
         'fontFamily:"Inter,sans-serif"},children:_blView.charAt(0).toUpperCase()+_blView.slice(1)}),'
         'e.jsx(qe,{size:11,style:{color:"#6b7280"}})'
         ']})')
NEW2b = ('e.jsxs("div",{style:{position:"relative"},children:['
         'e.jsxs("button",{onClick:()=>_setBlDD(v=>!v),style:{display:"flex",'
         'alignItems:"center",gap:6,border:"1px solid #e5e7eb",borderRadius:8,'
         'padding:"5px 10px",background:"#fff",cursor:"pointer"},'
         'children:['
         'e.jsx("span",{style:{fontSize:11,fontWeight:500,color:"#374151",'
         'fontFamily:"Inter,sans-serif"},children:"Timeline"}),'
         'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#111827",'
         'fontFamily:"Inter,sans-serif"},children:_blView.charAt(0).toUpperCase()+_blView.slice(1)}),'
         'e.jsx(qe,{size:11,style:{color:"#6b7280",transform:_blDD?"rotate(180deg)":"none",transition:"transform 0.15s"}})'
         ']}),'
         '_blDD&&e.jsxs("div",{style:{position:"absolute",right:0,top:"calc(100% + 4px)",'
         'background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,'
         'boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:20,overflow:"hidden",minWidth:130},'
         'children:["Weekly","Monthly","Quarterly","Yearly"].map((op,oi)=>'
         'e.jsx("button",{onClick:()=>{_setBlView(op.toLowerCase());_setBlDD(!1);},'
         'style:{display:"block",width:"100%",padding:"9px 14px",border:"none",'
         'background:_blView===op.toLowerCase()?"#EFF4FF":"#fff",'
         'color:_blView===op.toLowerCase()?"#1a56db":"#374151",'
         'fontSize:12,fontWeight:_blView===op.toLowerCase()?700:400,'
         'fontFamily:"Inter,sans-serif",cursor:"pointer",textAlign:"left"},'
         'children:op},oi))})'
         ']})')
if OLD2b in content:
    content = content.replace(OLD2b, NEW2b, 1)
    print('P2b dropdown open/close: OK')
else:
    errors.append('P2b'); print('P2b dropdown: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P3 – Fix Type section: add borderBottom so it sits properly in the panel
# ──────────────────────────────────────────────────────────────────────────────
OLD3 = ('e.jsxs("div",{style:{padding:"0 0 4px"},children:['
        'e.jsx("p",{style:{padding:"13px 16px 8px",fontSize:13,fontWeight:700,'
        'color:"#111827",fontFamily:"Inter,sans-serif"},children:"Type"}),')
NEW3 = ('e.jsxs("div",{style:{borderBottom:"1px solid #f0f1f4"},children:['
        'e.jsx("span",{style:{display:"block",padding:"13px 16px",fontSize:13,fontWeight:700,'
        'color:"#111827",fontFamily:"Inter,sans-serif"},children:"Type"}),')
if OLD3 in content:
    content = content.replace(OLD3, NEW3, 1)
    print('P3 Type section style: OK')
else:
    errors.append('P3'); print('P3 Type section style: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P4 – Add today red line to child rows
# ──────────────────────────────────────────────────────────────────────────────
# Current child row bar container:
# e.jsxs("div",{style:{flex:1,position:"relative",minHeight:40,...gap:3,padding:"4px 0"},
#   children:[...js_all.map(bars)]})
# Need to add the today line inside before the bars
OLD4 = ('e.jsxs("div",{style:{flex:1,position:"relative",minHeight:40,'
        'display:"flex",flexDirection:"column",justifyContent:"center",'
        'gap:3,padding:"4px 0"},'
        'children:[...js_all.map((blv,vi)=>chPe?e.jsx("div"')
NEW4 = ('e.jsxs("div",{style:{flex:1,position:"relative",minHeight:40,'
        'display:"flex",flexDirection:"column",justifyContent:"center",'
        'gap:3,padding:"4px 0"},'
        'children:[e.jsx("div",{style:{position:"absolute",left:qs,top:0,'
        'width:1.5,height:"100%",background:"#dc2626",zIndex:3}}),'
        '...js_all.map((blv,vi)=>chPe?e.jsx("div"')
if OLD4 in content:
    content = content.replace(OLD4, NEW4, 1)
    print('P4 today line in children: OK')
else:
    errors.append('P4'); print('P4 today line in children: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P5 – Wider name column for readability (100 → 160px) in all rows
# ──────────────────────────────────────────────────────────────────────────────
# Header STRUCTURE label column
OLD5a = ('e.jsx("div",{style:{width:100,flexShrink:0,padding:"6px 10px",'
         'borderRight:"1px solid #e5e7eb"},children:e.jsx("span",{style:{fontSize:9,'
         'fontWeight:700,color:"#6b7280",letterSpacing:"0.5px",'
         'textTransform:"uppercase",fontFamily:"Inter,sans-serif"},children:"STRUCTURE"})})')
NEW5a = ('e.jsx("div",{style:{width:160,flexShrink:0,padding:"6px 10px",'
         'borderRight:"1px solid #e5e7eb"},children:e.jsx("span",{style:{fontSize:9,'
         'fontWeight:700,color:"#6b7280",letterSpacing:"0.5px",'
         'textTransform:"uppercase",fontFamily:"Inter,sans-serif"},children:"STRUCTURE"})})')
if OLD5a in content:
    content = content.replace(OLD5a, NEW5a, 1)
    print('P5a header column width: OK')
else:
    errors.append('P5a'); print('P5a header column width: FAIL')

# Main row name column
OLD5b = ('e.jsxs("div",{style:{width:100,flexShrink:0,display:"flex",'
         'alignItems:"center",gap:4,padding:"6px 8px",'
         'borderRight:"1px solid #e5e7eb",alignSelf:"stretch"}')
NEW5b = ('e.jsxs("div",{style:{width:160,flexShrink:0,display:"flex",'
         'alignItems:"center",gap:4,padding:"6px 8px",'
         'borderRight:"1px solid #e5e7eb",alignSelf:"stretch"}')
if OLD5b in content:
    content = content.replace(OLD5b, NEW5b, 1)
    print('P5b main row name col width: OK')
else:
    errors.append('P5b'); print('P5b main row name col width: FAIL')

# Child row name column
OLD5c = ('e.jsx("div",{style:{width:100,flexShrink:0,display:"flex",'
         'alignItems:"center",padding:"6px 8px 6px 20px",'
         'borderRight:"1px solid #e5e7eb"}')
NEW5c = ('e.jsx("div",{style:{width:160,flexShrink:0,display:"flex",'
         'alignItems:"center",padding:"6px 8px 6px 24px",'
         'borderRight:"1px solid #e5e7eb"}')
if OLD5c in content:
    content = content.replace(OLD5c, NEW5c, 1)
    print('P5c child row name col width: OK')
else:
    errors.append('P5c'); print('P5c child row name col width: FAIL')

# Also update minWidth in the Gantt scroll container
OLD5d = 'style:{minWidth:100+Ue*22}'
NEW5d = 'style:{minWidth:160+Ue*22}'
if OLD5d in content:
    content = content.replace(OLD5d, NEW5d, 1)
    print('P5d minWidth update: OK')
else:
    errors.append('P5d'); print('P5d minWidth update: FAIL')

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
