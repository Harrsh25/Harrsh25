#!/usr/bin/env python3
"""
Add Gantt sub-views: Gantt | Baseline | Critical Path
All variables carefully named to avoid shadowing IIFE vars:
  W=projStart, pe=projEnd, be=months, _e=weekCols, Ae=weekW,
  Ue=leftW, ze=gridStart, wt=todayX, qs=barFn, ne=topItems, z=childFn
"""

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ── helpers ────────────────────────────────────────────────────────────────
def chk(s, label):
    ob = s.count('{') - s.count('}')
    op = s.count('(') - s.count(')')
    status = 'OK' if ob == 0 and op == 0 else f'WARN ob={ob} op={op}'
    print(f'  {label}: {status}')
    return ob, op

HDR = (
    'e.jsxs("div",{style:{display:"flex",borderBottom:"1px solid #e5e7eb",'
    'background:"#f9fafb",position:"sticky",top:0,zIndex:5},children:['
    'e.jsx("div",{style:{width:Ue,minWidth:Ue,flexShrink:0,padding:"8px 10px",'
    'borderRight:"1px solid #e5e7eb",position:"sticky",left:0,zIndex:4,'
    'background:"#f9fafb"},children:e.jsx("span",{style:{fontSize:10,fontWeight:700,'
    'color:"#6b7280",letterSpacing:"0.5px",textTransform:"uppercase",'
    'fontFamily:"Inter,sans-serif"},children:"STRUCTURE"})}),'
    'be.map((mo,mi)=>e.jsxs("div",{style:{flexShrink:0,width:mo.weeks.length*Ae},children:['
    'e.jsx("div",{style:{padding:"4px 6px",fontSize:9,fontWeight:700,'
    'color:"#9ca3af",textTransform:"uppercase",fontFamily:"Inter,sans-serif",'
    'borderBottom:"1px solid #e5e7eb"},children:mo.label}),'
    'e.jsxs("div",{style:{display:"flex"},children:['
    'mo.weeks.map((wk,wi)=>e.jsx("div",{style:{width:Ae,fontSize:8,color:"#9ca3af",'
    'textAlign:"center",borderRight:"1px solid #f3f4f6",'
    'fontFamily:"Inter,sans-serif"},children:"W"+(wi+1)},wi))'
    ']})]},mi))'
    ']})'
)

GRID_COLS = (
    'be.map((mo,mi)=>mo.weeks.map((_wk,wi)=>'
    'e.jsx("div",{style:{position:"absolute",'
    'left:(be.slice(0,mi).reduce((s,m)=>s+m.weeks.length,0)+wi)*Ae,'
    'top:0,width:Ae,height:"100%",'
    'borderRight:"1px solid #f3f4f6"}},{key:mi+"-"+wi})))'
)

TODAY_LINE = (
    'e.jsx("div",{style:{position:"absolute",top:0,bottom:0,'
    'left:wt,width:2,background:"#ef4444",zIndex:4,pointerEvents:"none"}})'
)

# ── flat-row walker (uses ne + z, avoids all IIFE var names) ───────────────
WALK = (
    '(()=>{const rws=[];'
    'const walk=(items,dp)=>items.forEach(itm=>{'
    'rws.push({itm,dp});'
    'const ch=z(itm.id);if(ch.length>0)walk(ch,dp+1);'
    '});walk(ne,0);return rws;})()'
)

# ── baseline bar calc (uses pe as projEnd Date – no shadowing) ────────────
def BS_BAR():
    return (
        '(()=>{'
        'if(!itm.startDate||!itm.endDate)return null;'
        'const bsS=new Date(new Date(itm.startDate).getTime()-14*864e5);'
        'const bsE=new Date(new Date(itm.endDate).getTime()-14*864e5);'
        'const pS=new Date(W.getFullYear(),W.getMonth(),1);'
        'const span=(pe.getTime()-pS.getTime())/864e5;'  # pe = projEnd Date
        'const tot=_e*Ae;'
        'const lft=Math.max(0,(bsS.getTime()-pS.getTime())/864e5/span)*tot;'
        'const rgt=Math.min(1,(bsE.getTime()-pS.getTime())/864e5/span)*tot;'
        'return{left:lft,width:Math.max(4,rgt-lft)};'
        '})()'
    )

