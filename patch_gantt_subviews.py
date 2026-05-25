#!/usr/bin/env python3
"""
Add Gantt sub-views: Gantt | Baseline | Critical Path
All three accessible via tabs inside the Gantt view.
"""

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

patches = []
errors = []

# ─────────────────────────────────────────────────────────────────────────────
# 1. Add ganttSubView state
# ─────────────────────────────────────────────────────────────────────────────
patches.append(('Add ganttSub state',
    '[_ganttSub,_setGanttSub]=b.useState("gantt"),',  # will fail if already added
    '[_ganttSub,_setGanttSub]=b.useState("gantt"),'
))
# Use safe add: only insert if not present
STATE_ANCHOR = '[_depBdOpen,_setDepBdOpen]=b.useState(!1),'
STATE_NEW = '[_depBdOpen,_setDepBdOpen]=b.useState(!1),[_ganttSub,_setGanttSub]=b.useState("gantt"),'
patches.clear()

# ─────────────────────────────────────────────────────────────────────────────
# Helper: brace-balanced string builder
# ─────────────────────────────────────────────────────────────────────────────

def verify(s, label):
    ob = s.count('{') - s.count('}')
    op = s.count('(') - s.count(')')
    if ob != 0 or op != 0:
        print(f'  WARN {label}: {{delta={ob} (delta={op}')
    return ob, op


# ─────────────────────────────────────────────────────────────────────────────
# 2. Sub-tab bar HTML  (3 tabs: Gantt / Baseline / Critical Path)
# ─────────────────────────────────────────────────────────────────────────────
SUB_TABS = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'padding:"0 16px",borderBottom:"1px solid #e5e7eb",'
    'background:"#fff",gap:0},children:['
    + ','.join(
        'e.jsx("button",{onClick:()=>_setGanttSub("' + mode + '"),'
        'style:{padding:"10px 14px",fontSize:11,fontWeight:_ganttSub==="' + mode + '"?700:500,'
        'color:_ganttSub==="' + mode + '"?"#1a56db":"#6b7280",'
        'background:"none",border:"none",cursor:"pointer",'
        'borderBottom:_ganttSub==="' + mode + '"?"2px solid #1a56db":"2px solid transparent",'
        'fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"},'
        'children:"' + label + '"})'
        for mode, label in [('gantt','Gantt'),('baseline','Baseline'),('critical','Critical Path')]
    )
    + ']}),'
)
verify(SUB_TABS, 'SUB_TABS')


# ─────────────────────────────────────────────────────────────────────────────
# 3. Baseline view content
# ─────────────────────────────────────────────────────────────────────────────
# Baseline bar: same position calc as main but offset by ~10-20% earlier start
# We reuse qs() for current bar, define qsB() for baseline bar
# Baseline = task.startDate minus 14 days, same duration → earlier start

