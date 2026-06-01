#!/usr/bin/env python3
"""Replace Timesheets screen header + list with pixel-perfect UI."""
import subprocess, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

# ── Locate sections ───────────────────────────────────────────────────────────
HDR_STR = 'e.jsxs("div",{style:{background:"#fff",padding:"44px 16px 12px",borderBottom:"1px solid #f0f1f4"'
OLD_START = content.find(HDR_STR, 925000, 935000)
assert OLD_START != -1, 'Header not found'

SCROLL_STR = 'e.jsx("div",{style:{flex:1,overflowY:"auto"'
SCROLL_START = content.find(SCROLL_STR, OLD_START+100, OLD_START+8000)
assert SCROLL_START != -1, 'Scroll div not found'

# Scan scroll div end
seg = content[SCROLL_START:]
db=dp=ds=0; ever=False; end_rel=None
for ii,ch in enumerate(seg):
    if ch=='{': db+=1; ever=True
    elif ch=='}': db-=1
    elif ch=='(': dp+=1; ever=True
    elif ch==')': dp-=1
    elif ch=='[': ds+=1; ever=True
    elif ch==']': ds-=1
    if ever and db==0 and dp==0 and ds==0: end_rel=ii+1; break
OLD_END = SCROLL_START + end_rel

print('OLD section: %d to %d (len=%d)' % (OLD_START, OLD_END, OLD_END-OLD_START))
print('Delta of replaced section:', delta(content[OLD_START:OLD_END]))

def sicon(paths, col, w=16, fill='none', sw=2):
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",'
            +'fill:"'+fill+'",stroke:"'+col+'",strokeWidth:'+str(sw)+','
            +'children:e.jsxs("g",{children:['+paths+']})})')

# ── Icon paths ────────────────────────────────────────────────────────────────
CHEV_L_P = 'e.jsx("polyline",{points:"15 18 9 12 15 6"})'
CHEV_R_P = 'e.jsx("polyline",{points:"9 6 15 12 9 18"})'
CHEV_D_P = 'e.jsx("polyline",{points:"6 9 12 15 18 9"})'
PLUS_P   = 'e.jsx("line",{x1:12,y1:5,x2:12,y2:19}),e.jsx("line",{x1:5,y1:12,x2:19,y2:12})'
SEARCH_P = 'e.jsx("circle",{cx:11,cy:11,r:8}),e.jsx("line",{x1:21,y1:21,x2:16.65,y2:16.65})'
FILTER_P = (
    'e.jsx("line",{x1:21,y1:10,x2:7,y2:10}),'
    'e.jsx("line",{x1:21,y1:6,x2:3,y2:6}),'
    'e.jsx("line",{x1:21,y1:14,x2:11,y2:14}),'
    'e.jsx("line",{x1:21,y1:18,x2:15,y2:18})'
)
FILE_P = (
    'e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
    'e.jsx("polyline",{points:"14 2 14 8 20 8"})'
)
CHECK_P = (
    'e.jsx("path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}),'
    'e.jsx("polyline",{points:"22 4 12 14.01 9 11.01"})'
)
CLOCK_P = (
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
)
XCIRC_P = (
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("line",{x1:15,y1:9,x2:9,y2:15}),'
    'e.jsx("line",{x1:9,y1:9,x2:15,y2:15})'
)
CAL_P = (
    'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
    'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
    'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
    'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
)
GRID_P = (
    'e.jsx("rect",{x:3,y:3,width:7,height:7}),'
    'e.jsx("rect",{x:14,y:3,width:7,height:7}),'
    'e.jsx("rect",{x:14,y:14,width:7,height:7}),'
    'e.jsx("rect",{x:3,y:14,width:7,height:7})'
)

# ── Stats helper ──────────────────────────────────────────────────────────────
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

FILE_IC  = sicon(FILE_P, '#1a56db', 22)
CHECK_IC = sicon(CHECK_P, '#16a34a', 22)
CLOCK_IC = sicon(CLOCK_P, '#f97316', 22)
XCIRC_IC = sicon(XCIRC_P, '#ef4444', 22)

