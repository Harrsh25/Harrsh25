#!/usr/bin/env python3
"""
Restore graph / bars to match the original flat-row appearance:
P1 – Expand by default (revert Q[me.id]===!0 -> Q[me.id]!==!1)
P2 – Child bars (depth>0): height 12, vi*1 offset, vi*2 width reduction,
     opacity 0.8, no flex date-label wrapper – matching original child rows
P3 – Child bar container: gap:3, padding "4px 0" (not gap:4 / "6px 0"),
     and no biweek grid-lines in child rows
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Expand by default
# ──────────────────────────────────────────────────────────────────────────────
OLD1 = 'renderRow=(me,depth)=>{const Te=Q[me.id]===!0,'
NEW1 = 'renderRow=(me,depth)=>{const Te=Q[me.id]!==!1,'
if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 expand-by-default: OK')
else:
    errors.append('P1'); print('P1 expand-by-default: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2+P3 – Fix child (depth>0) bar container + bars to match original
#
# OLD bar section (same for all depths):
#   e.jsxs("div",{style:{flex:1,position:"relative",minHeight:rowH,
#     display:"flex",flexDirection:"column",justifyContent:"center",
#     gap:4,padding:"6px 0"},children:[
#     today-line,
#     grid-lines (_e.map),
#     ...js_all.map((blv,vi)=>Pe?e.jsx("div",{height:barH,zIndex:2},
#       e.jsxs("div",{absolute, left:Pe.left+(vi*2), width:max(8,Pe.width-(vi*4)),
#               height:barH, borderRadius:4, background, display:flex,...},
#         [date-label-condition])
#     ):null)
#   ]}),
#
# NEW: same for depth===0, but for depth>0 use original child style:
#   e.jsxs("div",{style:{flex:1,position:"relative",minHeight:40,
#     display:"flex",flexDirection:"column",justifyContent:"center",
#     gap:3,padding:"4px 0"},children:[
#     today-line,
#     (no grid lines)
#     ...js_all.map((blv,vi)=>Pe?e.jsx("div",{height:12,zIndex:2},
#       e.jsx("div",{absolute, left:Pe.left+(vi*1), width:max(6,Pe.width-(vi*2)),
#               height:12, borderRadius:3, background, opacity:0.8})
#     ):null)
#   ]}),
# ──────────────────────────────────────────────────────────────────────────────

OLD2 = (
    'e.jsxs("div",{style:{flex:1,position:"relative",minHeight:rowH,'
    'display:"flex",flexDirection:"column",justifyContent:"center",'
    'gap:4,padding:"6px 0"},children:['
    'e.jsx("div",{style:{position:"absolute",left:qs,top:0,width:1.5,'
    'height:"100%",background:"#dc2626",zIndex:3}}),'
    '_e.map((Ye,He)=>Ye.biweeks.map((yt,bt)=>e.jsx("div",{style:{'
    'position:"absolute",'
    'left:(_e.slice(0,He).reduce((Zt,zs)=>Zt+zs.biweeks.length,0)+bt)*22,'
    'top:0,width:22,height:"100%",borderRight:"1px solid #f3f4f6"}'
    '},`${He}-${bt}`))),'
    '...js_all.map((blv,vi)=>Pe?e.jsx("div",{style:{position:"relative",'
    'height:barH,zIndex:2},key:vi,'
    'children:e.jsxs("div",{style:{position:"absolute",'
    'left:Pe.left+(vi*2),width:Math.max(8,Pe.width-(vi*4)),'
    'height:barH,borderRadius:4,background:Ts[vi],'
    'display:"flex",alignItems:"center",gap:2,paddingLeft:4,'
    'overflow:"hidden"},children:['
    'Pe.width>50&&depth===0&&e.jsxs("span",{style:{fontSize:9,fontWeight:600,'
    'color:"#fff",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"},'
    'children:[new Date(me.startDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})," – ",'
    'new Date(me.endDate||"").toLocaleDateString("en-GB",'
    '{day:"numeric",month:"short"})]})'
    ']})}):null)]})'
)

NEW2 = (
    # depth===0: full style with grid lines + date labels
    # depth>0:   original child style (smaller, opacity, no grid lines)
    'depth===0'
    '?e.jsxs("div",{style:{flex:1,position:"relative",minHeight:56,'
    'display:"flex",flexDirection:"column",justifyContent:"center",'
    'gap:4,padding:"6px 0"},children:['
    'e.jsx("div",{style:{position:"absolute",left:qs,top:0,width:1.5,'
    'height:"100%",background:"#dc2626",zIndex:3}}),'
    '_e.map((Ye,He)=>Ye.biweeks.map((yt,bt)=>e.jsx("div",{style:{'
    'position:"absolute",'
    'left:(_e.slice(0,He).reduce((Zt,zs)=>Zt+zs.biweeks.length,0)+bt)*22,'
    'top:0,width:22,height:"100%",borderRight:"1px solid #f3f4f6"}'
    '},`${He}-${bt}`))),'
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
    ']})}):null)]}'
    ')'
    # depth>0: child style
    ':e.jsxs("div",{style:{flex:1,position:"relative",minHeight:40,'
    'display:"flex",flexDirection:"column",justifyContent:"center",'
    'gap:3,padding:"4px 0"},children:['
    'e.jsx("div",{style:{position:"absolute",left:qs,top:0,width:1.5,'
    'height:"100%",background:"#dc2626",zIndex:3}}),'
    '...js_all.map((blv,vi)=>Pe?e.jsx("div",{style:{position:"relative",'
    'height:12,zIndex:2},key:vi,'
    'children:e.jsx("div",{style:{position:"absolute",'
    'left:Pe.left+(vi*1),width:Math.max(6,Pe.width-(vi*2)),'
    'height:12,borderRadius:3,background:Ts[vi],opacity:0.8}})'
    '}):null)'
    ']})'
)

if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2+P3 child bar style fix: OK')
else:
    errors.append('P2'); print('P2+P3 child bar style: FAIL')

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
