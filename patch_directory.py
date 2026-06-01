#!/usr/bin/env python3
"""Replace Workforce Directory screen with pixel-perfect UI."""
import subprocess, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

# The screen JSX starts at the return value of the directory component
START_STR = 'e.jsxs("div",{className:"screen",style:{background:"#ffffff"},children:[e.jsxs("div",{className:"screen-header px-'
# find the instance near Workforce Directory
WD_IDX = content.find('Workforce Directory')
START = content.rfind(START_STR, 0, WD_IDX)
assert START != -1, 'START_STR not found'
seg = content[START:]
db=dp=ds=0; ever=False; end_rel=None
for i,ch in enumerate(seg):
    if ch=='{': db+=1; ever=True
    elif ch=='}': db-=1
    elif ch=='(': dp+=1; ever=True
    elif ch==')': dp-=1
    elif ch=='[': ds+=1; ever=True
    elif ch==']': ds-=1
    if ever and db==0 and dp==0 and ds==0: end_rel=i+1; break
END = START + end_rel
OLD = content[START:END]
print('OLD: len=%d ob=%d op=%d sq=%d' % (len(OLD),*delta(OLD)))

def sicon(paths, col, w=16, fill='none', sw=2):
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",'
            +'fill:"'+fill+'",stroke:"'+col+'",strokeWidth:'+str(sw)+','
            +'children:e.jsxs("g",{children:['+paths+']})})')

# ── Chevron left ──────────────────────────────────────────────────────────────
CHEV_L = sicon('e.jsx("polyline",{points:"15 18 9 12 15 6"})','#374151',18)
CHEV_R = sicon('e.jsx("polyline",{points:"9 18 15 12 9 6"})','#9ca3af',12)
FILTER_IC = sicon('e.jsx("polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"})','#374151',18)
ADDPERSON_IC = sicon('e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),e.jsx("circle",{cx:12,cy:7,r:4}),e.jsx("line",{x1:19,y1:8,x2:19,y2:14}),e.jsx("line",{x1:16,y1:11,x2:22,y2:11})','#374151',18)
SEARCH_IC = sicon('e.jsx("circle",{cx:11,cy:11,r:8}),e.jsx("line",{x1:21,y1:21,x2:16.65,y2:16.65})','#9ca3af',16)
PIN_IC = sicon('e.jsx("path",{d:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"}),e.jsx("circle",{cx:12,cy:10,r:3})','#9ca3af',11)
CHAT_IC = sicon('e.jsx("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"})','#1a56db',14)
MAIL_IC = sicon('e.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),e.jsx("polyline",{points:"22,6 12,13 2,6"})','#1a56db',14)
SORT_IC = sicon('e.jsx("line",{x1:10,y1:3,x2:10,y2:21}),e.jsx("polyline",{points:"6 7 2 3 -2 7"}),e.jsx("line",{x1:14,y1:21,x2:14,y2:3}),e.jsx("polyline",{points:"18 17 22 21 26 17})','#1a56db',14)
CHEVDOWN = sicon('e.jsx("polyline",{points:"6 9 12 15 18 9"})','#1a56db',12)

