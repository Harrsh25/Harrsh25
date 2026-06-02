import subprocess, tempfile, os

content = open('hrmobileapp.html').read()

MARKER = 'function jm(){'
OLD_START = content.find(MARKER)
assert OLD_START != -1, "Could not find jm() function"

brace_start = content.find('{', OLD_START)
depth = 0
idx = brace_start
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
    raise AssertionError("Could not find end of jm()")

print(f"Boundaries OK: OLD_START={OLD_START} OLD_END={OLD_END} len={OLD_END-OLD_START}")

FF = '"Inter,sans-serif"'
BLUE = '#1a56db'

def isvg(w, h, vb, children_expr, extra=''):
    return (
        'e.jsx("svg",{width:' + str(w) + ',height:' + str(h)
        + ',viewBox:"' + vb + '",fill:"none",stroke:"currentColor"'
        + ',strokeWidth:1.5,strokeLinecap:"round",strokeLinejoin:"round"'
        + (',' + extra if extra else '')
        + ',children:' + children_expr + '})'
    )

# Rupee coin icon for cost display
RUPEE_COIN = isvg(13, 13, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("path",{d:"M6 9h12M6 12h12M12 12v6"})'
    ']})',
    'stroke:"#6b7280"'
)

# Suitcase illustration for promo banner
SUITCASE_SVG = (
    'e.jsx("svg",{width:90,height:80,viewBox:"0 0 90 80",fill:"none",'
    'style:{flexShrink:0},children:'
    'e.jsxs("g",{children:['
    # Suitcase body
    'e.jsx("rect",{x:8,y:22,width:50,height:40,rx:6,fill:"#3b82f6"}),'
    'e.jsx("rect",{x:18,y:16,width:30,height:10,rx:4,fill:"#2563eb"}),'
    # Handle
    'e.jsx("rect",{x:24,y:10,width:18,height:8,rx:4,fill:"none",stroke:"#2563eb",strokeWidth:2.5}),'
    # Suitcase center line
    'e.jsx("line",{x1:8,y1:42,x2:58,y2:42,stroke:"#2563eb",strokeWidth:2}),'
    # Wheels
    'e.jsx("circle",{cx:18,cy:63,r:4,fill:"#1d4ed8"}),'
    'e.jsx("circle",{cx:48,cy:63,r:4,fill:"#1d4ed8"}),'
    # Plane
    'e.jsx("path",{d:"M62 20 L78 12 L82 16 L70 26 L74 38 L68 36 L66 28 L58 32 L57 26 Z",'
    'fill:"#93c5fd",stroke:"#3b82f6",strokeWidth:1}),'
    # Checklist
    'e.jsx("rect",{x:68,y:44,width:18,height:22,rx:3,fill:"#fff",stroke:"#bfdbfe",strokeWidth:1.5}),'
    'e.jsx("line",{x1:72,y1:50,x2:82,y2:50,stroke:"#3b82f6",strokeWidth:1.5}),'
    'e.jsx("line",{x1:72,y1:55,x2:82,y2:55,stroke:"#3b82f6",strokeWidth:1.5}),'
    'e.jsx("line",{x1:72,y1:60,x2:78,y2:60,stroke:"#3b82f6",strokeWidth:1.5})'
    ']})'
    '})'
)

# Wallet icon for promo banner
WALLET_SVG = isvg(22, 22, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M21 12V7H5a2 2 0 0 1 0-4h14v4"}),'
    'e.jsx("path",{d:"M3 5v14a2 2 0 0 0 2 2h16v-5"}),'
    'e.jsx("path",{d:"M18 12a2 2 0 0 0 0 4h4v-4Z"})'
    ']})',
    'stroke:"' + BLUE + '"'
)

