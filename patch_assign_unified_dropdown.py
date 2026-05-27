#!/usr/bin/env python3
"""
Replace the two separate Project + Sub-Project dropdowns on the Assignments page
with a single unified hierarchical dropdown.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# Extract OLD using position anchors (avoids string escaping issues)
# ──────────────────────────────────────────────────────────────────────────────
DD_START = ('e.jsxs("div",{style:{position:"relative"},children:'
            '[e.jsxs("button",{type:"button",onClick:function(ev)'
            '{ev.preventDefault();ev.stopPropagation();_setDPrjDd(function(p){return !p;});_setDSubDd(!1);}')
DD_END   = 'children:s.name},qi);})]})]})'

si = content.find(DD_START, 482000, 483000)
ei = content.find(DD_END, 485200)
if si == -1 or ei == -1:
    errors.append('extract'); print('OLD extract: FAIL si=%d ei=%d' % (si,ei))
else:
    OLD = content[si:ei+len(DD_END)]
    print('OLD len=%d ob=%d op=%d sq=%d' % (
        len(OLD),
        OLD.count('{')-OLD.count('}'),
        OLD.count('(')-OLD.count(')'),
        OLD.count('[')-OLD.count(']'),
    ))

# ──────────────────────────────────────────────────────────────────────────────
# Build NEW: single unified hierarchical dropdown
# ──────────────────────────────────────────────────────────────────────────────
# Button label: breadcrumb "ProjectName / SubName" or "All Projects"
BTN_LABEL = '_dPrj==="all"?"All Projects":(_dSub==="all"?_prjName:_prjName+" / "+_subName)'

# Project row in dropdown list
PRJ_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();'
    '_setDPrj(p.id);_setDSub("all");if(!_pHasSubs)_setDPrjDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",'
    'textAlign:"left",padding:"8px 12px",'
    'fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_pSel&&_dSub==="all"?700:400,'
    'color:_pSel?"#1a56db":"#374151",'
    'background:_pSel&&_dSub==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:['
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af"},children:"⊘"}),'
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:p.name}),'
    '_pSel&&_dSub==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0},children:"✓"})'
    ']},qi+1)'
)

# Sub row (indented under selected project)
SUB_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();'
    '_setDSub(s.id);_setDPrjDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",'
    'textAlign:"left",padding:"8px 12px 8px 28px",'
    'fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_sA?700:400,'
    'color:_sA?"#1a56db":"#374151",'
    'background:_sA?"#EFF4FF":"#f8faff",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6",'
    'borderLeft:"3px solid #e5e7eb"},'
    'children:['
    'e.jsx("span",{style:{fontSize:11,color:"#b0b8c8"},children:"⊘"}),'
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:s.name}),'
    '_sA&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0},children:"✓"})'
    ']},qi+"-"+si)'
)

# All Projects row
ALL_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();'
    '_setDPrj("all");_setDSub("all");_setDPrjDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",'
    'textAlign:"left",padding:"8px 12px",'
    'fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_dPrj==="all"?700:400,'
    'color:_dPrj==="all"?"#1a56db":"#374151",'
    'background:_dPrj==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:['
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af"},children:"⊘"}),'
    'e.jsx("span",{style:{flex:1},children:"All Projects"}),'
    '_dPrj==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0},children:"✓"})'
    ']},0)'
)

NEW = (
    'e.jsxs("div",{style:{position:"relative"},children:['
    # Trigger button with breadcrumb label
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setDPrjDd(function(p){return !p;});},'
    'style:{display:"flex",alignItems:"center",gap:4,padding:"6px 10px",'
    'border:"1px solid "+(_dPrj==="all"?"#e5e7eb":"#1a56db"),'
    'borderRadius:10,'
    'background:_dPrj==="all"?"#fff":"#EFF4FF",'
    'color:_dPrj==="all"?"#6b7280":"#1a56db",'
    'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",'
    'cursor:"pointer",maxWidth:170,minWidth:60},'
    'children:['
    'e.jsx("span",{style:{flex:1,textAlign:"left",overflow:"hidden",'
    'textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:' + BTN_LABEL + '}),'
    'e.jsx("span",{style:{fontSize:9,flexShrink:0},children:_dPrjDd?"▲":"▼"})'
    ']}),'
    # Dropdown panel
    '_dPrjDd&&e.jsx("div",{style:{position:"absolute",right:0,'
    'top:"calc(100% + 4px)",background:"#fff",'
    'border:"1px solid #e5e7eb",borderRadius:10,'
    'boxShadow:"0 8px 24px rgba(0,0,0,0.12)",'
    'zIndex:999,minWidth:210,maxHeight:320,overflowY:"auto"},'
    'children:e.jsxs("div",{children:['
    + ALL_ROW + ','
    # Projects with nested subs
    '...il.flatMap(function(p,qi){'
    'var _pSubs=(_dSubMap[p.id]||[]);'
    'var _pSel=(_dPrj===p.id);'
    'var _pHasSubs=(_pSubs.length>0);'
    'var rows=[' + PRJ_ROW + '];'
    'if(_pSel&&_pHasSubs){'
    'rows=rows.concat(_pSubs.map(function(s,si){'
    'var _sA=(_dSub===s.id);'
    'return ' + SUB_ROW + ';'
    '}));'
    '}'
    'return rows;})'
    ']})})'
    ']})'
)

ob_n = NEW.count('{')-NEW.count('}')
op_n = NEW.count('(')-NEW.count(')')
sq_n = NEW.count('[')-NEW.count(']')
print('NEW balance: ob=%d op=%d sq=%d' % (ob_n, op_n, sq_n))

if not errors:
    if OLD in content:
        content = content.replace(OLD, NEW, 1)
        print('Unified dropdown: OK')
    else:
        errors.append('replace'); print('Unified dropdown replace: FAIL')

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
