#!/usr/bin/env python3
"""
My Assignments page: Replace two native <select> dropdowns with a unified
hierarchical custom dropdown. All projects always show their sub-projects
expanded below them. Project rows use folder SVG icon; sub-project rows
use Lu (GitBranch) icon with indentation.
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
# P2 – Extract OLD using position anchors
# ──────────────────────────────────────────────────────────────────────────────
START = 'e.jsxs("div",{style:{position:"relative",flexShrink:0},children:[e.jsx("select",{value:m,onChange:L=>p(L.target.value)'
END   = 'pointerEvents:"none"}})]})]})'

si = content.find(START, 408000, 412000)
ei = content.find(END, si + 100) if si != -1 else -1
if si == -1 or ei == -1:
    errors.append('P2-find'); print('P2 find: FAIL si=%d ei=%d' % (si, ei))
else:
    OLD2 = content[si:ei + len(END)]
    print('OLD2 len=%d ob=%d op=%d sq=%d' % (
        len(OLD2),
        OLD2.count('{') - OLD2.count('}'),
        OLD2.count('(') - OLD2.count(')'),
        OLD2.count('[') - OLD2.count(']'),
    ))

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Build NEW unified hierarchical dropdown
# ──────────────────────────────────────────────────────────────────────────────
FOLDER = (
    'e.jsx("svg",{width:13,height:11,viewBox:"0 0 13 11",fill:"none",'
    'stroke:"currentColor",strokeWidth:"1.2",strokeLinecap:"round",'
    'strokeLinejoin:"round",style:{flexShrink:0},'
    'children:e.jsx("path",{d:"M0 3.5 L0 9.5 Q0 11 1.5 11 L11.5 11'
    ' Q13 11 13 9.5 L13 4.5 Q13 3 11.5 3 L6.5 3 L5.5 1.5 L1.5 1.5'
    ' Q0 1.5 0 3.5 Z"})})'
)

SM = (
    '{dp1:["Site Assessment","IT Infrastructure Setup","Furniture & Fitout"],'
    'dp2:["Leave & Attendance Module"],'
    'dp3:["Project Management Module","Approval Workflow Engine",'
    '"Document Repository","Analytics Dashboard","Mobile Application"]}'
)

ALL_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();p("all");h("all");_setMDD(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:m==="all"?700:400,'
    'color:m==="all"?"#1a56db":"#374151",'
    'background:m==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:[' + FOLDER + ','
    'e.jsx("span",{style:{flex:1},children:"All Projects"}),'
    'm==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},0)'
)

PRJ_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();p(proj.name);h("all");_setMDD(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_pSel&&x==="all"?700:400,'
    'color:_pSel?"#1a56db":"#374151",'
    'background:_pSel&&x==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:[' + FOLDER + ','
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:proj.name}),'
    '_pSel&&x==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+1)'
)

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

BTN_LABEL = 'm==="all"?"All Projects":(x==="all"?m:m+" / "+x)'

# Inner unified wrapper (must be balanced: ob=0, op=0, sq=0)
INNER = (
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
    # IIFE to define _sm locally and render dropdown panel
    '_mDD&&(function(){'
    'var _sm=' + SM + ';'
    'return e.jsx("div",{style:{position:"absolute",right:0,'
    'top:"calc(100% + 4px)",background:"#fff",'
    'border:"1px solid #e5e7eb",borderRadius:10,'
    'boxShadow:"0 8px 24px rgba(0,0,0,0.12)",'
    'zIndex:999,minWidth:230,maxHeight:340,overflowY:"auto"},'
    'children:e.jsx("div",{children:('
    '[' + ALL_ROW + '].concat('
    'il.flatMap(function(proj,qi){'
    'var _pSubs=(_sm[proj.id]||[]);'
    'var _pSel=(m===proj.name);'
    'var rows=[' + PRJ_ROW + '];'
    'rows=rows.concat(_pSubs.map(function(sName,si){'
    'var _sA=(_pSel&&x===sName);'
    'return ' + SUB_ROW + ';'
    '}));'
    'return rows;'
    '})'    # close flatMap(function(proj,qi){...})
    ')'     # close .concat(
    ')'     # close children:(
    '})'    # close inner e.jsx("div",{children:...})
    '})'    # close outer e.jsx("div",{style:...,children:...})
    '})()'  # close IIFE function body, invoke it
    ']}'    # close unified div children array and props object
    ')'     # close e.jsxs("div", for the unified wrapper
)

print('INNER ob=%d op=%d sq=%d' % (
    INNER.count('{') - INNER.count('}'),
    INNER.count('(') - INNER.count(')'),
    INNER.count('[') - INNER.count(']'),
))

# NEW2 = inner part + parent container close (same as what OLD2 ends with)
NEW2 = INNER + ']})'

print('NEW2  ob=%d op=%d sq=%d' % (
    NEW2.count('{') - NEW2.count('}'),
    NEW2.count('(') - NEW2.count(')'),
    NEW2.count('[') - NEW2.count(']'),
))

# ──────────────────────────────────────────────────────────────────────────────
# Apply replacement
# ──────────────────────────────────────────────────────────────────────────────
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
