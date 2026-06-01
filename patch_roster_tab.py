#!/usr/bin/env python3
"""Replace My Shifts screen header + Roster tab with pixel-perfect UI."""
import subprocess, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

# ── Locate the screen-header section ────────────────────────────────────────
SH_STR = 'e.jsxs("div",{className:"screen-header px-4 pt-11 pb-2",'
SH_START = content.find(SH_STR, 872000, 874000)
assert SH_START != -1
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

# ── Locate the roster tab section ────────────────────────────────────────────
RT_STR = 'i===\"roster\" && e.jsxs("div",{children:['
RT_START = content.find(RT_STR, 873000, 882000)
assert RT_START != -1
seg2 = content[RT_START:]
db=dp=ds=0; ever=False; end_rel2=None
for i,ch in enumerate(seg2):
    if ch=='{': db+=1; ever=True
    elif ch=='}': db-=1
    elif ch=='(': dp+=1; ever=True
    elif ch==')': dp-=1
    elif ch=='[': ds+=1; ever=True
    elif ch==']': ds-=1
    if ever and db==0 and dp==0 and ds==0: end_rel2=i+1; break
RT_END = RT_START + end_rel2
print('RT: start=%d end=%d len=%d delta=%s' % (RT_START,RT_END,end_rel2,delta(content[RT_START:RT_END])))

def sicon(paths, col, w=16, fill='none', sw=2):
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",'
            +'fill:"'+fill+'",stroke:"'+col+'",strokeWidth:'+str(sw)+','
            +'children:e.jsxs("g",{children:['+paths+']})})')

CHEV_L = sicon('e.jsx("polyline",{points:"15 18 9 12 15 6"})','#374151',18)
CAL_P='e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
SWAP_P='e.jsx("polyline",{points:"17 1 21 5 17 9"}),e.jsx("path",{d:"M3 11V9a4 4 0 0 1 4-4h14"}),e.jsx("polyline",{points:"7 23 3 19 7 15"}),e.jsx("path",{d:"M21 13v2a4 4 0 0 1-4 4H3"})'
CHANGE_P='e.jsx("polyline",{points:"23 4 23 10 17 10"}),e.jsx("path",{d:"M20.49 15a9 9 0 1 1-2.12-9.36L23 10"})'
PLUS_P='e.jsx("line",{x1:12,y1:5,x2:12,y2:19}),e.jsx("line",{x1:5,y1:12,x2:19,y2:12})'
CLOCK_P='e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("polyline",{points:"12 6 12 12 16 14"})'

# ── New screen header ─────────────────────────────────────────────────────────
NEW_SH = (
    'e.jsxs("div",{style:{background:"#fff",padding:"44px 16px 0",borderBottom:"1px solid #f0f1f4"},children:['
    # Title row
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    +'e.jsx("button",{onClick:function(){le("dashboard");},'
    +'style:{width:36,height:36,borderRadius:10,background:"#f3f4f6",border:"none",'
    +'display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0},'
    +'children:'+CHEV_L+'}),'
    +'e.jsx("h1",{style:{fontSize:18,fontWeight:800,color:"#111827"},children:"My Shifts"})'
    +']})'
    +',i==="roster"&&e.jsxs("button",{onClick:function(){_setSwMode("new");_setSwCard(null);_setCardDur("");_setNrForm({date:"",autoShift:"",desiredShift:"",reason:""});_setSwMbr("");_setCvOpen(false);j(true);},'
    +'style:{display:"flex",alignItems:"center",gap:6,background:"#1a56db",color:"#fff",'
    +'border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"},'
    +'children:['+sicon(PLUS_P,'#fff',14)+',"  Request Swap"]})'
    +']})'
    # Tabs
    +',e.jsxs("div",{style:{display:"flex",borderTop:"1px solid #f0f1f4"},children:['
    +'[{key:"roster",label:"Roster",ic:'+sicon(CAL_P,'currentColor',13)+'},{key:"swap-requests",label:"Swap Requests",ic:'+sicon(SWAP_P,'currentColor',13)+'},{key:"changes",label:"Changes",ic:'+sicon(CHANGE_P,'currentColor',13)+'}]'
    +'.map(function(g){return e.jsxs("button",{onClick:function(){I(g.key);},'
    +'style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,'
    +'padding:"10px 4px",fontSize:12,fontWeight:i===g.key?700:500,'
    +'color:i===g.key?"#1a56db":"#6b7280",background:"none",border:"none",'
    +'borderBottom:i===g.key?"2px solid #1a56db":"2px solid transparent",cursor:"pointer"},'
    +'children:[g.ic,g.label]},g.key);})'
    +']})'
    +']})'
)