# ── Header ──────────────────────────────────────────────────────────────────────
HEADER = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:10,'
    'padding:"48px 16px 14px",borderBottom:"1px solid #e5e7eb",'
    'background:"#fff",flexShrink:0},children:['
    'e.jsx("button",{onClick:function(){le("dashboard");},style:{'
    'width:34,height:34,borderRadius:9,border:"1px solid #e5e7eb",'
    'background:"#fff",display:"flex",alignItems:"center",'
    'justifyContent:"center",cursor:"pointer",flexShrink:0,marginTop:2},'
    'children:e.jsx(ke,{size:17,color:"#374151"})}),'
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsx("h1",{style:{fontSize:20,fontWeight:800,color:"#111827",'
    'fontFamily:' + FF + ',margin:"0 0 2px"},children:"Travel & Expense"}),'
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + ',margin:0},'
    'children:"Manage your travel requests and expenses"})'
    ']}),'
    'e.jsxs("button",{onClick:function(){i==="travel"?Tr(!0):zr(!0);},style:{'
    'display:"flex",alignItems:"center",gap:6,'
    'padding:"9px 16px",borderRadius:10,'
    'background:"' + BLUE + '",color:"#fff",border:"none",'
    'fontSize:13,fontWeight:700,fontFamily:' + FF + ',cursor:"pointer",flexShrink:0},'
    'children:[e.jsx(Ve,{size:14}),"New Request"]})'
    ']})'
)

# ── Tabs ────────────────────────────────────────────────────────────────────────
TABS = (
    'e.jsxs("div",{style:{display:"flex",background:"#fff",'
    'borderBottom:"1px solid #e5e7eb",flexShrink:0},children:['
    '[{key:"travel",label:"Travel Requests",icon:e.jsx(Yi,{size:14})},'
    '{key:"expense",label:"Expense Claims",icon:e.jsx(Ba,{size:14})},'
    '{key:"approvals",label:"Approvals",icon:e.jsx(eo,{size:14})}]'
    '.map(function(t){return e.jsxs("button",{onClick:function(){I(t.key);},style:{'
    'flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,'
    'padding:"12px 4px",'
    'borderBottom:"2px solid "+(i===t.key?"' + BLUE + '":"transparent"),'
    'color:i===t.key?"' + BLUE + '":"#6b7280",'
    'fontSize:11,fontWeight:i===t.key?700:500,'
    'fontFamily:' + FF + ',background:"none",border:"none",'
    'borderBottom:"2px solid "+(i===t.key?"' + BLUE + '":"transparent"),'
    'cursor:"pointer"},children:[t.icon,t.label]},t.key);})'
    ']})'
)

# ── Overview card (4 stats) ─────────────────────────────────────────────────────
def stat_box(icon_expr, count, label, num_color, bg_color, border_color, icon_color):
    return (
        'e.jsxs("div",{style:{flex:1,borderRadius:10,border:"1px solid ' + border_color + '",'
        'background:"' + bg_color + '",padding:"12px 8px",'
        'display:"flex",flexDirection:"column",alignItems:"center",gap:6},children:['
        'e.jsx("div",{style:{width:32,height:32,borderRadius:"50%",'
        'background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",'
        'color:"' + icon_color + '"},children:' + icon_expr + '}),'
        'e.jsx("span",{style:{fontSize:22,fontWeight:800,color:"' + num_color + '",'
        'fontFamily:' + FF + ',lineHeight:1},children:' + str(count) + '}),'
        'e.jsx("span",{style:{fontSize:10,color:"#6b7280",fontFamily:' + FF + ','
        'textAlign:"center"},children:"' + label + '"})'
        ']})'
    )

OVERVIEW_CARD = (
    'e.jsxs("div",{style:{margin:"14px 14px 0",borderRadius:14,'
    'border:"1px solid #e5e7eb",background:"#fff",padding:"14px"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:14},children:['
    'e.jsx(Tu,{size:18,color:"' + BLUE + '"}),'
    'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827",'
    'fontFamily:' + FF + '},children:"Travel Requests Overview"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:8},children:['
    + stat_box('e.jsx(Ba,{size:16})', '_oo.length||12', 'Total Requests', '#1a56db', '#eff6ff', '#bfdbfe', '#1a56db') + ','
    + stat_box('e.jsx(Q1,{size:16})', '_oo.filter(function(t){return t.status==="pending";}).length||5', 'Pending', '#d97706', '#fffbeb', '#fde68a', '#d97706') + ','
    + stat_box('e.jsx(xt,{size:16})', '_oo.filter(function(t){return t.status==="approved";}).length||6', 'Approved', '#16a34a', '#f0fdf4', '#bbf7d0', '#16a34a') + ','
    + stat_box('e.jsx(so,{size:16})', '_oo.filter(function(t){return t.status==="rejected";}).length||1', 'Rejected', '#dc2626', '#fef2f2', '#fecaca', '#dc2626') +
    ']})'
    ']})'
)

# ── Travel request card ─────────────────────────────────────────────────────────
TRAVEL_CARDS_DATA = (
    '[{'
    'id:"td-1",destination:"Delhi",'
    'purpose:"Client meeting for Highway Bridge Project milestone review",'
    'dateRange:"30 Apr 2026 – 01 May 2026",'
    'cost:25000,status:"approved",'
    'requester:"Priya Singh",initials:"PS"'
    '},{'
    'id:"td-2",destination:"Bangalore",'
    'purpose:"Solar Farm site inspection and vendor meeting",'
    'dateRange:"15 May 2026 – 16 May 2026",'
    'cost:18000,status:"pending",'
    'requester:"Arjun Mehta",initials:"AM"'
    '}]'
)

TRAVEL_CARDS = (
    '(' + TRAVEL_CARDS_DATA + ').map(function(card){'
    'var isApproved=card.status==="approved";'
    'var isPending=card.status==="pending";'
    'var borderColor=isApproved?"#16a34a":isPending?"#f59e0b":"#ef4444";'
    'var iconBg=isApproved?"#dcfce7":isPending?"#fef3c7":"#fee2e2";'
    'var iconColor=isApproved?"#16a34a":isPending?"#d97706":"#ef4444";'
    'var chipBg=isApproved?"#dcfce7":isPending?"#fef3c7":"#fee2e2";'
    'var chipColor=isApproved?"#16a34a":isPending?"#d97706":"#ef4444";'
    'var chipLabel=isApproved?"Approved":isPending?"Pending":"Rejected";'
    'return e.jsxs("div",{style:{margin:"0 14px 10px",'
    'borderRadius:12,border:"1px solid #e5e7eb",'
    'background:"#fff",overflow:"hidden",'
    'borderLeft:"3px solid "+borderColor},children:['
    # Card header: icon + title + chip
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:12,'
    'padding:"14px 14px 10px"},children:['
    'e.jsx("div",{style:{width:48,height:48,borderRadius:12,'
    'background:iconBg,'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'flexShrink:0,color:iconColor},'
    'children:e.jsx(U1,{size:22})}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4},children:['
    'e.jsx("span",{style:{fontSize:16,fontWeight:800,color:"#111827",'
    'fontFamily:' + FF + '},children:card.destination}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:chipColor,'
    'background:chipBg,borderRadius:20,padding:"3px 10px",'
    'fontFamily:' + FF + '},children:chipLabel})'
    ']}),'
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + ',margin:0,'
    'lineHeight:"1.5"},children:card.purpose})'
    ']})'
    ']}),'
    # Date + cost row
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,'
    'padding:"8px 14px",borderTop:"1px solid #f3f4f6"},children:['
    'e.jsx(Ns,{size:13,style:{color:"#9ca3af",flexShrink:0}}),'
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + '},'
    'children:card.dateRange}),'
    'e.jsx("span",{style:{color:"#d1d5db",margin:"0 6px"},children:"|"}),'
    'e.jsx("span",{style:{display:"inline-flex",alignItems:"center",'
    'color:"#9ca3af",flexShrink:0},children:' + RUPEE_COIN + '}),'
    'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',marginLeft:3},'
    'children:"₹"+card.cost.toLocaleString("en-IN")})'
    ']}),'
    # Requester row
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,'
    'padding:"10px 14px",borderTop:"1px solid #f3f4f6"},children:['
    'e.jsx("div",{style:{width:30,height:30,borderRadius:"50%",'
    'background:"' + BLUE + '",display:"flex",alignItems:"center",'
    'justifyContent:"center",flexShrink:0},'
    'children:e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#fff",'
    'fontFamily:' + FF + '},children:card.initials})}),'
    'e.jsx("span",{style:{flex:1,fontSize:12,color:"#6b7280",'
    'fontFamily:' + FF + '},children:"Requested by "+card.requester}),'
    'e.jsx(Oe,{size:16,color:"#9ca3af"})'
    ']}) '
    ']},"card-"+card.id);'
    '})'
)

# ── Active Travel Requests section ─────────────────────────────────────────────
ACTIVE_SECTION = (
    'e.jsxs("div",{style:{padding:"16px 14px 8px"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",marginBottom:10},children:['
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsx("h2",{style:{fontSize:16,fontWeight:800,color:"#111827",'
    'fontFamily:' + FF + ',margin:"0 0 2px"},children:"Active Travel Requests"}),'
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + ',margin:0},'
    'children:"2 Requests"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:8},children:['
    'e.jsx("button",{style:{width:36,height:36,borderRadius:9,'
    'border:"1px solid #e5e7eb",background:"#fff",'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'cursor:"pointer"},'
    'children:e.jsx(al,{size:16,color:"#6b7280"})}),'
    'e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:5,'
    'padding:"8px 12px",borderRadius:9,'
    'border:"1px solid #e5e7eb",background:"#fff",'
    'fontSize:12,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',cursor:"pointer"},children:['
    'e.jsx(Vn,{size:13,color:"#6b7280"}),"Filters",'
    'e.jsx(qe,{size:12,color:"#6b7280"})'
    ']})'
    ']})'
    ']})'
    ']})'
)

# ── Promo banner ─────────────────────────────────────────────────────────────────
PROMO_BANNER = (
    'e.jsxs("div",{style:{margin:"4px 14px 14px",borderRadius:14,'
    'border:"1px solid #dbeafe",background:"#f0f7ff",'
    'padding:"14px",display:"flex",alignItems:"center",gap:12,overflow:"hidden"},children:['
    'e.jsx("div",{style:{width:44,height:44,borderRadius:12,'
    'background:"#dbeafe",display:"flex",alignItems:"center",'
    'justifyContent:"center",flexShrink:0},'
    'children:' + WALLET_SVG + '}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:14,fontWeight:800,color:"' + BLUE + '",'
    'fontFamily:' + FF + ',margin:"0 0 3px"},children:"Plan smart, travel smooth"}),'
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + ',margin:0,'
    'lineHeight:"1.5"},children:"Submit your requests early and track approvals in real-time."})'
    ']}),'
    + SUITCASE_SVG +
    ']})'
)

# ── TRAVEL TAB CONTENT ──────────────────────────────────────────────────────────
TRAVEL_TAB = (
    'e.jsxs(e.Fragment,{children:['
    + OVERVIEW_CARD + ','
    + ACTIVE_SECTION + ','
    + TRAVEL_CARDS + ','
    + PROMO_BANNER +
    ']})'
)

# ── EXPENSE CLAIMS TAB ──────────────────────────────────────────────────────────

# Inline SVGs for category icons
UTENSILS_IC = isvg(18, 18, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"}),'
    'e.jsx("path",{d:"M7 2v20"}),'
    'e.jsx("path",{d:"M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"})'
    ']})',
    'stroke:"#d97706"'
)

CAR_IC = isvg(18, 18, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3"}),'
    'e.jsx("circle",{cx:7,cy:17,r:2}),'
    'e.jsx("circle",{cx:17,cy:17,r:2}),'
    'e.jsx("path",{d:"M14 3v4a1 1 0 0 0 1 1h4"})'
    ']})',
    'stroke:"#7c3aed"'
)

PLANE_IC2 = isvg(18, 18, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"m22 2-7 20-4-9-9-4Z"}),'
    'e.jsx("path",{d:"M22 2 11 13"})'
    ']})',
    'stroke:"' + BLUE + '"'
)

HOTEL_IC = isvg(18, 18, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:4,y:2,width:16,height:20,rx:2}),'
    'e.jsx("path",{d:"M9 22v-4h6v4"}),'
    'e.jsx("path",{d:"M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M12 14h.01M8 14h.01M16 14h.01"})'
    ']})',
    'stroke:"#16a34a"'
)

