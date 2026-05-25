#!/usr/bin/env python3
"""
Gantt overlay filters: one chart, toolbar toggles for Baseline & Critical Path.
State: _showBl (baseline pink overlay), _showCp (critical path colors+columns)
"""
import re, sys

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def chk(s, label=''):
    ob = s.count('{') - s.count('}')
    op = s.count('(') - s.count(')')
    ok = ob == 0 and op == 0
    print(f'  {"OK" if ok else "WARN ob="+str(ob)+" op="+str(op)}: {label}')
    return ok

errors = []

# ── CP column widths ────────────────────────────────────────────────────────
TW, FW, SW = 48, 52, 68   # Type, Float, Status widths

# ── helper strings ──────────────────────────────────────────────────────────
def CP_TYPE_HDR():
    return (
        '_showCp&&e.jsx("div",{style:{width:' + str(TW) + ',flexShrink:0,'
        'padding:"6px 4px",fontSize:9,fontWeight:700,color:"#6b7280",'
        'textTransform:"uppercase",letterSpacing:"0.5px",'
        'fontFamily:"Inter,sans-serif",textAlign:"center",'
        'borderRight:"1px solid #e5e7eb"},children:"Type"}),'
    )
def CP_FLOAT_HDR():
    return (
        '_showCp&&e.jsx("div",{style:{width:' + str(FW) + ',flexShrink:0,'
        'padding:"6px 4px",fontSize:9,fontWeight:700,color:"#6b7280",'
        'textTransform:"uppercase",letterSpacing:"0.5px",'
        'fontFamily:"Inter,sans-serif",textAlign:"center",'
        'borderRight:"1px solid #e5e7eb"},children:"Float"}),'
    )
def CP_STATUS_HDR():
    return (
        '_showCp&&e.jsx("div",{style:{width:' + str(SW) + ',flexShrink:0,'
        'padding:"6px 4px",fontSize:9,fontWeight:700,color:"#6b7280",'
        'textTransform:"uppercase",letterSpacing:"0.5px",'
        'fontFamily:"Inter,sans-serif",textAlign:"center",'
        'borderRight:"1px solid #e5e7eb"},children:"Status"}),'
    )

def CP_TYPE_CELL(item_var):
    return (
        '_showCp&&e.jsx("div",{style:{width:' + str(TW) + ',flexShrink:0,'
        'display:"flex",justifyContent:"center",alignItems:"center",'
        'borderRight:"1px solid #e5e7eb"},children:'
        'e.jsx("span",{style:{fontSize:8,fontWeight:700,'
        'color:' + item_var + '.type==="Activity"?"#7c3aed":' + item_var + '.type==="Sub-Task"?"#d97706":"#1a56db",'
        'background:' + item_var + '.type==="Activity"?"#f3e8ff":' + item_var + '.type==="Sub-Task"?"#fffbeb":"#EFF4FF",'
        'padding:"2px 5px",borderRadius:4,fontFamily:"Inter,sans-serif"},'
        'children:' + item_var + '.type==="Activity"?"ACT":' + item_var + '.type==="Sub-Task"?"SUB":"TASK"})}),'
    )

def CP_FLOAT_CELL(item_var):
    return (
        '_showCp&&e.jsx("div",{style:{width:' + str(FW) + ',flexShrink:0,'
        'textAlign:"center",fontSize:11,fontWeight:600,'
        'fontFamily:"Inter,sans-serif",'
        'color:gFl(' + item_var + ')<=0?"#dc2626":gFl(' + item_var + ')<30?"#d97706":"#374151",'
        'borderRight:"1px solid #e5e7eb"},'
        'children:' + item_var + '.endDate?(gFl(' + item_var + ')<=0?"0d":gFl(' + item_var + ')+"d"):"—"}),'
    )

def CP_STATUS_CELL(item_var):
    return (
        '_showCp&&e.jsx("div",{style:{width:' + str(SW) + ',flexShrink:0,'
        'display:"flex",justifyContent:"center",alignItems:"center",'
        'borderRight:"1px solid #e5e7eb"},children:'
        'gFl(' + item_var + ')<=0?'
        'e.jsx("span",{style:{fontSize:8,fontWeight:700,color:"#dc2626",'
        'background:"#fee2e2",padding:"2px 5px",borderRadius:4,'
        'fontFamily:"Inter,sans-serif"},children:"Critical"}):'
        'e.jsx("span",{style:{fontSize:10,color:"#9ca3af"},children:"—"})}),'
    )