STATS_CARD = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",'
    +'display:"flex"},children:['
    +'(function(){var tot=_data.length;'
    +'var appr=_data.filter(function(d){return d.approvalStatus==="approved";}).length;'
    +'var pend=_data.filter(function(d){return d.approvalStatus==="pending";}).length;'
    +'var rejt=_data.filter(function(d){return d.approvalStatus==="rejected";}).length;'
    +'return e.jsxs(e.Fragment,{children:['
    +stat_item(FILE_IC,'tot','Total Timesheets','"All time"','#eff4ff')
    +','+stat_item(CHECK_IC,'appr','Approved','appr>0?(appr/tot*100).toFixed(1)+"%":"0%"','#f0fdf4')
    +','+stat_item(CLOCK_IC,'pend','Pending','pend>0?(pend/tot*100).toFixed(1)+"%":"0%"','#fff7ed')
    +','+stat_item(XCIRC_IC,'rejt','Rejected','rejt>0?(rejt/tot*100).toFixed(1)+"%":"0%"','#fef2f2',False)
    +']})})()'
    +']})'
)

# ── Card map ──────────────────────────────────────────────────────────────────
CAL_SM = sicon(CAL_P, '#9ca3af', 12)
CLK_SM = sicon(CLOCK_P, '#9ca3af', 12)
CAL_BADGE = sicon(CAL_P, 'accentCol', 14)  # note: accentCol is a JS var

CARDS_MAP = (
    '_filtered.map(function(d,di){'
    +'var accentCol=d.approvalStatus==="approved"?"#16a34a":d.approvalStatus==="rejected"?"#dc2626":"#1a56db";'
    +'var accentBg=d.approvalStatus==="approved"?"#f0fdf4":d.approvalStatus==="rejected"?"#fef2f2":"#eff4ff";'
    +'var chipCol=_stColor(d.approvalStatus);'
    +'var chipBg=_stBg(d.approvalStatus);'
    +'var chipLbl=_stLabel(d.approvalStatus);'
    +'var wkBadge=d.id.replace("ts-","").toUpperCase();'
    +'return e.jsxs("div",{style:{background:"#fff",borderRadius:14,'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",'
    +'cursor:"pointer",borderLeft:"4px solid "+accentCol},'
    +'onClick:function(){_setSelTs(d);},children:['
    +'e.jsxs("div",{style:{padding:"14px 14px 14px 12px",display:"flex",gap:12,alignItems:"flex-start"},children:['
    # Week badge
    +'e.jsxs("div",{style:{width:52,height:52,borderRadius:12,background:accentBg,'
    +'display:"flex",flexDirection:"column",alignItems:"center",'
    +'justifyContent:"center",gap:3,flexShrink:0},children:['
    +sicon(CAL_P,'accentCol',16)  # Note: accentCol is a JS variable (string)
    +',e.jsx("span",{style:{fontSize:11,fontWeight:800,color:accentCol,letterSpacing:0.5},children:wkBadge})'
    +']})'
    # Main content
    +',e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    # Row 1: title + chip
    +'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4},children:['
    +'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",margin:0,flex:1,paddingRight:8},children:d.name}),'
    +'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:chipCol,background:chipBg,'
    +'borderRadius:20,padding:"3px 10px",border:"1px solid "+chipCol+"33",whiteSpace:"nowrap"},'
    +'children:chipLbl})'
    +']})'
    # Row 2: project
    +',e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:"0 0 6px"},children:d.parentNames.join(", ")})'
    # Row 3: date + hours
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"},children:['
    +CAL_SM
    +',e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:d.duration}),'
    +'e.jsx("span",{style:{fontSize:11,color:"#d1d5db"},children:"•"}),'
    +CLK_SM
    +',e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:d.loggedHours+"h logged"})'
    +']})'
    +']})'
    # Chevron
    +',e.jsx("div",{style:{display:"flex",alignItems:"center",alignSelf:"center",flexShrink:0},'
    +'children:'+sicon(CHEV_R_P,'#9ca3af',18)+'})'
    +']})'
    +']},'
    +'d.id);'
    +'})'
)

# ── Banner ────────────────────────────────────────────────────────────────────
BANNER = (
    'e.jsxs("div",{style:{background:"linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)",'
    +'borderRadius:16,padding:"16px",border:"1px solid #bfdbfe",'
    +'display:"flex",alignItems:"center",gap:12,marginTop:4},children:['
    +'e.jsx("div",{style:{width:44,height:44,borderRadius:"50%",background:"#dbeafe",'
    +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    +'children:'+sicon(CLOCK_P,'#1a56db',22)+'})'
    +',e.jsxs("div",{style:{flex:1},children:['
    +'e.jsx("p",{style:{fontSize:14,fontWeight:800,color:"#1a56db",margin:"0 0 4px"},children:"Stay on track!"}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#374151",margin:0,lineHeight:1.5},'
    +'children:"Submit your timesheets on time to keep projects running smoothly."})'
    +']})'
    +',e.jsxs("div",{style:{position:"relative",width:64,height:56,flexShrink:0},children:['
    +'e.jsxs("div",{style:{width:44,height:46,borderRadius:6,background:"#bfdbfe",'
    +'border:"2px solid #93c5fd",overflow:"hidden",display:"flex",flexDirection:"column"},children:['
    +'e.jsx("div",{style:{height:10,background:"#60a5fa",flexShrink:0}})'
    +',e.jsxs("div",{style:{flex:1,padding:4,display:"flex",flexDirection:"column",gap:3},children:['
    +'e.jsx("div",{style:{height:5,background:"#93c5fd",borderRadius:2}}),'
    +'e.jsx("div",{style:{height:5,background:"#93c5fd",borderRadius:2,width:"70%"}})'
    +']})'
    +']})'
    +',e.jsx("div",{style:{position:"absolute",bottom:0,right:0,width:26,height:26,'
    +'borderRadius:"50%",background:"#1a56db",display:"flex",alignItems:"center",'
    +'justifyContent:"center"},'
    +'children:'+sicon(CLOCK_P,'#fff',14)+'})'
    +']})'
    +']})'
)

