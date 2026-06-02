import subprocess, tempfile, os

content = open('hrmobileapp.html').read()

OLD_START = 806335
OLD_END   = 811977

old_check_s = 'if(i.approvalKind==="timesheet"){var _tsColor="#1a56db";var '
old_check_e = '" Approve"]})]})]}),e.jsx("div",{style:{height:16}})]})]});}'

assert content[OLD_START:OLD_START+len(old_check_s)] == old_check_s, "START mismatch"
assert content[OLD_END-len(old_check_e):OLD_END] == old_check_e, f"END mismatch: {content[OLD_END-len(old_check_e):OLD_END]!r}"
print("Boundaries OK")

# ── Inline SVG helper ─────────────────────────────────────────────────────────
def isvg(w, h, vb, children_expr, extra_style=''):
    return (
        'e.jsx("svg",{width:' + str(w) + ',height:' + str(h) + ',viewBox:"' + vb + '",'
        'fill:"none",stroke:"currentColor",strokeWidth:1.5,'
        'strokeLinecap:"round",strokeLinejoin:"round"'
        + (',' + extra_style if extra_style else '') +
        ',children:' + children_expr + '})'
    )

# Clock icon
CLOCK_IC = isvg(13, 13, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
    ']})'
)
CLOCK_SM = isvg(12, 12, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
    ']})'
)

# Table/Grid (spreadsheet-like) for Timesheet tab
TABLE_IC = isvg(13, 13, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:3,y:3,width:18,height:18,rx:2}),'
    'e.jsx("line",{x1:3,y1:9,x2:21,y2:9}),'
    'e.jsx("line",{x1:3,y1:15,x2:21,y2:15}),'
    'e.jsx("line",{x1:9,y1:3,x2:9,y2:21}),'
    'e.jsx("line",{x1:15,y1:3,x2:15,y2:21})'
    ']})'
)

# Calendar icon
CAL_IC = isvg(13, 13, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2}),'
    'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
    'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
    'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
    ']})'
)

# Zap/Lightning for Overtime
ZAP_IC = isvg(13, 13, '0 0 24 24',
    'e.jsx("polygon",{points:"13 2 3 14 12 14 11 22 21 10 12 10 13 2"})'
)

# Trending up for Avg Hours
TREND_IC = isvg(13, 13, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("polyline",{points:"23 6 13.5 15.5 8.5 10.5 1 18"}),'
    'e.jsx("polyline",{points:"17 6 23 6 23 12"})'
    ']})'
)

# Check circle for "days completed"
CHECK_CIRC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}),'
    'e.jsx("polyline",{points:"22 4 12 14.01 9 11.01"})'
    ']})',
    'stroke:"#16a34a"'
)

# ── Reusable style strings ─────────────────────────────────────────────────────
FF = '"Inter,sans-serif"'
LBL = '{fontSize:10,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ',letterSpacing:"0.07em",margin:"0 0 3px",textTransform:"uppercase"}'

# ── HEADER ─────────────────────────────────────────────────────────────────────
AVATAR = (
    'e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",'
    'background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'flexShrink:0,color:"#fff",fontSize:13,fontWeight:700,fontFamily:' + FF + '},'
    'children:(i.parent||"?").split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase()})'
)

STATUS_CHIP = (
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,fontWeight:700,'
    'color:i.status==="Approved!"?"#16a34a":i.status==="Rejected"?"#dc2626":"#d97706",'
    'background:i.status==="Approved!"?"#f0fdf4":i.status==="Rejected"?"#fef2f2":"#fffbeb",'
    'borderRadius:20,padding:"5px 10px",'
    'border:i.status==="Approved!"?"1px solid #bbf7d0":i.status==="Rejected"?"1px solid #fecaca":"1px solid #fed7aa",'
    'fontFamily:' + FF + ',flexShrink:0},children:['
    + CLOCK_IC + ',"\\u00a0"+(i.status||"Pending")'
    ']})'
)

