#!/usr/bin/env python3
"""Replace Analytics Attendance tab with pixel-perfect UI."""
import subprocess, re, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = 'i===\"attendance\"&&e.jsxs(\"div\",{className:\"space-y-4\"'
assert content.count(START_STR) == 1
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
END=START+end_rel; OLD=content[START:END]
ob_o,op_o,sq_o=delta(OLD)
print('OLD: len=%d ob=%d op=%d sq=%d'%(len(OLD),ob_o,op_o,sq_o))

def svg(w,h,vb,inner):
    return 'e.jsxs("svg",{width:'+str(w)+',height:'+str(h)+',viewBox:"'+vb+'",children:['+inner+']})'

def path_el(d,fill='none',stroke='none',sw=2,extra=''):
    return ('e.jsx("path",{d:"'+d+'",fill:"'+fill+'",stroke:"'+stroke+'"'
            +(',strokeWidth:'+str(sw) if stroke!='none' else '')
            +(','+ extra if extra else '')
            +'})')

def circle_el(cx,cy,r,fill='#1a56db',stroke='none',sw=2):
    s=',stroke:"'+stroke+'",strokeWidth:'+str(sw) if stroke!='none' else ''
    return 'e.jsx("circle",{cx:'+str(cx)+',cy:'+str(cy)+',r:'+str(r)+',fill:"'+fill+'"'+s+'})'

def text_el(x,y,txt,anchor='middle',fs=8,fw=400,fill='#9ca3af'):
    return ('e.jsx("text",{x:'+str(x)+',y:'+str(y)+',textAnchor:"'+anchor+'",'
            +'fontSize:'+str(fs)+',fontWeight:'+str(fw)+',fill:"'+fill+'",children:"'+txt+'"})')

# ── MONTH SELECTOR ROW ────────────────────────────────────────────────────────
CAL_SVG = ('e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",'
           +'stroke:"#374151",strokeWidth:2,children:e.jsxs("g",{children:['
           +'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
           +'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
           +'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
           +'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
           +']})})')

MONTH_ROW = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,background:"#fff",'
    +'borderRadius:20,padding:"7px 14px",border:"1px solid #e5e7eb"},'
    +'children:['+CAL_SVG
    +',e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827"},children:"April 2026"}),'
    +'e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"\\u2304"})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:3},children:['
    +'e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"Compared to"}),'
    +'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#111827"},children:"March 2026"}),'
    +'e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"\\u2304"})'
    +']})'
    +']})'
)
print('MONTH_ROW delta:',delta(MONTH_ROW))

# ── STAT CARDS ────────────────────────────────────────────────────────────────
def stat_card(icon_svg,icon_bg,value,val_color,label,delta_txt,delta_color,delta_up):
    arrow='\\u2191' if delta_up else '\\u2193'
    return (
        'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px 14px",'
        +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
        +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:['
        +'e.jsx("div",{style:{width:46,height:46,borderRadius:"50%",background:"'+icon_bg+'",'
        +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        +'children:'+icon_svg+'}),'
        +'e.jsxs("div",{children:['
        +'e.jsx("p",{style:{fontSize:22,fontWeight:800,color:"'+val_color+'",margin:"0 0 2px",lineHeight:1},'
        +'children:"'+value+'"}),'
        +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
        +'e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"'+label+'"}),'
        +'e.jsxs("div",{style:{display:"inline-flex",alignItems:"center",gap:2,background:"'+delta_color+'22",'
        +'borderRadius:20,padding:"2px 7px"},children:['
        +'e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"'+delta_color+'"},'
        +'children:"'+arrow+' '+delta_txt+'"})'
        +']})'
        +']})'
        +']})'
        +']})'
        +']})'
    )

def icon_svg_box(paths_str,stroke_col,w=18):
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",'
            +'fill:"none",stroke:"'+stroke_col+'",strokeWidth:2,'
            +'children:e.jsxs("g",{children:['+paths_str+']})})')

