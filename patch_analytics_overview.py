#!/usr/bin/env python3
"""Replace Analytics (employee) Overview tab with pixel-perfect UI."""
import subprocess, re, tempfile, os, math

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = 'i===\"overview\"&&e.jsxs(\"div\",{className:\"space-y-4\"'
assert content.count(START_STR) == 1, 'START_STR not unique'
START = content.find(START_STR)

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
END=START+end_rel
OLD=content[START:END]
ob_o,op_o,sq_o=delta(OLD)
print('OLD: len=%d ob=%d op=%d sq=%d'%(len(OLD),ob_o,op_o,sq_o))

STAR_PTS='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

def sparkline(pts,col,W=56,H=30):
    ys=[p[1] for p in pts]; mn=min(ys); mx=max(ys); rng=mx-mn if mx!=mn else 1
    xs=W/(len(pts)-1)
    coords=' '.join(['%g,%g'%(i*xs, H-(y-mn)/rng*(H-4)-2) for i,(x,y) in enumerate(pts)])
    return ('e.jsx("svg",{width:'+str(W)+',height:'+str(H)+',viewBox:"0 0 '+str(W)+' '+str(H)+'",'
            +'children:e.jsx("polyline",{points:"'+coords+'",fill:"none",stroke:"'+col+'",'
            +'strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"})})')

# ── PRODUCTIVITY SCORE CARD ───────────────────────────────────────────────────
R=46; C=2*math.pi*R; DASH=round(C*0.78,1)
RING_SVG = (
    'e.jsxs("svg",{width:110,height:110,viewBox:"0 0 116 116",children:['
    +'e.jsx("circle",{cx:58,cy:58,r:'+str(R)+',fill:"none",stroke:"#e5e7eb",strokeWidth:10}),'
    +'e.jsx("circle",{cx:58,cy:58,r:'+str(R)+',fill:"none",stroke:"#16a34a",strokeWidth:10,'
    +'strokeLinecap:"round",strokeDasharray:"'+str(DASH)+' '+str(round(C,1))+'",'
    +'transform:"rotate(-90 58 58)"}),'
    +'e.jsx("text",{x:58,y:52,textAnchor:"middle",fontSize:26,fontWeight:800,fill:"#111827",children:"78"}),'
    +'e.jsx("text",{x:58,y:68,textAnchor:"middle",fontSize:12,fill:"#6b7280",children:"/100"})'
    +']})' )

def prog_bar(label,pct,dtxt,col):
    return (
        'e.jsxs("div",{style:{marginBottom:10},children:['
        +'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4},children:['
        +'e.jsx("span",{style:{fontSize:12,color:"#374151",fontWeight:500},children:"'+label+'"}),'
        +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        +'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#111827"},children:"'+str(pct)+'%"}),'
        +'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#16a34a"},children:"\\u2191 '+dtxt+'"})'
        +']})'
        +']})'
        +',e.jsx("div",{style:{height:7,background:"#f0f1f4",borderRadius:4},children:'
        +'e.jsx("div",{style:{width:"'+str(pct)+'%",height:"100%",background:"'+col+'",borderRadius:4}})'
        +'})'
        +']})'
    )

CAL_MINI = (
    'e.jsx("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#374151",strokeWidth:2,'
    +'children:e.jsxs("g",{children:['
    +'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
    +'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
    +'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
    +'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
    +']})})'
)

SCORE_CARD = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
    +'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:"0.06em"},children:"PRODUCTIVITY SCORE"}),'
    +'e.jsx("span",{style:{fontSize:11,color:"#9ca3af"},children:"\\u24D8"})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#f3f4f6",'
    +'borderRadius:8,padding:"5px 10px",border:"1px solid #e5e7eb"},children:['
    +CAL_MINI
    +',e.jsx("span",{style:{fontSize:11,color:"#374151",fontWeight:500},children:"This Month"}),'
    +'e.jsx("span",{style:{fontSize:11,color:"#374151"},children:"\\u2304"})'
    +']})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:16},children:['
    +RING_SVG
    +',e.jsxs("div",{style:{flex:1},children:['
    +prog_bar('Attendance',96,'4%','#16a34a')
    +','+prog_bar('Tasks',72,'8%','#1a56db')
    +','+prog_bar('Timesheet',85,'6%','#f59e0b')
    +']})'
    +']})'
    +']})'
)
print('SCORE_CARD delta:',delta(SCORE_CARD))

