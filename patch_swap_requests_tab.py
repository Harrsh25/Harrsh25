#!/usr/bin/env python3
"""Replace Swap Requests tab + update header for pixel-perfect UI."""
import subprocess, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

# ── Locate header ─────────────────────────────────────────────────────────────
SH_STR = 'e.jsxs("div",{style:{background:"#fff",padding:"44px 16px 0",borderBottom:"1px solid #f0f1f4"},'
SH_START = content.find(SH_STR, 870000, 895000)
assert SH_START != -1, 'Header not found'
seg = content[SH_START:]
db=dp=ds=0; ever=False; end_rel=None
for i,ch in enumerate(seg):
    if ch=='{': db+=1; ever=True
    elif ch=='}': db-=1
    elif ch=='(': dp+=1; ever=True
    elif ch==')': dp-=1
    elif ch=='[': ds+=1; ever=True
    elif ch==']': ds-=1
    if ever and db==0 and dp==0 and ds==0: end_rel=i+1; break
SH_END = SH_START + end_rel
print('SH: start=%d end=%d len=%d delta=%s' % (SH_START,SH_END,end_rel,delta(content[SH_START:SH_END])))

# ── Locate swap-requests tab ──────────────────────────────────────────────────
SR_STR = 'i===\"swap-requests\" && e.jsxs("div",{className:"space-y-2",'
SR_START = content.find(SR_STR, 880000, 900000)
assert SR_START != -1, 'Swap-requests section not found'
seg2 = content[SR_START:]
db=dp=ds=0; ever=False; end_rel2=None
for i,ch in enumerate(seg2):
    if ch=='{': db+=1; ever=True
    elif ch=='}': db-=1
    elif ch=='(': dp+=1; ever=True
    elif ch==')': dp-=1
    elif ch=='[': ds+=1; ever=True
    elif ch==']': ds-=1
    if ever and db==0 and dp==0 and ds==0: end_rel2=i+1; break
SR_END = SR_START + end_rel2
print('SR: start=%d end=%d len=%d delta=%s' % (SR_START,SR_END,end_rel2,delta(content[SR_START:SR_END])))

def sicon(paths, col, w=16, fill='none', sw=2):
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",'
            +'fill:"'+fill+'",stroke:"'+col+'",strokeWidth:'+str(sw)+','
            +'children:e.jsxs("g",{children:['+paths+']})})')

CHEV_L = sicon('e.jsx("polyline",{points:"15 18 9 12 15 6"})','#374151',18)
CAL_P='e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
SWAP_P='e.jsx("polyline",{points:"17 1 21 5 17 9"}),e.jsx("path",{d:"M3 11V9a4 4 0 0 1 4-4h14"}),e.jsx("polyline",{points:"7 23 3 19 7 15"}),e.jsx("path",{d:"M21 13v2a4 4 0 0 1-4 4H3"})'
CHANGE_P='e.jsx("polyline",{points:"23 4 23 10 17 10"}),e.jsx("path",{d:"M20.49 15a9 9 0 1 1-2.12-9.36L23 10"})'
PLUS_P='e.jsx("line",{x1:12,y1:5,x2:12,y2:19}),e.jsx("line",{x1:5,y1:12,x2:19,y2:12})'
BELL_P='e.jsx("path",{d:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"}),e.jsx("path",{d:"M13.73 21a2 2 0 0 1-3.46 0"})'