TREND_IC = icon_svg_box(
    'e.jsx("polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17"}),'
    +'e.jsx("polyline",{points:"15 7 22 7 22 14"})',
    '#16a34a')

CAL_IC = icon_svg_box(
    'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
    +'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
    +'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
    +'e.jsx("line",{x1:3,y1:10,x2:21,y2:10}),'
    +'e.jsx("line",{x1:3,y1:15,x2:15,y2:15})',
    '#1a56db')

CLOCK_IC = icon_svg_box(
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    +'e.jsx("polyline",{points:"12 6 12 12 16 14"})',
    '#f59e0b')

PERSON_X_IC = icon_svg_box(
    'e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),'
    +'e.jsx("circle",{cx:12,cy:7,r:4}),'
    +'e.jsx("line",{x1:17,y1:3,x2:23,y2:9}),'
    +'e.jsx("line",{x1:23,y1:3,x2:17,y2:9})',
    '#ef4444')

STATS_GRID = (
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:['
    +stat_card(TREND_IC,'#dcfce7','96%','#16a34a','Attendance Rate','4%','#16a34a',True)+','
    +stat_card(CAL_IC,'#eff4ff','22','#1a56db','Days Present','2 days','#1a56db',True)+','
    +stat_card(CLOCK_IC,'#fff7ed','2','#f59e0b','Late Arrivals','1','#f59e0b',False)+','
    +stat_card(PERSON_X_IC,'#fef2f2','1','#ef4444','Days Absent','2','#ef4444',False)
    +']})'
)
print('STATS_GRID delta:',delta(STATS_GRID))

# ── MONTHLY ATTENDANCE TREND ──────────────────────────────────────────────────
MONTHS_DATA=[('Nov',92),('Dec',88),('Jan',96),('Feb',100),('Mar',84),('Apr',96)]
# Chart area: x 45..290, y 25..145. Width=245, Height=120
XS=[45+i*49 for i in range(6)]
Y0=145; YH=120  # y at 0% = 145, scale = 1.2px per %
def cy(v): return round(Y0 - v*YH/100, 1)

def trend_chart():
    els=[]
    # defs for gradient
    els.append('e.jsxs("defs",{children:['
        +'e.jsxs("linearGradient",{id:"attGrad",x1:"0",y1:"0",x2:"0",y2:"1",children:['
        +'e.jsx("stop",{offset:"0%",stopColor:"#f59e0b",stopOpacity:0.25}),'
        +'e.jsx("stop",{offset:"100%",stopColor:"#f59e0b",stopOpacity:0.02})'
        +']})'
        +']})')
    # Y axis labels + gridlines
    for pct in [0,25,50,75,100]:
        yp=cy(pct)
        els.append(text_el(38,round(yp+3),str(pct)+'%','end',8,400,'#9ca3af'))
        els.append('e.jsx("line",{x1:42,y1:'+str(yp)+',x2:295,y2:'+str(yp)+',stroke:"#f0f1f4",strokeWidth:1})')
    # Smooth curve path
    pts=[(XS[i],cy(v)) for i,(m,v) in enumerate(MONTHS_DATA)]
    # Build cubic bezier path
    path='M %g %g'%(pts[0][0],pts[0][1])
    for i in range(1,len(pts)):
        ax,ay=pts[i-1]; bx,by=pts[i]; cpx=(ax+bx)/2
        path+=' C %g %g %g %g %g %g'%(cpx,ay,cpx,by,bx,by)
    # Area (close path)
    area=path+' L %g %g L %g %g Z'%(pts[-1][0],Y0,pts[0][0],Y0)
    els.append('e.jsx("path",{d:"'+area+'",fill:"url(#attGrad)",stroke:"none"})')
    # Line
    els.append('e.jsx("path",{d:"'+path+'",fill:"none",stroke:"#f59e0b",strokeWidth:2.5,strokeLinecap:"round"})')
    # Dots and labels
    for i,(m,v) in enumerate(MONTHS_DATA):
        x=XS[i]; y=cy(v)
        dot_col='#16a34a' if v>=95 else '#f59e0b'
        els.append(circle_el(x,y,5,dot_col,'#fff',2))
        # pct label above dot
        pct_col='#16a34a' if v>=95 else '#f59e0b'
        els.append(text_el(x,round(y-10),str(v)+'%','middle',9,700,pct_col))
        # x axis label
        els.append(text_el(x,162,m,'middle',9,400,'#9ca3af'))
    return svg('"100%"',175,'0 0 310 165',','.join(els))

TREND_CARD = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8},children:['
    +'e.jsx("span",{style:{fontSize:15,fontWeight:700,color:"#111827"},children:"Monthly Attendance Trend"}),'
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#f3f4f6",'
    +'borderRadius:8,padding:"5px 10px"},children:['
    +'e.jsx("span",{style:{fontSize:11,color:"#374151",fontWeight:500},children:"6 Months"}),'
    +'e.jsx("span",{style:{fontSize:11,color:"#374151"},children:"\\u2304"})'
    +']})'
    +']})'
    +','+trend_chart()
    +']})'
)
print('TREND_CARD delta:',delta(TREND_CARD))

