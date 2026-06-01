#!/usr/bin/env python3
"""
Dashboard v2: full pixel-perfect redesign matching reference image:
- Bell badge with number "3"
- Single overview card with 4 columns + % badges
- 2-col layout: Escalation Alerts (left) + Leave Balance (right)
- Team Performance: 4 cards + "This Month" filter
- Key Metrics section
- Quick Actions section
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

def chk_pair(old_name, old_s, new_name, new_s):
    ob1,op1,sq1 = chk(old_name, old_s)
    ob2,op2,sq2 = chk(new_name, new_s)
    if (ob1,op1,sq1) != (ob2,op2,sq2):
        print('PAIR MISMATCH'); errors.append(old_name)

# ── A: Bell → badge with "3" ─────────────────────────────────────────────
OLD_BELL = (
    'e.jsx("span",{style:{position:"absolute",top:2,right:2,'
    'width:8,height:8,borderRadius:"50%",background:"#dc2626",border:"2px solid #fff"}})'
)
NEW_BELL = (
    'e.jsx("span",{style:{position:"absolute",top:0,right:0,'
    'minWidth:16,height:16,borderRadius:8,background:"#dc2626",border:"2px solid #fff",'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'fontSize:8,fontWeight:700,color:"#fff",padding:"0 3px"},children:"3"})'
)
chk_pair('OLD_BELL', OLD_BELL, 'NEW_BELL', NEW_BELL)
if OLD_BELL in content:
    content = content.replace(OLD_BELL, NEW_BELL, 1)
    print('A bell badge: OK')
else:
    errors.append('A'); print('A: FAIL')

# ── B: Full overview section redesign ─────────────────────────────────────
OLD_OV_START = 'i==="overview"&&e.jsxs("div",{style:{padding:"16px 16px 80px"}'
OLD_OV_END   = ',i==="team"&&'
ov_s = content.find(OLD_OV_START)
ov_e = content.find(OLD_OV_END, ov_s)
if ov_s == -1 or ov_e == -1:
    errors.append('B'); print('B: anchors not found', ov_s, ov_e)
else:
    OLD_OV = content[ov_s:ov_e]
    print('OLD_OV len:', len(OLD_OV))
    chk('OLD_OV', OLD_OV)

    NEW_OV = (
        'i==="overview"&&e.jsxs("div",{style:{padding:"16px 14px 80px"},children:['

        # ── Overview card: single card 4 columns ──────────────────────────
        'e.jsxs("div",{style:{background:"#fff",borderRadius:16,border:"1px solid #f0f1f4",'
        'boxShadow:"0 2px 10px rgba(0,0,0,0.06)",marginBottom:14,padding:"16px 8px"},children:['
        'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0},children:['

        # Team Size (blue)
        'e.jsxs("div",{style:{borderRight:"1px solid #f0f1f4",padding:"0 6px",textAlign:"center"},children:['
        'e.jsx($n,{size:18,style:{color:"#1a56db",marginBottom:6}}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:4,fontWeight:500},children:"Team Size"}),'
        'e.jsx("p",{style:{fontSize:22,fontWeight:800,color:"#1a56db",lineHeight:1,marginBottom:4},children:j.length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginBottom:6},children:"Active members"}),'
        'e.jsx("span",{style:{background:"#EFF4FF",color:"#1a56db",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:10},'
        'children:Math.round(j.filter(function(mm){return mm.status==="present";}).length/j.length*100)+"%"})'
        ']})'

        # Present Today (green)
        ',e.jsxs("div",{style:{borderRight:"1px solid #f0f1f4",padding:"0 6px",textAlign:"center"},children:['
        'e.jsx(Ui,{size:18,style:{color:"#16a34a",marginBottom:6}}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:4,fontWeight:500},children:"Present Today"}),'
        'e.jsx("p",{style:{fontSize:22,fontWeight:800,color:"#16a34a",lineHeight:1,marginBottom:4},'
        'children:j.filter(function(mm){return mm.status==="present";}).length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginBottom:6},children:"of "+j.length+" members"}),'
        'e.jsx("span",{style:{background:"#f0fdf4",color:"#16a34a",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:10},'
        'children:Math.round(j.filter(function(mm){return mm.status==="present";}).length/j.length*100)+"%"})'
        ']})'

        # On Leave (orange)
        ',e.jsxs("div",{style:{borderRight:"1px solid #f0f1f4",padding:"0 6px",textAlign:"center"},children:['
        'e.jsx(Qt,{size:18,style:{color:"#d97706",marginBottom:6}}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:4,fontWeight:500},children:"On Leave"}),'
        'e.jsx("p",{style:{fontSize:22,fontWeight:800,color:"#d97706",lineHeight:1,marginBottom:4},'
        'children:j.filter(function(mm){return mm.status==="on-leave";}).length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginBottom:6},children:"members today"}),'
        'e.jsx("span",{style:{background:"#fffbeb",color:"#d97706",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:10},'
        'children:Math.round(j.filter(function(mm){return mm.status==="on-leave";}).length/j.length*100)+"%"})'
        ']})'

        # Pending Approvals (red)
        ',e.jsxs("div",{style:{padding:"0 6px",textAlign:"center"},children:['
        'e.jsx(G1,{size:18,style:{color:"#dc2626",marginBottom:6}}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:4,fontWeight:500},children:"Pending Approvals"}),'
        'e.jsx("p",{style:{fontSize:22,fontWeight:800,color:"#dc2626",lineHeight:1,marginBottom:4},'
        'children:m.filter(function(r){return r.status==="pending";}).length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginBottom:6},children:"requests"}),'
        'e.jsx("span",{style:{background:"#fef2f2",color:"#dc2626",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:10},'
        'children:Math.round(m.filter(function(r){return r.status==="pending";}).length/m.length*100)+"%"})'
        ']})'

        ']})'  # close grid
        ']})'  # close overview card

        # ── 2-column: Escalation Alerts (left) + Leave Balance (right) ────
        ',e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14},children:['

        # LEFT: Escalation Alerts
        'e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",padding:"12px 10px",display:"flex",flexDirection:"column"},children:['

        # Header row
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",flexWrap:"wrap",gap:4,marginBottom:10},children:['
        'e.jsxs("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",flexShrink:0,children:['
        'e.jsx("path",{d:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9",stroke:"#dc2626",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",fill:"#fca5a5"}),'
        'e.jsx("path",{d:"M13.73 21a2 2 0 0 1-3.46 0",stroke:"#dc2626",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"})'
        ']}),'
        'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#dc2626",flex:1,marginLeft:4},children:"Escalation Alerts"}),'
        'e.jsx("span",{style:{background:"#fff1f2",color:"#dc2626",fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:10,display:"block"},'
        'children:m.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).length+" overdue"}),'
        'e.jsx("button",{onClick:function(){_mhSetView("esc-all");},style:{fontSize:10,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer",padding:0},'
        'children:"View All"})'
        ']})'

        # Alert rows
        ',e.jsx("div",{style:{flex:1},children:m.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).slice(0,2).map(function(r){'
        'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"7px 0",borderTop:"1px solid #fef2f2"},children:['
        'e.jsx("div",{style:{width:28,height:28,borderRadius:"50%",background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsx("span",{style:{fontSize:9,fontWeight:700,color:"#dc2626"},children:r.requester.split(" ")[0][0]+r.requester.split(" ")[1][0]})}),'
        'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
        'e.jsx("p",{style:{fontSize:10,fontWeight:600,color:"#111827",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:r.requester}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af"},children:r.type+" · "+r.date.slice(5)})'
        ']}),'
        'e.jsx("span",{style:{background:"#fff7ed",color:"#d97706",fontSize:8,fontWeight:600,padding:"2px 5px",borderRadius:8,whiteSpace:"nowrap"},children:"Overdue"}),'
        'e.jsx("span",{style:{color:"#9ca3af",fontSize:12},children:"›"})'
        ']},r.id);})})'

        # Resolve All button
        ',e.jsx("button",{style:{marginTop:10,width:"100%",padding:"7px 0",border:"1px solid #fca5a5",'
        'borderRadius:8,background:"#fff",color:"#dc2626",fontSize:10,fontWeight:600,cursor:"pointer"},'
        'children:"Resolve All"})'

        ']})'  # close left card

        # RIGHT: Leave Balance
        ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",padding:"12px 10px"},children:['

        'e.jsxs("div",{style:{display:"flex",alignItems:"center",marginBottom:10},children:['
        'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#111827",flex:1},children:"Leave Balance"}),'
        'e.jsx("button",{onClick:function(){_mhSetView("leave-all");},style:{fontSize:10,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center"},'
        'children:["View All ",e.jsx("span",{style:{fontSize:12},children:"›"})]})'
        ']})'

        ',e.jsx("div",{children:j.slice(0,4).map(function(mem){'
        'var _rem=mem.leaveBalance?mem.leaveBalance.remaining:0;'
        'var _ann=mem.leaveBalance?mem.leaveBalance.annual:15;'
        'var _pct=Math.round(_rem/_ann*100);'
        'var _col=_pct>=70?"#16a34a":_pct>=40?"#d97706":"#dc2626";'
        'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"6px 0",borderBottom:"1px solid #f9fafb"},children:['
        'e.jsx("div",{style:{width:30,height:30,borderRadius:"50%",overflow:"hidden",flexShrink:0},'
        'children:e.jsx("img",{src:mem.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}})}),'
        'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
        'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3},children:['
        'e.jsx("p",{style:{fontSize:10,fontWeight:600,color:"#111827"},children:mem.name.split(" ")[0]}),'
        'e.jsx("p",{style:{fontSize:9,fontWeight:700,color:_col},children:_rem+" / "+_ann+" d"})'
        ']}),'
        'e.jsx("div",{style:{width:"100%",height:3,background:"#f0f1f4",borderRadius:2},children:'
        'e.jsx("div",{style:{width:_pct+"%",height:"100%",background:_col,borderRadius:2}})'
        '})'
        ']})'
        ']},mem.id);})})'

        ']})'  # close right card

        ']})'  # close 2-col grid

        # ── Team Performance ───────────────────────────────────────────────
        ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",marginBottom:14,padding:"14px"},children:['

        'e.jsxs("div",{style:{display:"flex",alignItems:"center",marginBottom:12},children:['
        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",flex:1},children:"Team Performance"}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#f9fafb",borderRadius:8,padding:"4px 8px",border:"1px solid #f0f1f4"},children:['
        'e.jsx(Qt,{size:10,style:{color:"#6b7280"}}),'
        'e.jsx("span",{style:{fontSize:10,color:"#6b7280",fontWeight:500},children:"This Month"}),'
        'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"▾"})'
        ']})'
        ']})'

        ',e.jsxs("div",{style:{display:"flex",gap:6},children:['

        # Avg Attendance (blue)
        'e.jsxs("div",{style:{flex:1,background:"#eff6ff",borderRadius:12,padding:"10px 8px 6px",display:"flex",flexDirection:"column"},children:['
        'e.jsx("div",{style:{width:28,height:28,borderRadius:8,background:"rgba(59,130,246,0.15)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsx($n,{size:13,style:{color:"#1a56db"}})}),'
        'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#1a56db",lineHeight:1},children:Math.round(j.reduce(function(s,mm){return s+mm.attendance;},0)/j.length)+"%"}),'
        'e.jsx("p",{style:{fontSize:8,color:"#3b82f6",fontWeight:500,marginTop:3},children:"Avg Attendance"}),'
        'e.jsx("svg",{width:"100%",height:24,viewBox:"0 0 60 24",preserveAspectRatio:"none",style:{marginTop:6},'
        'children:e.jsx("path",{d:"M0,18 C6,18 9,10 17,12 C25,14 30,8 38,10 C46,12 52,15 60,13",stroke:"#3b82f6",strokeWidth:1.5,fill:"none",opacity:0.7})})'
        ']})'

        # Avg Efficiency (green)
        ',e.jsxs("div",{style:{flex:1,background:"#f0fdf4",borderRadius:12,padding:"10px 8px 6px",display:"flex",flexDirection:"column"},children:['
        'e.jsx("div",{style:{width:28,height:28,borderRadius:8,background:"rgba(22,163,74,0.15)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2.5,strokeLinecap:"round",strokeLinejoin:"round",children:['
        'e.jsx("polyline",{points:"23 6 13.5 15.5 8.5 10.5 1 18"}),'
        'e.jsx("polyline",{points:"17 6 23 6 23 12"})'
        ']})})'
        ',e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#16a34a",lineHeight:1},children:Math.round(j.reduce(function(s,mm){return s+(mm.efficiency||80);},0)/j.length)+"%"}),'
        'e.jsx("p",{style:{fontSize:8,color:"#16a34a",fontWeight:500,marginTop:3},children:"Avg Efficiency"}),'
        'e.jsx("svg",{width:"100%",height:24,viewBox:"0 0 60 24",preserveAspectRatio:"none",style:{marginTop:6},'
        'children:e.jsx("path",{d:"M0,20 C8,20 12,14 20,10 C28,6 32,14 40,10 C48,6 52,12 60,8",stroke:"#16a34a",strokeWidth:1.5,fill:"none",opacity:0.7})})'
        ']})'

        # Task Completion (amber)
        ',e.jsxs("div",{style:{flex:1,background:"#fffbeb",borderRadius:12,padding:"10px 8px 6px",display:"flex",flexDirection:"column"},children:['
        'e.jsx("div",{style:{width:28,height:28,borderRadius:8,background:"rgba(217,119,6,0.15)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"#d97706",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:['
        'e.jsx("circle",{cx:12,cy:12,r:10}),'
        'e.jsx("circle",{cx:12,cy:12,r:3})'
        ']})})'
        ',e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#d97706",lineHeight:1},children:Math.round(j.reduce(function(s,mm){return s+mm.completedTasks/mm.tasks*100;},0)/j.length)+"%"}),'
        'e.jsx("p",{style:{fontSize:8,color:"#d97706",fontWeight:500,marginTop:3},children:"Task Completion"}),'
        'e.jsx("svg",{width:"100%",height:24,viewBox:"0 0 60 24",preserveAspectRatio:"none",style:{marginTop:6},'
        'children:e.jsx("path",{d:"M0,16 C6,16 10,12 18,14 C26,16 30,10 38,12 C46,14 52,8 60,12",stroke:"#d97706",strokeWidth:1.5,fill:"none",opacity:0.7})})'
        ']})'

        # Avg Rating (purple)
        ',e.jsxs("div",{style:{flex:1,background:"#faf5ff",borderRadius:12,padding:"10px 8px 6px",display:"flex",flexDirection:"column"},children:['
        'e.jsx("div",{style:{width:28,height:28,borderRadius:8,background:"rgba(147,51,234,0.12)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"#9333ea",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:['
        'e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})'
        ']})})'
        ',e.jsxs("p",{style:{fontSize:18,fontWeight:800,color:"#9333ea",lineHeight:1},children:["4.3",e.jsx("span",{style:{fontSize:11,fontWeight:500,color:"#9333ea"},children:" / 5"})]}),'
        'e.jsx("p",{style:{fontSize:8,color:"#9333ea",fontWeight:500,marginTop:3},children:"Avg Rating"}),'
        'e.jsx("svg",{width:"100%",height:24,viewBox:"0 0 60 24",preserveAspectRatio:"none",style:{marginTop:6},'
        'children:e.jsx("path",{d:"M0,18 C8,18 10,12 18,14 C26,16 32,8 40,12 C48,16 52,10 60,8",stroke:"#9333ea",strokeWidth:1.5,fill:"none",opacity:0.7})})'
        ']})'

        ']})'  # close 4-card flex row
        ']})'  # close team performance card

        # ── Key Metrics ────────────────────────────────────────────────────
        ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",marginBottom:14,padding:"14px"},children:['

        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",marginBottom:12},children:"Key Metrics"})'

        ',e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0},children:['

        # Overtime
        'e.jsxs("div",{style:{padding:"10px 10px 10px 0",borderBottom:"1px solid #f0f1f4",borderRight:"1px solid #f0f1f4"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:8},children:['
        'e.jsx("div",{style:{width:32,height:32,borderRadius:8,background:"#FFF7ED",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsxs("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#d97706",strokeWidth:2,strokeLinecap:"round",children:['
        'e.jsx("circle",{cx:12,cy:12,r:10}),'
        'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
        ']})})'
        ',e.jsxs("div",{children:['
        'e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:2},children:"Overtime (This Month)"}),'
        'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#111827",lineHeight:1},children:"45 hrs"}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginBottom:4},children:"Total Overtime"}),'
        'e.jsxs("span",{style:{fontSize:9,fontWeight:600,color:"#d97706"},children:["↓ 12% ","vs last month"]})'
        ']})'
        ']})'
        ']})'

        # Leave Requests
        ',e.jsxs("div",{style:{padding:"10px 0 10px 10px",borderBottom:"1px solid #f0f1f4"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:8},children:['
        'e.jsx("div",{style:{width:32,height:32,borderRadius:8,background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsxs("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:['
        'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
        'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
        'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
        'e.jsx("line",{x1:3,y1:10,x2:21,y2:10}),'
        'e.jsx("path",{d:"M9 16l2 2 4-4"})'
        ']})})'
        ',e.jsxs("div",{children:['
        'e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:2},children:"Leave Requests"}),'
        'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#111827",lineHeight:1},children:m.filter(function(r){return r.status==="pending";}).length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginBottom:4},children:"New Requests"}),'
        'e.jsxs("span",{style:{fontSize:9,fontWeight:600,color:"#16a34a"},children:["↓ 8% ","vs last week"]})'
        ']})'
        ']})'
        ']})'

        # Attendance Exceptions
        ',e.jsxs("div",{style:{padding:"10px 10px 10px 0",borderRight:"1px solid #f0f1f4"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:8},children:['
        'e.jsx("div",{style:{width:32,height:32,borderRadius:8,background:"#FFF5F5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsx($n,{size:14,style:{color:"#dc2626"}})})'
        ',e.jsxs("div",{children:['
        'e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:2},children:"Attendance Exceptions"}),'
        'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#111827",lineHeight:1},children:j.filter(function(mm){return mm.status==="absent";}).length+j.filter(function(mm){return mm.status==="on-leave";}).length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginBottom:4},children:"Employees"}),'
        'e.jsxs("span",{style:{fontSize:9,fontWeight:600,color:"#dc2626"},children:["↑ 16% ","vs last week"]})'
        ']})'
        ']})'
        ']})'

        # Active Projects
        ',e.jsxs("div",{style:{padding:"10px 0 10px 10px"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:8},children:['
        'e.jsx("div",{style:{width:32,height:32,borderRadius:8,background:"#EFF4FF",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsxs("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#1a56db",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:['
        'e.jsx("path",{d:"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"})'
        ']})})'
        ',e.jsxs("div",{children:['
        'e.jsx("p",{style:{fontSize:9,color:"#6b7280",marginBottom:2},children:"Active Projects"}),'
        'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#111827",lineHeight:1},children:il.length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginBottom:4},children:"In Progress"}),'
        'e.jsxs("span",{style:{fontSize:9,fontWeight:600,color:"#9ca3af"},children:["— ","vs last month"]})'
        ']})'
        ']})'
        ']})'

        ']})'  # close grid
        ']})'  # close key metrics card

        # ── Quick Actions ──────────────────────────────────────────────────
        ',e.jsxs("div",{style:{marginBottom:14},children:['

        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",marginBottom:12},children:"Quick Actions"})'

        ',e.jsxs("div",{style:{display:"flex",gap:6,justifyContent:"space-between"},children:['

        # Approve Leave
        'e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6},children:['
        'e.jsx("div",{style:{width:44,height:44,borderRadius:12,background:"#FFF7ED",display:"flex",alignItems:"center",justifyContent:"center"},'
        'children:e.jsx(Qt,{size:20,style:{color:"#d97706"}})}),'
        'e.jsx("p",{style:{fontSize:9,color:"#374151",fontWeight:500,textAlign:"center"},children:"Approve Leave"})'
        ']})'

        # View Team
        ',e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6},children:['
        'e.jsx("div",{style:{width:44,height:44,borderRadius:12,background:"#EFF4FF",display:"flex",alignItems:"center",justifyContent:"center"},'
        'children:e.jsx($n,{size:20,style:{color:"#1a56db"}})}),'
        'e.jsx("p",{style:{fontSize:9,color:"#374151",fontWeight:500,textAlign:"center"},children:"View Team"})'
        ']})'

        # Timesheets
        ',e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6},children:['
        'e.jsx("div",{style:{width:44,height:44,borderRadius:12,background:"#FAF5FF",display:"flex",alignItems:"center",justifyContent:"center"},'
        'children:e.jsxs("svg",{width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"#9333ea",strokeWidth:2,strokeLinecap:"round",children:['
        'e.jsx("circle",{cx:12,cy:12,r:10}),'
        'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
        ']})})'
        ',e.jsx("p",{style:{fontSize:9,color:"#374151",fontWeight:500,textAlign:"center"},children:"Timesheets"})'
        ']})'

        # Shift Manager
        ',e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6},children:['
        'e.jsx("div",{style:{width:44,height:44,borderRadius:12,background:"#FFF7ED",display:"flex",alignItems:"center",justifyContent:"center"},'
        'children:e.jsx(Qt,{size:20,style:{color:"#ea580c"}})}),'
        'e.jsx("p",{style:{fontSize:9,color:"#374151",fontWeight:500,textAlign:"center"},children:"Shift Manager"})'
        ']})'

        # Add Announcement
        ',e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6},children:['
        'e.jsx("div",{style:{width:44,height:44,borderRadius:12,background:"#FFF5F5",display:"flex",alignItems:"center",justifyContent:"center"},'
        'children:e.jsxs("svg",{width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"#dc2626",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:['
        'e.jsx("polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}),'
        'e.jsx("path",{d:"M19.07 4.93a10 10 0 0 1 0 14.14"}),'
        'e.jsx("path",{d:"M15.54 8.46a5 5 0 0 1 0 7.07"})'
        ']})})'
        ',e.jsx("p",{style:{fontSize:9,color:"#374151",fontWeight:500,textAlign:"center"},children:"Add Announcement"})'
        ']})'

        ']})'  # close flex row
        ']})'  # close quick actions

        ']})'  # close overview outer div
    )

    chk('NEW_OV', NEW_OV)
    o_chk = chk('OLD_OV_v', OLD_OV)
    n_chk = chk('NEW_OV_v', NEW_OV)
    if o_chk == n_chk:
        content = content[:ov_s] + NEW_OV + content[ov_e:]
        print('B overview v2: OK')
    else:
        errors.append('B'); print('B: FAIL bracket mismatch')

# ── Validate ─────────────────────────────────────────────────────────────
print()
if errors:
    print('FAILED:', errors)
else:
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    with open('/tmp/chk_dashv2.js', 'w') as f:
        f.write(scripts[0])
    r = subprocess.run(
        ['node', '-e',
         'try{new Function(require("fs").readFileSync("/tmp/chk_dashv2.js","utf8"));'
         'process.stdout.write("OK");}catch(e){process.stdout.write("ERR:"+e.message);}'],
        capture_output=True, text=True)
    print('Node check:', r.stdout)
    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    sq = content.count('[') - content.count(']')
    print('File delta: ob=%d op=%d sq=%d' % (ob, op, sq))
    if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
        if r.stdout != 'OK':
            print('Node error:', r.stdout[:600])