# ── Stats cards ───────────────────────────────────────────────────────────────
def stat_card(label, label_col, val_expr, bg, border_col):
    return ('e.jsxs("div",{style:{background:"'+bg+'",borderRadius:14,'
            +'border:"1px solid '+border_col+'",padding:"12px 10px"},children:['
            +'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"'+label_col+'",marginBottom:4},children:"'+label+'"}),'
            +'e.jsxs("p",{style:{fontSize:22,fontWeight:800,color:"'+label_col+'",lineHeight:1,marginBottom:6},children:['+val_expr+']}),'
            +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
            +sicon(CLOCK_P,''+label_col+'',12)
            +',e.jsx("span",{style:{fontSize:10,color:"'+label_col+'",opacity:0.8},children:"Total Hours"})'
            +']})'
            +']})')

STATS_ROW = (
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8},children:['
    +stat_card('This Week','#1a56db','_weekHrs,"h"','#eff4ff','#bfdbfe')+','
    +stat_card('This Month','#16a34a','_monthHrs,"h"','#f0fdf4','#bbf7d0')+','
    +stat_card('Overtime','#f97316','_overtime,"h"','#fff7ed','#fed7aa')
    +']})'
)

# ── Month/week nav row ────────────────────────────────────────────────────────
MONTH_NAV = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
    # Left: calendar icon + month label + chevron + prev/next
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
    +'e.jsx("button",{onClick:function(){if(_vw==="week"){_setWk(function(w){return w-1;});}else{_setMo(function(w){return w-1;});}},style:{width:24,height:24,borderRadius:6,background:"#f3f4f6",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},children:'
    +sicon('e.jsx("polyline",{points:"15 18 9 12 15 6"})','#374151',12)
    +'})'
    +','+sicon(CAL_P,'#6b7280',14)
    +',e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827"},children:_vw==="week"?(_wk===0?"This Week":_wk>0?"+"+_wk+" week":""+_wk+" week"):(_mo===0?"This Month":new Date(new Date().getFullYear(),new Date().getMonth()+_mo,1).toLocaleString("default",{month:"short",year:"numeric"}))}),'
    +sicon('e.jsx("polyline",{points:"6 9 12 15 18 9"})','#6b7280',12)
    +',e.jsx("button",{onClick:function(){if(_vw==="week"){_setWk(function(w){return w+1;});}else{_setMo(function(w){return w+1;});}},style:{width:24,height:24,borderRadius:6,background:"#f3f4f6",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},children:'
    +sicon('e.jsx("polyline",{points:"9 18 15 12 9 6"})','#374151',12)
    +'})'
    +']})'
    # Right: List / Week toggle
    +',e.jsxs("div",{style:{display:"flex",gap:6},children:['
    +'e.jsxs("button",{onClick:function(){_setVw("list");},style:{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:8,border:"1.5px solid "+(_vw==="list"?"#1a56db":"#e5e7eb"),background:_vw==="list"?"#eff4ff":"#fff",fontSize:12,fontWeight:700,color:_vw==="list"?"#1a56db":"#6b7280",cursor:"pointer"},children:['
    +sicon('e.jsx("line",{x1:8,y1:6,x2:21,y2:6}),e.jsx("line",{x1:8,y1:12,x2:21,y2:12}),e.jsx("line",{x1:8,y1:18,x2:21,y2:18}),e.jsx("line",{x1:3,y1:6,x2:3.01,y2:6}),e.jsx("line",{x1:3,y1:12,x2:3.01,y2:12}),e.jsx("line",{x1:3,y1:18,x2:3.01,y2:18})','currentColor',12)
    +',"List"]})'
    +',e.jsxs("button",{onClick:function(){_setVw("week");},style:{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:8,border:"1.5px solid "+(_vw==="week"?"#1a56db":"#e5e7eb"),background:_vw==="week"?"#eff4ff":"#fff",fontSize:12,fontWeight:700,color:_vw==="week"?"#1a56db":"#6b7280",cursor:"pointer"},children:['
    +sicon(CAL_P,'currentColor',12)
    +',"Week"]})'
    +']})'
    +']})'
)