# baseline bar uses qs() with shifted dates (no variable name conflicts)
def BS_BAR(item_var, bar_var):
    return (
        '_showBl&&(()=>{if(!' + item_var + '.startDate||!' + item_var + '.endDate)return null;'
        'const bsB=qs({startDate:new Date(new Date(' + item_var + '.startDate).getTime()-14*864e5).toISOString().slice(0,10),'
        'endDate:new Date(new Date(' + item_var + '.endDate).getTime()-14*864e5).toISOString().slice(0,10)});'
        'return bsB?e.jsx("div",{style:{position:"absolute",left:bsB.left,width:bsB.width,'
        'height:8,top:"50%",marginTop:3,borderRadius:3,'
        'background:"#fda4af",zIndex:1,opacity:0.85}}):null;'
        '})(),'
    )

def FLOAT_LINE(bar_var, item_var):
    return (
        '_showCp&&' + bar_var + '&&gFl(' + item_var + ')>0&&gFl(' + item_var + ')<500&&'
        'e.jsx("div",{style:{position:"absolute",'
        'left:' + bar_var + '.left+' + bar_var + '.width,'
        'width:Math.min(gFl(' + item_var + ')*' + str(28) + '/7,_e*' + str(28) + '-' + bar_var + '.left-' + bar_var + '.width),'
        'height:2,top:"50%",marginTop:-1,zIndex:1,'
        'backgroundImage:"repeating-linear-gradient(90deg,#9ca3af 0,#9ca3af 4px,transparent 4px,transparent 8px)"}}),'
    )

# verify helpers
for fn, name in [(CP_TYPE_HDR,'TYPE_HDR'),(CP_FLOAT_HDR,'FLOAT_HDR'),(CP_STATUS_HDR,'STATUS_HDR'),
                 (lambda:CP_TYPE_CELL('me'),'TYPE_CELL_me'),(lambda:CP_FLOAT_CELL('me'),'FLOAT_CELL_me'),
                 (lambda:CP_STATUS_CELL('me'),'STATUS_CELL_me'),
                 (lambda:BS_BAR('me','it'),'BS_BAR_me'),(lambda:FLOAT_LINE('it','me'),'FLOAT_LINE_me')]:
    chk(fn(), name)

print()

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 1 – Add _showBl and _showCp state
# ═══════════════════════════════════════════════════════════════════════════
OLD1 = '[_depBdOpen,_setDepBdOpen]=b.useState(!1),'
NEW1 = ('[_depBdOpen,_setDepBdOpen]=b.useState(!1),'
        '[_showBl,_setShowBl]=b.useState(!1),'
        '[_showCp,_setShowCp]=b.useState(!1),')
if NEW1 in content:
    print('P1: already applied')
elif OLD1 in content:
    content = content.replace(OLD1, NEW1, 1); print('P1 state: OK')
else:
    errors.append('P1'); print('P1 state: FAIL')

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 2 – Add cpEnd + gFl helpers inside IIFE, just before return
# ═══════════════════════════════════════════════════════════════════════════
OLD2 = 'return e.jsxs("div",{style:{background:"#fff",overflow:"hidden"},children:['
NEW2 = ('const cpEnd=Z.reduce((mx,_itm)=>{'
        'if(!_itm.endDate)return mx;'
        'const _d=new Date(_itm.endDate);return _d>mx?_d:mx;'
        '},new Date(0));'
        'const gFl=_itm=>_itm.endDate?'
        'Math.round((cpEnd.getTime()-new Date(_itm.endDate).getTime())/864e5):999;'
        + OLD2)
