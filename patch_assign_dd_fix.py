#!/usr/bin/env python3
"""
Fix the unified hierarchical dropdown:
 - Always close the dropdown when clicking a project (intuitive UX)
 - Show subs for the currently-selected project when dropdown opens
 - Replace ⊘ with an inline SVG folder icon
 - Use .concat() instead of spread for safety
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# Find the current unified dropdown section
# ──────────────────────────────────────────────────────────────────────────────
DD_BTN_START = ('e.jsxs("div",{style:{position:"relative"},children:'
                '[e.jsxs("button",{type:"button",onClick:function(ev)'
                '{ev.preventDefault();ev.stopPropagation();_setDPrjDd(function(p){return !p;});}')
DD_END_MARKER = 'return rows;})]})})]})'

si = content.find(DD_BTN_START, 482000, 483000)
ei = content.find(DD_END_MARKER, 484000)
if si == -1 or ei == -1:
    errors.append('find'); print('Find OLD: FAIL si=%d ei=%d' % (si, ei))
else:
    OLD = content[si:ei+len(DD_END_MARKER)]
    print('OLD len=%d ob=%d op=%d sq=%d found=%s' % (
        len(OLD),
        OLD.count('{')-OLD.count('}'),
        OLD.count('(')-OLD.count(')'),
        OLD.count('[')-OLD.count(']'),
        OLD in content,
    ))

# ──────────────────────────────────────────────────────────────────────────────
# SVG folder icon (inline, 12x10, stroke-based)
# ──────────────────────────────────────────────────────────────────────────────
def folder_icon(color):
    return (
        'e.jsx("svg",{width:13,height:11,viewBox:"0 0 13 11",fill:"none",'
        'stroke:"' + color + '",strokeWidth:"1.2",strokeLinecap:"round",'
        'strokeLinejoin:"round",style:{flexShrink:0},'
        'children:e.jsx("path",{d:"M0 3.5 L0 9.5 Q0 11 1.5 11 L11.5 11'
        ' Q13 11 13 9.5 L13 4.5 Q13 3 11.5 3 L6.5 3 L5.5 1.5 L1.5 1.5'
        ' Q0 1.5 0 3.5 Z"})})'
    )

# ──────────────────────────────────────────────────────────────────────────────
# Build NEW dropdown
# ──────────────────────────────────────────────────────────────────────────────
BTN_LABEL = '_dPrj==="all"?"All Projects":(_dSub==="all"?_prjName:_prjName+" / "+_subName)'

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
    + folder_icon('#9ca3af') + ','
    'e.jsx("span",{style:{flex:1},children:"All Projects"}),'
    '_dPrj==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},0)'
)

PRJ_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();'
    '_setDPrj(p.id);_setDSub("all");_setDPrjDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",'
    'textAlign:"left",padding:"8px 12px",'
    'fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_pSel&&_dSub==="all"?700:400,'
    'color:_pSel?"#1a56db":"#374151",'
    'background:_pSel&&_dSub==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:['
    + folder_icon('"+((_pSel)?"#1a56db":"#9ca3af")+"') + ','
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:p.name}),'
    '_pSel&&_dSub==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+1)'
)

SUB_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();'
    '_setDSub(s.id);_setDPrjDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",'
    'textAlign:"left",padding:"8px 12px 8px 32px",'
    'fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_sA?700:400,'
    'color:_sA?"#1a56db":"#374151",'
    'background:_sA?"#EFF4FF":"#f8faff",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:['
    + folder_icon('"+((_sA)?"#1a56db":"#b0b8c8")+"') + ','
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:s.name}),'
    '_sA&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+"-"+si)'
)

NEW = (
    'e.jsxs("div",{style:{position:"relative"},children:['
    # Trigger button
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setDPrjDd(function(p){return !p;});},'
    'style:{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",'
    'border:"1px solid "+(_dPrj==="all"?"#e5e7eb":"#1a56db"),'
    'borderRadius:10,'
    'background:_dPrj==="all"?"#fff":"#EFF4FF",'
    'color:_dPrj==="all"?"#6b7280":"#1a56db",'
    'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",'
    'cursor:"pointer",maxWidth:180,minWidth:60},'
    'children:['
    + folder_icon('"+((_dPrj!=="all")?"#1a56db":"#9ca3af")+"') + ','
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
    'zIndex:999,minWidth:220,maxHeight:320,overflowY:"auto"},'
    'children:e.jsx("div",{children:([' + ALL_ROW + '].concat('
    'il.flatMap(function(p,qi){'
    'var _pSubs=(_dSubMap[p.id]||[]);'
    'var _pSel=(_dPrj===p.id);'
    'var rows=[' + PRJ_ROW + '];'
    'if(_pSel&&_pSubs.length>0){'
    'rows=rows.concat(_pSubs.map(function(s,si){'
    'var _sA=(_dSub===s.id);'
    'return ' + SUB_ROW + ';'
    '}));'
    '}'
    'return rows;}))'
    ')})})'
    ']})'
)

ob_n = NEW.count('{')-NEW.count('}')
op_n = NEW.count('(')-NEW.count(')')
sq_n = NEW.count('[')-NEW.count(']')
print('NEW balance: ob=%d op=%d sq=%d' % (ob_n, op_n, sq_n))

if not errors:
    if OLD in content:
        content = content.replace(OLD, NEW, 1)
        print('Fixed dropdown: OK')
    else:
        errors.append('replace'); print('Replace: FAIL')

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