# ── 1. Sub-tabs ────────────────────────────────────────────────────────────
SUB_TABS = (
    'e.jsxs("div",{style:{display:"flex",borderBottom:"1px solid #e5e7eb",'
    'background:"#fff",padding:"0 16px",gap:0,flexShrink:0},children:['
    + ','.join(
        'e.jsx("button",{onClick:()=>_setGanttSub("' + mode + '"),'
        'style:{padding:"10px 14px",fontSize:11,background:"none",border:"none",'
        'cursor:"pointer",fontFamily:"Inter,sans-serif",'
        'fontWeight:_ganttSub==="' + mode + '"?700:500,'
        'color:_ganttSub==="' + mode + '"?"#1a56db":"#6b7280",'
        'borderBottom:_ganttSub==="' + mode + '"?"2px solid #1a56db":"2px solid transparent",'
        'whiteSpace:"nowrap"},children:"' + label + '"})'
        for mode, label in [('gantt','Gantt'),('baseline','Baseline'),('critical','Critical Path')]
    )
    + ']}),')
chk(SUB_TABS, 'SUB_TABS')

# ── 2. Baseline view ───────────────────────────────────────────────────────
BASELINE = (
    '_ganttSub==="baseline"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",'
    'background:"#fff",overflow:"hidden"},children:['
    # comparing header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",'
    'borderBottom:"1px solid #f0f1f4",background:"#f8faff",flexShrink:0},children:['
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#6b7280",'
    'fontFamily:"Inter,sans-serif"},children:"COMPARING"}),'
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif"},children:['
    'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",'
    'background:"#1a56db",display:"inline-block"}}),"Current"]}),'
    'e.jsx("span",{style:{color:"#9ca3af",fontSize:11},children:"vs"}),'
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif"},children:['
    'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",'
    'background:"#e11d48",display:"inline-block"}}),"V1 Baseline"]})'
    ']}),'
    # scroll
    'e.jsx("div",{style:{overflowX:"auto",WebkitOverflowScrolling:"touch"},children:'
    'e.jsxs("div",{style:{minWidth:Ue+_e*Ae},children:['
    + HDR + ','
    'e.jsx("div",{style:{position:"relative"},children:['
    + TODAY_LINE + ','
    + WALK + '.map(({itm,dp},ri)=>{'
    'const bar=qs(itm);'
    'const bsBar=' + BS_BAR() + ';'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'borderBottom:"1px solid #f0f1f4",minHeight:dp===0?40:34,'
    'background:"#fff"},children:['
    'e.jsx("div",{style:{width:Ue,minWidth:Ue,flexShrink:0,'
    'display:"flex",alignItems:"center",'
    'padding:"0 8px 0 "+(8+dp*12)+"px",'
    'borderRight:"1px solid #e5e7eb",position:"sticky",'
    'left:0,zIndex:3,background:"#fff"},'
    'children:e.jsx("span",{style:{fontSize:dp===0?12:11,'
    'fontWeight:dp===0?700:400,color:"#111827",'
    'fontFamily:"Inter,sans-serif",overflow:"hidden",'
    'textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:itm.name})}),'
    'e.jsxs("div",{style:{flex:1,position:"relative",'
    'height:dp===0?40:34},children:['
    + GRID_COLS + ','
    'bsBar&&e.jsx("div",{style:{position:"absolute",'
    'left:bsBar.left,width:bsBar.width,'
    'height:8,top:"50%",marginTop:4,'
    'borderRadius:3,background:"#fda4af",zIndex:1}}),'
    'bar&&e.jsx("div",{style:{position:"absolute",'
    'left:bar.left,width:bar.width,'
    'height:8,top:"50%",marginTop:-10,'
    'borderRadius:3,background:"#1a56db",zIndex:2}})'
    ']})'   # close bar cell
    ']},ri)'  # close row
    '})'    # close map
    ']}'    # close relative div children
    ')'     # close relative div
    ']}'    # close minWidth div children
    ')'     # close minWidth div
    '}'     # close overflowX children (arrow shorthand - no, it's an object value)
    ')'     # close overflowX div
    ']}'    # close outer baseline div children
    '),'    # close baseline outer div
)
ob_bl, op_bl = chk(BASELINE, 'BASELINE')