# ── New header with subtitle for swap-requests ────────────────────────────────
NEW_SH = (
    'e.jsxs("div",{style:{background:"#fff",padding:"44px 16px 0",borderBottom:"1px solid #f0f1f4"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    +'e.jsx("button",{onClick:function(){le("dashboard");},'
    +'style:{width:36,height:36,borderRadius:10,background:"#f3f4f6",border:"none",'
    +'display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0},'
    +'children:'+CHEV_L+'}),'
    +'e.jsxs("div",{children:['
    +'e.jsx("h1",{style:{fontSize:18,fontWeight:800,color:"#111827",margin:0},children:"My Shifts"}),'
    +'i==="swap-requests"&&e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:"2px 0 0"},children:"Manage your shift swap requests"})'
    +']})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",gap:8},children:['
    +'i==="roster"&&e.jsxs("button",{onClick:function(){_setSwMode("new");_setSwCard(null);_setCardDur("");_setNrForm({date:"",autoShift:"",desiredShift:"",reason:""});_setSwMbr("");_setCvOpen(false);j(true);},'
    +'style:{display:"flex",alignItems:"center",gap:6,background:"#1a56db",color:"#fff",'
    +'border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"},'
    +'children:['+sicon(PLUS_P,'#fff',14)+',"  Request Swap"]}),'
    +'i==="swap-requests"&&e.jsxs("div",{style:{position:"relative"},children:['
    +'e.jsx("button",{style:{width:36,height:36,borderRadius:10,background:"#f3f4f6",border:"none",'
    +'display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},'
    +'children:'+sicon(BELL_P,'#374151',18)+'}),'
    +'e.jsx("div",{style:{position:"absolute",top:-4,right:-4,width:18,height:18,'
    +'borderRadius:"50%",background:"#ef4444",display:"flex",alignItems:"center",'
    +'justifyContent:"center"},children:e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#fff"},children:"3"})})'
    +']})'
    +']})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",borderTop:"1px solid #f0f1f4"},children:['
    +'[{key:"roster",label:"Roster",ic:'+sicon(CAL_P,'currentColor',13)+'},{key:"swap-requests",label:"Swap Requests",ic:'+sicon(SWAP_P,'currentColor',13)+'},{key:"changes",label:"Changes",ic:'+sicon(CHANGE_P,'currentColor',13)+'}]'
    +'.map(function(g){return e.jsxs("button",{onClick:function(){I(g.key);},'
    +'style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,'
    +'padding:"10px 4px",fontSize:12,fontWeight:i===g.key?700:500,'
    +'color:i===g.key?"#1a56db":"#6b7280",background:"none",border:"none",'
    +'borderBottom:i===g.key?"2px solid #1a56db":"2px solid transparent",cursor:"pointer",position:"relative"},'
    +'children:[g.ic,g.label,'
    +'g.key==="swap-requests"&&e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#fff",'
    +'background:"#1a56db",borderRadius:20,padding:"1px 6px",marginLeft:2},children:x.length})'
    +']},g.key);})'
    +']})'
    +']})'
)

# ── Avatar helper ─────────────────────────────────────────────────────────────
AVATAR_COLORS = [
    '#7c3aed','#0891b2','#16a34a','#ea580c','#7c3aed','#d97706',
    '#1a56db','#db2777','#059669','#9333ea','#0284c7','#dc2626'
]

def avatar_color_js():
    cols = AVATAR_COLORS
    return '["'+'","'.join(cols)+'"][gi%'+str(len(cols))+']'

# ── Status chip ───────────────────────────────────────────────────────────────
STATUS_CHIP_JS = (
    'var stCfg='
    +'g.status==="approved"?{lbl:"APPROVED",col:"#16a34a",bg:"#f0fdf4"}:'
    +'g.status==="pending"?{lbl:"PENDING",col:"#f97316",bg:"#fff7ed"}:'
    +'g.status==="declined"||g.status==="rejected"?{lbl:"DECLINED",col:"#ef4444",bg:"#fef2f2"}:'
    +'{lbl:"PENDING REVIEW",col:"#1a56db",bg:"#eff4ff"};'
)

# ── Stats section ─────────────────────────────────────────────────────────────
SWAP_IC = sicon(SWAP_P,'#1a56db',22,'none',2)
CHECK_IC = sicon('e.jsx("path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}),e.jsx("polyline",{points:"22 4 12 14.01 9 11.01"})','#16a34a',22)
CLOCK_IC = sicon('e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("polyline",{points:"12 6 12 12 16 14"})','#f97316',22)
XCIRC_IC = sicon('e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("line",{x1:15,y1:9,x2:9,y2:15}),e.jsx("line",{x1:9,y1:9,x2:15,y2:15})','#ef4444',22)

def stat_item(ic, num_expr, label, sub_expr, col, bg, border_right=True):
    br = ',borderRight:"1px solid #f3f4f6"' if border_right else ''
    return ('e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",'
            +'gap:3,padding:"12px 6px"'+br+'},children:['
            +'e.jsx("div",{style:{width:40,height:40,borderRadius:"50%",background:"'+bg+'",'
            +'display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2},'
            +'children:'+ic+'}),'
            +'e.jsx("span",{style:{fontSize:20,fontWeight:800,color:"#111827",lineHeight:1},children:'+num_expr+'}),'
            +'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#374151"},children:"'+label+'"}),'
            +'e.jsx("span",{style:{fontSize:10,color:"#9ca3af"},children:'+sub_expr+'})'
            +']})')

STATS_CARD = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",'
    +'display:"flex"},children:['
    +'(function(){var tot=x.length;'
    +'var appr=x.filter(function(g){return g.status==="approved";}).length;'
    +'var pend=x.filter(function(g){return g.status==="pending";}).length;'
    +'var decl=x.filter(function(g){return g.status==="declined"||g.status==="rejected";}).length;'
    +'return e.jsxs(e.Fragment,{children:['
    +stat_item(SWAP_IC,'tot','Total Requests','"All time"','#1a56db','#eff4ff')
    +','+stat_item(CHECK_IC,'appr','Approved','appr>0?(appr/tot*100).toFixed(1)+"%":"0%"','#16a34a','#f0fdf4')
    +','+stat_item(CLOCK_IC,'pend','Pending','pend>0?(pend/tot*100).toFixed(1)+"%":"0%"','#f97316','#fff7ed')
    +','+stat_item(XCIRC_IC,'decl','Declined','decl>0?(decl/tot*100).toFixed(1)+"%":"0%"','#ef4444','#fef2f2',False)
    +']})})()'
    +']})'
)

# ── Section header ────────────────────────────────────────────────────────────
SECTION_HDR = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
    +'e.jsx("span",{style:{fontSize:16,fontWeight:800,color:"#111827"},children:"All Swap Requests"}),'
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,background:"#fff",'
    +'border:"1px solid #e5e7eb",borderRadius:10,padding:"6px 12px",cursor:"pointer"},children:['
    +'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#374151"},children:"All Status"}),'
    +sicon('e.jsx("polyline",{points:"6 9 12 15 18 9"})','#374151',12)
    +']})'
    +',e.jsx("div",{style:{width:34,height:34,borderRadius:10,background:"#fff",'
    +'border:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",'
    +'cursor:"pointer"},'
    +'children:'+sicon('e.jsx("line",{x1:21,y1:10,x2:7,y2:10}),e.jsx("line",{x1:21,y1:6,x2:3,y2:6}),e.jsx("line",{x1:21,y1:14,x2:11,y2:14}),e.jsx("line",{x1:21,y1:18,x2:15,y2:18})','#374151',14)
    +'})'
    +']})'
    +']})'
)

