import subprocess, tempfile, os

content = open('hrmobileapp.html').read()

TRAVEL_MARKER = 'if(i.approvalKind==="travel")'
OLD_START = content.find(TRAVEL_MARKER)
assert OLD_START != -1, "Could not find travel approval section"

# Find the opening brace of the if-block and scan to matching close
brace_pos = content.find('{', OLD_START + len(TRAVEL_MARKER))
depth = 0
idx = brace_pos
while idx < len(content):
    c = content[idx]
    if c == '{':
        depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0:
            OLD_END = idx + 1
            break
    idx += 1
else:
    raise AssertionError("Could not find end of travel if-block")

print(f"Boundaries OK: OLD_START={OLD_START} OLD_END={OLD_END} block_len={OLD_END-OLD_START}")

FF = '"Inter,sans-serif"'
ORANGE = '#ea580c'
ORANGE_BG = '#fff7ed'
ORANGE_BORDER = '#fed7aa'

def isvg(w, h, vb, ch, extra=''):
    return (
        'e.jsx("svg",{width:'+str(w)+',height:'+str(h)+',viewBox:"'+vb+'",'
        'fill:"none",stroke:"currentColor",strokeWidth:1.5,'
        'strokeLinecap:"round",strokeLinejoin:"round"'
        +(','+extra if extra else '')+
        ',children:'+ch+'})'
    )

CAL_IC = isvg(13,13,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2}),'
    'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
    'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
    'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
    ']})'
)

PLANE_IC = isvg(14,14,'0 0 24 24',   # plane take-off
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4s-2 1-3.5 2.5L11 10 2.8 8.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 15l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"})'
    ']})'
)

PLANE_LAND = isvg(14,14,'0 0 24 24',  # plane landing
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M2.5 19h19v2h-19zm7.18-1.73 4.35 1.16 5.31 1.42c.8.21 1.62-.26 1.84-1.06.21-.8-.26-1.62-1.06-1.84l-5.31-1.42-2.76-9.77L10 7v8l-4.5-1.5v-3L4 10l-1.5 4L9.68 17.27z"})'
    ']})',
    'stroke:"#16a34a"'
)

SUITCASE_IC = isvg(14,14,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:1,y:7,width:22,height:14,rx:2,ry:2}),'
    'e.jsx("path",{d:"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"}),'
    'e.jsx("line",{x1:12,y1:12,x2:12,y2:16})'
    ']})',
    'stroke:"#7c3aed"'
)

COIN_IC = isvg(14,14,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"}),'
    'e.jsx("line",{x1:12,y1:6,x2:12,y2:8}),'
    'e.jsx("line",{x1:12,y1:16,x2:12,y2:18})'
    ']})',
    'stroke:"#d97706"'
)

USER_IC = isvg(14,14,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),'
    'e.jsx("circle",{cx:12,cy:7,r:4})'
    ']})'
)

CALCLOCK_IC = isvg(14,14,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"}),'
    'e.jsx("path",{d:"M16 2v4"}),'
    'e.jsx("path",{d:"M8 2v4"}),'
    'e.jsx("path",{d:"M3 10h5"}),'
    'e.jsx("circle",{cx:18,cy:18,r:4}),'
    'e.jsx("path",{d:"M18 16v2l1 1"})'
    ']})',
    'stroke:"#e11d48"'
)

MAP_PIN = isvg(13,13,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"}),'
    'e.jsx("circle",{cx:12,cy:10,r:3})'
    ']})',
    'stroke:"#6b7280"'
)

FILE_IC = isvg(14,14,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
    'e.jsx("polyline",{points:"14 2 14 8 20 8"}),'
    'e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),'
    'e.jsx("line",{x1:16,y1:17,x2:8,y2:17})'
    ']})'
)

CLOCK_SM = isvg(14,14,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
    ']})'
)

CHECKCIRCLE = isvg(16,16,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}),'
    'e.jsx("polyline",{points:"22 4 12 14.01 9 11.01"})'
    ']})',
    'stroke:"#d1d5db"'
)