# ── METRIC CARDS ──────────────────────────────────────────────────────────────
SPS={'tasks':[(0,18),(1,14),(2,17),(3,11),(4,13),(5,9)],
     'response':[(0,10),(1,14),(2,19),(3,22),(4,16),(5,20)],
     'ontime':[(0,18),(1,14),(2,17),(3,10),(4,14),(5,8)],
     'goal':[(0,16),(1,19),(2,13),(3,17),(4,12),(5,15)]}
SC={'tasks':'#1a56db','response':'#1a56db','ontime':'#16a34a','goal':'#f59e0b'}

def icon_box(ic_svg,bg):
    return ('e.jsx("div",{style:{width:26,height:26,borderRadius:8,background:"'+bg+'",'
            +'display:"flex",alignItems:"center",justifyContent:"center"},'
            +'children:'+ic_svg+'})')

def metric_card(icon_svg,label,value,dtxt,up,sk):
    arrow='\\u2191' if up else '\\u2193'
    acol='#16a34a' if up else '#ef4444'
    lrow=('e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
          +icon_svg+','
          +'e.jsx("span",{style:{fontSize:11,color:"#6b7280",fontWeight:500},children:"'+label+'"}),'
          +'e.jsx("span",{style:{fontSize:10,color:"#9ca3af"},children:"\\u24D8"})'
          +']})')
    vrow=('e.jsxs("div",{style:{display:"flex",alignItems:"flex-end",justifyContent:"space-between"},children:['
          +'e.jsx("span",{style:{fontSize:22,fontWeight:800,color:"#111827"},children:"'+value+'"}),'
          +sparkline(SPS[sk],SC[sk])
          +']})')
    drow=('e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:3,marginTop:6},children:['
          +'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"'+acol+'"},children:"'+arrow+' '+dtxt+'"})'
          +']})')
    return ('e.jsxs("div",{style:{background:"#fff",borderRadius:14,padding:"14px 12px",'
            +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
            +lrow+','+vrow+','+drow
            +']})')

def svg_icon(paths,col,stroke=True,w=14):
    fill='"none"' if stroke else '"'+col+'"'
    s_attr=',stroke:"'+col+'",strokeWidth:2' if stroke else ''
    inner=','.join(['e.jsx("'+tag+'",{'+attrs+'})' for tag,attrs in paths])
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",fill:'+fill
            +s_attr+',children:e.jsxs("g",{children:['+inner+']})})')

TASK_IC=icon_box(svg_icon([('rect','x:3,y:3,width:18,height:18,rx:2'),('polyline','points:"9 11 12 14 22 4"'),('path','d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"')],'#1a56db'),'#eff4ff')
CLOK_IC=icon_box(svg_icon([('circle','cx:12,cy:12,r:10'),('polyline','points:"12 6 12 12 16 14"')],'#1a56db'),'#eff4ff')
OTIM_IC=icon_box(svg_icon([('circle','cx:12,cy:12,r:10'),('polyline','points:"9 12 11 14 15 10"')],'#16a34a'),'#f0fdf4')
GOAL_IC=icon_box(svg_icon([('circle','cx:12,cy:12,r:10'),('circle','cx:12,cy:12,r:6'),('circle','cx:12,cy:12,r:2')],'#f59e0b'),'#fff7ed')