CLIP_IC = isvg(12, 12, '0 0 24 24',
    'e.jsx("path",{d:"m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"})',
    'stroke:"' + BLUE + '"'
)

SORT_IC = isvg(13, 13, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M3 6h18M7 12h10M11 18h2"})'
    ']})',
    'stroke:"#374151"'
)

# Static expense claims data matching reference
EXP_CLAIMS_DATA = (
    '[{'
    'id:"ec-1",'
    'description:"Flight tickets Delhi-Mumbai return",'
    'category:"Travel",'
    'date:"2026-04-20",'
    'amount:12500,'
    'status:"approved",'
    'iconType:"plane",'
    'iconBg:"#eff6ff",iconColor:"' + BLUE + '"'
    '},{'
    'id:"ec-2",'
    'description:"Hotel stay for Delhi visit",'
    'category:"Accommodation",'
    'date:"2026-04-20",'
    'amount:5500,'
    'status:"approved",'
    'iconType:"hotel",'
    'iconBg:"#f0fdf4",iconColor:"#16a34a"'
    '},{'
    'id:"ec-3",'
    'description:"Client dinner meeting",'
    'category:"Meals",'
    'date:"2026-04-21",'
    'amount:2800,'
    'status:"under-review",'
    'iconType:"food",'
    'iconBg:"#fffbeb",iconColor:"#d97706"'
    '},{'
    'id:"ec-4",'
    'description:"Cab charges in Delhi",'
    'category:"Transport",'
    'date:"2026-04-21",'
    'amount:1500,'
    'status:"pending",'
    'iconType:"car",'
    'iconBg:"#f5f3ff",iconColor:"#7c3aed"'
    '}]'
)