HEADER = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:8,'
    'padding:"48px 16px 14px",background:"#fff",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsx("button",{onClick:()=>le("approvals"),style:{background:"none",border:"none",'
    'cursor:"pointer",padding:"6px 4px 0 0",flexShrink:0},'
    'children:e.jsx(ke,{size:22,color:"#374151"})}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:' + FF + ',margin:"0 0 6px",'
    'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:i.title}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    + AVATAR + ','
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:600,color:"#111827",fontFamily:' + FF + ',margin:0},children:i.parent||"—"}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:' + FF + ',margin:"1px 0 0"},'
    'children:(i.role||"Developer")+" • "+(i.department||"Engineering")})'
    ']})'
    ']})'
    ']}),'
    + STATUS_CHIP +
    ']})'
)

# ── TABS ───────────────────────────────────────────────────────────────────────
TABS = (
    'e.jsxs("div",{style:{display:"flex",background:"#fff",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,'
    'padding:"10px 16px",borderBottom:"2px solid #1a56db",'
    'color:"#1a56db",fontSize:12,fontWeight:600,fontFamily:' + FF + ',cursor:"pointer"},children:['
    + TABLE_IC + ',"Timesheet"'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,'
    'padding:"10px 16px",borderBottom:"2px solid transparent",'
    'color:"#6b7280",fontSize:12,fontWeight:500,fontFamily:' + FF + ',cursor:"pointer"},children:['
    + CAL_IC + ','
    'e.jsx("span",{children:i.timeline||i.start||"—"}),'
    'e.jsx(qe,{size:11})'
    ']})'
    ']})'
)

# ── STATS CARD (4-column) ──────────────────────────────────────────────────────
STATS_CARD = (
    'e.jsxs("div",{style:{margin:"14px 14px 0",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"},children:['
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr"},children:['
    # WEEK PERIOD
    'e.jsxs("div",{style:{padding:"12px 10px",borderRight:"1px solid #f0f1f4"},children:['
    + CAL_IC + ','
    'e.jsx("p",{style:{fontSize:9,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ',letterSpacing:"0.07em",margin:"6px 0 2px",textTransform:"uppercase"},children:"Week Period"}),'
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:' + FF + ',margin:"0 0 2px"},children:i.timeline||"—"}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",fontFamily:' + FF + ',margin:0},'
    'children:i.weekLabel||(i.title||"").replace(/.*Week\\s*(\\d+).*/,"Week $1")||"—"})'
    ']}),'
    # TOTAL HOURS
    'e.jsxs("div",{style:{padding:"12px 10px",borderRight:"1px solid #f0f1f4"},children:['
    + CLOCK_SM + ','
    'e.jsx("p",{style:{fontSize:9,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ',letterSpacing:"0.07em",margin:"6px 0 2px",textTransform:"uppercase"},children:"Total Hours"}),'
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#1a56db",fontFamily:' + FF + ',margin:"0 0 2px"},children:i.timeLogged||_tsTotalH+"h"}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",fontFamily:' + FF + ',margin:0},'
    'children:"of "+(i.expectedHours||40)+"h (Expected)"})'
    ']}),'
    # SUBMITTED BY
    'e.jsxs("div",{style:{padding:"12px 10px",borderRight:"1px solid #f0f1f4"},children:['
    'e.jsx("div",{style:{width:14,height:14,borderRadius:"50%",'
    'background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",'
    'display:"inline-flex",alignItems:"center",justifyContent:"center",'
    'color:"#fff",fontSize:8,fontWeight:700},'
    'children:(i.parent||"?").split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase()}),'
    'e.jsx("p",{style:{fontSize:9,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ',letterSpacing:"0.07em",margin:"6px 0 2px",textTransform:"uppercase"},children:"Submitted By"}),'
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:' + FF + ',margin:"0 0 2px"},children:i.parent||"—"}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",fontFamily:' + FF + ',margin:0},'
    'children:i.role||"Developer"})'
    ']}),'
    # SUBMITTED ON
    'e.jsxs("div",{style:{padding:"12px 10px"},children:['
    + CAL_IC + ','
    'e.jsx("p",{style:{fontSize:9,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ',letterSpacing:"0.07em",margin:"6px 0 2px",textTransform:"uppercase"},children:"Submitted On"}),'
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:' + FF + ',margin:"0 0 2px"},'
    'children:(function(){var d=i.submittedOn||"";var m=d.match(/(\\d{4})-(\\d{2})-(\\d{2})/);if(m){var months=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return months[parseInt(m[2],10)]+" "+parseInt(m[3],10)+", "+m[1];}return d||"—";})()}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",fontFamily:' + FF + ',margin:0},'
    'children:i.submittedTime||"10:30 AM"})'
    ']}) '
    ']})'
    ']})'
)