# ── Header ────────────────────────────────────────────────────────────────────
HEADER = (
    'e.jsxs("div",{style:{background:"#fff",padding:"44px 16px 0",borderBottom:"1px solid #f0f1f4"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    +'e.jsx("button",{onClick:()=>m?p(null):le("dashboard"),'
    +'style:{width:36,height:36,borderRadius:10,background:"#f3f4f6",border:"none",'
    +'display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0},'
    +'children:'+CHEV_L+'}),'
    +'e.jsx("h1",{style:{fontSize:18,fontWeight:800,color:"#111827"},children:m?"Profile":"Workforce Directory"})'
    +']})'
    +',!m&&e.jsxs("div",{style:{display:"flex",gap:8},children:['
    +'e.jsx("button",{style:{width:36,height:36,borderRadius:10,background:"#f3f4f6",border:"none",'
    +'display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},'
    +'children:'+FILTER_IC+'}),'
    +'e.jsx("button",{style:{width:36,height:36,borderRadius:10,background:"#f3f4f6",border:"none",'
    +'display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},'
    +'children:'+ADDPERSON_IC+'})'
    +']})'
    +']})'
    +',!m&&e.jsxs(e.Fragment,{children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,background:"#f8f9fb",'
    +'borderRadius:12,padding:"10px 14px",margin:"0 0 12px"},'
    +'children:['
    +SEARCH_IC
    +',e.jsx("input",{type:"text",placeholder:"Search by name, role, location, or skill...",'
    +'value:i,onChange:E=>I(E.target.value),'
    +'style:{flex:1,border:"none",background:"transparent",fontSize:13,color:"#374151",'
    +'outline:"none"}})'
    +']})'
    +',e.jsx("div",{style:{display:"flex",gap:8,overflowX:"auto",paddingBottom:12,'
    +'scrollbarWidth:"none",msOverflowStyle:"none"},'
    +'children:h.map(E=>e.jsx("button",{onClick:()=>j(E),'
    +'style:{padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:600,'
    +'whiteSpace:"nowrap",border:f===E?"none":"1px solid #e5e7eb",'
    +'background:f===E?"#1a56db":"#fff",'
    +'color:f===E?"#fff":"#374151",cursor:"pointer",flexShrink:0},'
    +'children:E==="all"?"All":E},E))})'
    +']})'
    +']})'
)

# ── Stats row ─────────────────────────────────────────────────────────────────
def stat_item(ic_paths, ic_col, ic_bg, num, label, border=True):
    border_str = ',borderRight:"1px solid #f0f1f4"' if border else ''
    return ('e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",'
            +'gap:4,flex:1,padding:"10px 4px"'+border_str+'},children:['
            +'e.jsx("div",{style:{width:32,height:32,borderRadius:10,background:"'+ic_bg+'",'
            +'display:"flex",alignItems:"center",justifyContent:"center"},'
            +'children:'+sicon(ic_paths,ic_col,16)+'})'
            +',e.jsx("span",{style:{fontSize:16,fontWeight:800,color:"#111827",lineHeight:1},children:"'+num+'"}),'
            +'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"'+label+'"})'
            +']})')

PEOPLE_P='e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),e.jsx("circle",{cx:9,cy:7,r:4}),e.jsx("path",{d:"M23 21v-2a4 4 0 0 0-3-3.87"}),e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})'
BUILDING_P='e.jsx("rect",{x:4,y:2,width:16,height:20,rx:1}),e.jsx("line",{x1:9,y1:22,x2:9,y2:12}),e.jsx("rect",{x:9,y:12,width:6,height:10}),e.jsx("line",{x1:4,y1:7,x2:4,y2:7}),e.jsx("line",{x1:9,y1:7,x2:9,y2:7}),e.jsx("line",{x1:14,y1:7,x2:14,y2:7}),e.jsx("line",{x1:19,y1:7,x2:19,y2:7})'
ORG_P='e.jsx("rect",{x:8,y:2,width:8,height:6,rx:1}),e.jsx("rect",{x:1,y:14,width:6,height:6,rx:1}),e.jsx("rect",{x:9,y:14,width:6,height:6,rx:1}),e.jsx("rect",{x:17,y:14,width:6,height:6,rx:1}),e.jsx("path",{d:"M12 8v3M3 14v-3h18v3"})'
STAR_P='e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})'

STATS_ROW = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,border:"1px solid #f0f1f4",'
    +'boxShadow:"0 1px 4px rgba(0,0,0,0.04)",display:"flex"},children:['
    +stat_item(PEOPLE_P,'#1a56db','#eff4ff','256','Total Employees')+','
    +stat_item(BUILDING_P,'#16a34a','#f0fdf4','8','Locations')+','
    +stat_item(ORG_P,'#7c3aed','#f3f0ff','12','Departments')+','
    +stat_item(STAR_P,'#f59e0b','#fef3c7','96%','Active',False)
    +']})'
)

# ── Count + Sort row ──────────────────────────────────────────────────────────
COUNT_SORT = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
    +'e.jsxs("span",{style:{fontSize:13,fontWeight:600,color:"#374151"},children:[v.length," People Found"]}),'
    +'e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",'
    +'cursor:"pointer",padding:0},children:['
    +sicon('e.jsx("line",{x1:16,y1:3,x2:16,y2:21}),e.jsx("line",{x1:8,y1:21,x2:8,y2:3}),e.jsx("path",{d:"M20 7H12M20 11H8"})',
           '#1a56db',13)
    +',e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#1a56db"},children:"Sort by: Name A-Z"}),'
    +sicon('e.jsx("polyline",{points:"6 9 12 15 18 9"})','#1a56db',12)
    +']})'
    +']})'
)

