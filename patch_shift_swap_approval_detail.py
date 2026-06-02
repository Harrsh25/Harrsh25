import subprocess, tempfile, os

content = open('hrmobileapp.html').read()

OLD_START = 843883
OLD_END   = 848816

old_check_s = 'if(i.approvalKind==="shift-swap"){return e.jsxs("div",{className:"screen",style:'
old_check_e = 'e.jsx(ps,{size:14})," Approve"]})]})]}),e.jsx("div",{style:{height:16}})]})]});}'
assert content[OLD_START:OLD_START+len(old_check_s)] == old_check_s, "START mismatch"
assert content[OLD_END-len(old_check_e):OLD_END] == old_check_e, f"END mismatch"
print("Boundaries OK")

FF = '"Inter,sans-serif"'

# ── Inline SVG helpers ──────────────────────────────────────────────────────────
def isvg(w, h, vb, children_expr, extra=''):
    return (
        'e.jsx("svg",{width:' + str(w) + ',height:' + str(h) + ',viewBox:"' + vb + '",'
        'fill:"none",stroke:"currentColor",strokeWidth:1.5,'
        'strokeLinecap:"round",strokeLinejoin:"round"'
        + (',' + extra if extra else '') +
        ',children:' + children_expr + '})'
    )

# Arrow left-right (swap)
SWAP_IC = isvg(18, 18, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("polyline",{points:"17 1 21 5 17 9"}),'
    'e.jsx("path",{d:"M3 11V9a4 4 0 0 1 4-4h14"}),'
    'e.jsx("polyline",{points:"7 23 3 19 7 15"}),'
    'e.jsx("path",{d:"M21 13v2a4 4 0 0 1-4 4H3"})'
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

# Sun icon (morning)
SUN_IC = isvg(26, 26, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:12,cy:12,r:5}),'
    'e.jsx("line",{x1:12,y1:1,x2:12,y2:3}),'
    'e.jsx("line",{x1:12,y1:21,x2:12,y2:23}),'
    'e.jsx("line",{x1:4.22,y1:4.22,x2:5.64,y2:5.64}),'
    'e.jsx("line",{x1:18.36,y1:18.36,x2:19.78,y2:19.78}),'
    'e.jsx("line",{x1:1,y1:12,x2:3,y2:12}),'
    'e.jsx("line",{x1:21,y1:12,x2:23,y2:12}),'
    'e.jsx("line",{x1:4.22,y1:19.78,x2:5.64,y2:18.36}),'
    'e.jsx("line",{x1:18.36,y1:5.64,x2:19.78,y2:4.22})'
    ']})',
    'stroke:"#f97316",strokeWidth:2'
)

# Moon icon (evening)
MOON_IC = isvg(26, 26, '0 0 24 24',
    'e.jsx("path",{d:"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"})',
    'stroke:"#16a34a",strokeWidth:2'
)

# User icon
USER_IC = isvg(12, 12, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),'
    'e.jsx("circle",{cx:12,cy:7,r:4})'
    ']})'
)

# Users (two people) icon
USERS_IC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),'
    'e.jsx("circle",{cx:9,cy:7,r:4}),'
    'e.jsx("path",{d:"M23 21v-2a4 4 0 0 1-3-3.87"}),'
    'e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})'
    ']})'
)

# MessageSquare icon
MSG_IC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"})'
    ']})'
)

# Clock icon (small)
CLOCK_IC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
    ']})'
)

# Info circle
INFO_IC = isvg(16, 16, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("line",{x1:12,y1:8,x2:12,y2:12}),'
    'e.jsx("line",{x1:12,y1:16,x2:"12.01",y2:16})'
    ']})',
    'stroke:"#4f46e5"'
)

# Edit/Pencil icon
EDIT_IC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),'
    'e.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})'
    ']})',
    'stroke:"#fff"'
)

