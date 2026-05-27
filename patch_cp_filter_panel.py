#!/usr/bin/env python3
"""
Add a right-side filter panel to the Critical Path view.
Filters: Critical Only (0d), Low Float (≤2d), Healthy Float (>2d),
         Float > 0, Delayed Critical, Activities, Tasks, Subtasks.
P1 – Add _cpFPnl and _cpFlt state.
P2 – Wire Filters button to open panel + show active-count badge.
P3 – Insert filter panel JSX (same pattern as assignments page).
P4 – Apply _cpFlt to cp_rows filter logic.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Add _cpFPnl and _cpFlt states
# ──────────────────────────────────────────────────────────────────────────────
OLD1 = '[_cpDD,_setCpDD]=b.useState(!1),[_cpExp,_setCpExp]=b.useState({})'
NEW1 = ('[_cpDD,_setCpDD]=b.useState(!1),[_cpExp,_setCpExp]=b.useState({}),'
        '[_cpFPnl,_setCpFPnl]=b.useState(!1),[_cpFlt,_setCpFlt]=b.useState([])')
if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 states added: OK')
else:
    errors.append('P1'); print('P1 states: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Wire Filters button: add onClick + active styling + badge
# ──────────────────────────────────────────────────────────────────────────────
OLD2 = ('e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,'
        'padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",'
        'background:"#fff",fontSize:11,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},children:["⊟"," Filters"]})')
NEW2 = ('e.jsxs("button",{onClick:()=>_setCpFPnl(!0),'
        'style:{display:"flex",alignItems:"center",gap:4,'
        'padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",'
        'background:_cpFlt.length>0?"#EFF4FF":"#fff",'
        'fontSize:11,color:_cpFlt.length>0?"#1a56db":"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:["⊟"," Filters",'
        '_cpFlt.length>0&&e.jsx("span",{style:{fontSize:9,fontWeight:700,'
        'color:"#fff",background:"#1a56db",borderRadius:"50%",'
        'width:16,height:16,display:"flex",alignItems:"center",'
        'justifyContent:"center"},children:_cpFlt.length})]})')
if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2 Filters button wired: OK')
else:
    errors.append('P2'); print('P2 Filters button: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P3 – Insert filter panel before !_cpAnalyzed? ternary
# ──────────────────────────────────────────────────────────────────────────────
FLOAT_CHIPS = (
    '[{v:"crit",d:"Critical Only (0d)",c:"#dc2626"},'
    '{v:"low",d:"Low Float (≤2d)",c:"#d97706"},'
    '{v:"healthy",d:"Healthy Float (>2d)",c:"#16a34a"},'
    '{v:"pos",d:"Float > 0",c:"#1a56db"},'
    '{v:"delayed",d:"Delayed Critical",c:"#7c3aed"}]'
    '.map((f,fi)=>{'
    'const ac=_cpFlt.includes(f.v);'
    'return e.jsxs("button",{onClick:()=>_setCpFlt(pv=>ac?pv.filter(x=>x!==f.v):[...pv,f.v]),'
    'style:{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",'
    'borderRadius:20,border:"1.5px solid "+(ac?f.c:"#e5e7eb"),'
    'background:ac?f.c+"18":"#fff",cursor:"pointer"},'
    'children:['
    'e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:f.c,flexShrink:0}}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:ac?700:400,'
    'color:ac?f.c:"#374151",fontFamily:"Inter,sans-serif"},children:f.d})'
    ']},fi)})'
)
TYPE_CHIPS = (
    '[{v:"act",d:"Activities",c:"#7c3aed"},'
    '{v:"task",d:"Tasks",c:"#1a56db"},'
    '{v:"sub",d:"Subtasks",c:"#d97706"}]'
    '.map((f,fi)=>{'
    'const ac=_cpFlt.includes(f.v);'
    'return e.jsxs("button",{onClick:()=>_setCpFlt(pv=>ac?pv.filter(x=>x!==f.v):[...pv,f.v]),'
    'style:{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",'
    'borderRadius:20,border:"1.5px solid "+(ac?f.c:"#e5e7eb"),'
    'background:ac?f.c+"18":"#fff",cursor:"pointer"},'
    'children:['
    'e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:f.c,flexShrink:0}}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:ac?700:400,'
    'color:ac?f.c:"#374151",fontFamily:"Inter,sans-serif"},children:f.d})'
    ']},fi)})'
)
PANEL = (
    '_cpFPnl&&e.jsx("div",{style:{position:"fixed",inset:0,zIndex:80,'
    'background:"rgba(0,0,0,0.4)"},onClick:()=>_setCpFPnl(!1),'
    'children:e.jsxs("div",{style:{position:"absolute",'
    'right:"max(0px,calc(50% - 224px))",top:0,bottom:0,'
    'width:"75%",maxWidth:280,background:"#fff",overflowY:"auto",'
    'boxShadow:"-4px 0 20px rgba(0,0,0,0.1)"},'
    'onClick:ev=>ev.stopPropagation(),'
    'children:['
    # Header
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",'
    'alignItems:"center",padding:"48px 16px 16px",'
    'borderBottom:"1px solid #f0f1f4"},children:['
    'e.jsx("p",{style:{fontSize:15,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},children:"Filters"}),'
    'e.jsx("button",{type:"button",onClick:()=>_setCpFPnl(!1),'
    'style:{width:28,height:28,borderRadius:8,background:"#f3f4f6",'
    'border:"none",cursor:"pointer",fontSize:14},children:"✕"})'
    ']}),'
    # Float section
    'e.jsxs("div",{style:{borderBottom:"1px solid #f0f1f4"},children:['
    'e.jsx("div",{style:{padding:"14px 16px",fontSize:13,fontWeight:700,'
    'color:"#111827",fontFamily:"Inter,sans-serif"},children:"Float"}),'
    'e.jsx("div",{style:{padding:"0 16px 14px",display:"flex",'
    'flexWrap:"wrap",gap:8},children:' + FLOAT_CHIPS + '})'
    ']}),'
    # Type section
    'e.jsxs("div",{style:{borderBottom:"1px solid #f0f1f4"},children:['
    'e.jsx("div",{style:{padding:"14px 16px",fontSize:13,fontWeight:700,'
    'color:"#111827",fontFamily:"Inter,sans-serif"},children:"Type"}),'
    'e.jsx("div",{style:{padding:"0 16px 14px",display:"flex",'
    'flexWrap:"wrap",gap:8},children:' + TYPE_CHIPS + '})'
    ']}),'
    # Clear button
    'e.jsx("div",{style:{padding:"12px 16px",borderTop:"1px solid #f0f1f4"},'
    'children:e.jsx("button",{onClick:()=>{_setCpFlt([]);_setCpFPnl(!1);},'
    'style:{width:"100%",padding:"10px",borderRadius:8,border:"none",'
    'background:"#f3f4f6",fontSize:12,fontWeight:600,color:"#374151",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
    'children:"Clear Filters"})})'
    ']})})'
)

OLD3 = '}))}),!_cpAnalyzed?e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1'
NEW3 = '}))}),'+PANEL+',!_cpAnalyzed?e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1'
if OLD3 in content:
    ob_d = (NEW3.count('{')-NEW3.count('}')) - (OLD3.count('{')-OLD3.count('}'))
    op_d = (NEW3.count('(')-NEW3.count(')')) - (OLD3.count('(')-OLD3.count(')'))
    sq_d = (NEW3.count('[')-NEW3.count(']')) - (OLD3.count('[')-OLD3.count(']'))
    print(f'P3 delta: ob={ob_d} op={op_d} sq={sq_d}')
    content = content.replace(OLD3, NEW3, 1)
    print('P3 filter panel inserted: OK')
else:
    errors.append('P3'); print('P3 panel: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P4 – Apply _cpFlt to the cp_rows filter
# ──────────────────────────────────────────────────────────────────────────────
OLD4 = ('const cp_hasCrit=it=>cp_gfl(it)<=0||(z(it.id).some(c2=>cp_hasCrit(c2)));'
        'const cp_rows=_cpInclInd?ne.filter(it=>cp_hasDate(it)):ne.filter(it=>cp_hasCrit(it));')
NEW4 = ('const cp_hasCrit=it=>cp_gfl(it)<=0||(z(it.id).some(c2=>cp_hasCrit(c2)));'
        'const cp_fltM=it=>{'
        'if(!_cpFlt.length)return true;'
        'const fl=cp_gfl(it);'
        'const hf=_cpFlt.some(f=>["crit","low","healthy","pos","delayed"].includes(f));'
        'const ht=_cpFlt.some(f=>["act","task","sub"].includes(f));'
        'const fm=hf&&((_cpFlt.includes("crit")&&fl<=0)'
        '||(_cpFlt.includes("low")&&fl>=0&&fl<=2)'
        '||(_cpFlt.includes("healthy")&&fl>2&&fl<999)'
        '||(_cpFlt.includes("pos")&&fl>0&&fl<999)'
        '||(_cpFlt.includes("delayed")&&fl<=0&&it.endDate&&new Date(it.endDate)<new Date()));'
        'const tm=ht&&((_cpFlt.includes("act")&&it.type==="Activity")'
        '||(_cpFlt.includes("task")&&it.type==="Task")'
        '||(_cpFlt.includes("sub")&&it.type==="Sub-Task"));'
        'if(hf&&ht)return fm&&tm;if(hf)return fm;return tm;};'
        'const cp_fltT=it=>cp_fltM(it)||z(it.id).some(c2=>cp_fltT(c2));'
        'const cp_rows=_cpInclInd'
        '?ne.filter(it=>cp_hasDate(it)&&(!_cpFlt.length||cp_fltT(it)))'
        ':ne.filter(it=>cp_hasCrit(it)&&(!_cpFlt.length||cp_fltT(it)));')
if OLD4 in content:
    ob_d = (NEW4.count('{')-NEW4.count('}')) - (OLD4.count('{')-OLD4.count('}'))
    op_d = (NEW4.count('(')-NEW4.count(')')) - (OLD4.count('(')-OLD4.count(')'))
    sq_d = (NEW4.count('[')-NEW4.count(']')) - (OLD4.count('[')-OLD4.count(']'))
    print(f'P4 delta: ob={ob_d} op={op_d} sq={sq_d}')
    content = content.replace(OLD4, NEW4, 1)
    print('P4 filter logic: OK')
else:
    errors.append('P4'); print('P4 filter logic: FAIL')

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