# ── Employee card ─────────────────────────────────────────────────────────────
STAR_SM = sicon('e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})','#fff',8,'#fff')

EMP_CARD = (
    'v.map(E=>e.jsxs("div",{onClick:()=>p(E.id),'
    +'style:{background:"#fff",borderRadius:16,border:"1px solid #f0f1f4",'
    +'boxShadow:"0 1px 3px rgba(0,0,0,0.04)",padding:"14px",cursor:"pointer"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:12},children:['
    +'e.jsxs("div",{style:{position:"relative",flexShrink:0},children:['
    +'e.jsx("img",{src:E.avatar,alt:E.name,'
    +'style:{width:54,height:54,borderRadius:"50%",objectFit:"cover"}}),'
    +'e.jsx("div",{style:{position:"absolute",bottom:1,left:1,width:12,height:12,'
    +'borderRadius:"50%",border:"2px solid #fff",'
    +'background:E.status==="online"?"#10b981":E.status==="away"?"#f59e0b":"#9ca3af"}}),'
    +'E.type==="contractor"&&e.jsx("div",{style:{position:"absolute",top:-2,right:-2,'
    +'width:18,height:18,borderRadius:"50%",background:"#f59e0b",'
    +'border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center"},'
    +'children:'+STAR_SM+'})'
    +']})'
    +',e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:2},children:['
    +'e.jsx("span",{style:{fontSize:15,fontWeight:800,color:"#111827"},children:E.name}),'
    +'e.jsx("span",{style:{fontSize:10,fontWeight:700,'
    +'color:E.type==="contractor"?"#b45309":"#1a56db",'
    +'background:E.type==="contractor"?"#fef3c7":"#eff4ff",'
    +'borderRadius:20,padding:"2px 8px"},'
    +'children:E.type==="contractor"?"Contractor":"Employee"})'
    +']})'
    +',e.jsxs("p",{style:{fontSize:12,color:"#6b7280",margin:"0 0 4px"},children:[E.role," · ",E.department]}),'
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,marginBottom:6},children:['
    +sicon('e.jsx("path",{d:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"}),e.jsx("circle",{cx:12,cy:10,r:3})','#9ca3af',11)
    +',e.jsx("span",{style:{fontSize:11,color:"#9ca3af"},children:E.location})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:5},children:['
    +'(E.skills||[]).slice(0,3).map(Q=>e.jsx("span",{style:{fontSize:10,fontWeight:500,'
    +'color:"#374151",background:"#f3f4f6",borderRadius:20,padding:"3px 8px",'
    +'border:"1px solid #e5e7eb"},children:Q},Q)),'
    +'(E.skills||[]).length>3&&e.jsx("span",{style:{fontSize:10,fontWeight:600,'
    +'color:"#6b7280",padding:"3px 4px"},children:"+"+(E.skills.length-3)})'
    +']})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",gap:8,flexShrink:0},children:['
    +'e.jsx("button",{onClick:E2=>{E2.stopPropagation();},'
    +'style:{width:36,height:36,borderRadius:10,background:"#eff4ff",'
    +'border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},'
    +'children:'+CHAT_IC+'}),'
    +'e.jsx("button",{onClick:E2=>{E2.stopPropagation();},'
    +'style:{width:36,height:36,borderRadius:10,background:"#eff4ff",'
    +'border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},'
    +'children:'+MAIL_IC+'})'
    +']})'
    +']})'
    +']},E.id))'
)

# ── List view (when !m) ───────────────────────────────────────────────────────
LIST_VIEW = (
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"12px 16px 80px"},children:['
    +STATS_ROW+','
    +COUNT_SORT+','
    +EMP_CARD
    +']})'
)

