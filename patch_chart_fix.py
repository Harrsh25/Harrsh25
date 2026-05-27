#!/usr/bin/env python3
"""
P1 – Collapse by default (Q[me.id]===!0 not !==!1)
P2 – Each version bar fills exactly one biweek column (22px wide),
     positioned in the column that matches the item's start date.
     This gives a clear, visible bar per version even for short items.
     Bars for different versions are stacked in the same column with
     distinct colours so users can see which version has what.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Collapse by default
# ──────────────────────────────────────────────────────────────────────────────
OLD1 = 'renderRow=(me,depth)=>{const Te=Q[me.id]!==!1,'
NEW1 = 'renderRow=(me,depth)=>{const Te=Q[me.id]===!0,'
if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 collapse-by-default: OK')
else:
    errors.append('P1'); print('P1 collapse-by-default: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Fix bar width: use Pe.width but make minimum = 22 (one column) so bars
#       are always visible. Keep proportional width if item has longer duration.
#       root (depth=0): minWidth 22, height 16
#       children (depth>0): minWidth 18, height 10, opacity 0.85
# ──────────────────────────────────────────────────────────────────────────────
# Root bars OLD
OLD2a = (
    '...js_all.map((blv,vi)=>Pe?e.jsx("div",{style:{position:"relative",'
    'height:18,zIndex:2},key:vi,'
    'children:e.jsxs("div",{style:{position:"absolute",'
    'left:Pe.left+(vi*2),width:Math.max(8,Pe.width-(vi*4)),'
    'height:18,borderRadius:4,background:Ts[vi],'
    'display:"flex",alignItems:"center",gap:2,paddingLeft:4,'
    'overflow:"hidden"},children:['
    'Pe.width>50&&e.jsxs("span",{style:{fontSize:9,fontWeight:600,'
    'color:"#fff",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"},'
    'children:[new Date(me.startDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})," – ",'
    'new Date(me.endDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})]})'
    ']})}):null)'
)
NEW2a = (
    '...js_all.map((blv,vi)=>Pe?e.jsx("div",{style:{position:"relative",'
    'height:16,zIndex:2},key:vi,'
    'children:e.jsxs("div",{style:{position:"absolute",'
    'left:Pe.left+(vi*2),width:Math.max(22,Pe.width-(vi*4)),'
    'height:16,borderRadius:4,background:Ts[vi],'
    'display:"flex",alignItems:"center",gap:2,paddingLeft:4,'
    'overflow:"hidden"},children:['
    'Math.max(22,Pe.width-(vi*4))>40&&e.jsxs("span",{style:{fontSize:9,fontWeight:600,'
    'color:"#fff",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"},'
    'children:[new Date(me.startDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})," – ",'
    'new Date(me.endDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})]})'
    ']})}):null)'
)
if OLD2a in content:
    content = content.replace(OLD2a, NEW2a, 1)
    print('P2a root bar width: OK')
else:
    errors.append('P2a'); print('P2a root bar width: FAIL')

# Child bars OLD
OLD2b = (
    '...js_all.map((blv,vi)=>Pe?e.jsx("div",{style:{position:"relative",'
    'height:12,zIndex:2},key:vi,'
    'children:e.jsx("div",{style:{position:"absolute",'
    'left:Pe.left+(vi*1),width:Math.max(6,Pe.width-(vi*2)),'
    'height:12,borderRadius:3,background:Ts[vi],opacity:0.8}})'
    '}):null)'
)
NEW2b = (
    '...js_all.map((blv,vi)=>Pe?e.jsx("div",{style:{position:"relative",'
    'height:10,zIndex:2},key:vi,'
    'children:e.jsx("div",{style:{position:"absolute",'
    'left:Pe.left+(vi*1),width:Math.max(18,Pe.width-(vi*2)),'
    'height:10,borderRadius:3,background:Ts[vi],opacity:0.85}})'
    '}):null)'
)
if OLD2b in content:
    content = content.replace(OLD2b, NEW2b, 1)
    print('P2b child bar width: OK')
else:
    errors.append('P2b'); print('P2b child bar width: FAIL')

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