# ── 3. Critical Path view ─────────────────────────────────────────────────
SEL = 'Object.keys(_colDraft).filter(function(k){return _colDraft[k];}).length'

CRITICAL = (
    '_ganttSub==="critical"&&(()=>{'
    'const cRows=' + WALK + ';'
    'const projEnd=cRows.reduce((mx,{itm})=>{'
    'if(!itm.endDate)return mx;'
    'const d=new Date(itm.endDate);return d>mx?d:mx;'
    '},new Date(0));'
    'const gFloat=itm2=>itm2.endDate?'
    'Math.round((projEnd.getTime()-new Date(itm2.endDate).getTime())/864e5):999;'
    'const critN=cRows.filter(({itm})=>gFloat(itm)<=0).length;'
    'const ncFlts=cRows.filter(({itm})=>itm.endDate&&gFloat(itm)>0)'
    '.map(({itm})=>gFloat(itm));'
    'const avgFl=ncFlts.length?Math.round(ncFlts.reduce((a,b)=>a+b,0)/ncFlts.length):0;'
    'const minFl=ncFlts.length?Math.min(...ncFlts):0;'
    'const totFl=ncFlts.reduce((a,b)=>a+b,0);'
    'const projDays=Math.round((projEnd.getTime()-ze.getTime())/864e5);'
    'return e.jsxs("div",{style:{display:"flex",flexDirection:"column",'
    'background:"#fff",overflow:"hidden"},children:['
    # toolbar
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,'
    'padding:"8px 16px",borderBottom:"1px solid #e5e7eb",'
    'background:"#fff",overflowX:"auto",flexShrink:0},children:['
    'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#7c3aed",'
    'background:"#f3e8ff",padding:"4px 10px",borderRadius:6,'
    'fontFamily:"Inter,sans-serif"},children:"Critical Path Analysis"}),'
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,color:"#059669",fontFamily:"Inter,sans-serif"},children:['
    'e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",'
    'background:"#059669",display:"inline-block"}}),'
    '"Dependencies Valid"]})'
    ']}),'
    # main scroll area
    'e.jsx("div",{style:{flex:1,overflowX:"auto",overflowY:"auto"},children:'
    'e.jsxs("div",{style:{minWidth:Ue+200+_e*Ae,display:"flex"},children:['
    # left panel
    'e.jsxs("div",{style:{width:Ue+200,flexShrink:0,'
    'borderRight:"1px solid #e5e7eb"},children:['
    'e.jsxs("div",{style:{display:"flex",borderBottom:"1px solid #e5e7eb",'
    'background:"#f9fafb",position:"sticky",top:0,zIndex:5},children:['
    'e.jsx("div",{style:{flex:1,padding:"8px 10px",fontSize:10,fontWeight:700,'
    'color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.5px",'
    'fontFamily:"Inter,sans-serif"},children:"Structure"}),'
    'e.jsx("div",{style:{width:48,padding:"8px 4px",fontSize:10,fontWeight:700,'
    'color:"#6b7280",textTransform:"uppercase",fontFamily:"Inter,sans-serif",'
    'textAlign:"center"},children:"Type"}),'
    'e.jsx("div",{style:{width:52,padding:"8px 4px",fontSize:10,fontWeight:700,'
    'color:"#6b7280",textTransform:"uppercase",fontFamily:"Inter,sans-serif",'
    'textAlign:"center"},children:"Float"}),'
    'e.jsx("div",{style:{width:68,padding:"8px 4px",fontSize:10,fontWeight:700,'
    'color:"#6b7280",textTransform:"uppercase",fontFamily:"Inter,sans-serif",'
    'textAlign:"center"},children:"Status"})'
    ']}),'
    'cRows.map(({itm,dp},ri)=>{'
    'const fl=gFloat(itm);const ic=fl<=0;'
    'const tl=itm.type==="Activity"?"ACT":"TASK";'
    'const tb=itm.type==="Activity"?"#f3e8ff":"#EFF4FF";'
    'const tc2=itm.type==="Activity"?"#7c3aed":"#1a56db";'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'borderBottom:"1px solid #f0f1f4",minHeight:36,'
    'background:ic?"#fff7f7":"#fff"},children:['
    'e.jsx("div",{style:{flex:1,padding:"6px 8px 6px "+(8+dp*12)+"px",'
    'fontSize:dp===0?12:11,fontWeight:dp===0?700:400,'
    'color:"#111827",fontFamily:"Inter,sans-serif",'
    'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:itm.name}),'
    'e.jsx("div",{style:{width:48,display:"flex",justifyContent:"center",'
    'alignItems:"center"},children:'
    'e.jsx("span",{style:{fontSize:9,fontWeight:700,color:tc2,'
    'background:tb,padding:"2px 5px",borderRadius:4,'
    'fontFamily:"Inter,sans-serif"},children:tl})}),'
    'e.jsx("div",{style:{width:52,textAlign:"center",fontSize:11,'
    'fontWeight:600,fontFamily:"Inter,sans-serif",'
    'color:ic?"#dc2626":fl<30?"#d97706":"#374151"},'
    'children:itm.endDate?(ic?"0d":fl+"d"):"—"}),'
    'e.jsx("div",{style:{width:68,display:"flex",justifyContent:"center",'
    'alignItems:"center"},children:'
    'ic?e.jsx("span",{style:{fontSize:9,fontWeight:700,color:"#dc2626",'
    'background:"#fee2e2",padding:"2px 6px",borderRadius:4,'
    'fontFamily:"Inter,sans-serif"},children:"Critical"}):'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af"},children:"—"})})'
    ']},ri)'  # close row div
    '})'    # close cRows.map
    ']}),'  # close left panel children + div
    # right panel
    'e.jsxs("div",{style:{flex:1,position:"relative"},children:['
    + HDR + ','
    'e.jsxs("div",{style:{position:"relative"},children:['
    + TODAY_LINE + ','
    'cRows.map(({itm,dp:_dp},ri)=>{'
    'const bar=qs(itm);const fl2=gFloat(itm);const ic2=fl2<=0;'
    'const fw=bar&&!ic2&&fl2<500?Math.min(fl2*Ae/7,_e*Ae-bar.left-bar.width):0;'
    'return e.jsxs("div",{style:{position:"relative",display:"flex",'
    'alignItems:"center",borderBottom:"1px solid #f0f1f4",'
    'minHeight:36},children:['
    + GRID_COLS + ','
    'bar&&e.jsx("div",{style:{position:"absolute",left:bar.left,'
    'width:bar.width,height:12,top:"50%",marginTop:-6,'
    'borderRadius:4,background:ic2?"#7c3aed":"#93c5fd",zIndex:2}}),'
    'bar&&!ic2&&fw>0&&e.jsx("div",{style:{position:"absolute",'
    'left:bar.left+bar.width,width:fw,height:2,'
    'top:"50%",marginTop:-1,zIndex:1,'
    'backgroundImage:"repeating-linear-gradient(90deg,#9ca3af 0,#9ca3af 4px,transparent 4px,transparent 8px)"}})'
    ']},ri)'  # close right row
    '})'    # close right rows map
    ']})'   # close right rows relative div
    ']})'   # close right panel
    ']})'   # close minWidth flex
    '}'     # close overflowX children (value)
    ')'     # close overflowX div
    ','
    # bottom stats
    'e.jsxs("div",{style:{display:"flex",gap:6,padding:"10px 16px",'
    'borderTop:"1px solid #e5e7eb",background:"#f9fafb",'
    'overflowX:"auto",flexShrink:0},children:['
    + ','.join(
        'e.jsxs("div",{style:{flexShrink:0,padding:"6px 10px",'
        'borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",'
        'textAlign:"center"},children:['
        'e.jsx("div",{style:{fontSize:9,color:"#9ca3af",fontWeight:600,'
        'textTransform:"uppercase",letterSpacing:"0.4px",'
        'fontFamily:"Inter,sans-serif"},children:"' + lbl + '"}),'
        'e.jsx("div",{style:{fontSize:13,fontWeight:700,color:"#111827",'
        'fontFamily:"Inter,sans-serif",marginTop:2},children:' + val + '}),'
        'e.jsx("div",{style:{fontSize:9,color:"#6b7280",'
        'fontFamily:"Inter,sans-serif"},children:"' + sub + '"})'
        ']},' + str(i) + ')'
        for i, (lbl, val, sub) in enumerate([
            ('Critical', 'critN', '"zero-float"'),
            ('Avg Float', 'avgFl+"d"', '"non-critical"'),
            ('Min Float', 'minFl+"d"', '"near critical"'),
            ('Total Float', 'totFl+"d"', '"non-critical"'),
            ('Duration', 'projDays+"d"', '"total span"'),
        ])
    )
    + ']})'   # close stats
    + ']})'   # close outer critical div
    + ';})()'  # close IIFE
    + ','
)
ob_cp, op_cp = chk(CRITICAL, 'CRITICAL')