# Calendar+clock decorative illustration (right side of Note banner)
NOTE_ILLUS = (
    'e.jsx("svg",{width:60,height:60,viewBox:"0 0 60 60",fill:"none",'
    'style:{opacity:0.7,flexShrink:0},children:'
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:8,y:10,width:34,height:36,rx:4,fill:"#e0e7ff",stroke:"#818cf8",strokeWidth:1.5}),'
    'e.jsx("rect",{x:8,y:10,width:34,height:10,rx:4,fill:"#818cf8"}),'
    'e.jsx("rect",{x:8,y:16,width:34,height:4,fill:"#818cf8"}),'
    'e.jsx("line",{x1:16,y1:8,x2:16,y2:14,stroke:"#818cf8",strokeWidth:2,strokeLinecap:"round"}),'
    'e.jsx("line",{x1:34,y1:8,x2:34,y2:14,stroke:"#818cf8",strokeWidth:2,strokeLinecap:"round"}),'
    'e.jsx("rect",{x:14,y:26,width:6,height:5,rx:1,fill:"#c7d2fe"}),'
    'e.jsx("rect",{x:24,y:26,width:6,height:5,rx:1,fill:"#c7d2fe"}),'
    'e.jsx("rect",{x:14,y:35,width:6,height:5,rx:1,fill:"#c7d2fe"}),'
    'e.jsx("circle",{cx:44,cy:44,r:12,fill:"#f0fdf4",stroke:"#86efac",strokeWidth:1.5}),'
    'e.jsx("circle",{cx:44,cy:44,r:9,stroke:"#22c55e",strokeWidth:1.5,fill:"none"}),'
    'e.jsx("polyline",{points:"44 40 44 44 47 46",stroke:"#22c55e",strokeWidth:1.5,strokeLinecap:"round"})'
    ']})'
    '})'
)

# ── Helper: icon in colored square ─────────────────────────────────────────────
def icon_sq(icon_expr, bg='#eef2ff', color='#4f46e5'):
    return (
        'e.jsx("div",{style:{width:32,height:32,borderRadius:8,'
        'background:"' + bg + '",'
        'display:"flex",alignItems:"center",justifyContent:"center",'
        'color:"' + color + '",flexShrink:0},children:' + icon_expr + '})'
    )

# ── STATUS CHIP ─────────────────────────────────────────────────────────────────
STATUS_CHIP = (
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,fontWeight:700,'
    'color:i.status==="Approved!"?"#16a34a":i.status==="Rejected"?"#dc2626":"#d97706",'
    'background:i.status==="Approved!"?"#f0fdf4":i.status==="Rejected"?"#fef2f2":"#fffbeb",'
    'borderRadius:20,padding:"5px 12px",'
    'border:i.status==="Approved!"?"1px solid #bbf7d0":i.status==="Rejected"?"1px solid #fecaca":"1px solid #fed7aa",'
    'fontFamily:' + FF + ',flexShrink:0},children:['
    'e.jsx(so,{size:13}),"\\u00a0"+(i.status||"Pending")'
    ']})'
)

# ── HEADER ─────────────────────────────────────────────────────────────────────
AVATAR = (
    'e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",'
    'background:"linear-gradient(135deg,#6366f1,#4f46e5)",'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'color:"#fff",fontSize:13,fontWeight:700,fontFamily:' + FF + ',flexShrink:0},'
    'children:(i.parent||"?").split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase()})'
)

HEADER = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:8,'
    'padding:"48px 16px 14px",background:"#fff",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsx("button",{onClick:()=>le("approvals"),style:{width:36,height:36,borderRadius:10,'
    'border:"1px solid #e5e7eb",background:"#fff",display:"flex",alignItems:"center",'
    'justifyContent:"center",cursor:"pointer",flexShrink:0,marginTop:2},'
    'children:e.jsx(ke,{size:18,color:"#374151"})}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:' + FF + ',margin:"0 0 6px",'
    'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:i.title}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    + AVATAR + ','
    'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#374151",fontFamily:' + FF + '},'
    'children:i.parent||"—"})'
    ']})'
    ']}),'
    + STATUS_CHIP +
    ']})'
)

