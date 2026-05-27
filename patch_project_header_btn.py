#!/usr/bin/env python3
"""
Add tab-conditional action button in the project name header row (right side):
- Baseline tab  → + Create Baseline
- Critical Path → ▶ Run Analysis
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# The project name row ends with the title div then `]})` closing the row's children.
# We inject a conditional button between the title div and the closing `]})`.

OLD = ('e.jsx("div",{style:{flex:1,minWidth:0},'
       'children:e.jsx("p",{style:{fontSize:15,fontWeight:700,color:"#111827",'
       'fontFamily:"Inter,sans-serif",overflow:"hidden",'
       'textOverflow:"ellipsis",whiteSpace:"nowrap"},'
       'children:i.name})}),]})')

# Conditional button: shown only on Baseline or CP tab
COND_BTN = (
    'I==="baseline"'
    '?e.jsxs("button",{onClick:()=>Ft("create"),'
    'style:{display:"flex",alignItems:"center",gap:5,'
    'padding:"6px 12px",borderRadius:8,border:"none",'
    'background:"#1a56db",fontSize:12,fontWeight:600,'
    'color:"#fff",fontFamily:"Inter,sans-serif",'
    'cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"},'
    'children:[e.jsx("span",{style:{fontSize:14,lineHeight:1},children:"+"}),'
    '" Create Baseline"]})'
    ':I==="cp"'
    '?e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
    'style:{display:"flex",alignItems:"center",gap:5,'
    'padding:"6px 12px",borderRadius:8,border:"none",'
    'background:"#1a56db",fontSize:12,fontWeight:600,'
    'color:"#fff",fontFamily:"Inter,sans-serif",'
    'cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"},'
    'children:[e.jsx("span",{children:"▶"})," Run Analysis"]})'
    ':null'
)

NEW = (
    'e.jsx("div",{style:{flex:1,minWidth:0},'
    'children:e.jsx("p",{style:{fontSize:15,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif",overflow:"hidden",'
    'textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:i.name})}),'
    + COND_BTN +
    ',]})'
)

ob_old = OLD.count('{') - OLD.count('}')
op_old = OLD.count('(') - OLD.count(')')
ob_new = NEW.count('{') - NEW.count('}')
op_new = NEW.count('(') - NEW.count(')')
print(f'OLD balance: ob={ob_old} op={op_old}')
print(f'NEW balance: ob={ob_new} op={op_new}')

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    print('P1 header button: OK')
else:
    errors.append('P1'); print('P1 header button: FAIL')

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