# ── 7-day week strip ──────────────────────────────────────────────────────────
DAY_STRIP = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",'
    +'padding:"12px 8px",display:"flex",alignItems:"center",gap:4},children:['
    +'e.jsx("button",{onClick:function(){_setWk(function(w){return w-1;});},style:{width:22,height:22,borderRadius:6,background:"#f3f4f6",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0},children:'
    +sicon('e.jsx("polyline",{points:"15 18 9 12 15 6"})','#374151',10)
    +'})'
    +',e.jsx("div",{style:{flex:1,display:"flex",justifyContent:"space-around"},children:_weekDates.map(function(wd,wdi){'
    +'var isToday=wd===_todayStr;'
    +'var dNum=parseInt(wd.split("-")[2],10);'
    +'var dObj=new Date(wd);'
    +'var dayName=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dObj.getDay()];'
    +'var monName=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dObj.getMonth()];'
    +'return e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer"},children:['
    +'e.jsx("span",{style:{fontSize:10,fontWeight:500,color:isToday?"#1a56db":"#9ca3af"},children:dayName}),'
    +'e.jsxs("div",{style:{width:30,height:30,borderRadius:"50%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:isToday?"#1a56db":"transparent",border:isToday?"none":"none"},children:['
    +'e.jsx("span",{style:{fontSize:14,fontWeight:800,color:isToday?"#fff":"#111827",lineHeight:1},children:dNum}),'
    +'!isToday&&e.jsx("span",{style:{fontSize:8,color:"#9ca3af",lineHeight:1},children:monName})'
    +']})'
    +',isToday&&e.jsx("div",{style:{width:5,height:5,borderRadius:"50%",background:"#1a56db",marginTop:1}})'
    +']},'
    +'wdi);'
    +'})})'
    +',e.jsx("button",{onClick:function(){_setWk(function(w){return w+1;});},style:{width:22,height:22,borderRadius:6,background:"#f3f4f6",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0},children:'
    +sicon('e.jsx("polyline",{points:"9 18 15 12 9 6"})','#374151',10)
    +'})'
    +']})'
)

# ── Shift icons ───────────────────────────────────────────────────────────────
SUN_P='e.jsx("circle",{cx:12,cy:12,r:5}),e.jsx("line",{x1:12,y1:1,x2:12,y2:3}),e.jsx("line",{x1:12,y1:21,x2:12,y2:23}),e.jsx("line",{x1:4.22,y1:4.22,x2:5.64,y2:5.64}),e.jsx("line",{x1:18.36,y1:18.36,x2:19.78,y2:19.78}),e.jsx("line",{x1:1,y1:12,x2:3,y2:12}),e.jsx("line",{x1:21,y1:12,x2:23,y2:12})'
GEN_P='e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
UMBRELLA_P='e.jsx("path",{d:"M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"})'

def shift_icon(name):
    if name == 'morning':
        return sicon(SUN_P,'#f97316',16,'none',2)
    elif name == 'general':
        return sicon(GEN_P,'#16a34a',16,'none',2)
    else:
        return sicon(UMBRELLA_P,'#9ca3af',16,'none',2)