print()

# ── Apply patches ──────────────────────────────────────────────────────────
errors = []

# P1: state
old1 = '[_depBdOpen,_setDepBdOpen]=b.useState(!1),'
new1 = '[_depBdOpen,_setDepBdOpen]=b.useState(!1),[_ganttSub,_setGanttSub]=b.useState("gantt"),'
if new1 in content:
    print('P1 state: already present')
elif old1 in content:
    content = content.replace(old1, new1, 1)
    print('P1 state: OK')
else:
    errors.append('P1-state'); print('P1 state: FAIL')

# P2: inject sub-tabs + open Fragment for gantt content
old2 = ('e.jsxs("div",{style:{background:"#fff",overflow:"hidden"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,'
        'padding:"10px 16px",borderBottom:"1px solid #e5e7eb",'
        'background:"#fff",overflowX:"auto"},')
new2 = ('e.jsxs("div",{style:{background:"#fff",overflow:"hidden",display:"flex",'
        'flexDirection:"column"},children:['
        + SUB_TABS
        + '_ganttSub==="gantt"&&e.jsxs(e.Fragment,{children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,'
        'padding:"10px 16px",borderBottom:"1px solid #e5e7eb",'
        'background:"#fff",overflowX:"auto"},')
if old2 in content:
    content = content.replace(old2, new2, 1)
    print('P2 sub-tabs: OK')