# ── TABS ───────────────────────────────────────────────────────────────────────
TABS = (
    'e.jsxs("div",{style:{display:"flex",background:"#fff",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,'
    'padding:"10px 16px",borderBottom:"2px solid #1a56db",'
    'color:"#1a56db",fontSize:12,fontWeight:600,fontFamily:' + FF + ',cursor:"pointer"},children:['
    + SWAP_IC + ',"Shift Swap"'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,'
    'padding:"10px 16px",borderBottom:"2px solid transparent",'
    'color:"#6b7280",fontSize:12,fontWeight:500,fontFamily:' + FF + ',cursor:"pointer"},children:['
    + CAL_IC + ','
    'i.timeline||i.start||"—"'
    ']})'
    ']})'
)

# ── SHIFT SWAP VISUAL CARD ─────────────────────────────────────────────────────
SHIFT_VISUAL = (
    'e.jsxs("div",{style:{margin:"14px 14px 0",borderRadius:16,overflow:"hidden",'
    'border:"1px solid #e5e7eb",background:"#fff"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"stretch"},children:['
    # LEFT: MY SHIFT (light indigo bg)
    'e.jsxs("div",{style:{flex:1,padding:"16px 14px 14px",'
    'background:"linear-gradient(135deg,#eef2ff 0%,#e0e7ff 100%)"},children:['
    'e.jsx("p",{style:{fontSize:9,fontWeight:800,color:"#6366f1",fontFamily:' + FF + ','
    'letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 10px"},'
    'children:"MY SHIFT"}),'
    # sun icon
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:6},children:['
    'e.jsx("div",{style:{width:40,height:40,borderRadius:12,background:"#fff7ed",'
    'display:"flex",alignItems:"center",justifyContent:"center"},children:'
    + SUN_IC + '}),'
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#111827",fontFamily:' + FF + ',margin:0,'
    'lineHeight:"1.1"},children:i.myShiftName||"Morning"}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:' + FF + ',margin:"2px 0 0"},'
    'children:i.myShiftTime||"7:00 AM – 3:00 PM"})'
    ']})'
    ']}),'
    # date
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,marginTop:8},children:['
    'e.jsx("div",{style:{color:"#6b7280"},children:' + CAL_IC + '}),'
    'e.jsx("span",{style:{fontSize:11,color:"#6b7280",fontFamily:' + FF + '},'
    'children:(i.start||"May 22")+", 2026"})'
    ']})'
    ']}),'
    # CENTER: swap button
    'e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",'
    'padding:"0 0",flexShrink:0,zIndex:1,position:"relative"},children:'
    'e.jsxs("div",{style:{width:44,height:44,borderRadius:"50%",background:"#fff",'
    'boxShadow:"0 2px 12px rgba(79,70,229,0.18)",display:"flex",alignItems:"center",'
    'justifyContent:"center",border:"1.5px solid #e0e7ff"},children:['
    + SWAP_IC +
    ']})'
    '}),'
    # RIGHT: SWAP WITH (light green bg)
    'e.jsxs("div",{style:{flex:1,padding:"16px 14px 14px",'
    'background:"linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)"},children:['
    'e.jsx("p",{style:{fontSize:9,fontWeight:800,color:"#16a34a",fontFamily:' + FF + ','
    'letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 10px",textAlign:"right"},'
    'children:"SWAP WITH"}),'
    # moon icon
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:6,justifyContent:"flex-end"},children:['
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#111827",fontFamily:' + FF + ',margin:0,'
    'lineHeight:"1.1",textAlign:"right"},children:i.swapShiftName||"Evening"}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:' + FF + ',margin:"2px 0 0",textAlign:"right"},'
    'children:i.swapShiftTime||"3:00 PM – 11:00 PM"})'
    ']}),'
    'e.jsx("div",{style:{width:40,height:40,borderRadius:12,background:"#dcfce7",'
    'display:"flex",alignItems:"center",justifyContent:"center"},children:'
    + MOON_IC + '})'
    ']}),'
    # swap-with person
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,marginTop:8,justifyContent:"flex-end"},children:['
    'e.jsx("div",{style:{color:"#6b7280"},children:' + USER_IC + '}),'
    'e.jsx("span",{style:{fontSize:11,color:"#6b7280",fontFamily:' + FF + '},'
    'children:i.swapWith||i.parent||"—"})'
    ']})'
    ']})'
    ']})'
    ']})'
)