# ── Card list ─────────────────────────────────────────────────────────────────
THREE_DOT = sicon('e.jsx("circle",{cx:12,cy:5,r:1}),e.jsx("circle",{cx:12,cy:12,r:1}),e.jsx("circle",{cx:12,cy:19,r:1})','#9ca3af',18,'#9ca3af',0)

CAL_SM = sicon(CAL_P,'#9ca3af',12)
SWAP_SM = sicon(SWAP_P,'#9ca3af',12)
NOTE_SM = sicon('e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),e.jsx("polyline",{points:"14 2 14 8 20 8"}),e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),e.jsx("line",{x1:16,y1:17,x2:8,y2:17})','#9ca3af',12)

CARDS = (
    'x.map(function(g,gi){'
    +'var init=(g.requesterName.split(" ").map(function(n){return n[0];}).join("")).slice(0,2).toUpperCase();'
    +'var avcol=["#7c3aed","#0891b2","#16a34a","#ea580c","#7c3aed","#d97706","#1a56db","#db2777","#059669","#9333ea","#0284c7","#dc2626"][gi%12];'
    +'var avbg=avcol+"20";'
    +'var dFmt=new Date(g.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).replace(/ /g," ");'
    +STATUS_CHIP_JS
    +'var canAcc=g.status==="awaiting-peer";'
    +'var canSwap=g.status==="pending";'
    +'return e.jsxs("div",{style:{background:"#fff",borderRadius:16,'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",'
    +'padding:"14px"},children:['
    # Row 1: avatar + name/role + status + dots
    +'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10},children:['
    +'e.jsx("div",{style:{width:44,height:44,borderRadius:12,background:avbg,'
    +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    +'children:e.jsx("span",{style:{fontSize:14,fontWeight:800,color:avcol},children:init})}),'
    +'e.jsxs("div",{style:{flex:1},children:['
    +'e.jsx("p",{style:{fontSize:14,fontWeight:800,color:"#111827",margin:"0 0 2px"},children:g.requesterName}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:0},children:g.requesterRole})'
    +']})'
    +',e.jsx("span",{style:{fontSize:10,fontWeight:700,color:stCfg.col,'
    +'background:stCfg.bg,borderRadius:6,padding:"3px 8px",whiteSpace:"nowrap",border:"1px solid "+stCfg.col+"33"},children:stCfg.lbl}),'
    +'e.jsx("button",{style:{width:28,height:28,borderRadius:8,background:"#f3f4f6",'
    +'border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0},'
    +'children:'+THREE_DOT+'})'
    +']})'
    # Row 2: date + shift swap
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6,flexWrap:"wrap"},children:['
    +CAL_SM
    +',e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:dFmt}),'
    +'e.jsx("span",{style:{fontSize:11,color:"#d1d5db"},children:"│"}),'
    +SWAP_SM
    +',e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:g.fromShift}),'
    +sicon('e.jsx("line",{x1:5,y1:12,x2:19,y2:12}),e.jsx("polyline",{points:"12 5 19 12 12 19"})','#9ca3af',12)
    +',e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:g.toShift})'
    +']})'
    # Row 3: reason
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6},children:['
    +NOTE_SM
    +',e.jsxs("span",{style:{fontSize:11,color:"#6b7280"},children:["Reason: ",e.jsx("span",{style:{fontWeight:600,color:"#374151"},children:g.reason})]})'
    +']})'
    # Row 4: via
    +',e.jsx("p",{style:{fontSize:11,color:"#9ca3af",margin:"0 0 10px"},children:"Via: "+g.supervisorName})'
    # Action buttons
    +',canAcc&&e.jsxs("div",{style:{display:"flex",gap:8},children:['
    +'e.jsx("button",{onClick:function(){h(x.map(function(r,ri){return ri===gi?Object.assign({},r,{status:"approved"}):r;}));},'
    +'style:{flex:1,padding:"9px",borderRadius:10,background:"#1a56db",color:"#fff",'
    +'border:"none",fontSize:13,fontWeight:700,cursor:"pointer"},children:"Accept"}),'
    +'e.jsx("button",{onClick:function(){h(x.map(function(r,ri){return ri===gi?Object.assign({},r,{status:"declined"}):r;}));},'
    +'style:{flex:1,padding:"9px",borderRadius:10,background:"#fff",color:"#ef4444",'
    +'border:"1.5px solid #ef4444",fontSize:13,fontWeight:700,cursor:"pointer"},children:"Decline"})'
    +']})'
    +',canSwap&&e.jsx("button",{onClick:function(){_setSwMode("card");_setSwCard({date:g.date,shift:g.fromShift});p({fromDate:g.date,fromShift:g.fromShift,toDate:"",toShift:"",reason:""});_setSwMbr("");_setCardDur("");_setCvOpen(false);j(true);},'
    +'style:{width:"100%",padding:"9px",borderRadius:10,background:"#1a56db",color:"#fff",'
    +'border:"none",fontSize:13,fontWeight:700,cursor:"pointer"},children:"Swap"})'
    +']},'
    +'gi);'
    +'})'
)

