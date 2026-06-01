#!/usr/bin/env python3
"""Replace Changes tab with pixel-perfect UI."""
import subprocess, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

# Locate changes tab
CH_STR = 'i===\"changes\" && e.jsx("div"'
CH_START = content.find(CH_STR, 890000, 920000)
assert CH_START != -1, 'Changes section not found'
seg = content[CH_START:]
db=dp=ds=0; ever=False; end_rel=None
for ii,ch in enumerate(seg):
    if ch=='{': db+=1; ever=True
    elif ch=='}': db-=1
    elif ch=='(': dp+=1; ever=True
    elif ch==')': dp-=1
    elif ch=='[': ds+=1; ever=True
    elif ch==']': ds-=1
    if ever and db==0 and dp==0 and ds==0: end_rel=ii+1; break
CH_END = CH_START + end_rel
print('CH: start=%d end=%d len=%d delta=%s' % (CH_START, CH_END, end_rel, delta(content[CH_START:CH_END])))

def sicon(paths, col, w=16, fill='none', sw=2):
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",'
            +'fill:"'+fill+'",stroke:"'+col+'",strokeWidth:'+str(sw)+','
            +'children:e.jsxs("g",{children:['+paths+']})})')

# ── Icon paths ────────────────────────────────────────────────────────────────
LAYERS_P = (
    'e.jsx("polygon",{points:"12 2 2 7 12 12 22 7 12 2"}),'
    'e.jsx("polyline",{points:"2 17 12 22 22 17"}),'
    'e.jsx("polyline",{points:"2 12 12 17 22 12"})'
)
CHECK_P = (
    'e.jsx("path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}),'
    'e.jsx("polyline",{points:"22 4 12 14.01 9 11.01"})'
)
CLOCK_IC_P = (
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
)
XCIRC_P = (
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("line",{x1:15,y1:9,x2:9,y2:15}),'
    'e.jsx("line",{x1:9,y1:9,x2:15,y2:15})'
)
SUN_P = (
    'e.jsx("circle",{cx:12,cy:12,r:4}),'
    'e.jsx("path",{d:"M12 2v2"}),'
    'e.jsx("path",{d:"M12 20v2"}),'
    'e.jsx("path",{d:"M4.93 4.93l1.41 1.41"}),'
    'e.jsx("path",{d:"M17.66 17.66l1.41 1.41"}),'
    'e.jsx("path",{d:"M2 12h2"}),'
    'e.jsx("path",{d:"M20 12h2"})'
)
MOON_P = 'e.jsx("path",{d:"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"})'
UMBRELLA_P = 'e.jsx("path",{d:"M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"})'
CLOCK_SH_P = (
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
)
NOTE_P = (
    'e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
    'e.jsx("polyline",{points:"14 2 14 8 20 8"}),'
    'e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),'
    'e.jsx("line",{x1:16,y1:17,x2:8,y2:17})'
)
CHEV_D_P = 'e.jsx("polyline",{points:"6 9 12 15 18 9"})'
FILTER_P = (
    'e.jsx("line",{x1:21,y1:10,x2:7,y2:10}),'
    'e.jsx("line",{x1:21,y1:6,x2:3,y2:6}),'
    'e.jsx("line",{x1:21,y1:14,x2:11,y2:14}),'
    'e.jsx("line",{x1:21,y1:18,x2:15,y2:18})'
)

NOTE_SM = sicon(NOTE_P, '#9ca3af', 13)
CHEV_D = sicon(CHEV_D_P, '#374151', 12)
FILTER_IC = sicon(FILTER_P, '#374151', 14)

# ── Stats section ─────────────────────────────────────────────────────────────
LAYERS_IC = sicon(LAYERS_P, '#1a56db', 22)
CHECK_IC   = sicon(CHECK_P,  '#16a34a', 22)
CLOCK_IC   = sicon(CLOCK_IC_P,'#f97316',22)
XCIRC_IC   = sicon(XCIRC_P,  '#ef4444', 22)

