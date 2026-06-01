#!/usr/bin/env python3
"""
Replace team-detail view with pixel-perfect member profile matching reference image.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

def chk(name, s):
    ob = s.count('{') - s.count('}')
    op = s.count('(') - s.count(')')
    sq = s.count('[') - s.count(']')
    print('  %s: ob=%d op=%d sq=%d len=%d' % (name, ob, op, sq, len(s)))
    return (ob, op, sq)

# ── Find exact OLD block ──────────────────────────────────────────────────
OLD_START = '_mhView==="team-detail"?_mhSelMember&&e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"16px 16px 80px"}'
OLD_END   = ':_mhView==="person-approvals"'

s = content.find(OLD_START)
e_pos = content.find(OLD_END, s)
OLD = content[s:e_pos]
print('OLD len:', len(OLD))
chk('OLD', OLD)

# ── NEW block ─────────────────────────────────────────────────────────────
NEW = (
    '_mhView==="team-detail"?_mhSelMember&&(function(){'
    # derive computed values
    'var _m=_mhSelMember;'
    'var _score=Math.round((_m.attendance+(_m.efficiency||80)+(_m.onTimeRate||85)+Math.round(_m.completedTasks/_m.tasks*100))/4);'
    'var _empId="EMP"+_m.id.replace("tm-","1").padStart(4,"0");'
    'var _inProg=_m.assignments?_m.assignments.filter(function(a){return a.status==="in-progress";}).length:0;'
    'var _done=_m.assignments?_m.assignments.filter(function(a){return a.status==="done";}).length:0;'
    'var _pend=_m.assignments?_m.assignments.filter(function(a){return a.status==="pending";}).length:0;'
    'var _totalTasks=_m.tasks||0;'
    # weekly trend data (use history for visual, fill 7 slots)
    'var _days=[{d:"Mon",dt:"Apr 21",h:8},{d:"Tue",dt:"Apr 22",h:8},{d:"Wed",dt:"Apr 23",h:7},{d:"Thu",dt:"Apr 24",h:6},{d:"Fri",dt:"Apr 25",h:7},{d:"Sat",dt:"Apr 26",h:5},{d:"Sun",dt:"Apr 27",h:0}];'
    'var _totalH=_days.reduce(function(s,x){return s+x.h;},0);'
    'var _daysWorked=_days.filter(function(x){return x.h>0;}).length;'
    'var _maxH=8;'
    # SVG ring helper inline fn
    'var _ring=function(pct,r,stroke,bg,sw){'
      'var c=2*Math.PI*r;'
      'var off=c*(1-pct/100);'
      'var sz=(r+sw)*2;'
      'return e.jsxs("svg",{width:sz,height:sz,viewBox:"0 0 "+sz+" "+sz,style:{transform:"rotate(-90deg)"},children:['
        'e.jsx("circle",{cx:sz/2,cy:sz/2,r:r,fill:"none",stroke:bg,strokeWidth:sw}),'
        'e.jsx("circle",{cx:sz/2,cy:sz/2,r:r,fill:"none",stroke:stroke,strokeWidth:sw,'
          'strokeDasharray:c,strokeDashoffset:off,strokeLinecap:"round"})'
      ']});'
    '};'
    'return e.jsx("div",{style:{flex:1,overflowY:"auto",background:"#f4f6fb"},children:'
    'e.jsxs("div",{style:{paddingBottom:80},children:['

    # ── HERO CARD ─────────────────────────────────────────────────────────
    'e.jsxs("div",{style:{background:"linear-gradient(135deg,#1a56db 0%,#2563eb 60%,#3b82f6 100%)",'
    'borderRadius:"0 0 24px 24px",padding:"52px 16px 20px",marginBottom:12},children:['

    # Top row: avatar + name/role/status + score ring
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:14,marginBottom:16},children:['

    # Avatar with status dot
    'e.jsxs("div",{style:{position:"relative",flexShrink:0},children:['
    'e.jsx("div",{style:{width:72,height:72,borderRadius:"50%",overflow:"hidden",'
    'border:"3px solid rgba(255,255,255,0.5)"},children:'
    'e.jsx("img",{src:_m.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}})})'
    ',e.jsx("div",{style:{position:"absolute",bottom:2,right:2,width:14,height:14,'
    'borderRadius:"50%",background:_m.status==="present"?"#22c55e":"#f59e0b",'
    'border:"2px solid #1a56db"}})'
    ']})'

    # Name, role, status badge
    ',e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#fff",marginBottom:2},children:_m.name}),'
    'e.jsx("p",{style:{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:8},children:(_m.role||"")+" • "+(_m.dept||"")}),'
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(34,197,94,0.25)",'
    'border:"1px solid rgba(34,197,94,0.4)",borderRadius:20,padding:"3px 10px"},children:['
    'e.jsx("span",{style:{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#fff"},children:_m.status==="present"?"Present":_m.status==="on-leave"?"On Leave":"WFH"})'
    ']})'
    ']})'

    # Score ring
    ',e.jsxs("div",{style:{flexShrink:0,position:"relative",width:72,height:72},children:['
    '_ring(_score,28,"#22c55e","rgba(255,255,255,0.2)",5),'
    'e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",'
    'alignItems:"center",justifyContent:"center"},children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#fff",lineHeight:1},children:_score}),'
    'e.jsx("p",{style:{fontSize:8,color:"rgba(255,255,255,0.75)"},children:"/100"})'
    ']})'
    ']})'

    ']})'  # end top row

    # Info bar: email/phone | joined | emp id | score label
    ',e.jsxs("div",{style:{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"10px 12px"},children:['
    'e.jsxs("div",{style:{display:"flex",gap:0},children:['

    # Email + phone
    'e.jsxs("div",{style:{flex:1.2,borderRight:"1px solid rgba(255,255,255,0.2)",paddingRight:10},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:4},children:['
    'e.jsxs("svg",{width:11,height:11,viewBox:"0 0 24 24",fill:"none",stroke:"rgba(255,255,255,0.7)",strokeWidth:2,strokeLinecap:"round",children:['
    'e.jsx("rect",{x:2,y:4,width:20,height:16,rx:2}),'
    'e.jsx("path",{d:"M2 7l10 7 10-7"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:9,color:"rgba(255,255,255,0.85)"},children:_m.email||""})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5},children:['
    'e.jsxs("svg",{width:11,height:11,viewBox:"0 0 24 24",fill:"none",stroke:"rgba(255,255,255,0.7)",strokeWidth:2,strokeLinecap:"round",children:['
    'e.jsx("path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:9,color:"rgba(255,255,255,0.85)"},children:_m.phone||""})'
    ']}),'
    ']})'

    # Joined
    ',e.jsxs("div",{style:{flex:1,borderRight:"1px solid rgba(255,255,255,0.2)",padding:"0 10px"},children:['
    'e.jsx("p",{style:{fontSize:8,color:"rgba(255,255,255,0.6)",marginBottom:3},children:"Joined"}),'
    'e.jsx("p",{style:{fontSize:10,fontWeight:600,color:"#fff"},children:_m.joinDate||"—"})'
    ']})'

    # Employee ID
    ',e.jsxs("div",{style:{flex:1,borderRight:"1px solid rgba(255,255,255,0.2)",padding:"0 10px"},children:['
    'e.jsx("p",{style:{fontSize:8,color:"rgba(255,255,255,0.6)",marginBottom:3},children:"Employee ID"}),'
    'e.jsx("p",{style:{fontSize:10,fontWeight:600,color:"#fff"},children:_empId})'
    ']})'

    # Overall Score
    ',e.jsxs("div",{style:{flex:1,paddingLeft:10},children:['
    'e.jsx("p",{style:{fontSize:8,color:"rgba(255,255,255,0.6)",marginBottom:3},children:"Overall Score"}),'
    'e.jsx("span",{style:{background:"rgba(34,197,94,0.25)",border:"1px solid rgba(34,197,94,0.4)",'
    'borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,color:"#fff"},children:"Top 25%"})'
    ']})'

    ']})'  # end info-bar flex
    ']})'  # end info-bar container
    ']})'  # end hero card

    # ── PERFORMANCE OVERVIEW ──────────────────────────────────────────────
    ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",margin:"0 12px 12px",padding:"14px"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",marginBottom:14},children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",flex:1},children:"Performance Overview"}),'
    'e.jsx("button",{style:{fontSize:11,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:2},'
    'children:["View Details",e.jsx("span",{style:{fontSize:14},children:" ›"})]})'
    ']})'
    ',e.jsxs("div",{style:{display:"flex",gap:8},children:['

    # Completion (blue)
    'e.jsxs("div",{style:{flex:1,background:"#f8faff",borderRadius:12,padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
    'e.jsxs("div",{style:{position:"relative",width:56,height:56,marginBottom:6},children:['
    '_ring(Math.round(_m.completedTasks/_m.tasks*100),22,"#3b82f6","#e0e7ff",4),'
    'e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},children:['
    'e.jsxs("svg",{width:10,height:10,viewBox:"0 0 24 24",fill:"none",stroke:"#3b82f6",strokeWidth:2,children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("circle",{cx:12,cy:12,r:3}),'
    'e.jsx("line",{x1:12,y1:2,x2:12,y2:5})'
    ']})'
    ']})'
    ']})'
    ',e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#3b82f6",lineHeight:1,marginBottom:2},children:Math.round(_m.completedTasks/_m.tasks*100)+"%"})'
    ',e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:3},children:"Completion"})'
    ',e.jsx("p",{style:{fontSize:8,color:"#16a34a"},children:"↑ 8% vs last 30 days"})'
    ']})'

    # Attendance (green)
    ',e.jsxs("div",{style:{flex:1,background:"#f0fdf8",borderRadius:12,padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
    'e.jsxs("div",{style:{position:"relative",width:56,height:56,marginBottom:6},children:['
    '_ring(_m.attendance,22,"#16a34a","#d1fae5",4),'
    'e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},children:['
    'e.jsx(Qt,{size:10,style:{color:"#16a34a"}})'
    ']})'
    ']})'
    ',e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#16a34a",lineHeight:1,marginBottom:2},children:_m.attendance+"%"})'
    ',e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:3},children:"Attendance"})'
    ',e.jsx("p",{style:{fontSize:8,color:"#16a34a"},children:"↑ 5% vs last 30 days"})'
    ']})'

    # Efficiency (orange)
    ',e.jsxs("div",{style:{flex:1,background:"#fffbeb",borderRadius:12,padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
    'e.jsxs("div",{style:{position:"relative",width:56,height:56,marginBottom:6},children:['
    '_ring(_m.efficiency||80,22,"#f59e0b","#fde68a",4),'
    'e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},children:['
    'e.jsxs("svg",{width:10,height:10,viewBox:"0 0 24 24",fill:"none",stroke:"#f59e0b",strokeWidth:2.5,strokeLinecap:"round",children:['
    'e.jsx("polygon",{points:"13 2 3 14 12 14 11 22 21 10 12 10 13 2"})'
    ']})'
    ']})'
    ']})'
    ',e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#f59e0b",lineHeight:1,marginBottom:2},children:(_m.efficiency||80)+"%"})'
    ',e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:3},children:"Efficiency"})'
    ',e.jsx("p",{style:{fontSize:8,color:"#16a34a"},children:"↑ 6% vs last 30 days"})'
    ']})'

    # On-Time (purple)
    ',e.jsxs("div",{style:{flex:1,background:"#faf5ff",borderRadius:12,padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
    'e.jsxs("div",{style:{position:"relative",width:56,height:56,marginBottom:6},children:['
    '_ring(_m.onTimeRate||85,22,"#9333ea","#e9d5ff",4),'
    'e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},children:['
    'e.jsxs("svg",{width:10,height:10,viewBox:"0 0 24 24",fill:"none",stroke:"#9333ea",strokeWidth:2,strokeLinecap:"round",children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
    ']})'
    ']})'
    ']})'
    ',e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#9333ea",lineHeight:1,marginBottom:2},children:(_m.onTimeRate||85)+"%"})'
    ',e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:3},children:"On-Time"})'
    ',e.jsx("p",{style:{fontSize:8,color:"#16a34a"},children:"↑ 7% vs last 30 days"})'
    ']})'

    ']})'  # end perf 4 cards flex
    ']})'  # end perf overview card

    # ── WEEKLY PERFORMANCE TREND ──────────────────────────────────────────
    ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",margin:"0 12px 12px",padding:"14px"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",marginBottom:14},children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",flex:1},children:"Weekly Performance Trend"}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#f9fafb",borderRadius:8,padding:"4px 8px",border:"1px solid #f0f1f4"},children:['
    'e.jsx(Qt,{size:10,style:{color:"#6b7280"}}),'
    'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"This Week"}),'
    'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:" ▾"})'
    ']})'
    ']})'

    ',e.jsx("div",{style:{display:"flex",gap:4,justifyContent:"space-between",marginBottom:12},children:'
    '_days.map(function(day,di){'
    'var _pct=Math.round(day.h/_maxH*100);'
    'var _col=day.h>=7?"#16a34a":day.h>=5?"#f59e0b":day.h>0?"#f97316":"#e5e7eb";'
    'var _bg=day.h>=7?"#dcfce7":day.h>=5?"#fef3c7":day.h>0?"#ffedd5":"#f3f4f6";'
    'return e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3},children:['
    'e.jsx("p",{style:{fontSize:8,fontWeight:600,color:"#6b7280"},children:day.d}),'
    'e.jsx("p",{style:{fontSize:7,color:"#9ca3af",marginBottom:4},children:day.dt}),'
    'e.jsxs("div",{style:{position:"relative",width:36,height:36},children:['
    '_ring(_pct,14,_col,_bg,3),'
    'e.jsx("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}})'
    ']})'
    ',e.jsx("p",{style:{fontSize:9,fontWeight:600,color:day.h>0?"#374151":"#9ca3af"},children:day.h+"h"})'
    ']},di);'
    '})})'

    # Summary row
    ',e.jsxs("div",{style:{display:"flex",justifyContent:"space-around",padding:"10px 0",borderTop:"1px solid #f0f1f4",marginTop:4},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5},children:['
    'e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2.5,strokeLinecap:"round",children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("path",{d:"M9 12l2 2 4-4"})'
    ']}),'
    'e.jsx("span",{style:{fontSize:10,color:"#374151",fontWeight:500},children:_daysWorked+" Days Completed"})'
    ']})'
    ',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5},children:['
    'e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"#3b82f6",strokeWidth:2,strokeLinecap:"round",children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
    ']}),'
    'e.jsx("span",{style:{fontSize:10,color:"#374151",fontWeight:500},children:_totalH+"h Logged"})'
    ']})'
    ',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5},children:['
    'e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"#f59e0b",strokeWidth:2,strokeLinecap:"round",children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
    ']}),'
    'e.jsx("span",{style:{fontSize:10,color:"#374151",fontWeight:500},children:Math.max(0,_totalH-40)+"h Overtime"})'
    ']})'
    ']})'

    ']})'  # end weekly trend card

    # ── WORK OVERVIEW + ASSIGNED WORK ─────────────────────────────────────
    ',e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"0 12px 12px"},children:['

    # LEFT: Work Overview with donut
    'e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",padding:"12px"},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:10},children:"Work Overview"})'

    # Donut chart SVG
    ',e.jsxs("div",{style:{position:"relative",width:80,height:80,margin:"0 auto 10px"},children:['
    'e.jsxs("svg",{width:80,height:80,viewBox:"0 0 80 80",style:{transform:"rotate(-90deg)"},children:['
    'e.jsx("circle",{cx:40,cy:40,r:28,fill:"none",stroke:"#e5e7eb",strokeWidth:8}),'
    # In progress (blue) - main segment
    'e.jsx("circle",{cx:40,cy:40,r:28,fill:"none",stroke:"#3b82f6",strokeWidth:8,'
    'strokeDasharray:2*3.14159*28,strokeDashoffset:2*3.14159*28*(1-Math.round(_inProg/_m.tasks*100)/100),strokeLinecap:"butt"}),'
    # Done (green) - second segment
    'e.jsx("circle",{cx:40,cy:40,r:28,fill:"none",stroke:"#16a34a",strokeWidth:8,'
    'strokeDasharray:2*3.14159*28,strokeDashoffset:2*3.14159*28*(1-Math.round(_done/_m.tasks*100)/100),'
    'transform:"rotate("+Math.round(_inProg/_m.tasks*360)+" 40 40)"}),'
    # Pending (amber)
    'e.jsx("circle",{cx:40,cy:40,r:28,fill:"none",stroke:"#f59e0b",strokeWidth:8,'
    'strokeDasharray:2*3.14159*28,strokeDashoffset:2*3.14159*28*(1-Math.round(_pend/_m.tasks*100)/100),'
    'transform:"rotate("+(Math.round(_inProg/_m.tasks*360)+Math.round(_done/_m.tasks*360))+" 40 40)"})'
    ']})'
    ',e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#111827",lineHeight:1},children:_m.tasks}),'
    'e.jsx("p",{style:{fontSize:8,color:"#6b7280"},children:"Tasks"})'
    ']})'
    ']})'

    # Legend
    ',e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:3,marginBottom:10},children:['
    '[{label:"In Progress",color:"#3b82f6",count:_inProg},'
    '{label:"Completed",color:"#16a34a",count:_done},'
    '{label:"Pending",color:"#f59e0b",count:_pend},'
    '{label:"Blocked",color:"#ef4444",count:0}].map(function(leg,li){'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    'e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:leg.color,flexShrink:0}}),'
    'e.jsx("span",{style:{fontSize:8,color:"#374151",flex:1},children:leg.label}),'
    'e.jsx("span",{style:{fontSize:8,color:"#6b7280"},children:leg.count+" ("+Math.round(leg.count/_m.tasks*100)+"%)"})'
    ']},li);'
    '})})'

    ',e.jsxs("button",{style:{width:"100%",padding:"6px",border:"1px solid #e5e7eb",borderRadius:8,'
    'background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer"},children:['
    'e.jsxs("svg",{width:11,height:11,viewBox:"0 0 24 24",fill:"none",stroke:"#6b7280",strokeWidth:2,strokeLinecap:"round",children:['
    'e.jsx("line",{x1:8,y1:6,x2:21,y2:6}),'
    'e.jsx("line",{x1:8,y1:12,x2:21,y2:12}),'
    'e.jsx("line",{x1:8,y1:18,x2:21,y2:18}),'
    'e.jsx("line",{x1:3,y1:6,x2:3.01,y2:6}),'
    'e.jsx("line",{x1:3,y1:12,x2:3.01,y2:12}),'
    'e.jsx("line",{x1:3,y1:18,x2:3.01,y2:18})'
    ']}),'
    'e.jsx("span",{style:{fontSize:9,color:"#374151",fontWeight:600},children:"View All Tasks"}),'
    'e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"›"})'
    ']})'
    ']})'  # end left card

    # RIGHT: Assigned Work
    ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",padding:"12px"},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:10},children:"Assigned Work"})'

    ',e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8,marginBottom:10},children:'
    '(_m.assignments||[]).slice(0,4).map(function(a,ai){'
    'var _bc=a.status==="in-progress"?"#dbeafe":a.status==="done"?"#dcfce7":"#fef3c7";'
    'var _tc=a.status==="in-progress"?"#1d4ed8":a.status==="done"?"#15803d":"#b45309";'
    'var _bl=a.status==="in-progress"?"In Progress":a.status==="done"?"Done":"Pending";'
    'var _icons=["</>","≡","✓","⧉"];'
    'var _icols=["#6366f1","#8b5cf6","#16a34a","#dc2626"];'
    'return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:3},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    'e.jsx("div",{style:{width:18,height:18,borderRadius:4,background:"#f0f1f4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:8,color:_icols[ai%4]},children:_icons[ai%4]}),'
    'e.jsx("p",{style:{fontSize:9,color:"#374151",flex:1,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:a.name}),'
    'e.jsx("span",{style:{background:_bc,color:_tc,fontSize:7,fontWeight:600,padding:"1px 5px",borderRadius:8,flexShrink:0},children:_bl}),'
    'e.jsx("span",{style:{fontSize:9,fontWeight:600,color:"#374151",flexShrink:0,marginLeft:2},children:a.progress+"%"})'
    ']})'
    ']},ai);'
    '})})'

    ',e.jsx("button",{style:{width:"100%",padding:"6px",border:"none",background:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer"},children:['
    'e.jsx("span",{style:{fontSize:10,color:"#1a56db",fontWeight:600},children:"View All Work"}),'
    'e.jsx("span",{style:{fontSize:12,color:"#1a56db"},children:"›"})'
    ']})'
    ']})'  # end right card

    ']})'  # end 2-col grid

    # ── SKILLS + ALIGNED PROJECTS ─────────────────────────────────────────
    ',e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"0 12px 12px"},children:['

    # Skills
    'e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",padding:"12px"},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:8},children:"Skills & Expertise"})'
    ',e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:5},children:'
    '(_m.expertise||[]).map(function(sk,si){'
    'var _sicons=["☕","🌱","🗄","⚙","★"];'
    'var _scols=["#f59e0b","#16a34a","#3b82f6","#8b5cf6","#ec4899"];'
    'return e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:3,background:"#f8faff",'
    'border:"1px solid #e0e7ff",borderRadius:20,padding:"3px 8px",fontSize:9,color:"#374151",fontWeight:500},children:['
    'e.jsx("span",{style:{fontSize:10},children:_sicons[si%5]}),'
    'sk'
    ']},si);'
    '}).concat([e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:2,background:"#f9fafb",'
    'border:"1px dashed #d1d5db",borderRadius:20,padding:"3px 8px",fontSize:9,color:"#6b7280",fontWeight:500,cursor:"pointer"},children:['
    '"+ Add Skill"'
    ']},"add")])'
    '})'
    ']})'

    # Aligned Projects
    ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",padding:"12px"},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:8},children:"Aligned Projects"})'
    ',e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6},children:'
    '(_m.projects||[]).map(function(proj,pi){'
    'var _picons=["💬","📁","📊","🚀"];'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",'
    'background:"#f8faff",borderRadius:8,cursor:"pointer"},children:['
    'e.jsx("span",{style:{fontSize:12},children:_picons[pi%4]}),'
    'e.jsx("span",{style:{fontSize:9,color:"#374151",fontWeight:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:proj}),'
    'e.jsx("span",{style:{fontSize:12,color:"#9ca3af"},children:"›"})'
    ']},pi);'
    '})})'
    ']})'

    ']})'  # end skills+projects grid

    # ── BOTTOM STATS ROW ──────────────────────────────────────────────────
    ',e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,margin:"0 12px 12px"},children:['

    'e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
    'e.jsx("div",{style:{width:26,height:26,borderRadius:6,background:"#eff4ff",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:5},'
    'children:e.jsxs("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#1a56db",strokeWidth:2,strokeLinecap:"round",children:['
    'e.jsx("rect",{x:3,y:3,width:7,height:7,rx:1}),'
    'e.jsx("rect",{x:14,y:3,width:7,height:7,rx:1}),'
    'e.jsx("rect",{x:3,y:14,width:7,height:7,rx:1}),'
    'e.jsx("rect",{x:14,y:14,width:7,height:7,rx:1})'
    ']})})'
    ',e.jsx("p",{style:{fontSize:8,color:"#6b7280",marginBottom:2},children:"Projects"}),'
    'e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#111827",lineHeight:1},children:(_m.projects||[]).length}),'
    'e.jsx("p",{style:{fontSize:7,color:"#9ca3af",marginTop:2},children:"Total"})'
    ']})'

    ',e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
    'e.jsx("div",{style:{width:26,height:26,borderRadius:6,background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:5},'
    'children:e.jsxs("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2.5,strokeLinecap:"round",children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("path",{d:"M9 12l2 2 4-4"})'
    ']})})'
    ',e.jsx("p",{style:{fontSize:8,color:"#6b7280",marginBottom:2},children:"Tasks Completed"}),'
    'e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#111827",lineHeight:1},children:_m.completedTasks*26}),'
    'e.jsx("p",{style:{fontSize:7,color:"#9ca3af",marginTop:2},children:"This Month"})'
    ']})'

    ',e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
    'e.jsx("div",{style:{width:26,height:26,borderRadius:6,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:5},'
    'children:e.jsxs("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#3b82f6",strokeWidth:2.5,strokeLinecap:"round",children:['
    'e.jsx("polyline",{points:"23 6 13.5 15.5 8.5 10.5 1 18"}),'
    'e.jsx("polyline",{points:"17 6 23 6 23 12"})'
    ']})})'
    ',e.jsx("p",{style:{fontSize:8,color:"#6b7280",marginBottom:2},children:"Avg. Daily Output"}),'
    'e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#111827",lineHeight:1},children:(_m.efficiency||80)/10}),'
    'e.jsx("p",{style:{fontSize:7,color:"#9ca3af",marginTop:2},children:"Tasks/Day"})'
    ']})'

    ',e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
    'e.jsx("div",{style:{width:26,height:26,borderRadius:6,background:"#fefce8",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:5},'
    'children:e.jsxs("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#eab308",strokeWidth:2,strokeLinecap:"round",children:['
    'e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",fill:"#fbbf24"})'
    ']})})'
    ',e.jsx("p",{style:{fontSize:8,color:"#6b7280",marginBottom:2},children:"Rating"}),'
    'e.jsxs("p",{style:{fontSize:16,fontWeight:800,color:"#111827",lineHeight:1},children:[Math.round((_m.onTimeRate||85)/20*10)/10]}),'
    'e.jsx("p",{style:{fontSize:7,color:"#9ca3af",marginTop:2},children:"(Out of 5)"})'
    ']})'

    ']})'  # end bottom stats

    ']})'  # end paddingBottom wrapper
    ']})'  # end outer flex div
    ';'
    '})()'  # IIFE end
    ':_mhView==="person-approvals"'
)

chk('OLD', OLD)
chk('NEW', NEW)

if chk('OLD', OLD) == chk('NEW', NEW):
    content = content[:s] + NEW + content[e_pos + len(':_mhView==="person-approvals"'):]
    # restore the separator
    idx = content.find('_mhView==="team-detail"?_mhSelMember&&(function()')
    # verify
    print('Replacement done, verifying...')
else:
    errors.append('main'); print('MISMATCH')

print()
if not errors:
    import re as _re
    scripts = _re.findall(r'<script[^>]*>(.*?)</script>', content, _re.DOTALL)
    with open('/tmp/chk_profile.js', 'w') as f:
        f.write(scripts[0])
    r = subprocess.run(
        ['node', '-e',
         'try{new Function(require("fs").readFileSync("/tmp/chk_profile.js","utf8"));'
         'process.stdout.write("OK");}catch(e){process.stdout.write("ERR:"+e.message);}'],
        capture_output=True, text=True)
    print('Node:', r.stdout)
    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    sq = content.count('[') - content.count(']')
    print('delta: ob=%d op=%d sq=%d' % (ob, op, sq))
    if ob==0 and op==0 and sq==0 and r.stdout=='OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
        if r.stdout != 'OK':
            print(r.stdout[:500])
else:
    print('FAILED:', errors)