BASELINE_CONTENT = (
    '_ganttSub==="baseline"&&e.jsxs("div",{style:{background:"#fff",overflow:"hidden"},children:['
    # Comparing header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,'
    'padding:"8px 16px",borderBottom:"1px solid #f0f1f4",background:"#f8faff"},children:['
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#6b7280",'
    'fontFamily:"Inter,sans-serif"},children:"COMPARING"}),'
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",color:"#111827"},children:['
    'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",'
    'background:"#1a56db",display:"inline-block"}}),'
    '"Current"]}),'
    'e.jsx("span",{style:{color:"#9ca3af",fontSize:11},children:"vs"}),'
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",color:"#111827"},children:['
    'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",'
    'background:"#e11d48",display:"inline-block"}}),'
    '"V1 Baseline"]})'
    ']}),'
    # Scroll container reusing gantt grid vars
    'e.jsx("div",{style:{overflowX:"auto",WebkitOverflowScrolling:"touch"},children:'
    'e.jsxs("div",{style:{minWidth:Ue+_e*Ae},children:['
    # Header row
    'e.jsxs("div",{style:{display:"flex",borderBottom:"1px solid #e5e7eb",'
    'background:"#ffffff",position:"sticky",top:0,zIndex:5},children:['
    'e.jsx("div",{style:{width:Ue,minWidth:Ue,flexShrink:0,padding:"8px 12px",'
    'borderRight:"1px solid #e5e7eb",position:"sticky",left:0,zIndex:4,background:"#ffffff"},'
    'children:e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#6b7280",'
    'letterSpacing:"0.5px",textTransform:"uppercase",fontFamily:"Inter,sans-serif"},'
    'children:"STRUCTURE"})}),'
    'be.map((me,Ne)=>e.jsxs("div",{style:{flexShrink:0,width:me.weeks.length*Ae},children:['
    'e.jsx("div",{style:{padding:"4px 6px",fontSize:9,fontWeight:700,color:"#9ca3af",'
    'letterSpacing:"0.5px",textTransform:"uppercase",fontFamily:"Inter,sans-serif",'
    'borderBottom:"1px solid #e5e7eb"},children:me.label}),'
    'e.jsxs("div",{style:{display:"flex"},children:['
    'me.weeks.map((He,yt)=>e.jsx("div",{style:{width:Ae,fontSize:8,color:"#9ca3af",'
    'padding:"2px 0",textAlign:"center",borderRight:"1px solid #f3f4f6",'
    'fontFamily:"Inter,sans-serif"},children:"W"+(yt+1)},yt))'
    ']})]},Ne))'
    ']}),'
    # Today line + rows
    'e.jsx("div",{style:{position:"relative"},children:['
    'e.jsx("div",{id:"bl-today-line",style:{position:"absolute",top:0,bottom:0,'
    'left:Ue+wt,width:2,background:"#ef4444",zIndex:4,pointerEvents:"none"}}),'
    # rows via flatMap on top-level items + their visible children
    '...(()=>{const rows=[];const addRows=(items,depth)=>items.forEach(me=>{'
    'const Te=Q[me.id]!==!1;rows.push({item:me,depth});'
    'if(Te&&me.children&&me.children.length>0)addRows(me.children,depth+1);});'
    'addRows(i.wbsItems&&i.wbsItems.length?i.wbsItems:rl,0);return rows;})().map(({item:me,depth:pe},Ne)=>{'
    'const it=qs(me);'
    # baseline bar: shift start 14 days earlier, same duration
    'const bsS=me.startDate?new Date(new Date(me.startDate).getTime()-14*864e5):null;'
    'const bsE=me.endDate?new Date(new Date(me.endDate).getTime()-14*864e5):null;'
    'const bsBar=(()=>{if(!bsS||!bsE)return null;'
    'const Pe=new Date(W.getFullYear(),W.getMonth(),1),'
    'it2=(pe2.getTime()-Pe.getTime())/864e5,'
    'Ye=_e*Ae,'
    'He2=Math.max(0,(bsS.getTime()-Pe.getTime())/864e5/it2),'
    'yt2=Math.min(1,(bsE.getTime()-Pe.getTime())/864e5/it2);'
    'return{left:He2*Ye,width:Math.max(4,(yt2-He2)*Ye)};})();'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'borderBottom:"1px solid #f0f1f4",minHeight:pe===0?40:34,background:"#fff"},children:['
    'e.jsx("div",{style:{width:Ue,minWidth:Ue,flexShrink:0,display:"flex",'
    'alignItems:"center",gap:3,padding:"0 8px 0 "+(8+pe*12)+"px",'
    'borderRight:"1px solid #e5e7eb",position:"sticky",left:0,zIndex:3,background:"#fff"},'
    'children:e.jsx("span",{style:{fontSize:pe===0?12:11,'
    'fontWeight:pe===0?700:400,color:"#111827",fontFamily:"Inter,sans-serif",'
    'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:me.name})}),'
    'e.jsxs("div",{style:{flex:1,position:"relative",height:pe===0?40:34},children:['
    'be.map((He,yt)=>He.weeks.map((bt,Zt)=>e.jsx("div",{style:{position:"absolute",'
    'left:(be.slice(0,yt).reduce((zs,Zs)=>zs+Zs.weeks.length,0)+Zt)*Ae,top:0,'
    'width:Ae,height:"100%",borderRight:"1px solid #f3f4f6"}},`${yt}-${Zt}`))),'
    # baseline bar (pink, behind)
    'bsBar&&e.jsx("div",{style:{position:"absolute",left:bsBar.left,width:bsBar.width,'
    'height:10,top:"50%",marginTop:2,borderRadius:3,background:"#fda4af",zIndex:1,opacity:0.85}}),'
    # current bar (blue, front)
    'it&&e.jsx("div",{style:{position:"absolute",left:it.left,width:it.width,'
    'height:10,top:"50%",marginTop:-8,borderRadius:3,background:"#1a56db",zIndex:2}})'
    ']})'
    ']},Ne)'
    '})'
    ']})'
    ']})'  # close minWidth div
    '})'   # close overflowX div
    ']}),')  # close baseline outer div + comma