if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1); print('P2 helpers: OK')
else:
    errors.append('P2'); print('P2 helpers: FAIL')

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 3 – Add toggle buttons to toolbar (after Today btn, before close)
# ═══════════════════════════════════════════════════════════════════════════
TOGGLE_BTNS = (
    'e.jsx("div",{style:{width:1,height:16,background:"#e5e7eb",flexShrink:0}}),'
    + 'e.jsx("button",{onClick:()=>_setShowBl(!_showBl),'
    'style:{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",'
    'borderRadius:8,border:"1px solid #e5e7eb",'
    'background:_showBl?"#fff1f2":"#fff",'
    'fontSize:11,fontWeight:_showBl?700:500,'
    'fontFamily:"Inter,sans-serif",'
    'color:_showBl?"#e11d48":"#374151",cursor:"pointer",flexShrink:0},'
    'children:["⬛ Baseline"]}),'
    + 'e.jsx("button",{onClick:()=>_setShowCp(!_showCp),'
    'style:{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",'
    'borderRadius:8,border:"1px solid #e5e7eb",'
    'background:_showCp?"#f5f3ff":"#fff",'
    'fontSize:11,fontWeight:_showCp?700:500,'
    'fontFamily:"Inter,sans-serif",'
    'color:_showCp?"#7c3aed":"#374151",cursor:"pointer",flexShrink:0},'
    'children:["🔴 Critical Path"]})'
)

OLD3 = '" Today"]})]}),e.jsx("div",{id:"gantt-scroll-container"'
NEW3 = '" Today"]}),'+TOGGLE_BTNS+']}),e.jsx("div",{id:"gantt-scroll-container"'
if OLD3 in content:
    content = content.replace(OLD3, NEW3, 1); print('P3 toggles: OK')
else:
    errors.append('P3'); print('P3 toggles: FAIL')

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 4 – Dynamic minWidth (add CP col space)
# ═══════════════════════════════════════════════════════════════════════════
OLD4 = 'style:{minWidth:Ue+_e*Ae},'
NEW4 = 'style:{minWidth:Ue+(_showCp?'+str(TW+FW+SW)+':0)+_e*Ae},'
if OLD4 in content:
    content = content.replace(OLD4, NEW4, 1); print('P4 minWidth: OK')
else:
    errors.append('P4'); print('P4 minWidth: FAIL')

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 5 – Add CP column HEADERS after STRUCTURE header
# ═══════════════════════════════════════════════════════════════════════════
OLD5 = 'children:"STRUCTURE"})}),be.map((me,Ne)=>'
NEW5 = ('children:"STRUCTURE"})}),'
        + CP_TYPE_HDR() + CP_FLOAT_HDR() + CP_STATUS_HDR()
        + 'be.map((me,Ne)=>')
if OLD5 in content:
    content = content.replace(OLD5, NEW5, 1); print('P5 CP headers: OK')
else:
    errors.append('P5'); print('P5 CP headers: FAIL')

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 6 – Top-level row: add CP columns + baseline bar + CP bar color + float line
# ═══════════════════════════════════════════════════════════════════════════
# After the sticky name div, add CP cells
# Then in the bar cell, add baseline overlay and change bar color

OLD6a = ('children:me.name})]}),e.jsxs("div",{style:{flex:1,position:"relative",'
         'height:38,display:"flex",alignItems:"center",cursor:"pointer"},'
         'onClick:()=>setGanttSel(me),children:[be.map((He,yt)=>He.weeks.map((bt,Zt)=>'
         'e.jsx("div",{style:{position:"absolute",left:(be.slice(0,yt).reduce((zs,Zs)=>'
         'zs+Zs.weeks.length,0)+Zt)*Ae,top:0,width:Ae,height:"100%",'
         'borderRight:"1px solid #f3f4f6"}},`${yt}-${Zt}`))),it&&e.jsx("div",{'
         'style:{position:"absolute",left:it.left,width:it.width,height:14,'
         'borderRadius:4,background:"#1a56db",zIndex:2}})]})]}),Te&&Pe.map')

NEW6a = ('children:me.name})]}),'
         + CP_TYPE_CELL('me') + CP_FLOAT_CELL('me') + CP_STATUS_CELL('me')
         + 'e.jsxs("div",{style:{flex:1,position:"relative",'
         'height:38,display:"flex",alignItems:"center",cursor:"pointer"},'
         'onClick:()=>setGanttSel(me),children:[be.map((He,yt)=>He.weeks.map((bt,Zt)=>'
         'e.jsx("div",{style:{position:"absolute",left:(be.slice(0,yt).reduce((zs,Zs)=>'
         'zs+Zs.weeks.length,0)+Zt)*Ae,top:0,width:Ae,height:"100%",'
         'borderRight:"1px solid #f3f4f6"}},`${yt}-${Zt}`))),\n'
         + BS_BAR('me','it')
         + 'it&&e.jsx("div",{'
         'style:{position:"absolute",left:it.left,width:it.width,height:14,'
         'borderRadius:4,'
         'background:_showCp?(gFl(me)<=0?"#7c3aed":"#93c5fd"):"#1a56db",'
         'zIndex:2}}),'
         + FLOAT_LINE('it','me')
         + ']})]}),Te&&Pe.map')