# ── DAILY BREAKDOWN CARD ───────────────────────────────────────────────────────
BREAKDOWN_CARD = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"},children:['
    # card header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",'
    'padding:"12px 14px 10px",borderBottom:"1px solid #f0f1f4"},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:' + FF + '},'
    'children:"Daily Breakdown"}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5},children:['
    'e.jsx("div",{style:{width:7,height:7,borderRadius:"50%",background:"#1a56db"}}),'
    'e.jsx("span",{style:{fontSize:11,color:"#6b7280",fontFamily:' + FF + '},children:"Hours Logged"})'
    ']})'
    ']}),'
    # bar chart area
    'e.jsx("div",{style:{padding:"12px 14px 0"},children:'
    # outer flex: bars + goal label
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:0},children:['
    # bars flex
    'e.jsx("div",{style:{flex:1},children:'
    'e.jsxs("div",{style:{display:"flex",gap:3},children:['
    '_tsWeekDays.map(function(d,idx){'
    'var isWe=d.d==="Sat"||d.d==="Sun";'
    'var dateN=(_tsStartDay+idx);'
    'var barPct=d.h===0?0:Math.max(10,Math.round(d.h/10*100));'
    'var barBg=d.h===0?"transparent":isWe?"#93c5fd":"#1a56db";'
    'return e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:0},children:['
    # day name
    'e.jsx("span",{style:{fontSize:9,fontWeight:600,color:isWe?"#9ca3af":"#6b7280",fontFamily:' + FF + ',marginBottom:1},children:d.d}),'
    # date
    'e.jsx("span",{style:{fontSize:8,color:"#9ca3af",fontFamily:' + FF + ',marginBottom:4},children:_tsMonAbbr+" "+dateN}),'
    # bar container
    'e.jsxs("div",{style:{width:"100%",height:80,background:"#f3f4f6",borderRadius:"5px 5px 0 0",'
    'position:"relative",overflow:"hidden"},children:['
    # fill
    'e.jsxs("div",{style:{position:"absolute",bottom:0,left:0,right:0,'
    'height:barPct+"%",background:barBg,borderRadius:"4px 4px 0 0",'
    'display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:4},children:['
    'd.h>0&&e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#fff",fontFamily:' + FF + '},children:d.h+"h"})'
    ']})'
    ']})'
    ']},idx);'
    '})'
    ']})'
    '}),'
    # goal label on right
    'e.jsxs("div",{style:{paddingLeft:6,display:"flex",flexDirection:"column",justifyContent:"flex-end",'
    'paddingBottom:0,width:36},children:['
    'e.jsx("span",{style:{fontSize:9,fontWeight:700,color:"#6b7280",fontFamily:' + FF + ',textAlign:"right",lineHeight:"12px"},children:"8h"}),'
    'e.jsx("span",{style:{fontSize:8,color:"#9ca3af",fontFamily:' + FF + ',textAlign:"right",lineHeight:"10px"},children:"Daily"}),'
    'e.jsx("span",{style:{fontSize:8,color:"#9ca3af",fontFamily:' + FF + ',textAlign:"right",lineHeight:"10px"},children:"Goal"})'
    ']}) '
    ']})'
    '}),'
    # footer
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",'
    'padding:"10px 14px",background:"#f9fafb",borderTop:"1px solid #f0f1f4",marginTop:0},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5},children:['
    + CHECK_CIRC + ','
    'e.jsx("span",{style:{fontSize:11,color:"#374151",fontFamily:' + FF + '},'
    'children:_tsWorkDays+" days completed"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    'e.jsxs("span",{style:{fontSize:11,fontWeight:700,color:"#1a56db",fontFamily:' + FF + '},children:[_tsTotalH+"h"," Logged"]}),'
    'e.jsx("span",{style:{fontSize:10,color:"#9ca3af"},children:"|"}),'
    'e.jsxs("span",{style:{fontSize:11,color:"#374151",fontFamily:' + FF + '},children:[_tsOT+"h"," Overtime"]})'
    ']})'
    ']})'
    ']})'
)