# ── DETAILS LIST CARD ──────────────────────────────────────────────────────────
def detail_row(icon_expr, label, val_expr, val_style='', is_last=False):
    return (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,'
        'padding:"13px 0"'
        + ('' if is_last else ',borderBottom:"1px dashed #f0f1f4"') +
        '},children:['
        + icon_expr + ','
        'e.jsx("span",{style:{fontSize:13,color:"#6b7280",fontFamily:' + FF + ',flex:1},'
        'children:"' + label + '"}),'
        'e.jsx("span",{style:{fontSize:13,fontWeight:600,fontFamily:' + FF + ',textAlign:"right"'
        + (',' + val_style if val_style else '') +
        '},children:' + val_expr + '})'
        ']})'
    )

DETAILS_CARD = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:14,border:"1px solid #e5e7eb",'
    'background:"#fff",padding:"2px 14px"},children:['
    + detail_row(icon_sq(USERS_IC), 'Requested With', 'i.swapWith||i.parent||"—"', 'color:"#111827"')
    + ','
    + detail_row(icon_sq(CAL_IC), 'Date', '(i.start||"May 22")+", 2026"', 'color:"#4f46e5",fontWeight:700')
    + ','
    + detail_row(icon_sq(MSG_IC), 'Reason', 'i.reason||"Personal commitment"', 'color:"#111827",fontWeight:700')
    + ','
    + detail_row(icon_sq(USER_IC, '#eef2ff', '#4f46e5'), 'Submitted By', 'i.submittedBy||"You"', 'color:"#111827",fontWeight:700')
    + ','
    + detail_row(icon_sq(CLOCK_IC), 'Submitted On',
        '(function(){var d=i.submittedOn||"";var m=d.match(/(\\d{4})-(\\d{2})-(\\d{2})/);if(m){var mo=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return mo[parseInt(m[2],10)]+" "+parseInt(m[3],10)+", "+m[1]+" • "+(i.submittedTime||"10:30 AM");}return d+" • "+(i.submittedTime||"10:30 AM");})()',
        'color:"#374151",fontWeight:500', True)
    + ' '
    ']})'
)

# ── NOTE BANNER ────────────────────────────────────────────────────────────────
NOTE_BANNER = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:14,'
    'background:"linear-gradient(135deg,#eef2ff,#e0e7ff)",padding:"14px 16px",'
    'display:"flex",alignItems:"center",gap:12,overflow:"hidden"},children:['
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4},children:['
    + INFO_IC + ','
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#4f46e5",fontFamily:' + FF + '},'
    'children:"Note"})'
    ']}),'
    'e.jsx("span",{style:{fontSize:12,color:"#374151",fontFamily:' + FF + ',lineHeight:"16px"},'
    'children:"Please review the shift swap request details before taking action."})'
    ']}),'
    + NOTE_ILLUS +
    ']})'
)

