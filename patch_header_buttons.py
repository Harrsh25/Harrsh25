#!/usr/bin/env python3
"""
1. Baseline: move "+ Create Baseline" to right side of header (swap with Compare)
2. Critical Path: dedicated header row with Run Analysis on right + controls row below
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# P1 – Baseline: swap buttons so Create Baseline is on the RIGHT
# ══════════════════════════════════════════════════════════════════════════════
CREATE_BTN = ('e.jsxs("button",{onClick:()=>Ft("create"),'
              'style:{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",'
              'borderRadius:8,border:"none",background:"#1a56db",'
              'fontSize:12,fontWeight:600,color:"#fff",'
              'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
              'children:[e.jsx("span",{style:{fontSize:16,lineHeight:1},children:"+"}),'
              '" Create Baseline"]})')

COMPARE_BTN = ('e.jsxs("button",{onClick:()=>{Ut.length>0&&Ft("compare-select")},'
               'disabled:Ut.length===0,'
               'style:{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",'
               'borderRadius:8,border:"1px solid "+(Ut.length===0?"#e5e7eb":"#d1d5db"),'
               'background:Ut.length===0?"#f9fafb":"#fff",'
               'fontSize:12,fontWeight:500,'
               'color:Ut.length===0?"#9ca3af":"#374151",'
               'fontFamily:"Inter,sans-serif",'
               'cursor:Ut.length===0?"not-allowed":"pointer",'
               'opacity:Ut.length===0?0.6:1},'
               'children:[e.jsx(Vn,{size:13,style:{color:Ut.length===0?"#d1d5db":"#6b7280"}}),'
               '" Compare"]})')

OLD1 = 'children:[' + CREATE_BTN + ',' + COMPARE_BTN + ']}'
NEW1 = 'children:[' + COMPARE_BTN + ',' + CREATE_BTN + ']}'

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 baseline swap: OK')
else:
    errors.append('P1'); print('P1 baseline swap: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# P2 – CP: replace single toolbar row with header row + controls row
# ══════════════════════════════════════════════════════════════════════════════
# Use exact string from the file
OLD2 = ('e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid #e5e7eb",background:"#fff",flexWrap:"wrap",gap:8},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"},children:[_cpAnalyzed&&e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),style:{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",fontSize:11,color:"#374151",fontFamily:"Inter,sans-serif",cursor:"pointer"},children:["↻"," Refresh"]}),_cpAnalyzed&&e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"Last analyzed: just now"}),_cpAnalyzed&&e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,color:"#16a34a",background:"#f0fdf4",padding:"3px 8px",borderRadius:6,fontFamily:"Inter,sans-serif"},children:["✓"," Dependencies Valid"]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#374151",fontFamily:"Inter,sans-serif",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:_cpInclInd,onChange:()=>_setCpInclInd(!_cpInclInd),style:{width:13,height:13}})," Include Independent Work"]}),e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",fontSize:11,color:"#374151",fontFamily:"Inter,sans-serif",cursor:"pointer"},children:["⊟"," Filters"]}),e.jsxs("div",{style:{display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid #e5e7eb"},children:["Weekly","Monthly","Quarterly","Yearly"].map(s=>e.jsx("button",{key:s,onClick:()=>_setCpScale(s.toLowerCase()),style:{padding:"5px 10px",border:"none",background:_cpScale===s.toLowerCase()?"#1a56db":"#fff",color:_cpScale===s.toLowerCase()?"#fff":"#374151",fontSize:11,fontWeight:_cpScale===s.toLowerCase()?600:400,fontFamily:"Inter,sans-serif",cursor:"pointer"},children:s}))}),e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",fontSize:11,color:"#374151",fontFamily:"Inter,sans-serif",cursor:"pointer"},children:["↓"," Export"]}),e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),style:{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",borderRadius:8,border:"none",background:"#1a56db",fontSize:12,fontWeight:600,color:"#fff",fontFamily:"Inter,sans-serif",cursor:"pointer",flexShrink:0},children:[e.jsx("span",{children:"▶"})," Run Analysis"]})]})]}),'
)

# NEW: Row 1 = header (title left, Run Analysis right)
#      Row 2 = controls (refresh/status left, include/filters/scale/export right)
NEW2 = (
    # ── Row 1: header ───────────────────────────────────────────────────────
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'justifyContent:"space-between",padding:"10px 16px",'
    'borderBottom:"1px solid #e5e7eb",background:"#fff",gap:8},'
    'children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},'
    'children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},children:"Critical Path Analysis"}),'
    '_cpAnalyzed&&e.jsxs("span",{style:{display:"flex",alignItems:"center",'
    'gap:4,fontSize:11,fontWeight:600,color:"#16a34a",background:"#f0fdf4",'
    'padding:"3px 8px",borderRadius:6,fontFamily:"Inter,sans-serif"},'
    'children:["✓"," Dependencies Valid"]})'
    ']}),'
    'e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
    'style:{display:"flex",alignItems:"center",gap:6,'
    'padding:"7px 16px",borderRadius:8,border:"none",'
    'background:"#1a56db",fontSize:12,fontWeight:600,'
    'color:"#fff",fontFamily:"Inter,sans-serif",'
    'cursor:"pointer",flexShrink:0},'
    'children:[e.jsx("span",{children:"▶"})," Run Analysis"]})'
    ']}),\n'
    # ── Row 2: controls ─────────────────────────────────────────────────────
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'justifyContent:"space-between",padding:"6px 16px",'
    'borderBottom:"1px solid #e5e7eb",background:"#f9fafb",'
    'flexWrap:"wrap",gap:8},'
    'children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"},'
    'children:['
    '_cpAnalyzed&&e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
    'style:{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",'
    'borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",'
    'fontSize:11,color:"#374151",fontFamily:"Inter,sans-serif",cursor:"pointer"},'
    'children:["↻"," Refresh"]}),'
    '_cpAnalyzed&&e.jsx("span",{style:{fontSize:11,color:"#9ca3af",'
    'fontFamily:"Inter,sans-serif"},children:"Last analyzed: just now"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},'
    'children:['
    'e.jsxs("label",{style:{display:"flex",alignItems:"center",'
    'gap:4,fontSize:11,color:"#374151",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
    'children:[e.jsx("input",{type:"checkbox",checked:_cpInclInd,'
    'onChange:()=>_setCpInclInd(!_cpInclInd),'
    'style:{width:13,height:13}})," Include Independent Work"]}),'
    'e.jsxs("button",{style:{display:"flex",alignItems:"center",'
    'gap:4,padding:"5px 10px",borderRadius:8,'
    'border:"1px solid #e5e7eb",background:"#fff",'
    'fontSize:11,color:"#374151",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
    'children:["⊟"," Filters"]}),'
    'e.jsxs("div",{style:{display:"flex",borderRadius:8,'
    'overflow:"hidden",border:"1px solid #e5e7eb"},'
    'children:["Weekly","Monthly","Quarterly","Yearly"]'
    '.map(s=>e.jsx("button",{key:s,'
    'onClick:()=>_setCpScale(s.toLowerCase()),'
    'style:{padding:"5px 10px",border:"none",'
    'background:_cpScale===s.toLowerCase()?"#1a56db":"#fff",'
    'color:_cpScale===s.toLowerCase()?"#fff":"#374151",'
    'fontSize:11,'
    'fontWeight:_cpScale===s.toLowerCase()?600:400,'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
    'children:s}))}),'
    'e.jsxs("button",{style:{display:"flex",alignItems:"center",'
    'gap:4,padding:"5px 10px",borderRadius:8,'
    'border:"1px solid #e5e7eb",background:"#fff",'
    'fontSize:11,color:"#374151",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
    'children:["↓"," Export"]})'
    ']})'
    ']}),')

if OLD2 in content:
    ob_old = OLD2.count('{') - OLD2.count('}')
    op_old = OLD2.count('(') - OLD2.count(')')
    sq_old = OLD2.count('[') - OLD2.count(']')
    ob_new = NEW2.count('{') - NEW2.count('}')
    op_new = NEW2.count('(') - NEW2.count(')')
    sq_new = NEW2.count('[') - NEW2.count(']')
    print(f'  OLD2: ob={ob_old} op={op_old} sq={sq_old}')
    print(f'  NEW2: ob={ob_new} op={op_new} sq={sq_new}')
    content = content.replace(OLD2, NEW2, 1)
    print('P2 CP toolbar restructure: OK')
else:
    errors.append('P2'); print('P2 CP toolbar restructure: FAIL')

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