else:
    errors.append('P2-tabs'); print('P2 sub-tabs: FAIL')

# P3: close Fragment + inject baseline + critical + close outer div
# After pe)) the chars are: }) ]}) ]}) ]}) })()
# Breakdown:
#   })     = close a div in the detail panel
#   ]})    = close detail panel map array + props + jsxs
#   ]})    = close ganttSel&&Fragment
#   ]})    = OLD outer div close — in new version:
#              → becomes Fragment close for _ganttSub==="gantt"&&Fragment
#              → then BASELINE + CRITICAL as siblings
#              → then outer div close ]})
#   })()   = IIFE close
PREFIX3 = 'children:W.value})]},pe))'
OLD_TAIL = '})' + ']})' * 3 + '})()'
NEW_TAIL = ('})' + ']})' * 2   # keep: detail + ganttSel Fragment
            + ']})' +           # close _ganttSub==="gantt"&&e.jsxs(e.Fragment,...)
            BASELINE +
            CRITICAL +
            ']})' +             # close outer div
            '})()')             # close IIFE

old3 = PREFIX3 + OLD_TAIL
new3 = PREFIX3 + NEW_TAIL

if old3 in content:
    content = content.replace(old3, new3, 1)
    print('P3 close+inject: OK')
else:
    errors.append('P3-end'); print('P3 close+inject: FAIL')
    # debug
    idx = content.find(PREFIX3)
    if idx != -1:
        print('  PREFIX found at', idx, '- chars after:', repr(content[idx+len(PREFIX3):idx+len(PREFIX3)+30]))

# ── Balance check & write ──────────────────────────────────────────────────
if errors:
    print('\nFailed:', errors)
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
