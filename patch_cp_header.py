#!/usr/bin/env python3
"""
Redesign Critical Path header:
P1 – Add _cpDD state for the new timeline dropdown
P2 – Replace "Critical Path Analysis" title row content with:
       [Include Independent Work checkbox] [Timeline dropdown] [Dependencies Valid badge]
P3 – In the navigation header: add Refresh button LEFT of Run Analysis
P4 – Slim the toolbar row: remove Refresh + Include Ind Work + scale tabs
      (keep only Filters + Export on the right, Last analyzed on the left)
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Add _cpDD dropdown state
# ──────────────────────────────────────────────────────────────────────────────
OLD1 = ('[_cpAnalyzed,_setCpAnalyzed]=b.useState(null),'
        '[_cpScale,_setCpScale]=b.useState("monthly"),'
        '[_cpInclInd,_setCpInclInd]=b.useState(!1)')
NEW1 = ('[_cpAnalyzed,_setCpAnalyzed]=b.useState(null),'
        '[_cpScale,_setCpScale]=b.useState("monthly"),'
        '[_cpInclInd,_setCpInclInd]=b.useState(!1),'
        '[_cpDD,_setCpDD]=b.useState(!1)')
if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 _cpDD state: OK')
else:
    errors.append('P1'); print('P1 _cpDD state: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Replace header row content: title → [Include Ind Work] [Timeline dropdown]
# ──────────────────────────────────────────────────────────────────────────────
OLD2 = ('e.jsxs("div",{style:{display:"flex",alignItems:"center",'
        'justifyContent:"space-between",padding:"10px 16px",'
        'borderBottom:"1px solid #e5e7eb",background:"#fff",gap:8},'
        'children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},'
        'children:[e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827",'
        'fontFamily:"Inter,sans-serif"},children:"Critical Path Analysis"}),'
        '_cpAnalyzed&&e.jsxs("span",{style:{display:"flex",alignItems:"center",'
        'gap:4,fontSize:11,fontWeight:600,color:"#16a34a",background:"#f0fdf4",'
        'padding:"3px 8px",borderRadius:6,fontFamily:"Inter,sans-serif"},'
        'children:["✓"," Dependencies Valid"]})]})]})')

NEW2 = ('e.jsxs("div",{style:{display:"flex",alignItems:"center",'
        'justifyContent:"space-between",padding:"10px 16px",'
        'borderBottom:"1px solid #e5e7eb",background:"#fff",gap:8},'
        'children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"},'
        'children:['
        # Include Independent Work checkbox
        'e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:5,'
        'fontSize:11,fontWeight:500,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:[e.jsx("input",{type:"checkbox",checked:_cpInclInd,'
        'onChange:()=>_setCpInclInd(!_cpInclInd),'
        'style:{width:13,height:13,accentColor:"#1a56db"}}),'
        '" Include Independent Work"]}),'
        # Timeline dropdown
        'e.jsxs("div",{style:{position:"relative"},children:['
        'e.jsxs("button",{onClick:()=>_setCpDD(v=>!v),'
        'style:{display:"flex",alignItems:"center",gap:6,'
        'border:"1px solid #e5e7eb",borderRadius:8,'
        'padding:"5px 10px",background:"#fff",cursor:"pointer"},'
        'children:['
        'e.jsx("span",{style:{fontSize:11,fontWeight:500,color:"#374151",'
        'fontFamily:"Inter,sans-serif"},children:"Timeline"}),'
        'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#111827",'
        'fontFamily:"Inter,sans-serif"},'
        'children:_cpScale.charAt(0).toUpperCase()+_cpScale.slice(1)}),'
        'e.jsx(qe,{size:11,style:{color:"#6b7280",'
        'transform:_cpDD?"rotate(180deg)":"none",'
        'transition:"transform 0.15s"}})'
        ']}),'
        '_cpDD&&e.jsxs("div",{style:{position:"absolute",left:0,'
        'top:"calc(100% + 4px)",background:"#fff",'
        'border:"1px solid #e5e7eb",borderRadius:10,'
        'boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:20,'
        'overflow:"hidden",minWidth:130},'
        'children:["Weekly","Monthly","Quarterly","Yearly"].map((op,oi)=>'
        'e.jsx("button",{onClick:()=>{_setCpScale(op.toLowerCase());_setCpDD(!1);},'
        'style:{display:"block",width:"100%",padding:"9px 14px",'
        'border:"none",'
        'background:_cpScale===op.toLowerCase()?"#EFF4FF":"#fff",'
        'color:_cpScale===op.toLowerCase()?"#1a56db":"#374151",'
        'fontSize:12,'
        'fontWeight:_cpScale===op.toLowerCase()?700:400,'
        'fontFamily:"Inter,sans-serif",cursor:"pointer",'
        'textAlign:"left"},children:op},oi))})'
        ']})'
        # Dependencies Valid badge
        ',_cpAnalyzed&&e.jsxs("span",{style:{display:"flex",alignItems:"center",'
        'gap:4,fontSize:11,fontWeight:600,color:"#16a34a",background:"#f0fdf4",'
        'padding:"3px 8px",borderRadius:6,fontFamily:"Inter,sans-serif"},'
        'children:["✓"," Dependencies Valid"]})'
        ']})]}'
        ')')

if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2 header row redesign: OK')
else:
    errors.append('P2'); print('P2 header row redesign: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P3 – Add Refresh left of Run Analysis in the navigation header
# ──────────────────────────────────────────────────────────────────────────────
OLD3 = ('I==="cp"?e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",'
        'borderRadius:8,border:"none",background:"#1a56db",fontSize:12,fontWeight:600,'
        'color:"#fff",fontFamily:"Inter,sans-serif",cursor:"pointer",'
        'flexShrink:0,whiteSpace:"nowrap"},'
        'children:[e.jsx("span",{children:"▶"})," Run Analysis"]}):null')
NEW3 = ('I==="cp"?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},'
        'children:['
        '_cpAnalyzed&&e.jsxs("button",{'
        'onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:4,padding:"6px 10px",'
        'borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",'
        'fontSize:12,fontWeight:500,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:["↻"," Refresh"]}),'
        'e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",'
        'borderRadius:8,border:"none",background:"#1a56db",fontSize:12,fontWeight:600,'
        'color:"#fff",fontFamily:"Inter,sans-serif",cursor:"pointer",'
        'flexShrink:0,whiteSpace:"nowrap"},'
        'children:[e.jsx("span",{children:"▶"})," Run Analysis"]})'
        ']}):null')
if OLD3 in content:
    content = content.replace(OLD3, NEW3, 1)
    print('P3 Refresh + Run Analysis in nav header: OK')
else:
    errors.append('P3'); print('P3 Refresh in nav header: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P4 – Slim the toolbar: remove Refresh, Include Ind Work, and scale tabs
#       Keep: Last analyzed (left) + Filters + Export (right)
# ──────────────────────────────────────────────────────────────────────────────
OLD4 = ('e.jsxs("div",{style:{display:"flex",alignItems:"center",'
        'justifyContent:"space-between",padding:"6px 16px",'
        'borderBottom:"1px solid #e5e7eb",background:"#f9fafb",'
        'flexWrap:"wrap",gap:8},'
        'children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",'
        'gap:8,flexWrap:"wrap"},children:['
        '_cpAnalyzed&&e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",'
        'borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",'
        'fontSize:11,color:"#374151",fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:["↻"," Refresh"]}),'
        '_cpAnalyzed&&e.jsx("span",{style:{fontSize:11,color:"#9ca3af",'
        'fontFamily:"Inter,sans-serif"},children:"Last analyzed: just now"})]}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},'
        'children:['
        'e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:4,'
        'fontSize:11,color:"#374151",fontFamily:"Inter,sans-serif",'
        'cursor:"pointer"},children:['
        'e.jsx("input",{type:"checkbox",checked:_cpInclInd,'
        'onChange:()=>_setCpInclInd(!_cpInclInd),style:{width:13,height:13}}),'
        '" Include Independent Work"]}),'
        'e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,'
        'padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",'
        'background:"#fff",fontSize:11,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},children:["⊟"," Filters"]}),'
        'e.jsxs("div",{style:{display:"flex",borderRadius:8,overflow:"hidden",'
        'border:"1px solid #e5e7eb"},children:["Weekly","Monthly","Quarterly","Yearly"]'
        '.map(s=>e.jsx("button",{key:s,onClick:()=>_setCpScale(s.toLowerCase()),'
        'style:{padding:"5px 10px",border:"none",'
        'background:_cpScale===s.toLowerCase()?"#1a56db":"#fff",'
        'color:_cpScale===s.toLowerCase()?"#fff":"#374151",'
        'fontSize:11,fontWeight:_cpScale===s.toLowerCase()?600:400,'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},children:s}))}),'
        'e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,'
        'padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",'
        'background:"#fff",fontSize:11,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:["↓"," Export"]})'
        ']})]}'
        ')')

NEW4 = ('e.jsxs("div",{style:{display:"flex",alignItems:"center",'
        'justifyContent:"space-between",padding:"6px 16px",'
        'borderBottom:"1px solid #e5e7eb",background:"#f9fafb",'
        'flexWrap:"wrap",gap:8},'
        'children:['
        'e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        '_cpAnalyzed&&e.jsx("span",{style:{fontSize:11,color:"#9ca3af",'
        'fontFamily:"Inter,sans-serif"},children:"Last analyzed: just now"})'
        ']}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},'
        'children:['
        'e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,'
        'padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",'
        'background:"#fff",fontSize:11,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},children:["⊟"," Filters"]}),'
        'e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,'
        'padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",'
        'background:"#fff",fontSize:11,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:["↓"," Export"]})'
        ']})]}'
        ')')

if OLD4 in content:
    content = content.replace(OLD4, NEW4, 1)
    print('P4 toolbar slim: OK')
else:
    errors.append('P4'); print('P4 toolbar slim: FAIL')

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