# ─────────────────────────────────────────────────────────────────────────────
# 4. Critical Path view
# ─────────────────────────────────────────────────────────────────────────────
# Float calc: (project_end - task_end) in days
# Critical = float <= 5 days
# TYPE: Activity = ACT (purple badge), Task/Sub-Task = TASK (blue badge)

CRITICAL_CONTENT = (
    '_ganttSub==="critical"&&(()=>{'
    # compute all rows flat
    'const cpRows=(()=>{const rows=[];'
    'const addR=(items,depth)=>items.forEach(me=>{'
    'rows.push({item:me,depth});'
    'if(me.children&&me.children.length>0)addR(me.children,depth+1);});'
    'addR(i.wbsItems&&i.wbsItems.length?i.wbsItems:rl,0);return rows;})();'
    # project end = max endDate across all rows
    'const projEnd=cpRows.reduce((mx,{item:me})=>{'
    'if(!me.endDate)return mx;const d=new Date(me.endDate);return d>mx?d:mx;'
    '},new Date(0));'
    # float helper
    'const getFloat=me=>{'
    'if(!me.endDate)return 999;'
    'return Math.round((projEnd.getTime()-new Date(me.endDate).getTime())/864e5);};'
    # stat calcs
    'const critItems=cpRows.filter(({item:me})=>getFloat(me)<=0);'
    'const nonCritItems=cpRows.filter(({item:me})=>getFloat(me)>0&&me.endDate);'
    'const allFloats=nonCritItems.map(({item:me})=>getFloat(me));'
    'const avgFloat=allFloats.length?Math.round(allFloats.reduce((a,b)=>a+b,0)/allFloats.length):0;'
    'const minFloat=allFloats.length?Math.min(...allFloats):0;'
    'const totalFloat=allFloats.reduce((a,b)=>a+b,0);'
    'const projDays=Math.round((projEnd.getTime()-ze.getTime())/864e5);'
    'return e.jsxs("div",{style:{display:"flex",flexDirection:"column",'
    'height:"100%",background:"#fff",overflow:"hidden"},children:['
    # toolbar
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,'
    'padding:"8px 16px",borderBottom:"1px solid #e5e7eb",background:"#fff",'
    'overflowX:"auto"},children:['
    'e.jsx("button",{style:{padding:"6px 12px",borderRadius:8,border:"none",'
    'background:"#1a56db",color:"#fff",fontSize:11,fontWeight:600,'
    'fontFamily:"Inter,sans-serif",cursor:"pointer",flexShrink:0},'
    'children:"Run Critical Path Analysis"}),'
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,color:"#059669",fontFamily:"Inter,sans-serif",flexShrink:0},children:['
    'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",'
    'background:"#059669",display:"inline-block"}}),'
    '"Dependencies Valid"]}),'
    'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",'
    'fontFamily:"Inter,sans-serif"},children:"Last analysed: just now"})'
    ']}),'
    # main area: left table + right bars
    'e.jsx("div",{style:{flex:1,overflowY:"auto"},children:'
    'e.jsx("div",{style:{overflowX:"auto"},children:'
    'e.jsxs("div",{style:{minWidth:Ue+_e*Ae+200,display:"flex"},children:['
    # Left panel: STRUCTURE + TYPE + FLOAT + STATUS
    'e.jsxs("div",{style:{width:Ue+200,flexShrink:0,borderRight:"1px solid #e5e7eb"},children:['
    # Left header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'borderBottom:"1px solid #e5e7eb",background:"#f9fafb",'
    'position:"sticky",top:0,zIndex:5},children:['
    'e.jsx("div",{style:{flex:1,padding:"8px 10px",fontSize:10,fontWeight:700,'
    'color:"#6b7280",letterSpacing:"0.5px",textTransform:"uppercase",'
    'fontFamily:"Inter,sans-serif"},children:"Structure"}),'
    'e.jsx("div",{style:{width:50,padding:"8px 4px",fontSize:10,fontWeight:700,'
    'color:"#6b7280",letterSpacing:"0.5px",textTransform:"uppercase",'
    'fontFamily:"Inter,sans-serif",textAlign:"center"},children:"Type"}),'
    'e.jsx("div",{style:{width:55,padding:"8px 4px",fontSize:10,fontWeight:700,'
    'color:"#6b7280",letterSpacing:"0.5px",textTransform:"uppercase",'
    'fontFamily:"Inter,sans-serif",textAlign:"center"},children:"Float"}),'
    'e.jsx("div",{style:{width:70,padding:"8px 4px",fontSize:10,fontWeight:700,'
    'color:"#6b7280",letterSpacing:"0.5px",textTransform:"uppercase",'
    'fontFamily:"Inter,sans-serif",textAlign:"center"},children:"Status"})'
    ']}),'
    # Left rows
    'cpRows.map(({item:me,depth:pe},Ne)=>{'
    'const fl=getFloat(me);const isCrit=fl<=0;'
    'const typeLabel=me.type==="Activity"?"ACT":"TASK";'
    'const typeBg=me.type==="Activity"?"#f3e8ff":"#EFF4FF";'
    'const typeClr=me.type==="Activity"?"#7c3aed":"#1a56db";'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'borderBottom:"1px solid #f0f1f4",minHeight:36,'
    'background:isCrit?"#fff7f7":"#fff"},children:['
    'e.jsx("div",{style:{flex:1,padding:"6px 8px 6px "+(8+pe*12)+"px",'
    'fontSize:pe===0?12:11,fontWeight:pe===0?700:400,'
    'color:"#111827",fontFamily:"Inter,sans-serif",'
    'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:me.name}),'
    'e.jsx("div",{style:{width:50,display:"flex",justifyContent:"center",'
    'alignItems:"center",padding:"4px"},children:'
    'e.jsx("span",{style:{fontSize:9,fontWeight:700,color:typeClr,'
    'background:typeBg,padding:"2px 5px",borderRadius:4,'
    'fontFamily:"Inter,sans-serif"},children:typeLabel})}),'
    'e.jsx("div",{style:{width:55,textAlign:"center",fontSize:11,'
    'color:isCrit?"#dc2626":fl<30?"#d97706":"#374151",'
    'fontFamily:"Inter,sans-serif",fontWeight:600},'
    'children:me.endDate?(isCrit?"0d":fl+"d"):"—"}),'
    'e.jsx("div",{style:{width:70,display:"flex",justifyContent:"center",'
    'alignItems:"center",padding:"4px"},children:'
    'isCrit?e.jsx("span",{style:{fontSize:9,fontWeight:700,color:"#dc2626",'
    'background:"#fee2e2",padding:"2px 6px",borderRadius:4,'
    'fontFamily:"Inter,sans-serif"},children:"Critical"}):'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af"},children:"—"})})'
    ']},Ne)'
    '})'
    ']}),'  # close left panel
    # Right panel: gantt-style bars
    'e.jsxs("div",{style:{flex:1,position:"relative"},children:['
    # date header
    'e.jsxs("div",{style:{display:"flex",borderBottom:"1px solid #e5e7eb",'
    'background:"#f9fafb",position:"sticky",top:0,zIndex:5},children:['
    'be.map((me,Ne)=>e.jsxs("div",{style:{flexShrink:0,width:me.weeks.length*Ae},children:['
    'e.jsx("div",{style:{padding:"4px 6px",fontSize:9,fontWeight:700,'
    'color:"#9ca3af",letterSpacing:"0.5px",textTransform:"uppercase",'
    'fontFamily:"Inter,sans-serif",borderBottom:"1px solid #e5e7eb"},'
    'children:me.label})]},Ne))'
    ']}),'
    # rows
    'e.jsx("div",{style:{position:"relative"},children:['
    'e.jsx("div",{style:{position:"absolute",top:0,bottom:0,'
    'left:wt,width:2,background:"#ef4444",zIndex:4,pointerEvents:"none"}}),'
    'cpRows.map(({item:me,depth:pe},Ne)=>{'
    'const it=qs(me);const fl=getFloat(me);const isCrit=fl<=0;'
    # float bar width = fl days
    'const floatW=me.endDate?Math.min(fl*Ae/7,(_e*Ae-( it?it.left+it.width:0))):0;'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'borderBottom:"1px solid #f0f1f4",minHeight:36,'
    'position:"relative"},children:['
    'be.map((He,yt)=>He.weeks.map((bt,Zt)=>e.jsx("div",{style:{position:"absolute",'
    'left:(be.slice(0,yt).reduce((zs,Zs)=>zs+Zs.weeks.length,0)+Zt)*Ae,'
    'top:0,width:Ae,height:"100%",'
    'borderRight:"1px solid #f3f4f6"}},`c${yt}-${Zt}`))),'
    # task bar
    'it&&e.jsx("div",{style:{position:"absolute",left:it.left,width:it.width,'
    'height:12,top:"50%",marginTop:-6,borderRadius:4,'
    'background:isCrit?"#7c3aed":"#93c5fd",zIndex:2}}),'
    # float dotted line
    'it&&!isCrit&&fl>0&&fl<500&&e.jsx("div",{style:{position:"absolute",'
    'left:it.left+it.width,width:Math.min(floatW,(_e*Ae-it.left-it.width)),'
    'height:2,top:"50%",marginTop:-1,'
    'background:"repeating-linear-gradient(90deg,#9ca3af 0,#9ca3af 4px,transparent 4px,transparent 8px)",'
    'zIndex:1}})'
    ']},Ne)'
    '})'
    ']})'   # close rows relative div
    ']})'   # close right flex
    ']})'   # close minWidth flex
    '})'    # close overflowX
    '})'    # close flex:1 overflowY
    ','
    # Bottom stats bar
    'e.jsxs("div",{style:{display:"flex",gap:8,padding:"10px 16px",'
    'borderTop:"1px solid #e5e7eb",background:"#f9fafb",'
    'overflowX:"auto",flexShrink:0},children:['
    + ','.join(
        'e.jsxs("div",{style:{flexShrink:0,padding:"6px 12px",borderRadius:8,'
        'border:"1px solid #e5e7eb",background:"#fff",textAlign:"center"},children:['
        'e.jsx("div",{style:{fontSize:9,color:"#9ca3af",fontWeight:600,'
        'textTransform:"uppercase",letterSpacing:"0.4px",'
        'fontFamily:"Inter,sans-serif"},children:"' + label + '"}),'
        'e.jsx("div",{style:{fontSize:14,fontWeight:700,color:"#111827",'
        'fontFamily:"Inter,sans-serif",marginTop:2},children:' + val + '}),'
        'e.jsx("div",{style:{fontSize:9,color:"#6b7280",'
        'fontFamily:"Inter,sans-serif"},children:"' + sub + '"})'
        ']},'+str(i)+')'
        for i, (label, val, sub) in enumerate([
            ('Critical Entities', 'critItems.length', '"zero-float"'),
            ('Zero Float',        'critItems.length', '"entities"'),
            ('Avg Float',         'avgFloat+"d"',     '"non-critical"'),
            ('Lowest Float',      'minFloat+"d"',     '"near critical"'),
            ('Total Float',       'totalFloat+"d"',   '"across non-critical"'),
            ('Project Duration',  'projDays+"d"',     '"total span"'),
        ])
    )
    + ']})'    # close stats children + div
    + ']})'   # close outer critical div children + div
    + ';})()'  # close IIFE
    + ','
)