# Stats card
EC_STATS = (
    'e.jsxs("div",{style:{margin:"14px 14px 0",borderRadius:14,'
    'border:"1px solid #e5e7eb",background:"#fff",padding:"14px 12px"},children:['
    'e.jsxs("div",{style:{display:"flex",gap:0},children:['
    # Total Claims
    'e.jsxs("div",{style:{flex:1,padding:"8px 10px",borderRight:"1px solid #f0f1f4"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
    'e.jsx("div",{style:{width:28,height:28,borderRadius:8,background:"#eff6ff",'
    'display:"flex",alignItems:"center",justifyContent:"center"},'
    'children:e.jsx(Ba,{size:14,color:"' + BLUE + '"})}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#6b7280",fontFamily:' + FF + '},'
    'children:"Total Claims"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:0},children:['
    'e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"' + BLUE + '",'
    'fontFamily:' + FF + '},children:"\\u20b9"}),'
    'e.jsx("span",{style:{fontSize:22,fontWeight:800,color:"' + BLUE + '",'
    'fontFamily:' + FF + ',lineHeight:1},children:"22,300"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:' + FF + ',margin:"4px 0 0"},'
    'children:"12 Claims"})'
    ']}),'
    # Approved
    'e.jsxs("div",{style:{flex:1,padding:"8px 10px",borderRight:"1px solid #f0f1f4"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
    'e.jsx("div",{style:{width:28,height:28,borderRadius:8,background:"#f0fdf4",'
    'display:"flex",alignItems:"center",justifyContent:"center"},'
    'children:e.jsx(xt,{size:14,color:"#16a34a"})}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#6b7280",fontFamily:' + FF + '},'
    'children:"Approved"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:0},children:['
    'e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#16a34a",'
    'fontFamily:' + FF + '},children:"\\u20b9"}),'
    'e.jsx("span",{style:{fontSize:22,fontWeight:800,color:"#16a34a",'
    'fontFamily:' + FF + ',lineHeight:1},children:"18,000"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:' + FF + ',margin:"4px 0 0"},'
    'children:"8 Claims"})'
    ']}),'
    # Pending
    'e.jsxs("div",{style:{flex:1,padding:"8px 10px"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
    'e.jsx("div",{style:{width:28,height:28,borderRadius:8,background:"#fffbeb",'
    'display:"flex",alignItems:"center",justifyContent:"center"},'
    'children:e.jsx(Q1,{size:14,color:"#d97706"})}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#6b7280",fontFamily:' + FF + '},'
    'children:"Pending"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:0},children:['
    'e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#d97706",'
    'fontFamily:' + FF + '},children:"\\u20b9"}),'
    'e.jsx("span",{style:{fontSize:22,fontWeight:800,color:"#d97706",'
    'fontFamily:' + FF + ',lineHeight:1},children:"4,300"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:' + FF + ',margin:"4px 0 0"},'
    'children:"4 Claims"})'
    ']}) '
    ']})'
    ']})'
)

# Search + Filter + Sort bar
EC_SEARCH_BAR = (
    'e.jsxs("div",{style:{display:"flex",gap:8,padding:"12px 14px 0"},children:['
    # Search input
    'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",gap:8,'
    'border:"1px solid #e5e7eb",borderRadius:10,padding:"9px 12px",'
    'background:"#fff"},children:['
    'e.jsx(al,{size:14,style:{color:"#9ca3af",flexShrink:0}}),'
    'e.jsx("input",{placeholder:"Search claims...",'
    'style:{border:"none",outline:"none",fontSize:13,color:"#374151",'
    'fontFamily:' + FF + ',background:"transparent",width:"100%",padding:0}})'
    ']}),'
    # Filter button
    'e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,'
    'padding:"9px 11px",borderRadius:10,'
    'border:"1px solid #e5e7eb",background:"#fff",'
    'fontSize:12,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',cursor:"pointer",flexShrink:0},children:['
    'e.jsx(Vn,{size:13,color:"#6b7280"}),"Filter",'
    'e.jsx(qe,{size:12,color:"#9ca3af"})'
    ']}),'
    # Recent (sort) button
    'e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,'
    'padding:"9px 11px",borderRadius:10,'
    'border:"1px solid #e5e7eb",background:"#fff",'
    'fontSize:12,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',cursor:"pointer",flexShrink:0},children:['
    'e.jsx("span",{style:{display:"inline-flex",color:"#6b7280"},children:' + SORT_IC + '}),'
    '"Recent",'
    'e.jsx(qe,{size:12,color:"#9ca3af"})'
    ']})'
    ']})'
)

# Expense claim cards
EC_CARDS = (
    'e.jsx("div",{style:{padding:"10px 14px 0"},children:'
    '(' + EXP_CLAIMS_DATA + ').map(function(k){'
    'var statusColor=k.status==="approved"?"#16a34a":'
    'k.status==="under-review"?"#d97706":'
    'k.status==="pending"?"#d97706":"#9ca3af";'
    'var statusBg=k.status==="approved"?"#dcfce7":'
    'k.status==="under-review"?"#fef3c7":'
    'k.status==="pending"?"#fef3c7":"#f3f4f6";'
    'var statusLabel=k.status==="approved"?"Approved":'
    'k.status==="under-review"?"Under Review":'
    'k.status==="pending"?"Pending":k.status;'
    'var catIcon=k.iconType==="plane"?' + PLANE_IC2 + ':'
    'k.iconType==="hotel"?' + HOTEL_IC + ':'
    'k.iconType==="food"?' + UTENSILS_IC + ':'
    + CAR_IC + ';'
    'var _d=k.date;'
    'var _dateStr=(function(){'
    'var p=_d.split("-");'
    'if(p.length<3)return _d;'
    'var mo=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];'
    'return parseInt(p[2],10)+" "+mo[parseInt(p[1],10)]+" "+p[0];})();'
    'return e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:12,'
    'background:"#fff",marginBottom:10,overflow:"hidden"},children:['
    # Top row: icon + description + amount/status
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:12,'
    'padding:"14px 14px 10px"},children:['
    'e.jsx("div",{style:{width:46,height:46,borderRadius:12,'
    'background:k.iconBg,'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'flexShrink:0,color:k.iconColor},'
    'children:catIcon}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",'
    'fontFamily:' + FF + ',margin:"0 0 3px"},'
    'children:k.description}),'
    'e.jsxs("p",{style:{fontSize:12,color:"#9ca3af",fontFamily:' + FF + ',margin:0},'
    'children:[k.category," \\u2022 ",_dateStr]})'
    ']}),'
    'e.jsxs("div",{style:{textAlign:"right",flexShrink:0,marginLeft:4},children:['
    'e.jsxs("p",{style:{fontSize:14,fontWeight:700,color:"#111827",'
    'fontFamily:' + FF + ',margin:"0 0 4px"},children:["\\u20b9",k.amount.toLocaleString("en-IN")]}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,'
    'color:statusColor,background:statusBg,'
    'borderRadius:20,padding:"3px 9px",fontFamily:' + FF + '},'
    'children:statusLabel})'
    ']})'
    ']}),'
    # Bottom row: receipt + awaiting + chevron
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,'
    'padding:"9px 14px",borderTop:"1px solid #f3f4f6"},children:['
    'e.jsx("span",{style:{display:"inline-flex",color:"' + BLUE + '"},'
    'children:' + CLIP_IC + '}),'
    'e.jsx("span",{style:{fontSize:12,fontWeight:500,color:"' + BLUE + '",'
    'fontFamily:' + FF + '},children:"Receipt attached"}),'
    'e.jsx("span",{style:{fontSize:12,color:"#9ca3af",fontFamily:' + FF + '},'
    'children:"\\u00a0\\u2022 Awaiting review"}),'
    'e.jsx("div",{style:{flex:1}}),'
    'e.jsx(Oe,{size:15,color:"#9ca3af"})'
    ']})'
    ']},k.id);'
    '})'
    '})'
)

