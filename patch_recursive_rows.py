#!/usr/bin/env python3
"""
Replace flat 2-level compare-result rows with a fully recursive multi-level
expand/collapse hierarchy that mirrors the WBS list view.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Add renderRow recursive function to IIFE constants (after js_all)
# ──────────────────────────────────────────────────────────────────────────────
RENDER_ROW = (
    # ── bar-area cell (flex:1) reused at every depth level ──────────────────
    # renderRow=(me,depth)=>{...};
    'renderRow=(me,depth)=>{'
    'const Te=Q[me.id]!==!1,'
    'ch=z(me.id),'
    'Pe=wt(me),'
    'ind=depth*14,'
    'rowH=depth===0?56:44,'
    'barH=depth===0?18:13;'
    'return e.jsxs(qn.Fragment,{'
    'children:['
    # ── row div ──────────────────────────────────────────────────────────────
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'borderBottom:"1px solid #f0f1f4",'
    'background:depth===0?"#ffffff":depth===1?"#f9fafb":"#f3f4f6",'
    'minHeight:rowH},children:['
    # ── name column ──────────────────────────────────────────────────────────
    'e.jsxs("div",{style:{width:160,flexShrink:0,display:"flex",'
    'alignItems:"center",gap:4,'
    'padding:"6px 8px 6px "+(8+ind)+"px",'
    'borderRight:"1px solid #e5e7eb",alignSelf:"stretch"},children:['
    'ch.length>0'
    '?e.jsx("button",{onClick:()=>g(Ye=>({...Ye,[me.id]:!Te})),'
    'style:{background:"none",border:"none",cursor:"pointer",padding:0,'
    'display:"flex",flexShrink:0,alignSelf:"flex-start",marginTop:6},'
    'children:Te?e.jsx(qe,{size:11,style:{color:"#6b7280"}}):'
    'e.jsx(Oe,{size:11,style:{color:"#6b7280"}})})'
    ':e.jsx("span",{style:{width:11,flexShrink:0,display:"block"}}),'
    'e.jsx("span",{style:{fontSize:depth===0?11:10,'
    'fontWeight:depth===0?700:500,color:"#111827",'
    'fontFamily:"Inter,sans-serif",overflow:"hidden",'
    'textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0},'
    'title:me.name,children:me.name})'
    ']}),'
    # ── gantt bars column ────────────────────────────────────────────────────
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
    ']})}):null)'
    ']})'
    ']})'
    # ── recursive children ───────────────────────────────────────────────────
    ',Te&&ch.length>0&&ch.map(ci=>renderRow(ci,depth+1))'
    ']},me.id)}'
)

OLD1 = ('js_all=[{id:"current",name:"Current",version:"Live",isLive:!0},...Ut]'
        '.filter(x=>wa.includes(x.id));return')
NEW1 = ('js_all=[{id:"current",name:"Current",version:"Live",isLive:!0},...Ut]'
        '.filter(x=>wa.includes(x.id)),'
        + RENDER_ROW +
        ';return')

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 renderRow function added: OK')
else:
    errors.append('P1'); print('P1 renderRow function: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Replace old flat map with recursive renderRow call
# ──────────────────────────────────────────────────────────────────────────────
# OLD: the entire ne.filter(...).map((me,Ne)=>{ complex flat 2-level callback })
# NEW: ne.filter(...).map(me=>renderRow(me,0))

cr_start = content.find('Ar==="compare-result"')
row_filter_start = content.find('ne.filter(me=>(bfa.length===0', cr_start)
map_end_idx = content.find('},me.id)', row_filter_start)
OLD2 = content[row_filter_start:map_end_idx + 10]  # 10 = len('},me.id)})')

NEW2 = ('ne.filter(me=>(bfa.length===0||bfa.includes(me.assignee))&&'
        '(_blType.length===0||_blType.includes(me.type||"Activity")))'
        '.map(me=>renderRow(me,0))')

if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2 recursive map: OK')
else:
    errors.append('P2'); print('P2 recursive map: FAIL')

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
