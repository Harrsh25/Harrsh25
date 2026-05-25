#!/usr/bin/env python3
"""
1. Add missing 'Create Baseline' button to baseline list view
2. Add Critical Path tab between Baseline and Overview
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# P1 – Add "+ Create Baseline" button to the list header toolbar
# ══════════════════════════════════════════════════════════════════════════════
OLD1 = ('e.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",'
        'padding:"12px 16px",background:"#fff",borderBottom:"1px solid #e5e7eb"},'
        'children:[e.jsxs("button",{onClick:()=>{Ut.length>0&&Ft("compare-select")}')

NEW1 = ('e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",'
        'alignItems:"center",'
        'padding:"12px 16px",background:"#fff",borderBottom:"1px solid #e5e7eb"},'
        'children:['
        'e.jsxs("button",{onClick:()=>Ft("create"),'
        'style:{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",'
        'borderRadius:8,border:"none",background:"#1a56db",'
        'fontSize:12,fontWeight:600,color:"#fff",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:[e.jsx("span",{style:{fontSize:16,lineHeight:1},children:"+"})," Create Baseline"]}),'
        'e.jsxs("button",{onClick:()=>{Ut.length>0&&Ft("compare-select")}')

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 create-btn header: OK')
else:
    errors.append('P1'); print('P1 create-btn header: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# P2 – Add "Create Baseline" CTA button inside the empty state
# ══════════════════════════════════════════════════════════════════════════════
OLD2 = 'compare and future better."})]}):e.jsx("div",{style:{padding:16},children:Ut.map'
NEW2 = ('compare and future better."}),e.jsx("button",{onClick:()=>Ft("create"),'
        'style:{marginTop:4,padding:"10px 28px",borderRadius:10,'
        'border:"none",background:"#1a56db",'
        'fontSize:13,fontWeight:600,color:"#fff",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:"+ Create Baseline"})]})'
        ':e.jsx("div",{style:{padding:16},children:Ut.map')

if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2 create-btn empty-state: OK')
else:
    errors.append('P2'); print('P2 create-btn empty-state: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# P3 – Add "cp" to swipe gesture array
# ══════════════════════════════════════════════════════════════════════════════
OLD3 = '["wbs","baseline","overview"]'
NEW3 = '["wbs","baseline","cp","overview"]'

if OLD3 in content:
    content = content.replace(OLD3, NEW3, 1)
    print('P3 swipe array: OK')
else:
    errors.append('P3'); print('P3 swipe array: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# P4 – Add Critical Path tab button between Baseline and Overview
# ══════════════════════════════════════════════════════════════════════════════
OLD4 = ('{key:"baseline",label:"Baseline",icon:e.jsx(Tu,{size:13})},'
        '{key:"overview",label:"Overview",icon:e.jsx(Ou,{size:13})}')
NEW4 = ('{key:"baseline",label:"Baseline",icon:e.jsx(Tu,{size:13})},'
        '{key:"cp",label:"Critical Path",icon:e.jsx(Lu,{size:13})},'
        '{key:"overview",label:"Overview",icon:e.jsx(Ou,{size:13})}')

if OLD4 in content:
    content = content.replace(OLD4, NEW4, 1)
    print('P4 tab button: OK')
else:
    errors.append('P4'); print('P4 tab button: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# P5 – Inject Critical Path content before Overview content
# ══════════════════════════════════════════════════════════════════════════════
ANCHOR5 = 'I==="overview"&&(()=>{'

# Critical Path view: compute float from latest project end date
# Uses WBS items (Z) - same variable as baseline tab
CP_CONTENT = (
    'I==="cp"&&(()=>{'
    # compute project end and float helper
    'const cpAll=Z||[];'
    'const cpEnd=cpAll.reduce((mx,it)=>{'
    'if(!it.endDate)return mx;'
    'const d=new Date(it.endDate);return d>mx?d:mx;'
    '},new Date(0));'
    'const gFl=it=>it.endDate?'
    'Math.round((cpEnd.getTime()-new Date(it.endDate).getTime())/864e5):999;'
    'const critical=cpAll.filter(it=>gFl(it)<=0&&it.endDate);'
    'const nearCrit=cpAll.filter(it=>{const f=gFl(it);return f>0&&f<=14&&it.endDate;});'
    'const safe=cpAll.filter(it=>gFl(it)>14||!it.endDate);'
    'return e.jsxs("div",{style:{background:"#fff",minHeight:"100%"},children:['
    # summary cards row
    'e.jsxs("div",{style:{display:"flex",gap:10,padding:"14px 16px 0"},children:['
    # Critical card
    'e.jsxs("div",{style:{flex:1,background:"#fff0f0",borderRadius:12,'
    'padding:"12px 14px",border:"1px solid #fecaca"},children:['
    'e.jsx("div",{style:{fontSize:11,fontWeight:600,color:"#dc2626",'
    'fontFamily:"Inter,sans-serif",marginBottom:4},children:"Critical"}),'
    'e.jsx("div",{style:{fontSize:22,fontWeight:700,color:"#dc2626",'
    'fontFamily:"Inter,sans-serif"},children:critical.length}),'
    'e.jsx("div",{style:{fontSize:10,color:"#ef4444",'
    'fontFamily:"Inter,sans-serif"},children:"0 float days"})]}),'
    # Near-critical card
    'e.jsxs("div",{style:{flex:1,background:"#fffbeb",borderRadius:12,'
    'padding:"12px 14px",border:"1px solid #fde68a"},children:['
    'e.jsx("div",{style:{fontSize:11,fontWeight:600,color:"#d97706",'
    'fontFamily:"Inter,sans-serif",marginBottom:4},children:"Near Critical"}),'
    'e.jsx("div",{style:{fontSize:22,fontWeight:700,color:"#d97706",'
    'fontFamily:"Inter,sans-serif"},children:nearCrit.length}),'
    'e.jsx("div",{style:{fontSize:10,color:"#f59e0b",'
    'fontFamily:"Inter,sans-serif"},children:"≤14 float days"})]}),'
    # Safe card
    'e.jsxs("div",{style:{flex:1,background:"#f0fdf4",borderRadius:12,'
    'padding:"12px 14px",border:"1px solid #bbf7d0"},children:['
    'e.jsx("div",{style:{fontSize:11,fontWeight:600,color:"#16a34a",'
    'fontFamily:"Inter,sans-serif",marginBottom:4},children:"Safe"}),'
    'e.jsx("div",{style:{fontSize:22,fontWeight:700,color:"#16a34a",'
    'fontFamily:"Inter,sans-serif"},children:safe.length}),'
    'e.jsx("div",{style:{fontSize:10,color:"#22c55e",'
    'fontFamily:"Inter,sans-serif"},children:">14 float days"})]})]}), '
    # section label
    'e.jsx("div",{style:{fontSize:11,fontWeight:700,color:"#9ca3af",'
    'letterSpacing:"0.5px",textTransform:"uppercase",'
    'fontFamily:"Inter,sans-serif",padding:"14px 16px 6px"},children:"Tasks by Float"}),'
    # item list
    'e.jsx("div",{style:{padding:"0 16px 80px"},children:'
    'cpAll.filter(it=>it.endDate).sort((a,b)=>gFl(a)-gFl(b)).map((it,idx)=>{'
    'const fl=gFl(it);'
    'const isCrit=fl<=0;'
    'const isNear=fl>0&&fl<=14;'
    'const barColor=isCrit?"#dc2626":isNear?"#f59e0b":"#22c55e";'
    'const bgColor=isCrit?"#fff0f0":isNear?"#fffbeb":"#f0fdf4";'
    'const badge=isCrit?"Critical":isNear?"Near":"Safe";'
    'const badgeColor=isCrit?"#dc2626":isNear?"#d97706":"#16a34a";'
    'const badgeBg=isCrit?"#fee2e2":isNear?"#fef3c7":"#dcfce7";'
    'return e.jsxs("div",{key:it.id||idx,'
    'style:{background:"#fff",borderRadius:12,padding:"12px 14px",'
    'marginBottom:8,border:"1px solid #f3f4f6",'
    'boxShadow:"0 1px 3px rgba(0,0,0,0.04)"},children:['
    # top row: name + badge
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'justifyContent:"space-between",marginBottom:8},children:['
    'e.jsx("div",{style:{fontSize:13,fontWeight:600,color:"#111827",'
    'fontFamily:"Inter,sans-serif",flex:1,marginRight:8,'
    'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:it.name||"Unnamed"}),'
    'e.jsx("span",{style:{fontSize:10,fontWeight:700,'
    'color:badgeColor,background:badgeBg,'
    'padding:"2px 8px",borderRadius:20,'
    'fontFamily:"Inter,sans-serif",flexShrink:0},'
    'children:badge})]}),'
    # float bar
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    'e.jsx("div",{style:{flex:1,height:4,background:"#f3f4f6",'
    'borderRadius:2,overflow:"hidden"},children:'
    'e.jsx("div",{style:{width:isCrit?"100%":Math.min(100,fl/30*100)+"%",'
    'height:"100%",background:barColor,borderRadius:2}})})'
    ',e.jsx("div",{style:{fontSize:11,fontWeight:600,color:barColor,'
    'fontFamily:"Inter,sans-serif",flexShrink:0,minWidth:36,textAlign:"right"},'
    'children:isCrit?"0d":fl+"d"})]}),'
    # end date
    'it.endDate&&e.jsx("div",{style:{fontSize:10,color:"#9ca3af",'
    'fontFamily:"Inter,sans-serif",marginTop:6},'
    'children:"End: "+it.endDate})'
    ']})'   # close map return item children:[ + e.jsxs
    '})'    # close map callback + .map() call
    '})'    # close padding e.jsx div
    ']})'   # close return div children:[ + e.jsxs
    '}'     # close IIFE body
    ')(),'  # call IIFE + trailing comma
)

if ANCHOR5 in content:
    content = content.replace(ANCHOR5, CP_CONTENT + ANCHOR5, 1)
    print('P5 CP content: OK')
else:
    errors.append('P5'); print('P5 CP content: FAIL')

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
    print(f'{{ delta: {ob},  ( delta: {op}')

    if ob == 0 and op == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