if OLD6a in content:
    content = content.replace(OLD6a, NEW6a, 1); print('P6 top row: OK')
else:
    errors.append('P6'); print('P6 top row: FAIL')
    idx = content.find('children:me.name})]}),e.jsxs("div",{style:{flex:1')
    print('  partial:', idx)

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 7 – Sub-level row: add CP columns + baseline + CP bar color + float line
# ═══════════════════════════════════════════════════════════════════════════
OLD7 = ('children:He.name})]}),e.jsxs("div",{style:{flex:1,position:"relative",'
        'height:34,display:"flex",alignItems:"center",cursor:"pointer"},'
        'onClick:()=>setGanttSel(He),children:[be.map((zs,Zs)=>zs.weeks.map((fi,gi)=>'
        'e.jsx("div",{style:{position:"absolute",left:(be.slice(0,Zs).reduce((Lr,yi)=>'
        'Lr+yi.weeks.length,0)+gi)*Ae,top:0,width:Ae,height:"100%",'
        'borderRight:"1px solid #f3f4f6"}},`${Zs}-${gi}`))),bt&&e.jsx("div",{'
        'style:{position:"absolute",left:bt.left,width:bt.width,height:12,'
        'borderRadius:3,background:barClr[He.type]||"#059669",zIndex:2}})')

NEW7 = ('children:He.name})]}),'
        + CP_TYPE_CELL('He') + CP_FLOAT_CELL('He') + CP_STATUS_CELL('He')
        + 'e.jsxs("div",{style:{flex:1,position:"relative",'
        'height:34,display:"flex",alignItems:"center",cursor:"pointer"},'
        'onClick:()=>setGanttSel(He),children:[be.map((zs,Zs)=>zs.weeks.map((fi,gi)=>'
        'e.jsx("div",{style:{position:"absolute",left:(be.slice(0,Zs).reduce((Lr,yi)=>'
        'Lr+yi.weeks.length,0)+gi)*Ae,top:0,width:Ae,height:"100%",'
        'borderRight:"1px solid #f3f4f6"}},`${Zs}-${gi}`))),\n'
        + BS_BAR('He','bt')
        + 'bt&&e.jsx("div",{'
        'style:{position:"absolute",left:bt.left,width:bt.width,height:12,'
        'borderRadius:3,'
        'background:_showCp?(gFl(He)<=0?"#7c3aed":"#93c5fd"):(barClr[He.type]||"#059669"),'
        'zIndex:2}}),'
        + FLOAT_LINE('bt','He'))

if OLD7 in content:
    content = content.replace(OLD7, NEW7, 1); print('P7 sub row: OK')
else:
    errors.append('P7'); print('P7 sub row: FAIL')
    idx = content.find('children:He.name})]}),e.jsxs("div",{style:{flex:1')
    print('  partial:', idx)

# ═══════════════════════════════════════════════════════════════════════════
# Check + write
# ═══════════════════════════════════════════════════════════════════════════
print()
if errors:
    print('Failed:', errors)
else:
    # Node syntax check
    import subprocess, re as re2
    scripts = re2.findall(r'<script[^>]*>(.*?)</script>', content, re2.DOTALL)
    with open('/tmp/chk.js','w') as f: f.write(scripts[0])
    r = subprocess.run(['node','-e',
        'try{new Function(require("fs").readFileSync("/tmp/chk.js","utf8"));'
        'process.stdout.write("OK");}catch(e){process.stdout.write("ERR:"+e.message);}'],
        capture_output=True, text=True)
    print('Node check:', r.stdout)

    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    print(f'{{ delta: {ob},  ( delta: {op}')
    if ob==0 and op==0 and r.stdout=='OK':
        with open('/home/user/Harrsh25/hrmobileapp.html','w',encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