# Promo banner for expense claims
EC_CHART_SVG = (
    'e.jsx("svg",{width:80,height:70,viewBox:"0 0 80 70",fill:"none",'
    'style:{flexShrink:0,opacity:0.9},children:'
    'e.jsxs("g",{children:['
    # Coin circle
    'e.jsx("circle",{cx:28,cy:35,r:22,fill:"#dbeafe",opacity:0.7}),'
    'e.jsx("circle",{cx:28,cy:35,r:16,fill:"#bfdbfe",opacity:0.5}),'
    # Up arrow on coin
    'e.jsx("path",{d:"M28 44 L28 26 M22 32 L28 26 L34 32",'
    'stroke:"' + BLUE + '",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"}),'
    # Chart bars
    'e.jsx("rect",{x:48,y:48,width:7,height:12,rx:2,fill:"' + BLUE + '",opacity:0.7}),'
    'e.jsx("rect",{x:58,y:36,width:7,height:24,rx:2,fill:"' + BLUE + '"}),'
    'e.jsx("rect",{x:68,y:28,width:7,height:32,rx:2,fill:"#60a5fa"}),'
    # Trend line
    'e.jsx("path",{d:"M51 46 L61 33 L71 26",'
    'stroke:"#16a34a",strokeWidth:1.5,strokeLinecap:"round",'
    'strokeDasharray:"2 2"}),'
    'e.jsx("circle",{cx:71,cy:26,r:3,fill:"#16a34a"})'
    ']})'
    '})'
)

EC_PROMO = (
    'e.jsxs("div",{style:{margin:"4px 14px 14px",borderRadius:14,'
    'border:"1px solid #dbeafe",background:"#f0f7ff",'
    'padding:"14px",display:"flex",alignItems:"center",gap:12,overflow:"hidden"},children:['
    'e.jsx("div",{style:{width:44,height:44,borderRadius:12,'
    'background:"#dbeafe",display:"flex",alignItems:"center",'
    'justifyContent:"center",flexShrink:0},'
    'children:e.jsx(Ba,{size:20,color:"' + BLUE + '"})}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:14,fontWeight:800,color:"#111827",'
    'fontFamily:' + FF + ',margin:"0 0 3px"},children:"Smart expense tracking"}),'
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + ',margin:0,'
    'lineHeight:"1.5"},children:"Keep all your receipts updated and track the status of your claims in real-time."})'
    ']}),'
    + EC_CHART_SVG +
    ']})'
)

EXPENSE_TAB = (
    'e.jsxs(e.Fragment,{children:['
    + EC_STATS + ','
    + EC_SEARCH_BAR + ','
    + EC_CARDS + ','
    + EC_PROMO +
    ']})'
)

# ── APPROVALS TAB ───────────────────────────────────────────────────────────────

# City destination SVG icons
BUILDING_GREEN = isvg(26, 26, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:3,y:3,width:18,height:18,rx:2}),'
    'e.jsx("path",{d:"M9 22V12h6v10"}),'
    'e.jsx("path",{d:"M3 9h18"}),'
    'e.jsx("rect",{x:7,y:5,width:2,height:2}),'
    'e.jsx("rect",{x:11,y:5,width:2,height:2}),'
    'e.jsx("rect",{x:15,y:5,width:2,height:2})'
    ']})',
    'stroke:"#16a34a"'
)

GATEWAY_ICON = isvg(26, 26, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M3 20h18M4 20V10M20 20V10M7 20V14h4v6M13 20V14h4v6M4 10Q8 5 12 5Q16 5 20 10"}),'
    'e.jsx("path",{d:"M8 10h8"}),'
    'e.jsx("circle",{cx:12,cy:8,r:1,fill:"currentColor"})'
    ']})',
    'stroke:"#d97706"'
)

ARCH_ICON = isvg(26, 26, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M3 20h18M5 20V12M19 20V12"}),'
    'e.jsx("path",{d:"M5 12Q5 6 12 6Q19 6 19 12"}),'
    'e.jsx("path",{d:"M8 20V15h8v5"}),'
    'e.jsx("path",{d:"M8 12h8"})'
    ']})',
    'stroke:"' + BLUE + '"'
)

LINK_IC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),'
    'e.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})'
    ']})',
    'stroke:"#fff"'
)

# Approval data matching reference
APPROVAL_DATA = (
    '[{'
    'id:"ta-001",destination:"Bangalore",'
    'dates:"2026-05-10 to 2026-05-15",'
    'departureDate:"2026-05-10",returnDate:"2026-05-15",'
    'status:"approved",'
    'policyCompliance:"Within policy",'
    'estimatedCost:25e3,'
    'bookingStatus:"booked",'
    'approvedBy:"Sarah Chen",'
    'approvedDate:"2026-05-08",'
    'initials:"SC",'
    'iconType:"building",'
    'borderColor:"#16a34a",'
    'iconBg:"#f0fdf4"'
    '},{'
    'id:"ta-002",destination:"Mumbai",'
    'dates:"2026-05-20 to 2026-05-23",'
    'departureDate:"2026-05-20",returnDate:"2026-05-23",'
    'status:"pending",'
    'policyCompliance:"Within policy",'
    'estimatedCost:18e3,'
    'bookingStatus:"not-booked",'
    'approvedBy:"Pending",'
    'approvedDate:"",'
    'initials:"AK",'
    'iconType:"gateway",'
    'borderColor:"#f59e0b",'
    'iconBg:"#fffbeb"'
    '},{'
    'id:"ta-003",destination:"Delhi",'
    'dates:"2026-05-08 to 2026-05-10",'
    'departureDate:"2026-05-08",returnDate:"2026-05-10",'
    'status:"approved",'
    'policyCompliance:"Requires Escalation",'
    'estimatedCost:32e3,'
    'bookingStatus:"pending",'
    'approvedBy:"Marcus Rivera",'
    'approvedDate:"2026-05-07",'
    'initials:"MR",'
    'iconType:"arch",'
    'borderColor:"' + BLUE + '",'
    'iconBg:"#eff6ff"'
    '}]'
)

def fmt_approval_date(field):
    return (
        '(function(){var _d='+field+';if(!_d)return"Pending Approval";'
        'var _p=_d.split("-");if(_p.length<3)return _d;'
        'var _mo=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];'
        'return _mo[parseInt(_p[1],10)]+" "+("0"+parseInt(_p[2],10)).slice(-2)+", "+_p[0];})()'
    )