# ── Gateway of India illustration SVG ─────────────────────────────────────────
GATEWAY_SVG = (
    'e.jsx("svg",{width:140,height:120,viewBox:"0 0 140 120",fill:"none",'
    'style:{flexShrink:0,opacity:0.92},children:'
    'e.jsxs("g",{children:['
    # sky / clouds
    'e.jsx("ellipse",{cx:95,cy:20,rx:22,ry:8,fill:"#fef3c7",opacity:0.8}),'
    'e.jsx("ellipse",{cx:115,cy:16,rx:16,ry:6,fill:"#fde68a",opacity:0.7}),'
    # ground base
    'e.jsx("rect",{x:10,y:108,width:120,height:4,rx:2,fill:"#fed7aa"}),'
    # main arch structure
    'e.jsx("rect",{x:30,y:55,width:80,height:55,fill:"#fde68a",stroke:"#f59e0b",strokeWidth:1}),'
    # main arch opening
    'e.jsx("path",{d:"M55 110 L55 80 Q70 65 85 80 L85 110 Z",fill:"#fed7aa"}),'
    # main arch detail
    'e.jsx("path",{d:"M55 80 Q70 65 85 80",fill:"none",stroke:"#f59e0b",strokeWidth:1.5}),'
    # side arches
    'e.jsx("path",{d:"M33 110 L33 90 Q40 83 47 90 L47 110",fill:"#fde68a",stroke:"#f59e0b",strokeWidth:1}),'
    'e.jsx("path",{d:"M93 110 L93 90 Q100 83 107 90 L107 110",fill:"#fde68a",stroke:"#f59e0b",strokeWidth:1}),'
    # pillars
    'e.jsx("rect",{x:30,y:55,width:10,height:55,fill:"#fbbf24"}),'
    'e.jsx("rect",{x:100,y:55,width:10,height:55,fill:"#fbbf24"}),'
    # upper structure
    'e.jsx("rect",{x:35,y:38,width:70,height:18,fill:"#fde68a",stroke:"#f59e0b",strokeWidth:1}),'
    # dome / top
    'e.jsx("ellipse",{cx:70,cy:36,rx:18,ry:8,fill:"#fbbf24",stroke:"#f59e0b",strokeWidth:1}),'
    'e.jsx("path",{d:"M52 36 L52 18 Q70 8 88 18 L88 36",fill:"#fde68a",stroke:"#f59e0b",strokeWidth:1.5}),'
    # top finial
    'e.jsx("line",{x1:70,y1:8,x2:70,y2:3,stroke:"#f59e0b",strokeWidth:1.5}),'
    'e.jsx("circle",{cx:70,cy:2,r:2,fill:"#f59e0b"}),'
    # turrets
    'e.jsx("rect",{x:46,y:28,width:8,height:12,fill:"#fbbf24",stroke:"#f59e0b",strokeWidth:1}),'
    'e.jsx("rect",{x:86,y:28,width:8,height:12,fill:"#fbbf24",stroke:"#f59e0b",strokeWidth:1}),'
    'e.jsx("ellipse",{cx:50,cy:28,rx:4,ry:3,fill:"#fbbf24"}),'
    'e.jsx("ellipse",{cx:90,cy:28,rx:4,ry:3,fill:"#fbbf24"}),'
    # side towers
    'e.jsx("rect",{x:20,y:42,width:12,height:68,fill:"#fde68a",stroke:"#f59e0b",strokeWidth:1}),'
    'e.jsx("rect",{x:108,y:42,width:12,height:68,fill:"#fde68a",stroke:"#f59e0b",strokeWidth:1}),'
    'e.jsx("ellipse",{cx:26,cy:42,rx:6,ry:4,fill:"#fbbf24"}),'
    'e.jsx("ellipse",{cx:114,cy:42,rx:6,ry:4,fill:"#fbbf24"}),'
    # windows
    'e.jsx("rect",{x:37,y:62,width:6,height:8,rx:3,fill:"#f59e0b",opacity:0.6}),'
    'e.jsx("rect",{x:97,y:62,width:6,height:8,rx:3,fill:"#f59e0b",opacity:0.6}),'
    # birds
    'e.jsx("path",{d:"M10 18 Q13 15 16 18",fill:"none",stroke:"#9ca3af",strokeWidth:1}),'
    'e.jsx("path",{d:"M20 12 Q23 9 26 12",fill:"none",stroke:"#9ca3af",strokeWidth:1})'
    ']})'
    '})'
)

