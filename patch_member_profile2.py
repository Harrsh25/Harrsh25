#!/usr/bin/env python3
"""
Member profile redesign - two patches:
A: inject _ring helper into Bm() before return
B: replace team-detail view (no IIFE, use _ring directly)
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

# ── A: inject _ring before Bm's return statement ────────────────────────
OLD_RETURN = 'return e.jsxs("div",{className:"screen",style:{background:"#ffffff"'
NEW_RETURN = (
    'var _mhRing=function(pct,r,stroke,bg,sw){'
    'var c=2*Math.PI*r,off=c*(1-Math.min(pct,100)/100),sz=(r+sw)*2;'
    'return e.jsxs("svg",{width:sz,height:sz,viewBox:"0 0 "+sz+" "+sz,'
    'style:{transform:"rotate(-90deg)"},children:['
    'e.jsx("circle",{cx:sz/2,cy:sz/2,r:r,fill:"none",stroke:bg,strokeWidth:sw}),'
    'e.jsx("circle",{cx:sz/2,cy:sz/2,r:r,fill:"none",stroke:stroke,strokeWidth:sw,'
    'strokeDasharray:c,strokeDashoffset:off,strokeLinecap:"round"})'
    ']});'
    '};'
    'return e.jsxs("div",{className:"screen",style:{background:"#ffffff"'
)

chk('OLD_RETURN', OLD_RETURN)
chk('NEW_RETURN', NEW_RETURN)
if OLD_RETURN in content:
    # Only replace the FIRST occurrence (inside Bm)
    content = content.replace(OLD_RETURN, NEW_RETURN, 1)
    print('A _ring helper: OK')
else:
    errors.append('A'); print('A: FAIL')

# ── B: replace team-detail view ─────────────────────────────────────────
OLD_START = '_mhView==="team-detail"?_mhSelMember&&e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"16px 16px 80px"}'
OLD_END   = ':_mhView==="person-approvals"'

s = content.find(OLD_START)
ep = content.find(OLD_END, s)
if s == -1 or ep == -1:
    errors.append('B'); print('B: anchors not found')
else:
    OLD_B = content[s:ep]
    chk('OLD_B', OLD_B)

    # Build new view — no IIFE, use _mhSelMember directly, _mhRing for rings
    N = '_mhSelMember'  # alias shorthand for building strings

    NEW_B = (
        '_mhView==="team-detail"?_mhSelMember&&e.jsx("div",{style:{flex:1,overflowY:"auto",background:"#f4f6fb"},children:'
        'e.jsxs("div",{style:{paddingBottom:80},children:['

        # HERO
        'e.jsxs("div",{style:{background:"linear-gradient(135deg,#1a56db 0%,#2563eb 60%,#3b82f6 100%)",'
        'borderRadius:"0 0 24px 24px",padding:"52px 16px 20px",marginBottom:12},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:14,marginBottom:16},children:['

        # Avatar
        'e.jsxs("div",{style:{position:"relative",flexShrink:0},children:['
        'e.jsx("div",{style:{width:72,height:72,borderRadius:"50%",overflow:"hidden",border:"3px solid rgba(255,255,255,0.5)"},'
        'children:e.jsx("img",{src:_mhSelMember.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}})}),'
        'e.jsx("div",{style:{position:"absolute",bottom:2,right:2,width:14,height:14,borderRadius:"50%",'
        'background:_mhSelMember.status==="present"?"#22c55e":"#f59e0b",border:"2px solid #1a56db"}})'
        ']})'

        # Name/role/status
        ',e.jsxs("div",{style:{flex:1,minWidth:0},children:['
        'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#fff",marginBottom:2},children:_mhSelMember.name}),'
        'e.jsx("p",{style:{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:8},children:(_mhSelMember.role||"")+" • "+(_mhSelMember.dept||"")}),'
        'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(34,197,94,0.25)",'
        'border:"1px solid rgba(34,197,94,0.4)",borderRadius:20,padding:"3px 10px"},children:['
        'e.jsx("span",{style:{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}),'
        'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#fff"},'
        'children:_mhSelMember.status==="present"?"Present":_mhSelMember.status==="on-leave"?"On Leave":"WFH"})'
        ']})'
        ']})'

        # Score ring
        ',e.jsxs("div",{style:{flexShrink:0,position:"relative",width:72,height:72},children:['
        '_mhRing(Math.round((_mhSelMember.attendance+(_mhSelMember.efficiency||80)+(_mhSelMember.onTimeRate||85)+Math.round(_mhSelMember.completedTasks/_mhSelMember.tasks*100))/4),28,"#22c55e","rgba(255,255,255,0.2)",5),'
        'e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},children:['
        'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#fff",lineHeight:1},'
        'children:Math.round((_mhSelMember.attendance+(_mhSelMember.efficiency||80)+(_mhSelMember.onTimeRate||85)+Math.round(_mhSelMember.completedTasks/_mhSelMember.tasks*100))/4)}),'
        'e.jsx("p",{style:{fontSize:8,color:"rgba(255,255,255,0.75)"},children:"/100"})'
        ']})'
        ']})'
        ']})'  # end top row

        # Info bar
        ',e.jsxs("div",{style:{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"10px 12px"},children:['
        'e.jsxs("div",{style:{display:"flex",gap:0},children:['

        'e.jsxs("div",{style:{flex:1.2,borderRight:"1px solid rgba(255,255,255,0.2)",paddingRight:8},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,marginBottom:4},children:['
        'e.jsxs("svg",{width:10,height:10,viewBox:"0 0 24 24",fill:"none",stroke:"rgba(255,255,255,0.7)",strokeWidth:2,strokeLinecap:"round",children:['
        'e.jsx("rect",{x:2,y:4,width:20,height:16,rx:2}),e.jsx("path",{d:"M2 7l10 7 10-7"})]}),'
        'e.jsx("p",{style:{fontSize:8,color:"rgba(255,255,255,0.85)"},children:_mhSelMember.email||""})'
        ']}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
        'e.jsxs("svg",{width:10,height:10,viewBox:"0 0 24 24",fill:"none",stroke:"rgba(255,255,255,0.7)",strokeWidth:2,strokeLinecap:"round",children:['
        'e.jsx("path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 13.37 18.9 19.5 19.5 0 0 1 7.4 12.91 19.79 19.79 0 0 1 4.32 4.24 2 2 0 0 1 6.3 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L10.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"})]}),'
        'e.jsx("p",{style:{fontSize:8,color:"rgba(255,255,255,0.85)"},children:_mhSelMember.phone||""})'
        ']})'
        ']})'

        ',e.jsxs("div",{style:{flex:1,borderRight:"1px solid rgba(255,255,255,0.2)",padding:"0 8px"},children:['
        'e.jsx("p",{style:{fontSize:8,color:"rgba(255,255,255,0.6)",marginBottom:3},children:"Joined"}),'
        'e.jsx("p",{style:{fontSize:10,fontWeight:600,color:"#fff"},children:_mhSelMember.joinDate||""})'
        ']})'

        ',e.jsxs("div",{style:{flex:1,borderRight:"1px solid rgba(255,255,255,0.2)",padding:"0 8px"},children:['
        'e.jsx("p",{style:{fontSize:8,color:"rgba(255,255,255,0.6)",marginBottom:3},children:"Employee ID"}),'
        'e.jsx("p",{style:{fontSize:10,fontWeight:600,color:"#fff"},children:"EMP"+_mhSelMember.id.replace("tm-","")})'
        ']})'

        ',e.jsxs("div",{style:{flex:1,paddingLeft:8},children:['
        'e.jsx("p",{style:{fontSize:8,color:"rgba(255,255,255,0.6)",marginBottom:3},children:"Overall Score"}),'
        'e.jsx("span",{style:{background:"rgba(34,197,94,0.25)",border:"1px solid rgba(34,197,94,0.4)",'
        'borderRadius:20,padding:"2px 7px",fontSize:9,fontWeight:700,color:"#fff"},children:"Top 25%"})'
        ']})'

        ']})'  # end info flex
        ']})'  # end info bar
        ']})'  # end hero card

        # PERFORMANCE OVERVIEW
        ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",margin:"0 12px 12px",padding:"14px"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",marginBottom:14},children:['
        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",flex:1},children:"Performance Overview"}),'
        'e.jsxs("button",{style:{fontSize:11,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:2},children:["View Details ",e.jsx("span",{style:{fontSize:13},children:">"})]})'
        ']})'
        ',e.jsxs("div",{style:{display:"flex",gap:8},children:['

        # Completion
        'e.jsxs("div",{style:{flex:1,background:"#f8faff",borderRadius:12,padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsxs("div",{style:{position:"relative",width:56,height:56,marginBottom:6},children:['
        '_mhRing(Math.round(_mhSelMember.completedTasks/_mhSelMember.tasks*100),22,"#3b82f6","#e0e7ff",4),'
        'e.jsx("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"},'
        'children:e.jsxs("svg",{width:10,height:10,viewBox:"0 0 24 24",fill:"none",stroke:"#3b82f6",strokeWidth:2,children:['
        'e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("circle",{cx:12,cy:12,r:3}),e.jsx("line",{x1:12,y1:2,x2:12,y2:5})]})})'
        ']})'
        ',e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#3b82f6",lineHeight:1,marginBottom:2},children:Math.round(_mhSelMember.completedTasks/_mhSelMember.tasks*100)+"%"})'
        ',e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:3},children:"Completion"})'
        ',e.jsx("p",{style:{fontSize:8,color:"#16a34a"},children:"8% vs last 30d"})'
        ']})'

        # Attendance
        ',e.jsxs("div",{style:{flex:1,background:"#f0fdf8",borderRadius:12,padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsxs("div",{style:{position:"relative",width:56,height:56,marginBottom:6},children:['
        '_mhRing(_mhSelMember.attendance,22,"#16a34a","#d1fae5",4),'
        'e.jsx("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"},'
        'children:e.jsx(Qt,{size:10,style:{color:"#16a34a"}})})'
        ']})'
        ',e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#16a34a",lineHeight:1,marginBottom:2},children:_mhSelMember.attendance+"%"})'
        ',e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:3},children:"Attendance"})'
        ',e.jsx("p",{style:{fontSize:8,color:"#16a34a"},children:"5% vs last 30d"})'
        ']})'

        # Efficiency
        ',e.jsxs("div",{style:{flex:1,background:"#fffbeb",borderRadius:12,padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsxs("div",{style:{position:"relative",width:56,height:56,marginBottom:6},children:['
        '_mhRing(_mhSelMember.efficiency||80,22,"#f59e0b","#fde68a",4),'
        'e.jsx("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"},'
        'children:e.jsxs("svg",{width:10,height:10,viewBox:"0 0 24 24",fill:"none",stroke:"#f59e0b",strokeWidth:2.5,strokeLinecap:"round",children:['
        'e.jsx("polygon",{points:"13 2 3 14 12 14 11 22 21 10 12 10 13 2"})]})})'
        ']})'
        ',e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#f59e0b",lineHeight:1,marginBottom:2},children:(_mhSelMember.efficiency||80)+"%"})'
        ',e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:3},children:"Efficiency"})'
        ',e.jsx("p",{style:{fontSize:8,color:"#16a34a"},children:"6% vs last 30d"})'
        ']})'

        # On-Time
        ',e.jsxs("div",{style:{flex:1,background:"#faf5ff",borderRadius:12,padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsxs("div",{style:{position:"relative",width:56,height:56,marginBottom:6},children:['
        '_mhRing(_mhSelMember.onTimeRate||85,22,"#9333ea","#e9d5ff",4),'
        'e.jsx("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"},'
        'children:e.jsxs("svg",{width:10,height:10,viewBox:"0 0 24 24",fill:"none",stroke:"#9333ea",strokeWidth:2,strokeLinecap:"round",children:['
        'e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("polyline",{points:"12 6 12 12 16 14"})]})})'
        ']})'
        ',e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#9333ea",lineHeight:1,marginBottom:2},children:(_mhSelMember.onTimeRate||85)+"%"})'
        ',e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:3},children:"On-Time"})'
        ',e.jsx("p",{style:{fontSize:8,color:"#16a34a"},children:"7% vs last 30d"})'
        ']})'

        ']})'  # end 4-card flex
        ']})'  # end perf card

        # WEEKLY TREND
        ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",margin:"0 12px 12px",padding:"14px"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",marginBottom:14},children:['
        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",flex:1},children:"Weekly Performance Trend"}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#f9fafb",borderRadius:8,padding:"4px 8px",border:"1px solid #f0f1f4"},children:['
        'e.jsx(Qt,{size:10,style:{color:"#6b7280"}}),e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"This Week"}),e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:" v"})'
        ']})'
        ']})'

        ',e.jsx("div",{style:{display:"flex",gap:2,justifyContent:"space-between",marginBottom:12},'
        'children:[{d:"Mon",dt:"Apr 21",h:8},{d:"Tue",dt:"Apr 22",h:8},{d:"Wed",dt:"Apr 23",h:7},{d:"Thu",dt:"Apr 24",h:6},{d:"Fri",dt:"Apr 25",h:7},{d:"Sat",dt:"Apr 26",h:5},{d:"Sun",dt:"Apr 27",h:0}].map(function(day,di){'
        'var _pct=Math.round(day.h/8*100);'
        'var _col=day.h>=7?"#16a34a":day.h>=5?"#f59e0b":day.h>0?"#f97316":"#e5e7eb";'
        'var _bg=day.h>=7?"#dcfce7":day.h>=5?"#fef3c7":day.h>0?"#ffedd5":"#f3f4f6";'
        'return e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2},children:['
        'e.jsx("p",{style:{fontSize:7,fontWeight:600,color:"#6b7280"},children:day.d}),'
        'e.jsx("p",{style:{fontSize:6,color:"#9ca3af",marginBottom:2},children:day.dt}),'
        'e.jsxs("div",{style:{position:"relative",width:32,height:32},children:['
        '_mhRing(_pct,12,_col,_bg,3),'
        'e.jsx("div",{style:{position:"absolute",inset:0}})'
        ']})'
        ',e.jsx("p",{style:{fontSize:8,fontWeight:600,color:day.h>0?"#374151":"#9ca3af"},children:day.h+"h"})'
        ']},di);'
        '})})'

        ',e.jsxs("div",{style:{display:"flex",justifyContent:"space-around",padding:"8px 0",borderTop:"1px solid #f0f1f4"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
        'e.jsxs("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2.5,strokeLinecap:"round",children:[e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("path",{d:"M9 12l2 2 4-4"})]})'
        ',e.jsx("span",{style:{fontSize:9,color:"#374151",fontWeight:500},children:"6 Days Done"})'
        ']})'
        ',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
        'e.jsxs("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#3b82f6",strokeWidth:2,strokeLinecap:"round",children:[e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("polyline",{points:"12 6 12 12 16 14"})]})'
        ',e.jsx("span",{style:{fontSize:9,color:"#374151",fontWeight:500},children:"41h Logged"})'
        ']})'
        ',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
        'e.jsxs("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#f59e0b",strokeWidth:2,strokeLinecap:"round",children:[e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("polyline",{points:"12 6 12 12 16 14"})]})'
        ',e.jsx("span",{style:{fontSize:9,color:"#374151",fontWeight:500},children:"1h Overtime"})'
        ']})'
        ']})'
        ']})'  # end weekly trend card

        # WORK OVERVIEW + ASSIGNED WORK (2-col)
        ',e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"0 12px 12px"},children:['

        # Work Overview
        'e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",padding:"12px"},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:10},children:"Work Overview"})'
        ',e.jsxs("div",{style:{position:"relative",width:76,height:76,margin:"0 auto 8px"},children:['
        'e.jsxs("svg",{width:76,height:76,viewBox:"0 0 76 76",style:{transform:"rotate(-90deg)"},children:['
        'e.jsx("circle",{cx:38,cy:38,r:26,fill:"none",stroke:"#e5e7eb",strokeWidth:8}),'
        'e.jsx("circle",{cx:38,cy:38,r:26,fill:"none",stroke:"#3b82f6",strokeWidth:8,'
        'strokeDasharray:163.4,strokeDashoffset:163.4*(1-_mhSelMember.completedTasks/_mhSelMember.tasks),strokeLinecap:"butt"}),'
        'e.jsx("circle",{cx:38,cy:38,r:26,fill:"none",stroke:"#f59e0b",strokeWidth:8,'
        'strokeDasharray:163.4,strokeDashoffset:163.4*(1-(_mhSelMember.tasks-_mhSelMember.completedTasks)/_mhSelMember.tasks),'
        'transform:"rotate("+(_mhSelMember.completedTasks/_mhSelMember.tasks*360)+" 38 38)"})'
        ']})'
        ',e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},children:['
        'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#111827",lineHeight:1},children:_mhSelMember.tasks}),'
        'e.jsx("p",{style:{fontSize:8,color:"#6b7280"},children:"Tasks"})'
        ']})'
        ']})'
        ',e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:4,marginBottom:8},children:'
        '[{label:"In Progress",color:"#3b82f6",cnt:_mhSelMember.assignments?_mhSelMember.assignments.filter(function(a){return a.status==="in-progress";}).length:0},'
        '{label:"Completed",color:"#16a34a",cnt:_mhSelMember.completedTasks},'
        '{label:"Pending",color:"#f59e0b",cnt:_mhSelMember.tasks-_mhSelMember.completedTasks},'
        '{label:"Blocked",color:"#ef4444",cnt:0}].map(function(leg,li){'
        'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
        'e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:leg.color,flexShrink:0}}),'
        'e.jsx("span",{style:{fontSize:8,color:"#374151",flex:1},children:leg.label}),'
        'e.jsx("span",{style:{fontSize:8,color:"#6b7280"},children:leg.cnt+" ("+Math.round(leg.cnt/_mhSelMember.tasks*100)+"%)"})'
        ']},li);})'
        '})'
        ',e.jsxs("button",{style:{width:"100%",padding:"6px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",'
        'display:"flex",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer"},children:['
        'e.jsx("span",{style:{fontSize:9,color:"#374151",fontWeight:600},children:"View All Tasks"}),'
        'e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:">"})'
        ']})'
        ']})'  # end work overview

        # Assigned Work
        ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",padding:"12px"},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:10},children:"Assigned Work"})'
        ',e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6,marginBottom:8},children:'
        '(_mhSelMember.assignments||[]).slice(0,4).map(function(a,ai){'
        'var bc=a.status==="in-progress"?"#dbeafe":a.status==="done"?"#dcfce7":"#fef3c7";'
        'var tc=a.status==="in-progress"?"#1d4ed8":a.status==="done"?"#15803d":"#b45309";'
        'var bl=a.status==="in-progress"?"In Progress":a.status==="done"?"Done":"Pending";'
        'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
        'e.jsx("div",{style:{width:16,height:16,borderRadius:4,background:"#f0f1f4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:7,color:"#6366f1"},children:"<>"}),'
        'e.jsx("p",{style:{fontSize:8,color:"#374151",flex:1,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:a.name}),'
        'e.jsx("span",{style:{background:bc,color:tc,fontSize:7,fontWeight:600,padding:"1px 4px",borderRadius:6,flexShrink:0,whiteSpace:"nowrap"},children:bl}),'
        'e.jsx("span",{style:{fontSize:8,fontWeight:600,color:"#374151",flexShrink:0,marginLeft:2},children:a.progress+"%"})'
        ']},ai);'
        '})})'
        ',e.jsxs("button",{style:{width:"100%",padding:"6px",border:"none",background:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer"},children:['
        'e.jsx("span",{style:{fontSize:10,color:"#1a56db",fontWeight:600},children:"View All Work"}),'
        'e.jsx("span",{style:{fontSize:12,color:"#1a56db"},children:">"})'
        ']})'
        ']})'  # end assigned work

        ']})'  # end 2-col grid

        # SKILLS + ALIGNED PROJECTS (2-col)
        ',e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"0 12px 12px"},children:['

        'e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",padding:"12px"},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:8},children:"Skills & Expertise"})'
        ',e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:5},children:'
        '(_mhSelMember.expertise||[]).map(function(sk,si){'
        'return e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:3,background:"#f0f4ff",'
        'border:"1px solid #c7d7fe",borderRadius:20,padding:"3px 8px",fontSize:9,color:"#374151",fontWeight:500},children:["* ",sk]},si);'
        '}).concat([e.jsx("span",{style:{display:"inline-flex",alignItems:"center",background:"#f9fafb",'
        'border:"1px dashed #d1d5db",borderRadius:20,padding:"3px 8px",fontSize:9,color:"#6b7280",fontWeight:500,cursor:"pointer"},children:"+ Add Skill"},"add")])'
        '})'
        ']})'

        ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",padding:"12px"},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:8},children:"Aligned Projects"})'
        ',e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6},children:'
        '(_mhSelMember.projects||[]).map(function(proj,pi){'
        'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",background:"#f8faff",borderRadius:8,cursor:"pointer"},children:['
        'e.jsx("span",{style:{fontSize:12},children:pi===0?"[c]":"[f]"}),'
        'e.jsx("span",{style:{fontSize:9,color:"#374151",fontWeight:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:proj}),'
        'e.jsx("span",{style:{fontSize:12,color:"#9ca3af"},children:">"})'
        ']},pi);'
        '})})'
        ']})'

        ']})'  # end skills+projects grid

        # BOTTOM STATS (4 cards)
        ',e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,margin:"0 12px 12px"},children:['

        'e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"10px 4px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsx("div",{style:{width:24,height:24,borderRadius:6,background:"#eff4ff",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4},'
        'children:e.jsx($n,{size:11,style:{color:"#1a56db"}})}),'
        'e.jsx("p",{style:{fontSize:7,color:"#6b7280",marginBottom:1,textAlign:"center"},children:"Projects"}),'
        'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",lineHeight:1},children:(_mhSelMember.projects||[]).length}),'
        'e.jsx("p",{style:{fontSize:6,color:"#9ca3af",marginTop:2},children:"Total"})'
        ']})'

        ',e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"10px 4px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsx("div",{style:{width:24,height:24,borderRadius:6,background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4},'
        'children:e.jsxs("svg",{width:11,height:11,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2.5,strokeLinecap:"round",children:['
        'e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("path",{d:"M9 12l2 2 4-4"})]})}),'
        'e.jsx("p",{style:{fontSize:7,color:"#6b7280",marginBottom:1,textAlign:"center"},children:"Tasks Done"}),'
        'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",lineHeight:1},children:_mhSelMember.completedTasks*26}),'
        'e.jsx("p",{style:{fontSize:6,color:"#9ca3af",marginTop:2},children:"This Month"})'
        ']})'

        ',e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"10px 4px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsx("div",{style:{width:24,height:24,borderRadius:6,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4},'
        'children:e.jsxs("svg",{width:11,height:11,viewBox:"0 0 24 24",fill:"none",stroke:"#3b82f6",strokeWidth:2.5,strokeLinecap:"round",children:['
        'e.jsx("polyline",{points:"23 6 13.5 15.5 8.5 10.5 1 18"}),e.jsx("polyline",{points:"17 6 23 6 23 12"})]})}),'
        'e.jsx("p",{style:{fontSize:7,color:"#6b7280",marginBottom:1,textAlign:"center"},children:"Daily Output"}),'
        'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",lineHeight:1},children:Math.round((_mhSelMember.efficiency||80)/10*10)/10}),'
        'e.jsx("p",{style:{fontSize:6,color:"#9ca3af",marginTop:2},children:"Tasks/Day"})'
        ']})'

        ',e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"10px 4px",display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsx("div",{style:{width:24,height:24,borderRadius:6,background:"#fefce8",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4},'
        'children:e.jsxs("svg",{width:11,height:11,viewBox:"0 0 24 24",fill:"none",stroke:"#eab308",strokeWidth:2,children:['
        'e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",fill:"#fbbf24"})]})}),'
        'e.jsx("p",{style:{fontSize:7,color:"#6b7280",marginBottom:1,textAlign:"center"},children:"Rating"}),'
        'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",lineHeight:1},children:Math.round((_mhSelMember.onTimeRate||85)/20*10)/10}),'
        'e.jsx("p",{style:{fontSize:6,color:"#9ca3af",marginTop:2},children:"Out of 5"})'
        ']})'

        ']})'  # end 4-col stats

        ']})'  # end paddingBottom
        '})'   # end outer div
    )

    chk('NEW_B', NEW_B)
    if chk('OLD_B', OLD_B) == chk('NEW_B', NEW_B):
        content = content[:s] + NEW_B + content[ep:]
        print('B team-detail: OK')
    else:
        errors.append('B'); print('B: bracket mismatch')

# ── Validate ─────────────────────────────────────────────────────────────
print()
if errors:
    print('FAILED:', errors)
else:
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    with open('/tmp/chk_p2.js', 'w', encoding='utf-8') as f:
        f.write(scripts[0])
    r = subprocess.run(['node', '-e',
        'try{new Function(require("fs").readFileSync("/tmp/chk_p2.js","utf8"));'
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
            print(r.stdout[:400])
