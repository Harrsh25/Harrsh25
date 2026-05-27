#!/usr/bin/env python3
"""
Insert critical-item summary cards between the toolbar row and the data rows in the
Critical Path view.

The cards are shown only after Run Analysis is clicked. They display up to 3 items
whose float <= 0 (critical path), with type badge, name, date range and assignee.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Insert critical cards section between toolbar and !_cpAnalyzed ternary
# ──────────────────────────────────────────────────────────────────────────────

OLD1 = ('children:["↓"," Export"]})]})]}),!_cpAnalyzed?')

CARDS = (
    '_cpAnalyzed&&(()=>{'
    'const cp_crit=cp_all.filter(it=>cp_gfl(it)<=0).slice(0,3);'
    'if(!cp_crit.length)return null;'
    'return e.jsx("div",{style:{display:"flex",gap:10,padding:"10px 16px",'
    'overflowX:"auto",borderBottom:"1px solid #e5e7eb",background:"#fff",'
    'flexShrink:0},children:cp_crit.map((it,ci)=>e.jsxs("div",{'
    'style:{minWidth:200,maxWidth:240,background:"#fff5f5",'
    'border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",'
    'display:"flex",flexDirection:"column",gap:5,flexShrink:0},'
    'children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'justifyContent:"space-between",gap:6},children:['
    'e.jsx("span",{style:{fontSize:8,fontWeight:700,'
    'color:it.type==="Activity"?"#7c3aed":it.type==="Sub-Task"?"#d97706":"#1a56db",'
    'background:it.type==="Activity"?"#f3e8ff":it.type==="Sub-Task"?"#fffbeb":"#EFF4FF",'
    'padding:"2px 5px",borderRadius:4,fontFamily:"Inter,sans-serif"},'
    'children:it.type==="Activity"?"ACT":it.type==="Sub-Task"?"SUB":"TASK"}),'
    'e.jsx("span",{style:{fontSize:9,fontWeight:700,color:"#dc2626",'
    'background:"#fee2e2",padding:"2px 6px",borderRadius:10,'
    'fontFamily:"Inter,sans-serif"},children:"⚠ Critical"})'
    ']}),'
    'e.jsx("div",{style:{fontSize:12,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif",overflow:"hidden",textOverflow:"ellipsis",'
    'whiteSpace:"nowrap"},children:it.name||"—"}),'
    'e.jsx("div",{style:{fontSize:10,color:"#6b7280",'
    'fontFamily:"Inter,sans-serif"},'
    'children:(it.startDate?new Date(it.startDate).toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"}):"—")+" → "+'
    '(it.endDate?new Date(it.endDate).toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"}):"—")}),'
    'e.jsxs("div",{style:{fontSize:10,color:"#374151",'
    'fontFamily:"Inter,sans-serif"},'
    'children:["Assignee: ",it.assignee||"—"]})'
    ']},ci))})'
    '})(),'
)

NEW1 = 'children:["↓"," Export"]})]})]}),'+CARDS+'!_cpAnalyzed?'

if OLD1 in content:
    ob_d = (NEW1.count('{')-NEW1.count('}')) - (OLD1.count('{')-OLD1.count('}'))
    op_d = (NEW1.count('(')-NEW1.count(')')) - (OLD1.count('(')-OLD1.count(')'))
    sq_d = (NEW1.count('[')-NEW1.count(']')) - (OLD1.count('[')-OLD1.count(']'))
    print(f'P1 delta: ob={ob_d} op={op_d} sq={sq_d}')
    content = content.replace(OLD1, NEW1, 1)
    print('P1 critical cards inserted: OK')
else:
    errors.append('P1'); print('P1 critical cards: FAIL')

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