# Each approval card
APPROVAL_CARDS = (
    '(' + APPROVAL_DATA + ').map(function(k){'
    'var isApproved=k.status==="approved";'
    'var isPending=k.status==="pending";'
    'var chipColor=isApproved?"#16a34a":"#d97706";'
    'var chipBg=isApproved?"#dcfce7":"#fef3c7";'
    'var chipLabel=isApproved?"Approved":"Pending";'
    'var chipIcon=isApproved?e.jsx(xt,{size:12}):e.jsx(Q1,{size:12});'
    'var compColor=k.policyCompliance==="Within policy"?"#16a34a":"#dc2626";'
    'var compBg=k.policyCompliance==="Within policy"?"#dcfce7":"#fee2e2";'
    'var destIcon=k.iconType==="building"?' + BUILDING_GREEN + ':'
    'k.iconType==="gateway"?' + GATEWAY_ICON + ':' + ARCH_ICON + ';'
    'return e.jsxs("div",{style:{margin:"0 14px 12px",'
    'borderRadius:14,border:"1px solid #e5e7eb",'
    'background:"#fff",overflow:"hidden",'
    'borderLeft:"3px solid "+k.borderColor},children:['

    # Card header: icon + destination + dates + status chip
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:12,'
    'padding:"14px 14px 12px"},children:['
    'e.jsx("div",{style:{width:50,height:50,borderRadius:"50%",'
    'background:k.iconBg,'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'flexShrink:0,color:k.borderColor},'
    'children:destIcon}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:17,fontWeight:800,color:"#111827",'
    'fontFamily:' + FF + ',margin:"0 0 4px"},children:k.destination}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + '},'
    'children:k.dates}),'
    'e.jsx(Ns,{size:12,style:{color:"#9ca3af"}})'
    ']})'
    ']}),'
    # Status chip
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,fontWeight:700,color:chipColor,'
    'background:chipBg,borderRadius:20,padding:"4px 10px",'
    'fontFamily:' + FF + ',flexShrink:0},'
    'children:[chipIcon,chipLabel]})'
    ']}),'

    # Policy compliance + Est. cost row
    'e.jsxs("div",{style:{margin:"0 14px 12px",borderRadius:10,'
    'background:"#f8fafc",border:"1px solid #f0f1f4",'
    'display:"flex",alignItems:"center"},children:['
    'e.jsxs("div",{style:{flex:1,padding:"10px 12px",borderRight:"1px solid #e5e7eb"},children:['
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:' + FF + ',margin:"0 0 5px"},'
    'children:"Policy Compliance"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:compColor,'
    'background:compBg,borderRadius:6,padding:"3px 8px",'
    'fontFamily:' + FF + '},children:k.policyCompliance})'
    ']}),'
    'e.jsxs("div",{style:{flex:1,padding:"10px 12px"},children:['
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",fontFamily:' + FF + ',margin:"0 0 5px"},'
    'children:"Est. Cost"}),'
    'e.jsxs("p",{style:{fontSize:14,fontWeight:700,color:"#111827",'
    'fontFamily:' + FF + ',margin:0},children:["\\u20b9",k.estimatedCost.toLocaleString("en-IN")]})'
    ']})'
    ']}),'

    # Booking linkage row
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'padding:"0 14px 12px"},children:['
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",'
    'fontFamily:' + FF + ',flex:1},children:"Booking Linkage"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,'
    'color:k.bookingStatus==="booked"?"' + BLUE + '":k.bookingStatus==="pending"?"#d97706":"#6b7280",'
    'background:k.bookingStatus==="booked"?"#eff6ff":k.bookingStatus==="pending"?"#fef3c7":"#f3f4f6",'
    'border:k.bookingStatus==="booked"?"1.5px solid #bfdbfe":"1.5px solid transparent",'
    'borderRadius:20,padding:"3px 10px",fontFamily:' + FF + '},'
    'children:k.bookingStatus==="booked"?"Booked":k.bookingStatus==="pending"?"Pending":"Not Booked"})'
    ']}),'

    # Link Booking button (only for not-booked)
    'k.bookingStatus==="not-booked"?e.jsxs("button",{style:{'
    'display:"flex",alignItems:"center",justifyContent:"center",gap:8,'
    'margin:"0 14px 12px",width:"calc(100% - 28px)",'
    'padding:"13px",background:"' + BLUE + '",color:"#fff",'
    'border:"none",borderRadius:10,fontSize:13,fontWeight:700,'
    'fontFamily:' + FF + ',cursor:"pointer"},children:['
    'e.jsx("span",{style:{display:"inline-flex"},children:' + LINK_IC + '}),'
    '"Link Booking"'
    ']}):null,'

    # Pending booking note
    'k.bookingStatus==="pending"?e.jsx("p",{style:{fontSize:12,color:"#d97706",'
    'fontFamily:' + FF + ',padding:"0 14px 10px",margin:0},'
    'children:"Waiting for booking confirmation"}):null,'

    # Approved by + date footer
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,'
    'padding:"10px 14px",borderTop:"1px solid #f3f4f6"},children:['
    'e.jsx("div",{style:{width:28,height:28,borderRadius:"50%",'
    'background:"#e5e7eb",display:"flex",alignItems:"center",'
    'justifyContent:"center",flexShrink:0},'
    'children:e.jsx("span",{style:{fontSize:10,fontWeight:700,'
    'color:"#6b7280",fontFamily:' + FF + '},children:k.initials})}),'
    'e.jsxs("span",{style:{fontSize:12,color:"#6b7280",'
    'fontFamily:' + FF + ',flex:1},children:["Approved by: ",'
    'e.jsx("span",{style:{fontWeight:700,color:"#111827"},children:k.approvedBy})]}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    'e.jsx(Ns,{size:12,style:{color:"#9ca3af"}}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:' + FF + '},'
    'children:' + fmt_approval_date('k.approvedDate') + '})'
    ']})'
    ']})'

    ']},k.id);'
    '})'
)