# ── List rows ─────────────────────────────────────────────────────────────────
LIST_VIEW = (
    '_vw==="list"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:0},children:['
    +'_getMonthRoster(_mo).map(function(g,w){'
    +'var T=g.date===_todayStr;'
    +'var A=new Date(g.date)>new Date();'
    +'var dObj=new Date(g.date);'
    +'var dNum=parseInt(g.date.split("-")[2],10);'
    +'var monName=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dObj.getMonth()];'
    +'var yr=g.date.split("-")[0];'
    +'var isMorn=!g.isOff&&g.shiftName.toLowerCase().indexOf("morning")!==-1;'
    +'var shIcCol=g.isOff?"#9ca3af":isMorn?"#f97316":"#16a34a";'
    +'var shIcBg=g.isOff?"#f3f4f6":isMorn?"#fff7ed":"#f0fdf4";'
    +'return e.jsxs("div",{'
    +'style:{display:"flex",alignItems:"center",borderBottom:"1px solid #f3f4f6",'
    +'padding:"12px 0",background:T?"transparent":"transparent",'
    +'borderRadius:T?12:0,border:T?"1.5px solid #14b8a6":undefined,'
    +'margin:T?"4px 0":0,padding:T?"12px 14px":"12px 0"},'
    +'children:['
    # Left: date column with blue dot for today
    +'e.jsxs("div",{style:{width:52,flexShrink:0,display:"flex",alignItems:"center",gap:8},children:['
    +'T&&e.jsx("div",{style:{width:8,height:8,borderRadius:"50%",background:"#1a56db",flexShrink:0}})'
    +',e.jsxs("div",{style:{textAlign:"center"},children:['
    +'e.jsx("p",{style:{fontSize:20,fontWeight:800,color:"#111827",lineHeight:1},children:dNum}),'
    +'e.jsx("p",{style:{fontSize:10,color:"#6b7280",lineHeight:1.2},children:monName}),'
    +'e.jsx("p",{style:{fontSize:10,color:"#6b7280",lineHeight:1.2},children:yr})'
    +']})'
    +']})'
    # Middle: shift info
    +',e.jsxs("div",{style:{flex:1,paddingLeft:12},children:['
    +'T&&e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#fff",background:"#16a34a",borderRadius:20,padding:"1px 8px",marginBottom:4,display:"inline-block"},children:"Today"}),'
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    +'e.jsx("div",{style:{width:28,height:28,borderRadius:8,background:shIcBg,'
    +'display:"flex",alignItems:"center",justifyContent:"center"},'
    +'children:g.isOff?'
    +sicon('e.jsx("path",{d:"M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"})','#9ca3af',15)
    +':isMorn?'
    +sicon('e.jsx("circle",{cx:12,cy:12,r:5}),e.jsx("line",{x1:12,y1:1,x2:12,y2:3}),e.jsx("line",{x1:12,y1:21,x2:12,y2:23}),e.jsx("line",{x1:4.22,y1:4.22,x2:5.64,y2:5.64}),e.jsx("line",{x1:18.36,y1:18.36,x2:19.78,y2:19.78}),e.jsx("line",{x1:1,y1:12,x2:3,y2:12}),e.jsx("line",{x1:21,y1:12,x2:23,y2:12})','#f97316',15)
    +':'
    +sicon('e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),e.jsx("line",{x1:3,y1:10,x2:21,y2:10})','#16a34a',15)
    +'})'
    +',e.jsxs("div",{children:['
    +'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",margin:0},children:g.isOff?"Day Off":g.shiftName}),'
    +'!g.isOff&&e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:0},children:g.shiftStart+" – "+g.shiftEnd})'
    +']})'
    +']})'
    +']})'
    # Right: Request Swap + chevron
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,flexShrink:0},children:['
    +'A&&!g.isOff&&e.jsx("button",{onClick:function(ev){ev.stopPropagation();_setSwMode("card");_setSwCard({date:g.date,shift:g.shiftName+(g.shiftStart?" ("+g.shiftStart+"-"+g.shiftEnd+")":"")});p({fromDate:g.date,fromShift:g.shiftName+(g.shiftStart?" ("+g.shiftStart+"-"+g.shiftEnd+")":""),toDate:"",toShift:"",reason:""});_setSwMbr("");_setCardDur("");_setCvOpen(false);j(true);},'
    +'style:{fontSize:12,fontWeight:600,color:"#1a56db",background:"#eff4ff",'
    +'border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",whiteSpace:"nowrap"},'
    +'children:"Request Swap"}),'
    +sicon('e.jsx("polyline",{points:"9 18 15 12 9 6"})','#d1d5db',14)
    +']})'
    +']},'
    +'w);'
    +'})'
    +']})'
)