# ── Status chip ────────────────────────────────────────────────────────────────
STATUS_CHIP = (
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,fontWeight:700,'
    'color:i.status==="Approved!"||i.status==="Approved"?"#059669":i.status==="Rejected"?"#dc2626":"#d97706",'
    'background:i.status==="Approved!"||i.status==="Approved"?"#ecfdf5":i.status==="Rejected"?"#fef2f2":"#fffbeb",'
    'borderRadius:20,padding:"5px 12px",'
    'border:i.status==="Approved!"||i.status==="Approved"?"1px solid #a7f3d0":i.status==="Rejected"?"1px solid #fecaca":"1px solid #fed7aa",'
    'fontFamily:'+FF+',flexShrink:0},children:['
    + CLOCK_SM + ',"\\u00a0"+(i.status||"Pending")'
    ']})'
)

# ── HEADER ─────────────────────────────────────────────────────────────────────
HEADER = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:8,'
    'padding:"48px 16px 14px",background:"#fff",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsx("button",{onClick:()=>le("approvals"),style:{width:36,height:36,borderRadius:10,'
    'border:"1px solid #e5e7eb",background:"#fff",display:"flex",alignItems:"center",'
    'justifyContent:"center",cursor:"pointer",flexShrink:0,marginTop:2},'
    'children:e.jsx(ke,{size:18,color:"#374151"})}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("h1",{style:{fontSize:19,fontWeight:800,color:"#111827",fontFamily:'+FF+',margin:"0 0 3px",'
    'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:i.title}),'
    'e.jsx("p",{style:{fontSize:13,color:"#6b7280",fontFamily:'+FF+',margin:0},children:i.parent||"—"})'
    ']}),'
    + STATUS_CHIP + ','
    'e.jsx("button",{style:{background:"none",border:"none",cursor:"pointer",'
    'padding:"4px 0 0 4px",flexShrink:0,color:"#374151"},'
    'children:e.jsx(lg,{size:18})})'
    ']})'
)

# ── TABS ───────────────────────────────────────────────────────────────────────
PLANE_TAB = isvg(14,14,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"m22 2-7 20-4-9-9-4Z"}),'
    'e.jsx("path",{d:"M22 2 11 13"})'
    ']})',
    'stroke:"#ea580c"'
)

TABS = (
    'e.jsxs("div",{style:{display:"flex",background:"#fff",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,'
    'padding:"10px 16px",borderBottom:"2px solid #ea580c",'
    'color:"#ea580c",fontSize:12,fontWeight:600,fontFamily:'+FF+',cursor:"pointer"},children:['
    + PLANE_TAB + ',"Travel Request"'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,'
    'padding:"10px 16px",borderBottom:"2px solid transparent",'
    'color:"#6b7280",fontSize:12,fontWeight:500,fontFamily:'+FF+',cursor:"pointer"},children:['
    + CAL_IC + ','
    'i.timeline||((i.start||"")+" – "+(i.end||""))'
    ']})'
    ']})'
)

# ── DESTINATION CARD ───────────────────────────────────────────────────────────
DEST_CARD = (
    'e.jsxs("div",{style:{margin:"14px 14px 0",borderRadius:16,'
    'background:"linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)",'
    'border:"1px solid #fed7aa",padding:"16px 14px",'
    'display:"flex",alignItems:"center",gap:8,overflow:"hidden"},children:['
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:9,fontWeight:800,color:"#ea580c",fontFamily:'+FF+','
    'letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 6px"},'
    'children:"DESTINATION"}),'
    'e.jsx("p",{style:{fontSize:20,fontWeight:800,color:"#111827",fontFamily:'+FF+','
    'margin:"0 0 3px",lineHeight:"1.2"},children:i.destination||i.title}),'
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:'+FF+',margin:"0 0 8px"},'
    'children:i.purpose||"Business Trip"}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5},children:['
    'e.jsx("div",{style:{color:"#6b7280"},children:'+MAP_PIN+'}),'
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:'+FF+'},'
    'children:i.location||"Mumbai, Maharashtra, India"})'
    ']})'
    ']}),'
    + GATEWAY_SVG +
    ']})'
)

