#!/usr/bin/env python3
"""
My Assignments page: Replace two native <select> dropdowns with a single
unified hierarchical custom dropdown that:
 - Shows all projects; projects with subs ALWAYS have them expanded below
 - Sub-project rows use GitBranch icon, project rows use folder SVG
 - Single button shows breadcrumb: "Project / Sub" or "All Projects"
 - Clicking project closes dropdown and filters by project
 - Clicking sub closes dropdown and filters by that specific sub
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Add _mDD state to My Assignments state chain
# ──────────────────────────────────────────────────────────────────────────────
OLD_S = '[m,p]=b.useState("all"),[x,h]=b.useState("all"),[v,k]=b.useState(!1)'
NEW_S = '[m,p]=b.useState("all"),[x,h]=b.useState("all"),[_mDD,_setMDD]=b.useState(!1),[v,k]=b.useState(!1)'
if OLD_S in content:
    content = content.replace(OLD_S, NEW_S, 1)
    print('P1 _mDD state: OK')
else:
    errors.append('P1'); print('P1: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Replace two <select> boxes with unified hierarchical dropdown
# ──────────────────────────────────────────────────────────────────────────────
OLD2 = (
    'e.jsxs("div",{style:{position:"relative",flexShrink:0},children:'
    '[e.jsx("select",{value:m,onChange:L=>p(L.target.value),'
    'style:{padding:"7px 24px 7px 10px",borderRadius:10,border:"1px solid #e5e7eb",'
    'background:"#fff",fontSize:11,fontFamily:"Inter,sans-serif",'
    'color:"#374151",outline:"none",cursor:"pointer",appearance:"none",maxWidth:130},'
    'children:z.map(L=>e.jsx("option",{value:L,children:L==="all"?"All Projects":'
    'L.length>14?L.slice(0,12)+"…":L},L))}),e.jsx(qe,{size:11,'
    'style:{position:"absolute",right:7,top:"50%",'
    'transform:"translateY(-50%)",color:"#6b7280",pointerEvents:"none"}})]}),'
    '$&&e.jsxs("div",{style:{position:"relative",flexShrink:0},children:'
    '[e.jsxs("select",{value:x,onChange:L=>h(L.target.value),'
    'style:{padding:"7px 24px 7px 10px",borderRadius:10,border:"1px solid #e5e7eb",'
    'background:"#fff",fontSize:11,fontFamily:"Inter,sans-serif",'
    'color:x&&x!=="all"?"#111827":"#9ca3af",outline:"none",cursor:"pointer",'
    'appearance:"none",maxWidth:130},'
    'children:[e.jsx("option",{value:"all",children:"Select Sub-project"}),'
    'B.map(L=>e.jsx("option",{value:L,children:L.length>14?L.slice(0,12)+"…":L},L))]}),'
    'e.jsx(qe,{size:11,style:{position:"absolute",right:7,top:"50%",'
    'transform:"translateY(-50%)",color:"#9ca3af",pointerEvents:"none"}})]})]})'
)

# Folder SVG (inline, 13x11)
FOLDER = (
    'e.jsx("svg",{width:13,height:11,viewBox:"0 0 13 11",fill:"none",'
    'stroke:"currentColor",strokeWidth:"1.2",strokeLinecap:"round",'
    'strokeLinejoin:"round",style:{flexShrink:0},'
    'children:e.jsx("path",{d:"M0 3.5 L0 9.5 Q0 11 1.5 11 L11.5 11'
    ' Q13 11 13 9.5 L13 4.5 Q13 3 11.5 3 L6.5 3 L5.5 1.5 L1.5 1.5'
    ' Q0 1.5 0 3.5 Z"})})'
)

# All projects row
ALL_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();p("all");h("all");_setMDD(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:m==="all"?700:400,'
    'color:m==="all"?"#1a56db":"#374151",'
    'background:m==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:['
    + FOLDER + ','
    'e.jsx("span",{style:{flex:1},children:"All Projects"}),'
    'm==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},0)'
)

# Full sub-project name map (same data as used in B, but full map)
SM = (
    '{dp1:["Site Assessment","IT Infrastructure Setup","Furniture & Fitout"],'
    'dp2:["Leave & Attendance Module"],'
    'dp3:["Project Management Module","Approval Workflow Engine",'
    '"Document Repository","Analytics Dashboard","Mobile Application"]}'
)

# Project row
PRJ_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();p(proj.name);h("all");_setMDD(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_pSel&&x==="all"?700:400,'
    'color:_pSel?"#1a56db":"#374151",'
    'background:_pSel&&x==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:['
    + FOLDER + ','
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:proj.name}),'
    '_pSel&&x==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+1)'
)

# Sub-project row (GitBranch icon = Lu)
SUB_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();p(proj.name);h(sName);_setMDD(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"7px 12px 7px 28px",fontSize:11,fontFamily:"Inter,sans-serif",'
    'fontWeight:_sA?700:400,'
    'color:_sA?"#1a56db":"#374151",'
    'background:_sA?"#EFF4FF":"#f8faff",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6",'
    'borderLeft:"3px solid #e5e7eb"},'
    'children:['
    'e.jsx(Lu,{size:11,style:{flexShrink:0,color:_sA?"#1a56db":"#9ca3af"}}),'
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:sName}),'
    '_sA&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+"-"+si)'
)

# Button label expression
BTN_LABEL = 'm==="all"?"All Projects":(x==="all"?m:m+" / "+x)'

NEW2 = (
    # Unified trigger button + dropdown (position:relative wrapper)
    'e.jsxs("div",{style:{position:"relative",flexShrink:0},children:['
    # Trigger button
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setMDD(function(p){return !p;});},'
    'style:{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",'
    'borderRadius:10,border:"1px solid "+(m==="all"?"#e5e7eb":"#1a56db"),'
    'background:m==="all"?"#fff":"#EFF4FF",'
    'color:m==="all"?"#6b7280":"#1a56db",'
    'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",'
    'cursor:"pointer",maxWidth:180,minWidth:60},'
    'children:['
    + FOLDER + ','
    'e.jsx("span",{style:{flex:1,textAlign:"left",overflow:"hidden",'
    'textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:' + BTN_LABEL + '}),'
    'e.jsx(qe,{size:9,style:{flexShrink:0}})'
    ']}),'
    # Dropdown panel (IIFE to define _sm locally)
    '_mDD&&(function(){'
    'var _sm=' + SM + ';'
    'return e.jsx("div",{style:{position:"absolute",right:0,'
    'top:"calc(100% + 4px)",background:"#fff",'
    'border:"1px solid #e5e7eb",borderRadius:10,'
    'boxShadow:"0 8px 24px rgba(0,0,0,0.12)",'
    'zIndex:999,minWidth:230,maxHeight:340,overflowY:"auto"},'
    'children:e.jsx("div",{children:([' + ALL_ROW + '].concat('
    'il.flatMap(function(proj,qi){'
    'var _pSubs=(_sm[proj.id]||[]);'
    'var _pSel=(m===proj.name);'
    'var rows=[' + PRJ_ROW + '];'
    'if(_pSubs.length>0){'
    'rows=rows.concat(_pSubs.map(function(sName,si){'
    'var _sA=(_pSel&&x===sName);'
    'return ' + SUB_ROW + ';'
    '}));'
    '}'
    'return rows;})))})})'
    ']})'
)

ob_o = OLD2.count('{')-OLD2.count('}')
op_o = OLD2.count('(')-OLD2.count(')')
sq_o = OLD2.count('[')-OLD2.count(']')
ob_n = NEW2.count('{')-NEW2.count('}')
op_n = NEW2.count('(')-NEW2.count(')')
sq_n = NEW2.count('[')-NEW2.count(']')
print(f'OLD balance: ob={ob_o} op={op_o} sq={sq_o}')
print(f'NEW balance: ob={ob_n} op={op_n} sq={sq_n}')

if not errors:
    if OLD2 in content:
        content = content.replace(OLD2, NEW2, 1)
        print('P2 unified dropdown: OK')
    else:
        errors.append('P2'); print('P2: FAIL')

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
    print('{ delta:', ob, ' ( delta:', op, ' [ delta:', sq)
    if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