def stat_item(ic, num_expr, label, sub_expr, bg, border_right=True):
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
    +'(function(){var tot=E.length;'
    +'var appr=E.filter(function(g){return g.status==="approved";}).length;'
    +'var pend=E.filter(function(g){return g.status==="pending";}).length;'
    +'var rejt=E.filter(function(g){return g.status==="rejected"||g.status==="declined";}).length;'
    +'return e.jsxs(e.Fragment,{children:['
    +stat_item(LAYERS_IC,'tot','Total Changes','"All time"','#eff4ff')
    +','+stat_item(CHECK_IC,'appr','Approved','appr>0?(appr/tot*100).toFixed(1)+"%":"0%"','#f0fdf4')
    +','+stat_item(CLOCK_IC,'pend','Pending','pend>0?(pend/tot*100).toFixed(1)+"%":"0%"','#fff7ed')
    +','+stat_item(XCIRC_IC,'rejt','Rejected','rejt>0?(rejt/tot*100).toFixed(1)+"%":"0%"','#fef2f2',False)
    +']})})()'
    +']})'
)

# ── Section header ────────────────────────────────────────────────────────────
SECTION_HDR = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
    +'e.jsx("span",{style:{fontSize:16,fontWeight:800,color:"#111827"},children:"Change History"}),'
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,background:"#fff",'
    +'border:"1px solid #e5e7eb",borderRadius:10,padding:"6px 12px",cursor:"pointer"},children:['
    +'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#374151"},children:"All Status"}),'
    +CHEV_D
    +']})'
    +',e.jsx("div",{style:{width:34,height:34,borderRadius:10,background:"#fff",'
    +'border:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",'
    +'cursor:"pointer"},children:'+FILTER_IC+'})'
    +']})'
    +']})'
)

# ── Card list ─────────────────────────────────────────────────────────────────
CARDS = (
    'E.map(function(g,gi){'
    +'var dt=new Date(g.date);'
    +'var dayNum=dt.getDate();'
    +'var monStr=dt.toLocaleString("en-GB",{month:"short"}).toUpperCase();'
    +'var dtFmt=dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});'
    +'var dtApp=g.changedOn?new Date(g.changedOn).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"";'
    +'var stCol=g.status==="approved"?"#16a34a":g.status==="pending"?"#f97316":"#ef4444";'
    +'var stBg=g.status==="approved"?"#f0fdf4":g.status==="pending"?"#fff7ed":"#fef2f2";'
    +'var stLbl=g.status==="approved"?"Approved":g.status==="pending"?"Pending":"Rejected";'
    +'var fromIc=g.oldShift.indexOf("Morning")>=0?'+sicon(SUN_P,'#f97316',13)
    +':g.oldShift.indexOf("Evening")>=0||g.oldShift.indexOf("Night")>=0?'+sicon(MOON_P,'#8b5cf6',13)
    +':g.oldShift.indexOf("Day Off")>=0?'+sicon(UMBRELLA_P,'#16a34a',13)
    +':'+sicon(CLOCK_SH_P,'#6b7280',13)+';'
    +'var toIc=g.newShift.indexOf("Morning")>=0?'+sicon(SUN_P,'#f97316',13)
    +':g.newShift.indexOf("Evening")>=0||g.newShift.indexOf("Night")>=0?'+sicon(MOON_P,'#8b5cf6',13)
    +':g.newShift.indexOf("Day Off")>=0?'+sicon(UMBRELLA_P,'#16a34a',13)
    +':'+sicon(CLOCK_SH_P,'#6b7280',13)+';'
    +'var supInits=(g.approvedBy.split(" ").map(function(n){return n[0];}).join("")).slice(0,2).toUpperCase();'
    +'var supLbl=g.status==="approved"?"Approved by ":g.status==="pending"?"Submitted to ":"Rejected by ";'
    +'return e.jsxs("div",{style:{background:"#fff",borderRadius:16,'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",'
    +'borderLeft:"4px solid "+stCol,padding:"14px 14px 14px 12px"},children:['
    # Row 1: calendar box + date text + status chip
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12},children:['
    +'e.jsxs("div",{style:{width:48,height:52,borderRadius:10,border:"2px solid "+stCol,'
    +'background:"#fff",display:"flex",flexDirection:"column",'
    +'alignItems:"center",justifyContent:"center",flexShrink:0,gap:2},children:['
    +'e.jsx("span",{style:{fontSize:18,fontWeight:800,color:stCol,lineHeight:1},children:dayNum}),'
    +'e.jsx("span",{style:{fontSize:9,fontWeight:700,color:stCol,letterSpacing:0.5},children:monStr})'
    +']})'
    +',e.jsx("span",{style:{fontSize:15,fontWeight:800,color:"#111827",flex:1},children:dtFmt})'
    +',e.jsx("span",{style:{fontSize:11,fontWeight:700,color:stCol,background:stBg,'
    +'borderRadius:20,padding:"3px 10px",border:"1px solid "+stCol+"33",whiteSpace:"nowrap"},'
    +'children:stLbl})'
    +']})'
    # Row 2: from → to
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6,flexWrap:"wrap"},children:['
    +'fromIc,'
    +'e.jsxs("span",{style:{fontSize:12,color:"#374151"},children:["From: ",'
    +'e.jsx("span",{style:{fontWeight:500,color:"#6b7280"},children:g.oldShift})]}),'
    +'e.jsx("span",{style:{fontSize:12,color:"#d1d5db"},children:" | "}),'
    +'toIc,'
    +'e.jsxs("span",{style:{fontSize:12,color:"#374151"},children:["To: ",'
    +'e.jsx("span",{style:{fontWeight:500,color:"#6b7280"},children:g.newShift})]})'
    +']})'
    # Row 3: reason
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:10},children:['
    +NOTE_SM+','
    +'e.jsxs("span",{style:{fontSize:12,color:"#374151"},children:["Reason: ",'
    +'e.jsx("span",{style:{fontWeight:500,color:"#6b7280"},children:g.reason})]})'
    +']})'
    # Divider
    +',e.jsx("div",{style:{height:1,background:"#f3f4f6",marginBottom:10}})'
    # Supervisor row
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    +'e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",background:"#dbeafe",'
    +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    +'children:e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#1a56db"},children:supInits})}),'
    +'e.jsxs("div",{children:['
    +'e.jsxs("p",{style:{fontSize:12,fontWeight:600,color:"#374151",margin:"0 0 2px"},children:['
    +'supLbl,'
    +'e.jsx("span",{style:{fontWeight:700,color:"#111827"},children:g.approvedBy})'
    +']})'
    +',e.jsx("p",{style:{fontSize:11,color:"#9ca3af",margin:0},children:"on "+dtApp})'
    +']})'
    +']})'
    +']},'
    +'g.id);'
    +'})'
)