# ── New swap-requests section ─────────────────────────────────────────────────
NEW_SR = (
    'i===\"swap-requests\"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:['
    +STATS_CARD+','
    +SECTION_HDR+','
    +CARDS
    +']})'
)

print('STATS_CARD delta:', delta(STATS_CARD))
print('SECTION_HDR delta:', delta(SECTION_HDR))
print('CARDS delta:', delta(CARDS))
ob_n,op_n,sq_n = delta(NEW_SR)
print('NEW_SR delta: %d %d %d' % (ob_n,op_n,sq_n))
assert (ob_n,op_n,sq_n)==(0,0,0), 'NEW_SR bracket imbalance!'
ob_s,op_s,sq_s = delta(NEW_SH)
print('NEW_SH delta: %d %d %d' % (ob_s,op_s,sq_s))
assert (ob_s,op_s,sq_s)==(0,0,0), 'NEW_SH bracket imbalance!'

# Apply patches right-to-left (SR first since SR_START > SH_START)
new_content = content[:SH_START] + NEW_SH + content[SH_END:SR_START] + NEW_SR + content[SR_END:]
g0,g1,g2 = delta(new_content)
c0,c1,c2 = delta(content)
print('global: %d %d %d' % (g0-c0,g1-c1,g2-c2))
assert (g0-c0,g1-c1,g2-c2)==(0,0,0), 'Global bracket imbalance!'

tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
js_vars = ('var i="swap-requests",I=()=>{},le=()=>{},'
           '_setSwMode=()=>{},_setSwCard=()=>{},_setCardDur=()=>{},'
           '_setNrForm=()=>{},_setSwMbr=()=>{},_setCvOpen=()=>{},j=()=>{},'
           '_setWk=()=>{},_setMo=()=>{},_setVw=()=>{},'
           'x=[{id:"sr-001",requesterName:"Anita Desai",requesterRole:"Team Lead",'
           'date:"2026-04-24",fromShift:"Morning (08:00-17:00)",toShift:"Evening (17:00-22:00)",'
           'reason:"Medical appointment",status:"awaiting-peer",supervisorName:"Sarah Chen"}],'
           'h=()=>{},p=()=>{},'
           'e={jsx:()=>{},jsxs:()=>{}};')
tmp.write(js_vars + 'void (' + NEW_SH + ');void (' + NEW_SR + ')')
tmp.close()
r = subprocess.run(['node', tmp.name], capture_output=True, text=True)
os.unlink(tmp.name)
if r.returncode != 0:
    print('ERR:' + r.stderr[:600])
else:
    print('Node: OK')
    with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Done.')
