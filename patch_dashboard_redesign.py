#!/usr/bin/env python3
"""
Redesign Manager Hub Dashboard:
A: Header -> hamburger + bell notification
B: Overview section -> full pixel-perfect redesign
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
    ob1, op1, sq1 = chk(old_name, old_s)
    ob2, op2, sq2 = chk(new_name, new_s)
    if (ob1, op1, sq1) != (ob2, op2, sq2):
        print('PAIR MISMATCH %s vs %s' % (old_name, new_name))
        errors.append(old_name)

# ── A: Header - hamburger icon + Manager Hub + bell notification ──────────
OLD_HDR = (
    'e.jsxs("div",{className:"flex items-center gap-3 mb-2",children:['
    'e.jsx("button",{onClick:()=>le("dashboard"),className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})}),'
    'e.jsx("h1",{className:"text-base font-bold truncate",children:"Manager Hub"})]})'
)

NEW_HDR = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",marginBottom:8},children:['
    'e.jsx("button",{onClick:()=>le("dashboard"),style:{background:"none",border:"none",padding:0,cursor:"pointer",flexShrink:0,marginRight:12},'
    'children:e.jsxs("svg",{width:22,height:16,viewBox:"0 0 22 16",fill:"none",children:['
    'e.jsx("rect",{x:0,y:0,width:22,height:2,rx:1,fill:"#111827"}),'
    'e.jsx("rect",{x:0,y:7,width:22,height:2,rx:1,fill:"#111827"}),'
    'e.jsx("rect",{x:0,y:14,width:22,height:2,rx:1,fill:"#111827"})'
    ']})})'
    ',e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",flex:1,fontFamily:"Inter,sans-serif"},children:"Manager Hub"})'
    ',e.jsxs("div",{style:{position:"relative"},children:['
    'e.jsx("button",{style:{background:"none",border:"none",padding:4,cursor:"pointer",display:"flex",alignItems:"center"},'
    'children:e.jsxs("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:"#111827",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:['
    'e.jsx("path",{d:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"}),'
    'e.jsx("path",{d:"M13.73 21a2 2 0 0 1-3.46 0"})'
    ']})})'
    ',e.jsx("span",{style:{position:"absolute",top:2,right:2,width:8,height:8,borderRadius:"50%",background:"#dc2626",border:"2px solid #fff"}})'
    ']})'
    ']})'
)

chk_pair('OLD_HDR', OLD_HDR, 'NEW_HDR', NEW_HDR)
if OLD_HDR in content:
    content = content.replace(OLD_HDR, NEW_HDR, 1)
    print('A header: OK')
else:
    errors.append('A'); print('A: FAIL not found')

# ── B: Full overview section redesign ──────────────────────────────────────

OLD_OV_START = 'i==="overview"&&e.jsxs("div",{style:{padding:"14px 16px 80px"}'
OLD_OV_END   = ',i==="team"&&'

ov_s = content.find(OLD_OV_START)
ov_e = content.find(OLD_OV_END, ov_s)
if ov_s == -1 or ov_e == -1:
    errors.append('B'); print('B: FAIL anchors not found', ov_s, ov_e)
else:
    OLD_OV = content[ov_s:ov_e]
    print('OLD_OV len:', len(OLD_OV))
    chk('OLD_OV', OLD_OV)

    NEW_OV = (
        # ── outer wrapper ──────────────────────────────────────────────────
        'i==="overview"&&e.jsxs("div",{style:{padding:"16px 16px 80px"},children:['

        # Section heading
        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",marginBottom:14},children:"Overview"})'

        # ── 4 stat cards horizontal scroll ─────────────────────────────────
        ',e.jsx("div",{style:{overflowX:"auto",marginBottom:16},children:'
        'e.jsxs("div",{style:{display:"flex",gap:10,paddingBottom:4},children:['

        # Team Size (blue)
        'e.jsxs("div",{style:{flexShrink:0,width:100,background:"#fff",borderRadius:16,padding:"14px 10px",'
        'boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f0f1f4",'
        'display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsx("div",{style:{width:40,height:40,borderRadius:"50%",background:"#EFF4FF",'
        'display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsx($n,{size:18,style:{color:"#1a56db"}})}),'
        'e.jsx("p",{style:{fontSize:11,color:"#374151",marginBottom:6,fontWeight:500,textAlign:"center"},children:"Team Size"}),'
        'e.jsx("p",{style:{fontSize:24,fontWeight:800,color:"#1a56db",lineHeight:1},children:j.length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginTop:4,textAlign:"center"},children:"Active members"})'
        ']})'

        # Present Today (green)
        ',e.jsxs("div",{style:{flexShrink:0,width:100,background:"#fff",borderRadius:16,padding:"14px 10px",'
        'boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f0f1f4",'
        'display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsx("div",{style:{width:40,height:40,borderRadius:"50%",background:"#f0fdf4",'
        'display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsx(Ui,{size:18,style:{color:"#16a34a"}})}),'
        'e.jsx("p",{style:{fontSize:11,color:"#374151",marginBottom:6,fontWeight:500,textAlign:"center"},children:"Present Today"}),'
        'e.jsx("p",{style:{fontSize:24,fontWeight:800,color:"#16a34a",lineHeight:1},'
        'children:j.filter(function(mm){return mm.status==="present";}).length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginTop:4,textAlign:"center"},children:"of "+j.length+" members"})'
        ']})'

        # On Leave (orange)
        ',e.jsxs("div",{style:{flexShrink:0,width:100,background:"#fff",borderRadius:16,padding:"14px 10px",'
        'boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f0f1f4",'
        'display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsx("div",{style:{width:40,height:40,borderRadius:"50%",background:"#fffbeb",'
        'display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsx(Qt,{size:18,style:{color:"#d97706"}})}),'
        'e.jsx("p",{style:{fontSize:11,color:"#374151",marginBottom:6,fontWeight:500,textAlign:"center"},children:"On Leave"}),'
        'e.jsx("p",{style:{fontSize:24,fontWeight:800,color:"#d97706",lineHeight:1},'
        'children:j.filter(function(mm){return mm.status==="on-leave";}).length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginTop:4,textAlign:"center"},children:"members today"})'
        ']})'

        # Pending (red)
        ',e.jsxs("div",{style:{flexShrink:0,width:100,background:"#fff",borderRadius:16,padding:"14px 10px",'
        'boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f0f1f4",'
        'display:"flex",flexDirection:"column",alignItems:"center"},children:['
        'e.jsx("div",{style:{width:40,height:40,borderRadius:"50%",background:"#fef2f2",'
        'display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsx(G1,{size:18,style:{color:"#dc2626"}})}),'
        'e.jsx("p",{style:{fontSize:11,color:"#374151",marginBottom:6,fontWeight:500,textAlign:"center"},children:"Pending"}),'
        'e.jsx("p",{style:{fontSize:24,fontWeight:800,color:"#dc2626",lineHeight:1},'
        'children:m.filter(function(r){return r.status==="pending";}).length}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af",marginTop:4,textAlign:"center"},children:"approvals"})'
        ']})'

        ']})'  # close flex row
        '})'   # close overflowX div

        # ── Escalation Alerts ──────────────────────────────────────────────
        ',e.jsxs("div",{style:{background:"#fff5f5",borderRadius:14,border:"1px solid #fecaca",marginBottom:14,padding:"14px"},children:['

        # Header row: bell + title + overdue badge + view all
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",marginBottom:12},children:['
        'e.jsxs("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",flexShrink:0,children:['
        'e.jsx("path",{d:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9",stroke:"#dc2626",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",fill:"#fca5a5"}),'
        'e.jsx("path",{d:"M13.73 21a2 2 0 0 1-3.46 0",stroke:"#dc2626",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"})'
        ']}),'
        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#dc2626",flex:1,marginLeft:8},children:"Escalation Alerts"}),'
        'e.jsx("span",{style:{background:"#fff7ed",color:"#ea580c",fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:20,marginRight:10},'
        'children:m.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).length+" overdue"}),'
        'e.jsx("button",{onClick:function(){_mhSetView("esc-all");},style:{fontSize:11,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center"},'
        'children:["View All ",e.jsx("span",{style:{fontSize:14,marginLeft:2},children:"›"})]})'
        ']})'

        # Alert rows
        ',e.jsx("div",{children:m.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).slice(0,2).map(function(r){'
        'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderTop:"1px solid #fecaca"},children:['
        'e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#dc2626"},children:r.requester.split(" ")[0][0]+r.requester.split(" ")[1][0]})}),'
        'e.jsxs("div",{style:{flex:1},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:600,color:"#111827"},children:r.requester}),'
        'e.jsx("p",{style:{fontSize:10,color:"#9ca3af"},children:r.type+" · "+r.date})'
        ']}),'
        'e.jsx("span",{style:{color:"#9ca3af",fontSize:16,fontWeight:300},children:"›"})'
        ']},r.id);})})'

        ']})'  # close escalation alerts card

        # ── Leave Balance ──────────────────────────────────────────────────
        ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",marginBottom:14},children:['

        'e.jsxs("div",{style:{padding:"12px 14px",borderBottom:"1px solid #f0f1f4",display:"flex",alignItems:"center"},children:['
        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",flex:1},children:"Leave Balance"}),'
        'e.jsx("button",{onClick:function(){_mhSetView("leave-all");},style:{fontSize:11,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center"},'
        'children:["View All ",e.jsx("span",{style:{fontSize:14,marginLeft:2},children:"›"})]})'
        ']})'

        ',e.jsx("div",{style:{padding:"4px 14px 6px"},children:j.slice(0,4).map(function(mem){'
        'var _rem=mem.leaveBalance?mem.leaveBalance.remaining:0;'
        'var _ann=mem.leaveBalance?mem.leaveBalance.annual:15;'
        'var _pct=Math.round(_rem/_ann*100);'
        'var _col=_pct>=70?"#16a34a":"#d97706";'
        'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f9fafb"},children:['
        'e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",overflow:"hidden",flexShrink:0},'
        'children:e.jsx("img",{src:mem.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}})}),'
        'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
        'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:600,color:"#111827"},children:mem.name.split(" ")[0]}),'
        'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:_col},children:_rem+" / "+_ann+" d"})'
        ']}),'
        'e.jsx("div",{style:{width:"100%",height:4,background:"#f0f1f4",borderRadius:2},children:'
        'e.jsx("div",{style:{width:_pct+"%",height:"100%",background:_col,borderRadius:2}})'
        '})'
        ']})'
        ']},mem.id);})})'

        ']})'  # close leave balance card

        # ── Team Performance ───────────────────────────────────────────────
        ',e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",marginBottom:14,padding:"14px"},children:['

        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",marginBottom:12},children:"Team Performance"})'

        ',e.jsxs("div",{style:{display:"flex",gap:8},children:['

        # Avg Attendance (blue)
        'e.jsxs("div",{style:{flex:1,background:"#eff6ff",borderRadius:14,padding:"12px 10px 8px",display:"flex",flexDirection:"column"},children:['
        'e.jsx("div",{style:{width:30,height:30,borderRadius:8,background:"rgba(59,130,246,0.15)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsx(Qt,{size:14,style:{color:"#1a56db"}})}),'
        'e.jsx("p",{style:{fontSize:22,fontWeight:800,color:"#1a56db",lineHeight:1},'
        'children:Math.round(j.reduce(function(s,mm){return s+mm.attendance;},0)/j.length)+"%"}),'
        'e.jsx("p",{style:{fontSize:9,color:"#3b82f6",fontWeight:500,marginTop:4},children:"Avg Attendance"}),'
        'e.jsx("svg",{width:"100%",height:28,viewBox:"0 0 80 28",preserveAspectRatio:"none",style:{marginTop:8},'
        'children:e.jsx("path",{d:"M0,22 C8,22 12,14 22,16 C32,18 38,10 48,12 C58,14 68,17 80,15",'
        'stroke:"#3b82f6",strokeWidth:2,fill:"none",opacity:0.6})})'
        ']})'

        # Avg Efficiency (green)
        ',e.jsxs("div",{style:{flex:1,background:"#f0fdf4",borderRadius:14,padding:"12px 10px 8px",display:"flex",flexDirection:"column"},children:['
        'e.jsx("div",{style:{width:30,height:30,borderRadius:8,background:"rgba(22,163,74,0.15)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsxs("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2.5,strokeLinecap:"round",strokeLinejoin:"round",children:['
        'e.jsx("polyline",{points:"23 6 13.5 15.5 8.5 10.5 1 18"}),'
        'e.jsx("polyline",{points:"17 6 23 6 23 12"})'
        ']})})'
        ',e.jsx("p",{style:{fontSize:22,fontWeight:800,color:"#16a34a",lineHeight:1},'
        'children:Math.round(j.reduce(function(s,mm){return s+(mm.efficiency||80);},0)/j.length)+"%"}),'
        'e.jsx("p",{style:{fontSize:9,color:"#16a34a",fontWeight:500,marginTop:4},children:"Avg Efficiency"}),'
        'e.jsx("svg",{width:"100%",height:28,viewBox:"0 0 80 28",preserveAspectRatio:"none",style:{marginTop:8},'
        'children:e.jsx("path",{d:"M0,24 C10,24 15,18 25,14 C35,10 40,16 50,12 C60,8 70,14 80,10",'
        'stroke:"#16a34a",strokeWidth:2,fill:"none",opacity:0.6})})'
        ']})'

        # Task Completion (amber)
        ',e.jsxs("div",{style:{flex:1,background:"#fffbeb",borderRadius:14,padding:"12px 10px 8px",display:"flex",flexDirection:"column"},children:['
        'e.jsx("div",{style:{width:30,height:30,borderRadius:8,background:"rgba(217,119,6,0.15)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
        'children:e.jsxs("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#d97706",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:['
        'e.jsx("circle",{cx:12,cy:12,r:10}),'
        'e.jsx("circle",{cx:12,cy:12,r:3}),'
        'e.jsx("line",{x1:12,y1:2,x2:12,y2:5}),'
        'e.jsx("line",{x1:12,y1:19,x2:12,y2:22})'
        ']})})'
        ',e.jsx("p",{style:{fontSize:22,fontWeight:800,color:"#d97706",lineHeight:1},'
        'children:Math.round(j.reduce(function(s,mm){return s+mm.completedTasks/mm.tasks*100;},0)/j.length)+"%"}),'
        'e.jsx("p",{style:{fontSize:9,color:"#d97706",fontWeight:500,marginTop:4},children:"Task Completion"}),'
        'e.jsx("svg",{width:"100%",height:28,viewBox:"0 0 80 28",preserveAspectRatio:"none",style:{marginTop:8},'
        'children:e.jsx("path",{d:"M0,20 C8,20 12,16 22,18 C32,20 38,12 48,14 C58,16 68,10 80,16",'
        'stroke:"#d97706",strokeWidth:2,fill:"none",opacity:0.6})})'
        ']})'

        ']})'  # close flex row of 3 perf cards
        ']})'  # close team performance card

        ']})'  # close overview outer div
    )

    chk('NEW_OV', NEW_OV)

    if chk('OLD_OV', OLD_OV) == chk('NEW_OV', NEW_OV):
        content = content[:ov_s] + NEW_OV + content[ov_e:]
        print('B overview redesign: OK')
    else:
        errors.append('B'); print('B: FAIL bracket mismatch')

# ── Validate ─────────────────────────────────────────────────────────────
print()
if errors:
    print('FAILED:', errors)
else:
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    with open('/tmp/chk_dash.js', 'w') as f:
        f.write(scripts[0])
    r = subprocess.run(
        ['node', '-e',
         'try{new Function(require("fs").readFileSync("/tmp/chk_dash.js","utf8"));'
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