# ── Assemble new section ──────────────────────────────────────────────────────
NEW_CH = (
    'i===\"changes\"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"0 0 80px"},children:['
    +STATS_CARD+','
    +SECTION_HDR+','
    +CARDS
    +']})'
)

print('STATS_CARD delta:', delta(STATS_CARD))
print('SECTION_HDR delta:', delta(SECTION_HDR))
print('CARDS delta:', delta(CARDS))
ob_n,op_n,sq_n = delta(NEW_CH)
print('NEW_CH delta: %d %d %d' % (ob_n,op_n,sq_n))
assert (ob_n,op_n,sq_n)==(0,0,0), 'NEW_CH bracket imbalance!'

new_content = content[:CH_START] + NEW_CH + content[CH_END:]
g0,g1,g2 = delta(new_content)
c0,c1,c2 = delta(content)
print('global: %d %d %d' % (g0-c0,g1-c1,g2-c2))
assert (g0-c0,g1-c1,g2-c2)==(0,0,0), 'Global bracket imbalance!'

tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
js_vars = ('var i="changes",I=()=>{},le=()=>{},'
           'x=[],'
           'E=[{id:"sc-001",date:"2026-04-29",oldShift:"Morning (08:00-17:00)",'
           'newShift:"Evening (17:00-22:00)",reason:"Project requirement",'
           'approvedBy:"Sarah Chen",status:"approved",changedOn:"2026-04-27"},'
           '{id:"sc-002",date:"2026-05-01",oldShift:"General (09:00-18:00)",'
           'newShift:"Day Off",reason:"Leave approved",'
           'approvedBy:"Sarah Chen",status:"approved",changedOn:"2026-04-25"}],'
           'e={jsx:()=>{},jsxs:()=>{},Fragment:"f"};')
tmp.write(js_vars + 'void (' + NEW_CH + ')')
tmp.close()
r = subprocess.run(['node', tmp.name], capture_output=True, text=True)
os.unlink(tmp.name)
if r.returncode != 0:
    print('ERR:' + r.stderr[:800])
else:
    print('Node: OK')
    with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Done.')