# ── LEAVE UTILIZATION ─────────────────────────────────────────────────────────
def leave_row(icon_svg,icon_bg,label,used,total,bar_col,last=False):
    pct=round(used/total*100)
    bb='' if last else ',borderBottom:"1px solid #f3f4f6"'
    return (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,padding:"12px 0"'+bb+'},children:['
        +'e.jsx("div",{style:{width:38,height:38,borderRadius:10,background:"'+icon_bg+'",'
        +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        +'children:'+icon_svg+'}),'
        +'e.jsxs("div",{style:{flex:1},children:['
        +'e.jsx("p",{style:{fontSize:12,fontWeight:600,color:"#111827",margin:"0 0 6px"},children:"'+label+'"}),'
        +'e.jsx("div",{style:{height:6,background:"#f0f1f4",borderRadius:3},'
        +'children:e.jsx("div",{style:{width:"'+str(pct)+'%",height:"100%",background:"'+bar_col+'",borderRadius:3}})})'
        +']})'
        +',e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"'+bar_col+'",minWidth:32,textAlign:"right"},'
        +'children:"'+str(used)+'/'+str(total)+'"})'
        +']})'
    )

def leave_icon(paths,col):
    return ('e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",'
            +'stroke:"'+col+'",strokeWidth:2,'
            +'children:e.jsxs("g",{children:['+paths+']})})')

PLANE_IC=leave_icon(
    'e.jsx("path",{d:"M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"})','#1a56db')
UMBR_IC=leave_icon(
    'e.jsx("path",{d:"M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"})','#16a34a')
GIFT_IC=leave_icon(
    'e.jsx("path",{d:"M20 12v10H4V12"}),'
    +'e.jsx("rect",{x:2,y:7,width:20,height:5}),'
    +'e.jsx("line",{x1:12,y1:22,x2:12,y2:7}),'
    +'e.jsx("path",{d:"M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"}),'
    +'e.jsx("path",{d:"M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"})','#f59e0b')
THERM_IC=leave_icon(
    'e.jsx("path",{d:"M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"})','#ef4444')

PIE_IC = ('e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",'
          +'stroke:"#1a56db",strokeWidth:2,'
          +'children:e.jsxs("g",{children:['
          +'e.jsx("path",{d:"M21.21 15.89A10 10 0 1 1 8 2.83"}),'
          +'e.jsx("path",{d:"M22 12A10 10 0 0 0 12 2v10z"})'
          +']})})')