# Verify balance of new content
ob_tabs, op_tabs = verify(SUB_TABS, 'SUB_TABS')
ob_bl,   op_bl   = verify(BASELINE_CONTENT, 'BASELINE_CONTENT')
ob_cp,   op_cp   = verify(CRITICAL_CONTENT, 'CRITICAL_CONTENT')
print(f'SUB_TABS    {{ {ob_tabs:+d}  ( {op_tabs:+d}')
print(f'BASELINE    {{ {ob_bl:+d}  ( {op_bl:+d}')
print(f'CRITICAL    {{ {ob_cp:+d}  ( {op_cp:+d}')
print()

# ─────────────────────────────────────────────────────────────────────────────
# Now apply all patches
# ─────────────────────────────────────────────────────────────────────────────

# Patch 1: Add state
old1 = '[_depBdOpen,_setDepBdOpen]=b.useState(!1),'
new1 = '[_depBdOpen,_setDepBdOpen]=b.useState(!1),[_ganttSub,_setGanttSub]=b.useState("gantt"),'
if old1 in content and new1 not in content:
    content = content.replace(old1, new1, 1)
    print('OK: Add state')
elif new1 in content:
    print('SKIP: state already added')
else:
    print('FAIL: state anchor not found')
    errors.append('state')

# Patch 2: Add sub-tabs as first child of outer gantt div
old2 = 'e.jsxs("div",{style:{background:"#fff",overflow:"hidden"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderBottom:"1px solid #e5e7eb",background:"#fff",overflowX:"auto"},'
new2 = ('e.jsxs("div",{style:{background:"#fff",overflow:"hidden"},children:['
        + SUB_TABS
        + '_ganttSub==="gantt"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderBottom:"1px solid #e5e7eb",background:"#fff",overflowX:"auto"},')