# ── TRAVEL DETAILS CARD ────────────────────────────────────────────────────────
def icon_sq(icon_expr, bg, color, sz=32):
    return (
        'e.jsx("div",{style:{width:'+str(sz)+',height:'+str(sz)+',borderRadius:8,'
        'background:"'+bg+'",'
        'display:"flex",alignItems:"center",justifyContent:"center",'
        'color:"'+color+'",flexShrink:0},children:'+icon_expr+'})'
    )

def travel_row(icon_expr, label, val_primary, val_secondary='', is_last=False):
    val_block = (
        'e.jsxs("div",{style:{textAlign:"right"},children:['
        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:'+FF+',margin:0},'
        'children:'+val_primary+'}),'
        +('e.jsx("p",{style:{fontSize:11,color:"#9ca3af",fontFamily:'+FF+',margin:"1px 0 0"},'
        'children:'+val_secondary+'})' if val_secondary else '')
        +('e.jsx("span",{style:{display:"none"}})' if not val_secondary else '')
        + ']}'
        ')'
    )
    return (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,'
        'padding:"12px 0"'
        +('' if is_last else ',borderBottom:"1px solid #f3f4f6"')+
        '},children:['
        + icon_expr + ','
        'e.jsx("span",{style:{fontSize:13,color:"#6b7280",fontFamily:'+FF+',flex:1},'
        'children:"'+label+'"}),'
        + val_block +
        ']})'
    )

def fmt_date(field, fallback):
    return (
        '(function(){var d='+field+'||"'+fallback+'";'
        'var m=d.match(/(\\d{4})-(\\d{2})-(\\d{2})/);'
        'if(m){var mo=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];'
        'return mo[parseInt(m[2],10)]+" "+parseInt(m[3],10)+", "+m[1];}'
        'return d;})()'
    )

DETAILS_CARD = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:14,border:"1px solid #e5e7eb",'
    'background:"#fff",padding:"0 14px"},children:['
    + travel_row(
        icon_sq(PLANE_IC,'#eff6ff','#3b82f6'),
        'Departure',
        fmt_date('i.departureDate', 'Jun 2, 2026'),
        'i.departureTime||"09:45 AM"'
    ) + ','
    + travel_row(
        icon_sq(PLANE_LAND,'#f0fdf4','#16a34a'),
        'Return',
        fmt_date('i.returnDate', 'Jun 4, 2026'),
        'i.returnTime||"07:30 PM"'
    ) + ','
    + travel_row(
        icon_sq(SUITCASE_IC,'#f5f3ff','#7c3aed'),
        'Mode of Travel',
        'i.travelMode||"Air"',
        ''
    ) + ','
    # Estimated cost with chevron
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,'
    'padding:"12px 0",borderBottom:"1px solid #f3f4f6"},children:['
    + icon_sq(COIN_IC,'#fffbeb','#d97706') + ','
    'e.jsx("span",{style:{fontSize:13,color:"#6b7280",fontFamily:'+FF+',flex:1},'
    'children:"Estimated Cost"}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:3,cursor:"pointer"},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:'+FF+'},'
    'children:i.estimatedCost||"\\u20b922,500"}),'
    'e.jsx(qe,{size:13,style:{color:"#6b7280",transform:"rotate(-90deg)"}})'
    ']})'
    ']}),'
    + travel_row(
        icon_sq(USER_IC,'#eff6ff','#3b82f6'),
        'Submitted By',
        'i.parent||"—"',
        'i.parentRole||"Sales Manager"'
    ) + ','
    # Submitted On
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,'
    'padding:"12px 0"},children:['
    + icon_sq(CALCLOCK_IC,'#fff1f2','#e11d48') + ','
    'e.jsx("span",{style:{fontSize:13,color:"#6b7280",fontFamily:'+FF+',flex:1},'
    'children:"Submitted On"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:'+FF+',textAlign:"right"},'
    'children:'+fmt_date('i.submittedOn','May 20, 2026')+'+(" \\u2022 ")+(i.submittedTime||"11:30 AM")})'
    ']})'
    ']})'
)