METRICS_GRID=(
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:['
    +metric_card(TASK_IC,'Tasks Completed','24','3 from last month',True,'tasks')+','
    +metric_card(CLOK_IC,'Avg Response Time','2.4h','0.5h from last month',False,'response')+','
    +metric_card(OTIM_IC,'On-Time Rate','89%','12% from last month',True,'ontime')+','
    +metric_card(GOAL_IC,'Goal Progress','67%','5% from last month',True,'goal')
    +']})')
print('METRICS_GRID delta:',delta(METRICS_GRID))

# ── WEEKLY ACTIVITY ───────────────────────────────────────────────────────────
DAYS=[('Mon',5,2.2),('Tue',3,3.1),('Wed',7,4.0),('Thu',4,2.8),('Fri',6,2.1),('Sat',1,1.5),('Sun',2,2.0)]
BASE_Y=105; SCL=10

def bar_chart():
    els=[]
    for v in [2,4,6,8,10]:
        gy=BASE_Y-v*SCL
        els.append('e.jsx("line",{x1:28,y1:'+str(gy)+',x2:295,y2:'+str(gy)+',stroke:"#f0f1f4",strokeWidth:1})')
        els.append('e.jsx("text",{x:22,y:'+str(gy+3)+',textAnchor:"end",fontSize:8,fill:"#9ca3af",children:"'+str(v)+'"})')
    els.append('e.jsx("line",{x1:28,y1:'+str(BASE_Y)+',x2:295,y2:'+str(BASE_Y)+',stroke:"#e5e7eb",strokeWidth:1})')
    for i,(day,tasks,hours) in enumerate(DAYS):
        gx=38+i*38; th=round(tasks*SCL); hh=round(hours*SCL)
        ty=BASE_Y-th; hy=BASE_Y-hh
        els.append('e.jsx("rect",{x:'+str(gx-13)+',y:'+str(ty)+',width:12,height:'+str(th)+',rx:3,fill:"#1a56db"})')
        els.append('e.jsx("rect",{x:'+str(gx+2)+',y:'+str(hy)+',width:12,height:'+str(hh)+',rx:3,fill:"#c7d2fe"})')
        els.append('e.jsx("text",{x:'+str(gx-7)+',y:'+str(ty-3)+',textAnchor:"middle",fontSize:9,fontWeight:700,fill:"#1a56db",children:"'+str(tasks)+'"})')
        els.append('e.jsx("text",{x:'+str(gx)+',y:'+str(BASE_Y+12)+',textAnchor:"middle",fontSize:9,fill:"#9ca3af",children:"'+day+'"})')
    return 'e.jsxs("svg",{width:"100%",viewBox:"0 0 310 122",children:['+','.join(els)+']})'

WEEKLY_CHART=(
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10},children:['
    +'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Weekly Activity"}),'
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    +'e.jsx("div",{style:{width:8,height:8,borderRadius:"50%",background:"#1a56db"}}),'
    +'e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"Tasks"})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    +'e.jsx("div",{style:{width:8,height:8,borderRadius:"50%",background:"#c7d2fe"}}),'
    +'e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"Hours"})'
    +']})'
    +']})'
    +']})'
    +','+bar_chart()
    +']})')
print('WEEKLY_CHART delta:',delta(WEEKLY_CHART))

# ── SMART NUDGES ──────────────────────────────────────────────────────────────
def nudge_row(icon_svg,icon_bg,label,lcol,sub,last=False):
    bb='' if last else ',borderBottom:"1px solid #f3f4f6"'
    return ('e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"10px 0"'+bb+'},children:['
            +'e.jsx("div",{style:{width:34,height:34,borderRadius:10,background:"'+icon_bg+'",'
            +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
            +'children:'+icon_svg+'}),'
            +'e.jsxs("div",{style:{flex:1},children:['
            +'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"'+lcol+'",margin:"0 0 1px"},children:"'+label+'"}),'
            +'e.jsx("p",{style:{fontSize:11,color:"#6b7280",margin:0},children:"'+sub+'"})'
            +']})'
            +',e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#9ca3af",'
            +'strokeWidth:2.5,children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})'
            +']})')

COIN_IC=svg_icon([('circle','cx:12,cy:12,r:8'),('line','x1:12,y1:8,x2:12,y2:16'),('path','d:"M9.5 10a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 2"')],'#d97706')
CALR_IC=svg_icon([('rect','x:3,y:4,width:18,height:18,rx:2,ry:2'),('line','x1:16,y1:2,x2:16,y2:6'),('line','x1:8,y1:2,x2:8,y2:6'),('line','x1:3,y1:10,x2:21,y2:10')],'#ef4444')
CLIP_IC=svg_icon([('rect','x:9,y:2,width:6,height:4,rx:1'),('path','d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"'),('line','x1:9,y1:12,x2:15,y2:12'),('line','x1:9,y1:16,x2:13,y2:16')],'#1a56db')

SMART_NUDGES=(
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"14px",'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7,marginBottom:10},children:['
    +'e.jsx("span",{style:{fontSize:16},children:"\\uD83D\\uDCA1"}),'
    +'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Smart Nudges"})'
    +']})'
    +','+nudge_row(COIN_IC,'#fff7ed','Timesheet gap detected','#d97706','For April 23')
    +','+nudge_row(CALR_IC,'#fef2f2','2 comp-off days','#ef4444','Expiring on May 5')
    +','+nudge_row(CLIP_IC,'#eff4ff','Self-assessment','#1a56db','Due in 14 days',True)
    +']})')
print('SMART_NUDGES delta:',delta(SMART_NUDGES))

# ── PERFORMANCE TREND ─────────────────────────────────────────────────────────
def trend_chart():
    pts=[(0,20),(4,22),(9,37),(14,56),(19,78),(24,74),(29,73)]
    x0,x1,y0,y1=40,235,130,15
    def px(d,v): return (round(x0+d/29*(x1-x0),1), round(y0-v/100*(y0-y1),1))
    coords=[px(d,v) for d,v in pts]
    path='M %g %g'%coords[0]
    for i in range(1,len(coords)):
        ax,ay=coords[i-1]; bx,by=coords[i]; cpx=(ax+bx)/2
        path+=' C %g %g %g %g %g %g'%(cpx,ay,cpx,by,bx,by)
    last=coords[-1]; first=coords[0]
    area=path+' L %g %g L %g %g Z'%(last[0],y0,first[0],y0)
    peak=px(19,78); pkx=round(peak[0]); pky=round(peak[1])
    yax=[]
    for v in [0,25,50,75,100]:
        yp=round(y0-v/100*(y0-y1))
        yax.append('e.jsx("line",{x1:35,y1:'+str(yp)+',x2:240,y2:'+str(yp)+',stroke:"#f0f1f4",strokeWidth:1})')
        yax.append('e.jsx("text",{x:30,y:'+str(yp+3)+',textAnchor:"end",fontSize:7,fill:"#9ca3af",children:"'+str(v)+'"})')
    xlbls=[(0,'Apr 1'),(9,'Apr 10'),(19,'Apr 20'),(29,'Apr 30')]
    xax=['e.jsx("text",{x:'+str(round(x0+d/29*(x1-x0)))+',y:147,textAnchor:"middle",fontSize:7,fill:"#9ca3af",children:"'+l+'"})' for d,l in xlbls]
    els=(yax
         +['e.jsx("path",{d:"'+area+'",fill:"#dbeafe",stroke:"none"})']
         +['e.jsx("path",{d:"'+path+'",fill:"none",stroke:"#1a56db",strokeWidth:2.5,strokeLinecap:"round"})']
         +xax
         +['e.jsx("circle",{cx:'+str(pkx)+',cy:'+str(pky)+',r:5,fill:"#1a56db",stroke:"#fff",strokeWidth:2})']
         +['e.jsxs("g",{children:['
           +'e.jsx("rect",{x:'+str(pkx-16)+',y:'+str(pky-26)+',width:32,height:18,rx:5,fill:"#111827"}),'
           +'e.jsx("text",{x:'+str(pkx)+',y:'+str(pky-13)+',textAnchor:"middle",fontSize:10,fontWeight:700,fill:"#fff",children:"78"})'
           +']})'
          ])
    return 'e.jsxs("svg",{width:"100%",viewBox:"0 0 250 152",children:['+','.join(els)+']})'

PERF_TREND=(
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"14px",'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
    +'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#1a56db",strokeWidth:2,'
    +'children:e.jsx("polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17"})}),'
    +'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827"},children:"Performance Trend"})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#f3f4f6",'
    +'borderRadius:7,padding:"4px 8px"},children:['
    +'e.jsx("span",{style:{fontSize:10,color:"#374151"},children:"This Month"}),'
    +'e.jsx("span",{style:{fontSize:10,color:"#374151"},children:"\\u2304"})'
    +']})'
    +']})'
    +','+trend_chart()
    +']})')
print('PERF_TREND delta:',delta(PERF_TREND))

BOTTOM_ROW=('e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:['
            +SMART_NUDGES+','+PERF_TREND+']})')

# ── FOOTER BANNER ─────────────────────────────────────────────────────────────
TROPHY=(
    'e.jsx("div",{style:{width:48,height:48,borderRadius:"50%",background:"#dcfce7",'
    +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    +'children:e.jsx("svg",{width:24,height:24,viewBox:"0 0 24 24",fill:"none",'
    +'stroke:"#16a34a",strokeWidth:2,'
    +'children:e.jsxs("g",{children:['
    +'e.jsx("path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6"}),'
    +'e.jsx("path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18"}),'
    +'e.jsx("path",{d:"M4 22h16"}),'
    +'e.jsx("path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"}),'
    +'e.jsx("path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"}),'
    +'e.jsx("path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2z"})'
    +']})})})'
)

FOOTER_BANNER=(
    'e.jsxs("div",{style:{background:"#f0fdf4",borderRadius:16,padding:"16px",'
    +'border:"1px solid #bbf7d0",display:"flex",alignItems:"center",gap:14},children:['
    +TROPHY
    +',e.jsxs("div",{style:{flex:1},children:['
    +'e.jsxs("p",{style:{fontSize:14,fontWeight:800,color:"#111827",margin:"0 0 3px"},'
    +'children:["Great going, Harsh! ","\\uD83C\\uDF89"]}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#374151",margin:0,lineHeight:1.5},'
    +'children:"You\'re performing better than 72% of your team this month."})'
    +']})'
    +',e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,background:"none",'
    +'border:"none",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},children:['
    +'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#16a34a"},children:"View Full Report"}),'
    +'e.jsx("span",{style:{fontSize:12,color:"#16a34a"},children:"\\u203A"})'
    +']})'
    +']})')
print('FOOTER_BANNER delta:',delta(FOOTER_BANNER))

# ── ASSEMBLE ──────────────────────────────────────────────────────────────────
NEW_VIEW=(
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"0 0 80px"},children:['
    +SCORE_CARD+','
    +METRICS_GRID+','
    +WEEKLY_CHART+','
    +BOTTOM_ROW+','
    +FOOTER_BANNER
    +']})')
ob_v,op_v,sq_v=delta(NEW_VIEW)
print('NEW_VIEW delta:',ob_v,op_v,sq_v)
if ob_v!=0 or op_v!=0 or sq_v!=0: print('IMBALANCED'); exit(1)

NEW='i==="overview"&&'+NEW_VIEW
ob_n,op_n,sq_n=delta(NEW)
if (ob_n,op_n,sq_n)!=(ob_o,op_o,sq_o): print('DELTA MISMATCH',ob_n,op_n,sq_n,'vs',ob_o,op_o,sq_o); exit(1)

content2=content[:START]+NEW+content[END:]
ob_g,op_g,sq_g=delta(content2)
print('global:',ob_g,op_g,sq_g)
if ob_g!=0 or op_g!=0 or sq_g!=0: print('GLOBAL IMBALANCE'); exit(1)

m_re=re.search(r'<script[^>]*>([\s\S]*?)</script>',content2)
script=m_re.group(1) if m_re else content2
with tempfile.NamedTemporaryFile(mode='w',suffix='.js',delete=False,encoding='utf-8') as tf:
    tf.write('try{new Function('+repr(script)+')}catch(e){process.stdout.write("ERR:"+e.message)}\nprocess.stdout.write("OK")')
    tname=tf.name
r=subprocess.run(['node',tname],capture_output=True,text=True)
os.unlink(tname)
node_out=r.stdout+r.stderr
print('Node:',node_out[:160])
if 'OK' in node_out and 'ERR' not in node_out:
    with open('/home/user/Harrsh25/hrmobileapp.html','w',encoding='utf-8') as f:
        f.write(content2)
    print('Done.')
else:
    print('Node FAILED')