if old2 in content:
    content = content.replace(old2, new2, 1)
    print('OK: Add sub-tabs + open gantt Fragment')
else:
    print('FAIL: outer div anchor not found')
    errors.append('sub-tabs')

# Patch 3: Close the gantt Fragment before the gantt IIFE closes
# The gantt IIFE ends with: ]})})()
# We need to close the Fragment after ganttSel detail panel but before ]})})()
# The exact end is: "})]})]})]})})()"]
# After pe)) the sequence is: }) + ]}) x3 + })()
# }) = close inner map-row element
# ]}) x2 = close map wrapper + ganttSel Fragment
# ]}) = close outer div children[] + props{} + jsxs() — this one we replace
# })() = close IIFE
PREFIX = 'children:W.value})]},pe))'
SUFFIX_OLD = '})' + ']})' * 3 + '})()'
SUFFIX_NEW = ('})' + ']})' * 2     # keep: close map-row + ganttSel Fragment
              + ']})' +             # close _ganttSub==="gantt"&&e.jsxs(e.Fragment,...)
              BASELINE_CONTENT +
              CRITICAL_CONTENT +
              ']})' +               # close outer div children[] + props{} + jsxs()
              '})()')               # close IIFE
old3 = PREFIX + SUFFIX_OLD
new3 = PREFIX + SUFFIX_NEW

if old3 in content:
    content = content.replace(old3, new3, 1)
    print('OK: Close Fragment + add baseline + critical')
else:
    print('FAIL: gantt end anchor not found')
    print('Looking for:', repr(old3[:60]))
    errors.append('gantt-end')

# ─────────────────────────────────────────────────────────────────────────────
# Check balance & write
# ─────────────────────────────────────────────────────────────────────────────
if errors:
    print('\nFailed patches:', errors)
else:
    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    print(f'\n{{ delta: {ob},  ( delta: {op}')
    if ob == 0 and op == 0:
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done. All patches applied.')
    else:
        print('BALANCE ERROR – file not written.')