# ── Week grid view (reuse existing logic) ─────────────────────────────────────
WEEK_VIEW = (
    '_vw==="week"&&e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"},children:['
    +'e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid #e5e7eb"},children:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(function(da,di){'
    +'return e.jsx("div",{style:{padding:"6px 2px",textAlign:"center",fontSize:9,fontWeight:700,color:"#6B7280",background:"#F9FAFB",borderRight:di<6?"1px solid #e5e7eb":"none"},children:da},di);'
    +'})})'
    +',e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)"},children:_weekDates.map(function(wd,wdi){'
    +'var entry=null;for(var gi2=0;gi2<_getMonthRoster(0).length;gi2++){if(_getMonthRoster(0)[gi2].date===wd){entry=_getMonthRoster(0)[gi2];break;}}'
    +'var isToday=wd===_todayStr;var dateNum=wd.split("-")[2];'
    +'var sc2=entry?_shiftColor(entry.isOff?"Day Off":entry.shiftName):{bg:"#fff",c:"#9CA3AF",bdr:"#e5e7eb"};'
    +'var canSwap=entry&&!entry.isOff&&new Date(wd)>new Date();'
    +'return e.jsxs("div",{onClick:function(){if(canSwap){_setSwMode("card");_setSwCard({date:entry.date,shift:entry.shiftName+(entry.shiftStart?" ("+entry.shiftStart+"-"+entry.shiftEnd+")":"")});p({fromDate:entry.date,fromShift:entry.shiftName+(entry.shiftStart?" ("+entry.shiftStart+"-"+entry.shiftEnd+")":""),toDate:"",toShift:"",reason:""});_setSwMbr("");_setCardDur("");_setCvOpen(false);j(true);}},style:{minHeight:52,padding:"4px 2px",borderRight:wdi<6?"1px solid #e5e7eb":"none",borderBottom:"1px solid #e5e7eb",background:isToday?"#EFF6FF":sc2.bg,cursor:canSwap?"pointer":"default",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2},children:['
    +'e.jsx("span",{style:{fontSize:9,fontWeight:isToday?700:400,color:isToday?"#1D4ED8":"#374151"},children:dateNum}),'
    +'entry&&e.jsx("span",{style:{fontSize:7,color:sc2.c,textAlign:"center",lineHeight:1.2},children:entry.isOff?"Off":entry.shiftName.split(" ")[0]})'
    +']},wdi);'
    +'})})'
    +']})'
)

# ── New roster tab section ─────────────────────────────────────────────────────
NEW_RT = (
    'i===\"roster\"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:['
    +STATS_ROW+','
    +MONTH_NAV+','
    +DAY_STRIP+','
    +LIST_VIEW+','
    +WEEK_VIEW
    +']})'
)

print('STATS_ROW delta:', delta(STATS_ROW))
print('MONTH_NAV delta:', delta(MONTH_NAV))
print('DAY_STRIP delta:', delta(DAY_STRIP))
print('LIST_VIEW delta:', delta(LIST_VIEW))
print('WEEK_VIEW delta:', delta(WEEK_VIEW))
print('NEW_SH delta:', delta(NEW_SH))
ob_n,op_n,sq_n = delta(NEW_RT)
print('NEW_RT delta: %d %d %d' % (ob_n,op_n,sq_n))
assert (ob_n,op_n,sq_n)==(0,0,0), 'NEW_RT bracket imbalance!'
ob_s,op_s,sq_s = delta(NEW_SH)
print('NEW_SH delta: %d %d %d' % (ob_s,op_s,sq_s))
assert (ob_s,op_s,sq_s)==(0,0,0), 'NEW_SH bracket imbalance!'

# Apply both patches (header first, then roster content)
# Since R_START > SH_END, no overlap - apply right-to-left
new_content = (content[:SH_START] + NEW_SH + content[SH_END:RT_START] + NEW_RT + content[RT_END:])

g0,g1,g2 = delta(new_content)
c0,c1,c2 = delta(content)
print('global: %d %d %d' % (g0-c0,g1-c1,g2-c2))
assert (g0-c0,g1-c1,g2-c2)==(0,0,0), 'Global bracket imbalance!'

tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
js_test = ('var i="roster",I=()=>{},le=()=>{},'
           '_setSwMode=()=>{},_setSwCard=()=>{},_setCardDur=()=>{},'
           '_setNrForm=()=>{},_setSwMbr=()=>{},_setCvOpen=()=>{},j=()=>{},'
           '_setWk=()=>{},_setMo=()=>{},_setVw=()=>{},'
           '_weekHrs=54,_monthHrs=234,_overtime=14,'
           '_wk=0,_mo=0,_vw="list",'
           '_weekDates=["2026-05-31","2026-06-01","2026-06-02","2026-06-03","2026-06-04","2026-06-05","2026-06-06"],'
           '_todayStr="2026-06-01",'
           '_getMonthRoster=function(){return [];},'
           '_shiftColor=function(){return {bg:"#fff",c:"#000",bdr:"#ccc"};},'
           'p=()=>{},'
           'e={jsx:()=>{},jsxs:()=>{}};'
           'void (' + NEW_SH + ');'
           'void (' + NEW_RT + ')')
tmp.write(js_test)
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