# ── STATS ROW (4 mini stats) ───────────────────────────────────────────────────
def stat_item(icon_expr, label, val_expr, sub_expr, border_right=True):
    return (
        'e.jsxs("div",{style:{flex:1,padding:"12px 8px",display:"flex",flexDirection:"column",alignItems:"flex-start",'
        + ('borderRight:"1px solid #f0f1f4",' if border_right else '')
        + 'gap:2},children:['
        'e.jsx("div",{style:{color:"#6b7280",marginBottom:4},children:' + icon_expr + '}),'
        'e.jsx("span",{style:{fontSize:9,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ',letterSpacing:"0.07em",textTransform:"uppercase"},children:"' + label + '"}),'
        'e.jsx("span",{style:{fontSize:18,fontWeight:800,color:"#111827",fontFamily:' + FF + ',lineHeight:"1.1"},children:' + val_expr + '}),'
        'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontFamily:' + FF + '},children:' + sub_expr + '})'
        ']})'
    )

STATS_ROW = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"},children:['
    'e.jsxs("div",{style:{display:"flex"},children:['
    + stat_item('e.jsx("div",{style:{color:"#6b7280"},children:' + CLOCK_SM + '})', 'Regular Hours', '_tsReg+"h"', '"95% of total"', True)
    + ','
    + stat_item('e.jsx("div",{style:{color:"#f59e0b"},children:' + ZAP_IC + '})', 'Overtime', '_tsOT+"h"', '"5% of total"', True)
    + ','
    + stat_item('e.jsx("div",{style:{color:"#6b7280"},children:' + CAL_IC + '})', 'Working Days', '_tsWorkDays+"/7"', '"Days"', True)
    + ','
    + stat_item('e.jsx("div",{style:{color:"#16a34a"},children:' + TREND_IC + '})', 'Avg Daily Hours', '_tsAvgH+"h"', '"Per Day"', False)
    + ' '
    ']})'
    ']})'
)

# ── APPROVAL DECISION CARD ─────────────────────────────────────────────────────
DECISION_CARD = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"},children:['
    'e.jsxs("div",{style:{padding:"14px"},children:['
    'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",fontFamily:' + FF + ',margin:"0 0 2px"},'
    'children:"Approval Decision"}),'
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + ',margin:"0 0 10px"},'
    'children:"Add a remark (optional)"}),'
    # textarea wrapper
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",marginBottom:10},children:['
    'e.jsx("textarea",{placeholder:"Write your remark here...",rows:4,value:j,'
    'onChange:function(ev){m(ev.target.value.slice(0,500));},style:{'
    'width:"100%",padding:"12px",border:"none",fontSize:13,'
    'fontFamily:' + FF + ',color:"#111827",outline:"none",'
    'resize:"none",boxSizing:"border-box",display:"block"}}),'
    'e.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",'
    'padding:"4px 10px 6px",background:"#f9fafb",borderTop:"1px solid #f3f4f6"},children:['
    'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontFamily:' + FF + '},'
    'children:j.length+"/500"})'
    ']})'
    ']}),'
    # info banner
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:8,'
    'padding:"10px 12px",background:"#f8faff",borderRadius:10,border:"1px solid #e0eaff",marginBottom:12},children:['
    'e.jsx("div",{style:{color:"#6b7280",flexShrink:0,marginTop:1},children:e.jsx(eo,{size:13})}),'
    'e.jsx("span",{style:{fontSize:11,color:"#374151",fontFamily:' + FF + ',lineHeight:"16px"},'
    'children:"Please review the timesheet details before approving."})'
    ']}),'
    # buttons row
    'e.jsxs("div",{style:{display:"flex",gap:10},children:['
    'e.jsxs("button",{onClick:function(){ye("Rejected");le("approvals");},style:{'
    'flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,'
    'padding:"13px 0",borderRadius:12,'
    'border:"1.5px solid #dc2626",background:"#fff",'
    'fontSize:13,fontWeight:700,color:"#dc2626",'
    'fontFamily:' + FF + ',cursor:"pointer"},children:['
    'e.jsx(mt,{size:15}),"Reject"'
    ']}),'
    'e.jsxs("button",{onClick:function(){ye("Approved!");le("approvals");},style:{'
    'flex:2,display:"flex",alignItems:"center",justifyContent:"center",gap:6,'
    'padding:"13px 0",borderRadius:12,'
    'border:"none",background:"#1a56db",'
    'fontSize:13,fontWeight:700,color:"#fff",'
    'fontFamily:' + FF + ',cursor:"pointer"},children:['
    'e.jsx(ps,{size:15}),"Approve"'
    ']})'
    ']})'
    ']})'
    ']})'
)