# ── New scroll div ────────────────────────────────────────────────────────────
EMPTY_STATE = (
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",'
    +'justifyContent:"center",padding:"60px 16px",gap:8},children:['
    +'e.jsx("div",{style:{fontSize:32},children:"📋"}),'
    +'e.jsx("p",{style:{fontSize:14,fontWeight:600,color:"#374151",margin:0},children:"No timesheets found"}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#9ca3af",margin:0,textAlign:"center"},'
    +'children:"No timesheets match your current filters."})'
    +']})'
)

NEW_SCROLL = (
    'e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"12px 16px",'
    +'display:"flex",flexDirection:"column",gap:10,paddingBottom:80},children:['
    +STATS_CARD+','
    +'_filtered.length===0?'+EMPTY_STATE
    +':e.jsxs(e.Fragment,{children:'+CARDS_MAP+'}),'
    +BANNER
    +']})'
)

# ── New header ────────────────────────────────────────────────────────────────
NEW_HEADER = (
    'e.jsxs("div",{style:{background:"#fff",padding:"44px 16px 12px",'
    +'borderBottom:"1px solid #f0f1f4",position:"sticky",top:0,zIndex:40},children:['
    # Row 1: back + title/subtitle + actions
    +'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",'
    +'justifyContent:"space-between",marginBottom:12},children:['
    # Left: back + title block
    +'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:10},children:['
    +'e.jsx("button",{onClick:function(){le("dashboard");},'
    +'style:{width:32,height:32,borderRadius:10,background:"#f3f4f6",border:"none",'
    +'display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0},'
    +'children:'+sicon(CHEV_L_P,'#374151',16)+'}),'
    +'e.jsxs("div",{children:['
    +'e.jsx("h1",{style:{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 2px"},children:"Timesheets"}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:0},children:"Track and manage your weekly timesheets"})'
    +']})'
    +']})'
    # Right: All Projects dropdown + Create button
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,flexShrink:0},children:['
    # Dropdown
    +'e.jsxs("div",{style:{position:"relative"},children:['
    +'e.jsxs("button",{type:"button",'
    +'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setTsDd(function(q){return !q;});},'
    +'style:{display:"flex",alignItems:"center",gap:5,padding:"7px 10px",'
    +'border:"1px solid "+(_proj?"#1a56db":"#e5e7eb"),borderRadius:10,'
    +'background:_proj?"#eff4ff":"#fff",color:_proj?"#1a56db":"#374151",'
    +'fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"},children:['
    +sicon(GRID_P,'currentColor',12)
    +',e.jsx("span",{children:_selectedProject?_selectedProject.name:"All Projects"}),'
    +sicon(CHEV_D_P,'currentColor',10)
    +']})'
    # Dropdown list
    +',_tsDd&&e.jsxs("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,'
    +'background:"#fff",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",'
    +'border:"1px solid #f0f1f4",minWidth:170,zIndex:300,overflow:"hidden"},children:['
    +'e.jsx("button",{type:"button",'
    +'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setProj("");_setTsDd(false);},'
    +'style:{width:"100%",textAlign:"left",padding:"10px 14px",border:"none",'
    +'background:!_proj?"#eff4ff":"#fff",color:!_proj?"#1a56db":"#374151",'
    +'fontSize:12,fontWeight:!_proj?700:400,cursor:"pointer"},children:"All Projects"}),'
    +'..._projects.map(function(p){'
    +'return e.jsx("button",{type:"button",'
    +'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setProj(p.id);_setTsDd(false);},'
    +'style:{width:"100%",textAlign:"left",padding:"10px 14px",border:"none",'
    +'background:_proj===p.id?"#eff4ff":"#fff",color:_proj===p.id?"#1a56db":"#374151",'
    +'fontSize:12,fontWeight:_proj===p.id?700:400,cursor:"pointer"},children:p.name},'
    +'p.id);})'
    +']})'
    +']})'
    # Create button
    +',e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",'
    +'background:"#1a56db",color:"#fff",border:"none",borderRadius:10,'
    +'fontSize:13,fontWeight:700,cursor:"pointer"},children:['
    +sicon(PLUS_P,'#fff',14)
    +',e.jsx("span",{children:"Create"})'
    +']})'
    +']})'
    +']})'
    # Row 2: Search + Filters
    +',e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center"},children:['
    +'e.jsxs("div",{style:{position:"relative",flex:1},children:['
    +'e.jsx("div",{style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",'
    +'pointerEvents:"none"},children:'+sicon(SEARCH_P,'#9ca3af',14)+'})'
    +',e.jsx("input",{type:"text",placeholder:"Search timesheets...",value:_tsSearch,'
    +'onChange:function(ev){_setTsSearch(ev.target.value);},'
    +'style:{width:"100%",padding:"9px 10px 9px 32px",border:"1px solid #e5e7eb",'
    +'borderRadius:10,fontSize:12,outline:"none",color:"#111827",'
    +'background:"#fff",boxSizing:"border-box"}})'
    +']})'
    +',e.jsxs("button",{onClick:function(){_setShowFilter(true);},'
    +'style:{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",'
    +'background:_hasFilter?"#eff4ff":"#fff",border:"1px solid "+(_hasFilter?"#1a56db":"#e5e7eb"),'
    +'borderRadius:10,fontSize:12,fontWeight:600,color:_hasFilter?"#1a56db":"#374151",'
    +'cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"},children:['
    +sicon(FILTER_P,'currentColor',14)
    +',e.jsx("span",{children:"Filters"}),'
    +'_hasFilter&&e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#fff",'
    +'background:"#1a56db",borderRadius:"50%",width:16,height:16,'
    +'display:"inline-flex",alignItems:"center",justifyContent:"center"},'
    +'children:_filterStatus.length})'
    +']})'
    +']})'
    +']})'
)