# Bottom stats bar
BOTTOM_STATS = (
    'e.jsxs("div",{style:{display:"flex",background:"#fff",'
    'borderTop:"1px solid #e5e7eb",padding:"12px 14px",'
    'flexShrink:0,gap:0},children:['
    '[{icon:e.jsx(Ku,{size:18,color:"#16a34a"}),iconBg:"#f0fdf4",'
    'count:"12",label:"Approved",labelColor:"#374151"},'
    '{icon:e.jsx(Q1,{size:18,color:"#d97706"}),iconBg:"#fffbeb",'
    'count:"5",label:"Pending",labelColor:"#374151"},'
    '{icon:e.jsx(L1,{size:18,color:"#dc2626"}),iconBg:"#fef2f2",'
    'count:"2",label:"Requires Action",labelColor:"#dc2626"},'
    '{icon:e.jsx(Ba,{size:18,color:"' + BLUE + '"}),iconBg:"#eff6ff",'
    'count:"19",label:"Total",labelColor:"#374151"}]'
    '.map(function(s,idx){'
    'return e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",'
    'alignItems:"center",gap:4,borderRight:idx<3?"1px solid #f0f1f4":"none"},children:['
    'e.jsx("div",{style:{width:36,height:36,borderRadius:10,'
    'background:s.iconBg,display:"flex",alignItems:"center",'
    'justifyContent:"center"},children:s.icon}),'
    'e.jsx("span",{style:{fontSize:16,fontWeight:800,color:"#111827",'
    'fontFamily:' + FF + ',lineHeight:1},children:s.count}),'
    'e.jsx("span",{style:{fontSize:10,color:s.labelColor,'
    'fontFamily:' + FF + ',textAlign:"center",fontWeight:s.labelColor==="' + BLUE + '"||s.labelColor==="#dc2626"?700:500},'
    'children:s.label})'
    ']},idx);'
    '})'
    ']})'
)

# Info banner
INFO_BANNER = (
    'e.jsxs("div",{style:{margin:"14px 14px 12px",borderRadius:14,'
    'border:"1px solid #fed7aa",background:"#fffbeb",'
    'padding:"14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"},children:['
    'e.jsx("div",{style:{width:40,height:40,borderRadius:10,'
    'background:"#ffedd5",display:"flex",alignItems:"center",'
    'justifyContent:"center",flexShrink:0},'
    'children:e.jsx(eo,{size:20,color:"#f59e0b"})}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#d97706",'
    'fontFamily:' + FF + ',margin:"0 0 3px"},'
    'children:"Travel Approval & Policy Compliance"}),'
    'e.jsx("p",{style:{fontSize:12,color:"#b45309",fontFamily:' + FF + ',margin:0},'
    'children:"Policy-based validation ensures compliance with travel guidelines."})'
    ']}),'
    'e.jsx(Oe,{size:16,color:"#f59e0b"})'
    ']})'
)

APPROVALS_TAB = (
    'e.jsxs(e.Fragment,{children:['
    + INFO_BANNER + ','
    + APPROVAL_CARDS + ','
    + BOTTOM_STATS +
    ']})'
)

# ── MODALS (preserved from existing) ────────────────────────────────────────────
# Keep the travel detail and expense detail modals
MODALS = (
    # Travel detail modal
    'Jx&&bs&&e.jsx("div",{style:{position:"fixed",inset:0,zIndex:600,'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'backgroundColor:"rgba(0,0,0,0.45)",padding:"20px"},'
    'onMouseDown:function(k){if(k.target===k.currentTarget)Ia(!1);},'
    'children:e.jsxs("div",{style:{width:"100%",maxWidth:440,'
    'background:"#fff",borderRadius:20,display:"flex",'
    'flexDirection:"column",maxHeight:"85vh",'
    'boxShadow:"0 8px 40px rgba(0,0,0,0.22)"},children:['
    'e.jsxs("div",{style:{padding:"20px 20px 8px",flexShrink:0},children:['
    'e.jsx("div",{style:{width:40,height:4,background:"#e5e7eb",'
    'borderRadius:4,margin:"0 auto 16px"}}),'
    'e.jsx("h2",{style:{fontSize:17,fontWeight:700,color:"#111827",'
    'fontFamily:' + FF + ',margin:0},children:bs.destination})'
    ']}),'
    'e.jsxs("div",{className:"no-scrollbar",style:{overflowY:"auto",padding:"0 20px 32px"},children:['
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'padding:"12px",marginBottom:12},children:['
    'e.jsx("p",{style:{fontSize:10,fontWeight:700,color:"#9ca3af",'
    'letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 8px"},children:"Travel Details"}),'
    '[["Purpose",bs.purpose],["Duration",re(bs.departureDate)+" - "+re(bs.returnDate)],'
    '["Estimated Cost",Se(bs.estimatedCost)],["Status",bs.status]]'
    '.map(function(row){return e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",'
    'padding:"6px 0",borderBottom:"1px solid #f3f4f6"},children:['
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + '},'
    'children:row[0]}),'
    'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#111827",'
    'fontFamily:' + FF + '},'
    'children:row[1]})'
    ']},row[0]);})'
    ']}),'
    'e.jsx("button",{onClick:function(){Ia(!1);},style:{'
    'width:"100%",padding:"13px",background:"#f3f4f6",color:"#374151",'
    'border:"none",borderRadius:10,fontSize:13,fontWeight:600,'
    'fontFamily:' + FF + ',cursor:"pointer"},children:"Close"})'
    ']})'
    ']})})'
    ','
    # Expense detail modal
    'tm&&Ds&&e.jsx("div",{style:{position:"fixed",inset:0,zIndex:600,'
    'display:"flex",alignItems:"flex-end",justifyContent:"center",'
    'backgroundColor:"rgba(0,0,0,0.4)"},'
    'onMouseDown:function(k){if(k.target===k.currentTarget)pi(!1);},'
    'children:e.jsxs("div",{style:{width:"100%",maxWidth:448,'
    'background:"#fff",borderRadius:"24px 24px 0 0",'
    'maxHeight:"80vh",display:"flex",flexDirection:"column"},children:['
    'e.jsxs("div",{style:{padding:"20px 20px 8px",flexShrink:0},children:['
    'e.jsx("div",{style:{width:40,height:4,background:"#e5e7eb",'
    'borderRadius:4,margin:"0 auto 16px"}}),'
    'e.jsx("h2",{style:{fontSize:17,fontWeight:700,color:"#111827",'
    'fontFamily:' + FF + ',margin:0},children:Ds.description})'
    ']}),'
    'e.jsxs("div",{className:"no-scrollbar",style:{overflowY:"auto",padding:"0 20px 32px"},children:['
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'padding:"12px",marginBottom:12},children:['
    'e.jsx("p",{style:{fontSize:10,fontWeight:700,color:"#9ca3af",'
    'letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 8px"},children:"Expense Details"}),'
    '[["Amount",Se(Ds.amount)],["Category",Ds.category],'
    '["Date",re(Ds.date)],["Status",Ds.status]]'
    '.map(function(row){return e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",'
    'padding:"6px 0",borderBottom:"1px solid #f3f4f6"},children:['
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + '},'
    'children:row[0]}),'
    'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#111827",'
    'fontFamily:' + FF + '},'
    'children:row[1]})'
    ']},row[0]);})'
    ']}),'
    'e.jsx("button",{onClick:function(){pi(!1);},style:{'
    'width:"100%",padding:"13px",background:"#f3f4f6",color:"#374151",'
    'border:"none",borderRadius:10,fontSize:13,fontWeight:600,'
    'fontFamily:' + FF + ',cursor:"pointer"},children:"Close"})'
    ']})'
    ']})})'
)