# ── APPROVAL DECISION CARD ─────────────────────────────────────────────────────
DECISION_CARD = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:14,border:"1px solid #e5e7eb",'
    'background:"#fff",overflow:"hidden"},children:['
    'e.jsxs("div",{style:{padding:"14px 14px 0"},children:['
    # header: pencil icon square + title
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10},children:['
    'e.jsx("div",{style:{width:32,height:32,borderRadius:8,background:"#1a56db",'
    'display:"flex",alignItems:"center",justifyContent:"center"},'
    'children:' + EDIT_IC + '}),'
    'e.jsx("span",{style:{fontSize:15,fontWeight:700,color:"#111827",fontFamily:' + FF + '},'
    'children:"Approval Decision"})'
    ']}),'
    # remark label
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + ',margin:"0 0 8px"},'
    'children:"Add a remark (optional)"}),'
    # textarea wrapper
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,marginBottom:12,overflow:"hidden"},children:['
    'e.jsx("textarea",{placeholder:"Write your remark here...",rows:4,value:j,'
    'onChange:function(ev){m(ev.target.value.slice(0,500));},style:{'
    'width:"100%",padding:"12px 12px 4px",border:"none",fontSize:13,'
    'fontFamily:' + FF + ',color:"#111827",outline:"none",'
    'resize:"none",boxSizing:"border-box",display:"block"}}),'
    'e.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",'
    'padding:"2px 10px 6px"},children:['
    'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontFamily:' + FF + '},'
    'children:j.length+"/500"})'
    ']})'
    ']})'
    ']}),'
    # buttons
    'e.jsxs("div",{style:{display:"flex",gap:0,borderTop:"1px solid #f0f1f4"},children:['
    'e.jsxs("button",{onClick:function(){ye("Rejected");le("approvals");},style:{'
    'flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,'
    'padding:"15px 0",border:"none",'
    'borderRight:"1px solid #f0f1f4",background:"#fff",'
    'fontSize:13,fontWeight:700,color:"#dc2626",'
    'fontFamily:' + FF + ',cursor:"pointer"},children:['
    'e.jsx(mt,{size:15}),"Reject"'
    ']}),'
    'e.jsxs("button",{onClick:function(){ye("Approved!");le("approvals");},style:{'
    'flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,'
    'padding:"15px 0",border:"none",background:"#1a56db",'
    'fontSize:13,fontWeight:700,color:"#fff",'
    'fontFamily:' + FF + ',cursor:"pointer"},children:['
    'e.jsx(ps,{size:15}),"Approve"'
    ']})'
    ']})'
    ']})'
)

# ── ASSEMBLE ───────────────────────────────────────────────────────────────────
NEW_SCREEN = (
    'if(i.approvalKind==="shift-swap"){'
    'return e.jsxs("div",{className:"screen",'
    'style:{background:"#f3f4f6",display:"flex",flexDirection:"column"},children:['
    + HEADER + ','
    + TABS + ','
    'e.jsxs("div",{style:{flex:1,overflowY:"auto"},children:['
    + SHIFT_VISUAL + ','
    + DETAILS_CARD + ','
    + NOTE_BANNER + ','
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

# ── Syntax check ───────────────────────────────────────────────────────────────
STUBS = (
    'var e={jsx:function(){return null;},jsxs:function(){return null;}};'
    'var i={title:"Shift Swap — May 22",approvalKind:"shift-swap",parent:"Vaibhav Sharma",'
    'status:"Rejected",timeline:"May 22",start:"May 22",end:"May 22",'
    'submittedOn:"2026-05-14",reason:"Personal commitment",swapWith:"Vaibhav Sharma",'
    'myShiftName:"Morning",myShiftTime:"7:00 AM - 3:00 PM",'
    'swapShiftName:"Evening",swapShiftTime:"3:00 PM - 11:00 PM",'
    'submittedBy:"You",submittedTime:"10:30 AM"};'
    'var le=function(){};var ye=function(){};'
    'var ke={},qe={},eo={},so={},mt={},ps={};'
    'var j="";var m=function(){};'
)
test_code = STUBS + '(function(){' + NEW_SCREEN + '})();'
with tempfile.NamedTemporaryFile(suffix='.js', delete=False, mode='w') as f:
    f.write(test_code)
    tmpf = f.name
result = subprocess.run(['node', '--check', tmpf], capture_output=True, text=True)
os.unlink(tmpf)
if result.returncode != 0:
    print("SYNTAX ERROR:", result.stderr[:600])
    exit(1)
print("Syntax OK")

# ── Apply ──────────────────────────────────────────────────────────────────────
new_content = content[:OLD_START] + NEW_SCREEN + content[OLD_END:]
open('hrmobileapp.html', 'w').write(new_content)
print(f"Done. New size: {len(new_content)}")