# ── Validate deltas ───────────────────────────────────────────────────────────
print('STATS_CARD delta:', delta(STATS_CARD))
print('CARDS_MAP delta:', delta(CARDS_MAP))
print('BANNER delta:', delta(BANNER))
print('NEW_SCROLL delta:', delta(NEW_SCROLL))
print('NEW_HEADER delta:', delta(NEW_HEADER))

assert delta(NEW_SCROLL) == (0,0,0), 'NEW_SCROLL imbalance!'
assert delta(NEW_HEADER) == (0,0,0), 'NEW_HEADER imbalance!'

# ── Assemble and verify global balance ────────────────────────────────────────
new_content = content[:OLD_START] + NEW_HEADER + ',' + NEW_SCROLL + content[OLD_END:]
g0,g1,g2 = delta(new_content)
c0,c1,c2 = delta(content)
print('global: %d %d %d' % (g0-c0,g1-c1,g2-c2))
assert (g0-c0,g1-c1,g2-c2) == (0,0,0), 'Global bracket imbalance!'

# ── Node syntax check ─────────────────────────────────────────────────────────
tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
js_vars = (
    'var le=()=>{},_setTsDd=()=>{},_setProj=()=>{},_setShowFilter=()=>{},'
    '_setTsSearch=()=>{},_setSelTs=()=>{},'
    '_proj="",_tsDd=false,_hasFilter=false,'
    '_filterStatus=[],'
    '_tsSearch="",'
    '_selectedProject=null,'
    '_projects=[{id:"p1",name:"HR Module",sub:[]}],'
    '_stColor=function(s){return "#000";},'
    '_stBg=function(s){return "#fff";},'
    '_stLabel=function(s){return s;},'
    '_data=[{id:"ts-w20",name:"Week 20 - Harsh",duration:"18-24 May 2026",'
    'parentNames:["HR Module"],loggedHours:32,approvalStatus:"pending",addedBy:"Harsh"}],'
    '_filtered=[{id:"ts-w20",name:"Week 20 - Harsh",duration:"18-24 May 2026",'
    'parentNames:["HR Module"],loggedHours:32,approvalStatus:"pending",addedBy:"Harsh"}],'
    'e={jsx:()=>{},jsxs:()=>{},Fragment:"f"};'
)
tmp.write(js_vars + 'void(' + NEW_HEADER + ');void(' + NEW_SCROLL + ')')
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