# ── ASSEMBLE FULL FUNCTION ──────────────────────────────────────────────────────
NEW_FUNC = (
    'function jm(){'
    'const _ll=ll.concat(window._expenseClaims||[]);'
    'const _oo=oo.concat(window._travelReqs||[]);'
    'const[i,I]=b.useState("travel");'
    'const f=_ll.reduce(function(k,E){return k+E.amount;},0);'
    'const j=_ll.filter(function(k){return k.status==="approved";}).reduce(function(k,E){return k+E.amount;},0);'
    'const m=_ll.filter(function(k){return k.status==="pending"||k.status==="under-review";}).reduce(function(k,E){return k+E.amount;},0);'
    'const[p,x]=b.useState([{id:"ta-001",requesterName:"You",destination:"Bangalore",'
    'dates:"2026-05-10 to 2026-05-15",departureDate:"2026-05-10",returnDate:"2026-05-15",'
    'purpose:"Client meeting",estimatedCost:25e3,status:"approved",'
    'approvedBy:"Sarah Chen",policyCompliance:"Within policy",bookingStatus:"booked"},'
    '{id:"ta-002",requesterName:"Raj Kumar",destination:"Mumbai",'
    'dates:"2026-05-20 to 2026-05-23",departureDate:"2026-05-20",returnDate:"2026-05-23",'
    'purpose:"Training",estimatedCost:18e3,status:"pending",'
    'approvedBy:"Pending",policyCompliance:"Within policy",bookingStatus:"not-booked"},'
    '{id:"ta-003",requesterName:"Priya Singh",destination:"Delhi",'
    'dates:"2026-05-08 to 2026-05-10",departureDate:"2026-05-08",returnDate:"2026-05-10",'
    'purpose:"Conference",estimatedCost:32e3,status:"approved",'
    'approvedBy:"Marcus Rivera",policyCompliance:"Requires escalation",bookingStatus:"pending"}]);'
    'const[h,v]=b.useState([{id:"erm-001",description:"Hotel accommodation - Bangalore",'
    'amount:8e3,policyLimit:1e4,reimbursable:8e3,status:"approved",category:"Accommodation",'
    'date:"2026-05-10",policyCategory:"Accommodation"},'
    '{id:"erm-002",description:"Flight ticket - Mumbai",'
    'amount:12e3,policyLimit:15e3,reimbursable:12e3,status:"approved",category:"Transportation",'
    'date:"2026-05-20",policyCategory:"Transportation"},'
    '{id:"erm-003",description:"Meal expenses",'
    'amount:2500,policyLimit:2e3,reimbursable:2e3,status:"partial",category:"Meals",'
    'date:"2026-05-12",note:"Exceeded policy limit by 500",policyCategory:"Meals"},'
    '{id:"erm-004",description:"Local transport",'
    'amount:1200,policyLimit:1500,reimbursable:1200,status:"approved",category:"Local Transport",'
    'date:"2026-05-14",policyCategory:"Local Transport"}]);'
    'return e.jsxs("div",{className:"screen",'
    'style:{background:"#f3f4f6",display:"flex",flexDirection:"column"},children:['
    + HEADER + ','
    + TABS + ','
    'e.jsx("div",{className:"no-scrollbar",style:{flex:1,overflowY:"auto"},children:'
    'i==="travel"?' + TRAVEL_TAB +
    ':i==="expense"?' + EXPENSE_TAB +
    ':' + APPROVALS_TAB +
    '}),'
    + MODALS +
    ']})'
    '}'
)

print("NEW length:", len(NEW_FUNC))
opens = NEW_FUNC.count('{') + NEW_FUNC.count('(') + NEW_FUNC.count('[')
closes = NEW_FUNC.count('}') + NEW_FUNC.count(')') + NEW_FUNC.count(']')
print(f"opens={opens} closes={closes} delta={opens-closes}")

# Syntax check
STUBS = (
    'var e={jsx:function(){return null;},jsxs:function(){return null;},'
    'Fragment:"fragment"};'
    'var b={useState:function(v){return[v,function(){}];}};'
    'var ke={},qe={},Ve={},Ba={},Wu={},Au={},fg={};'
    'var Q1={},xt={},so={},Tu={},_1={},Oe={},Vn={},Yi={},eo={};'
    'var U1={},Ns={},al={},_n={},Zu={},L1={},Ku={},Qu={};'
    'var ll=[{amount:8000,status:"approved"},{amount:12000,status:"approved"},'
    '{amount:2500,status:"partial"},{amount:1200,status:"approved"}];'
    'var oo=[{status:"approved"},{status:"pending"},{status:"approved"},'
    '{status:"rejected"},{status:"approved"},{status:"pending"}];'
    'var le=function(){},le=function(){};'
    'var Tr=function(){},zr=function(){},Ia=function(){},pi=function(){};'
    'var Jx=false,Bx=false,tm=false,em=false;'
    'var bs=null,Ds=null,sm=function(){},Yx=function(){},Er=function(){};'
    'var Se=function(v){return "₹"+v;};'
    'var re=function(v){return v||"—";};'
    'var N=function(){return "";};'
    'var Je=function(){return "";};'
    'var G1={};'
)
test_code = STUBS + NEW_FUNC
with tempfile.NamedTemporaryFile(suffix='.js', delete=False, mode='w') as f:
    f.write(test_code)
    tmpf = f.name
result = subprocess.run(['node', '--check', tmpf], capture_output=True, text=True)
os.unlink(tmpf)
if result.returncode != 0:
    print("SYNTAX ERROR:", result.stderr[:800])
    exit(1)
print("Syntax OK")

new_content = content[:OLD_START] + NEW_FUNC + content[OLD_END:]
open('hrmobileapp.html', 'w').write(new_content)
print(f"Done. Size: {len(new_content)}")