# ── ASSEMBLE FULL SCREEN ────────────────────────────────────────────────────────
NEW_SCREEN = (
    'if(i.approvalKind==="timesheet"){'
    # vars
    'var _tsColor="#1a56db";'
    'var _tsWeekDays=['
    '{d:"Mon",h:i.monHours!=null?i.monHours:8},'
    '{d:"Tue",h:i.tueHours!=null?i.tueHours:8},'
    '{d:"Wed",h:i.wedHours!=null?i.wedHours:7},'
    '{d:"Thu",h:i.thuHours!=null?i.thuHours:6},'
    '{d:"Fri",h:i.friHours!=null?i.friHours:7},'
    '{d:"Sat",h:i.satHours!=null?i.satHours:5},'
    '{d:"Sun",h:i.sunHours!=null?i.sunHours:0}'
    '];'
    'var _tsTotalH=_tsWeekDays.reduce(function(s,d){return s+d.h;},0);'
    'var _tsExpected=i.expectedHours||40;'
    'var _tsOT=Math.max(0,_tsTotalH-_tsExpected);'
    'var _tsReg=Math.min(_tsTotalH,_tsExpected);'
    'var _tsWorkDays=_tsWeekDays.filter(function(d){return d.h>0;}).length;'
    'var _tsAvgH=_tsWorkDays>0?Math.round(_tsTotalH/_tsWorkDays):0;'
    'var _tsStartParts=(i.start||"Apr 21").split(" ");'
    'var _tsMonAbbr=_tsStartParts[0]||"Apr";'
    'var _tsStartDay=parseInt(_tsStartParts[1]||"21",10);'
    # return the screen
    'return e.jsxs("div",{className:"screen",'
    'style:{background:"#f3f4f6",display:"flex",flexDirection:"column"},children:['
    + HEADER + ','
    + TABS + ','
    'e.jsxs("div",{style:{flex:1,overflowY:"auto"},children:['
    + STATS_CARD + ','
    + BREAKDOWN_CARD + ','
    + STATS_ROW + ','
    + DECISION_CARD + ','
    'e.jsx("div",{style:{height:24}})'
    ']})'
    ']})'
    ';}'
)

print("NEW length:", len(NEW_SCREEN))
opens = NEW_SCREEN.count('{') + NEW_SCREEN.count('(') + NEW_SCREEN.count('[')
closes = NEW_SCREEN.count('}') + NEW_SCREEN.count(')') + NEW_SCREEN.count(']')
print(f"opens={opens} closes={closes} delta={opens-closes}")

# ── Node.js syntax check ────────────────────────────────────────────────────────
STUBS = (
    'var e={jsx:function(){return null;},jsxs:function(){return null;}};'
    'var i={title:"Timesheet — Week 17",approvalKind:"timesheet",parent:"Raj Kumar",'
    'status:"Pending",timeline:"Apr 21 – Apr 27",start:"Apr 21",end:"Apr 27",'
    'timeLogged:"42h",submittedOn:"2026-04-25",monHours:8,tueHours:8,wedHours:7,'
    'thuHours:6,friHours:7,satHours:5,sunHours:0,expectedHours:40,role:"Developer",'
    'department:"Engineering"};'
    'var le=function(){};var ye=function(){};var b={useState:function(){return["",function(){}];}};'
    'var ke={},qe={},eo={},mt={},ps={},so={};'
    'var j="";var m=function(){};'
)
test_code = STUBS + '(function(){' + NEW_SCREEN + '})();'
with tempfile.NamedTemporaryFile(suffix='.js', delete=False, mode='w') as f:
    f.write(test_code)
    tmpf = f.name
result = subprocess.run(['node', '--check', tmpf], capture_output=True, text=True)
os.unlink(tmpf)
if result.returncode != 0:
    print("SYNTAX ERROR:", result.stderr[:500])
    exit(1)
print("Syntax OK")

# ── Apply ────────────────────────────────────────────────────────────────────────
new_content = content[:OLD_START] + NEW_SCREEN + content[OLD_END:]
print(f"New file size: {len(new_content)}")
open('hrmobileapp.html', 'w').write(new_content)
print("Done")