# ── APPROVAL TIMELINE ──────────────────────────────────────────────────────────
TIMELINE = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:14,border:"1px solid #e5e7eb",'
    'background:"#fff",padding:"20px 14px"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start"},children:['
    # Step 1: Requested
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",flex:1},children:['
    'e.jsx("div",{style:{width:40,height:40,borderRadius:"50%",'
    'background:"#fff7ed",border:"2px solid #f97316",'
    'display:"flex",alignItems:"center",justifyContent:"center",color:"#ea580c"},'
    'children:' + FILE_IC + '}),'
    'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#111827",fontFamily:'+FF+',margin:"8px 0 2px",textAlign:"center"},'
    'children:"Requested"}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",fontFamily:'+FF+',margin:0,textAlign:"center",lineHeight:"14px"},'
    'children:'+fmt_date('i.submittedOn','May 20, 2026')+'}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",fontFamily:'+FF+',margin:0,textAlign:"center"},'
    'children:i.submittedTime||"11:30 AM"})'
    ']}),'
    # Connector 1 (dashed)
    'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",paddingTop:20},children:['
    'e.jsx("div",{style:{flex:1,height:2,'
    'backgroundImage:"repeating-linear-gradient(to right,#f97316 0,#f97316 4px,transparent 4px,transparent 8px)"}})'
    ']}),'
    # Step 2: Pending Approval (active)
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",flex:1},children:['
    'e.jsx("div",{style:{width:40,height:40,borderRadius:"50%",'
    'background:"#fffbeb",border:"2px solid #f97316",'
    'display:"flex",alignItems:"center",justifyContent:"center",color:"#d97706"},'
    'children:' + CLOCK_SM + '}),'
    'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#d97706",fontFamily:'+FF+',margin:"8px 0 2px",textAlign:"center"},'
    'children:"Pending Approval"}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",fontFamily:'+FF+',margin:0,textAlign:"center",lineHeight:"14px"},'
    'children:"Currently with"}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",fontFamily:'+FF+',margin:0,textAlign:"center"},'
    'children:"Manager"})'
    ']}),'
    # Connector 2 (solid gray)
    'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",paddingTop:20},children:['
    'e.jsx("div",{style:{flex:1,height:2,background:"#e5e7eb"}})'
    ']}),'
    # Step 3: Approved (inactive)
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",flex:1},children:['
    'e.jsx("div",{style:{width:40,height:40,borderRadius:"50%",'
    'background:"#f9fafb",border:"2px solid #d1d5db",'
    'display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af"},'
    'children:' + CHECKCIRCLE + '}),'
    'e.jsx("p",{style:{fontSize:11,fontWeight:600,color:"#9ca3af",fontFamily:'+FF+',margin:"8px 0 2px",textAlign:"center"},'
    'children:"Approved"}),'
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:'+FF+',margin:0,textAlign:"center"},'
    'children:"Pending"})'
    ']})'
    ']})'
    ']})'
)