LEAVE_CARD = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    +PIE_IC
    +',e.jsx("span",{style:{fontSize:15,fontWeight:700,color:"#111827"},children:"Leave Utilization"})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#f3f4f6",'
    +'borderRadius:8,padding:"5px 10px"},children:['
    +'e.jsx("span",{style:{fontSize:11,color:"#374151",fontWeight:500},children:"This Month"}),'
    +'e.jsx("span",{style:{fontSize:11,color:"#374151"},children:"\\u2304"})'
    +']})'
    +']})'
    +','+leave_row(PLANE_IC,'#eff4ff','Earned Leave',5,20,'#1a56db')
    +','+leave_row(UMBR_IC,'#f0fdf4','Casual Leave',3,12,'#16a34a')
    +','+leave_row(GIFT_IC,'#fff7ed','Comp-off',2,3,'#f59e0b')
    +','+leave_row(THERM_IC,'#fef2f2','Sick Leave',1,10,'#ef4444',True)
    +']})'
)
print('LEAVE_CARD delta:',delta(LEAVE_CARD))

# ── INSIGHT BANNER ────────────────────────────────────────────────────────────
BULB_IC = (
    'e.jsx("div",{style:{width:44,height:44,borderRadius:"50%",background:"#dbeafe",'
    +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    +'children:e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",'
    +'stroke:"#1a56db",strokeWidth:2,'
    +'children:e.jsxs("g",{children:['
    +'e.jsx("line",{x1:9,y1:18,x2:15,y2:18}),'
    +'e.jsx("line",{x1:10,y1:22,x2:14,y2:22}),'
    +'e.jsx("path",{d:"M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"})'
    +']})})})'
)

# Mini bar chart for insight banner
MINI_CHART = (
    'e.jsx("svg",{width:60,height:44,viewBox:"0 0 60 44",children:'
    +'e.jsxs("g",{children:['
    +'e.jsx("rect",{x:2,y:28,width:10,height:14,rx:2,fill:"#93c5fd"}),'
    +'e.jsx("rect",{x:15,y:20,width:10,height:22,rx:2,fill:"#60a5fa"}),'
    +'e.jsx("rect",{x:28,y:12,width:10,height:30,rx:2,fill:"#3b82f6"}),'
    +'e.jsx("rect",{x:41,y:6,width:10,height:36,rx:2,fill:"#1d4ed8"}),'
    +'e.jsx("path",{d:"M5 25 L18 17 L31 9 L47 4",fill:"none",stroke:"#16a34a",strokeWidth:2,strokeLinecap:"round"}),'
    +'e.jsx("polygon",{points:"47 0 54 4 47 8",fill:"#16a34a"})'
    +']})'
    +'})'
)

INSIGHT_BANNER = (
    'e.jsxs("div",{style:{background:"linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)",'
    +'borderRadius:16,padding:"16px",border:"1px solid #bfdbfe",'
    +'display:"flex",alignItems:"center",gap:12},children:['
    +BULB_IC
    +',e.jsxs("div",{style:{flex:1},children:['
    +'e.jsx("p",{style:{fontSize:13,fontWeight:800,color:"#1a56db",margin:"0 0 4px"},children:"Insight"}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#374151",margin:0,lineHeight:1.5},'
    +'children:"Great job! Attendance rate improved by 4% compared to last month."})'
    +']})'
    +','+MINI_CHART
    +']})'
)
print('INSIGHT_BANNER delta:',delta(INSIGHT_BANNER))

# ── ASSEMBLE ──────────────────────────────────────────────────────────────────
NEW_VIEW = (
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"0 0 80px"},children:['
    +MONTH_ROW+','
    +STATS_GRID+','
    +TREND_CARD+','
    +LEAVE_CARD+','
    +INSIGHT_BANNER
    +']})'
)
ob_v,op_v,sq_v=delta(NEW_VIEW)
print('NEW_VIEW delta:',ob_v,op_v,sq_v)
if ob_v!=0 or op_v!=0 or sq_v!=0: print('IMBALANCED'); exit(1)

NEW='i==="attendance"&&'+NEW_VIEW
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