# ── Profile view (when m) ─────────────────────────────────────────────────────
PROFILE_VIEW = (
    'e.jsxs("div",{style:{padding:"16px",display:"flex",flexDirection:"column",gap:12},children:['
    +'e.jsxs("div",{style:{background:"#fff",borderRadius:16,border:"1px solid #f0f1f4",'
    +'padding:"20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12},children:['
    +'e.jsxs("div",{style:{position:"relative"},children:['
    +'e.jsx("img",{src:k&&k.avatar,alt:"",'
    +'style:{width:80,height:80,borderRadius:"50%",objectFit:"cover"}}),'
    +'k&&e.jsx("div",{style:{position:"absolute",bottom:2,right:2,width:16,height:16,'
    +'borderRadius:"50%",border:"2px solid #fff",'
    +'background:k&&k.status==="online"?"#10b981":k&&k.status==="away"?"#f59e0b":"#9ca3af"}})'
    +']})'
    +',e.jsxs("div",{style:{textAlign:"center"},children:['
    +'e.jsx("h2",{style:{fontSize:18,fontWeight:800,color:"#111827",margin:"0 0 4px"},children:k&&k.name}),'
    +'e.jsxs("p",{style:{fontSize:13,color:"#6b7280",margin:"0 0 8px"},children:[k&&k.role," · ",k&&k.department]}),'
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,justifyContent:"center"},children:['
    +sicon('e.jsx("path",{d:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"}),e.jsx("circle",{cx:12,cy:10,r:3})','#9ca3af',12)
    +',e.jsx("span",{style:{fontSize:12,color:"#9ca3af"},children:k&&k.location})'
    +']})'
    +']})'
    +']})'
    +',e.jsxs("div",{style:{background:"#fff",borderRadius:16,border:"1px solid #f0f1f4",padding:"16px"},children:['
    +'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",margin:"0 0 12px"},children:"Contact"}),'
    +'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    +sicon('e.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),e.jsx("polyline",{points:"22,6 12,13 2,6"})','#6b7280',16)
    +',e.jsx("span",{style:{fontSize:13,color:"#374151"},children:k&&k.email})'
    +']})'
    +']})'
    +']})'
    +',k&&(k.skills||[]).length>0&&e.jsxs("div",{style:{background:"#fff",borderRadius:16,'
    +'border:"1px solid #f0f1f4",padding:"16px"},children:['
    +'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",margin:"0 0 10px"},children:"Skills"}),'
    +'e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:6},children:'
    +'(k.skills||[]).map(E=>e.jsx("span",{style:{fontSize:12,fontWeight:500,color:"#374151",'
    +'background:"#f3f4f6",borderRadius:20,padding:"5px 12px",border:"1px solid #e5e7eb"},children:E},E))'
    +'})'
    +']})'
    +']})'
)

# ── Full screen ───────────────────────────────────────────────────────────────
NEW_VIEW = (
    'e.jsxs("div",{className:"screen",style:{background:"#f8f9fb"},children:['
    +HEADER+','
    +'e.jsx("div",{style:{overflowY:"auto",flex:1},children:m?'+PROFILE_VIEW+':'+LIST_VIEW+'})'
    +']})'
)

print('STATS_ROW delta:', delta(STATS_ROW))
print('COUNT_SORT delta:', delta(COUNT_SORT))
print('EMP_CARD delta:', delta(EMP_CARD))
print('LIST_VIEW delta:', delta(LIST_VIEW))
print('PROFILE_VIEW delta:', delta(PROFILE_VIEW))
print('HEADER delta:', delta(HEADER))
ob_n,op_n,sq_n = delta(NEW_VIEW)
print('NEW_VIEW delta: %d %d %d' % (ob_n,op_n,sq_n))
assert (ob_n,op_n,sq_n)==(0,0,0), 'NEW_VIEW bracket imbalance!'

new_content = content[:START] + NEW_VIEW + content[END:]
g0,g1,g2 = delta(new_content)
c0,c1,c2 = delta(content)
print('global: %d %d %d' % (g0-c0,g1-c1,g2-c2))
assert (g0-c0,g1-c1,g2-c2)==(0,0,0), 'Global bracket imbalance!'

tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
tmp.write('var i="",I=()=>{},f="all",j=()=>{},m=null,p=()=>{},le=()=>{},h=["all"],v=[],k=null;'
          +'var e={jsx:()=>{},jsxs:()=>{}};void (' + NEW_VIEW + ')')
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