# ── APPROVAL DECISION CARD ─────────────────────────────────────────────────────
DECISION = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:14,border:"1px solid #e5e7eb",'
    'background:"#fff",overflow:"hidden"},children:['
    'e.jsxs("div",{style:{padding:"14px 14px 0"},children:['
    'e.jsx("p",{style:{fontSize:15,fontWeight:700,color:"#111827",fontFamily:'+FF+',margin:"0 0 10px"},'
    'children:"Approval Decision"}),'
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"},children:['
    'e.jsx("textarea",{placeholder:"Add a remark (optional)",rows:4,value:j,'
    'onChange:function(ev){m(ev.target.value.slice(0,500));},style:{'
    'width:"100%",padding:"12px",border:"none",fontSize:13,'
    'fontFamily:'+FF+',color:"#111827",outline:"none",'
    'resize:"none",boxSizing:"border-box",display:"block"}}),'
    'e.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",'
    'padding:"2px 10px 6px",background:"#f9fafb",borderTop:"1px solid #f3f4f6"},children:['
    'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontFamily:'+FF+'},'
    'children:j.length+"/500"})'
    ']})'
    ']})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:0,borderTop:"1px solid #e5e7eb",marginTop:12},children:['
    'e.jsxs("button",{onClick:function(){ye("Rejected");le("approvals");},style:{'
    'flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,'
    'padding:"15px 0",border:"none",'
    'borderRight:"1px solid #e5e7eb",background:"#fff",'
    'fontSize:13,fontWeight:700,color:"#dc2626",'
    'fontFamily:'+FF+',cursor:"pointer"},children:['
    'e.jsx(mt,{size:15}),"Reject"'
    ']}),'
    'e.jsxs("button",{onClick:function(){ye("Approved!");le("approvals");},style:{'
    'flex:2,display:"flex",alignItems:"center",justifyContent:"center",gap:6,'
    'padding:"15px 0",border:"none",background:"#1a56db",'
    'fontSize:13,fontWeight:700,color:"#fff",'
    'fontFamily:'+FF+',cursor:"pointer"},children:['
    'e.jsx(ps,{size:15}),"Approve"'
    ']})'
    ']})'
    ']})'
)

# ── ASSEMBLE ───────────────────────────────────────────────────────────────────
NEW_SCREEN = (
    'if(i.approvalKind==="travel"){'
    'return e.jsxs("div",{className:"screen",'
    'style:{background:"#f3f4f6",display:"flex",flexDirection:"column"},children:['
    + HEADER + ','
    + TABS + ','
    'e.jsxs("div",{style:{flex:1,overflowY:"auto"},children:['
    + DEST_CARD + ','
    + DETAILS_CARD + ','
    + TIMELINE + ','
    + DECISION + ','
    'e.jsx("div",{style:{height:24}})'
    ']})'
    ']})'
    ';}'
)

print("NEW length:", len(NEW_SCREEN))
opens = NEW_SCREEN.count('{') + NEW_SCREEN.count('(') + NEW_SCREEN.count('[')
closes = NEW_SCREEN.count('}') + NEW_SCREEN.count(')') + NEW_SCREEN.count(']')
print(f"opens={opens} closes={closes} delta={opens-closes}")

STUBS = (
    'var e={jsx:function(){return null;},jsxs:function(){return null;}};'
    'var i={title:"Mumbai Business Trip",approvalKind:"travel",parent:"Harsh Dayal",'
    'status:"Pending",timeline:"Jun 2 - Jun 4",start:"Jun 2",end:"Jun 4",'
    'submittedOn:"2026-05-20",travelMode:"Air",estimatedCost:"\\u20b922,500",'
    'destination:"Mumbai Business Trip",purpose:"Business Trip",'
    'location:"Mumbai, Maharashtra, India",departureDate:"2026-06-02",'
    'returnDate:"2026-06-04",departureTime:"09:45 AM",returnTime:"07:30 PM",'
    'submittedTime:"11:30 AM",parentRole:"Sales Manager"};'
    'var le=function(){};var ye=function(){};'
    'var ke={},qe={},lg={},eo={},so={},mt={},ps={};'
    'var j="";var m=function(){};'
)
test_code = STUBS + '(function(){' + NEW_SCREEN + '})();'
with tempfile.NamedTemporaryFile(suffix='.js', delete=False, mode='w') as f:
    f.write(test_code); tmpf = f.name
result = subprocess.run(['node','--check',tmpf], capture_output=True, text=True)
os.unlink(tmpf)
if result.returncode != 0:
    print("SYNTAX ERROR:", result.stderr[:600])
    exit(1)
print("Syntax OK")

new_content = content[:OLD_START] + NEW_SCREEN + content[OLD_END:]
open('hrmobileapp.html','w').write(new_content)
print(f"Done. Size: {len(new_content)}")
