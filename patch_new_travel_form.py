import subprocess, tempfile, os

content = open('hrmobileapp.html').read()

# Find the New Travel form block dynamically
MARKER = 'Lx&&e.jsx("div",{style:{position:"fixed",top:0,bottom:60'
OLD_START = content.find(MARKER)
assert OLD_START != -1, "Could not find New Travel form block"

# Find OLD_END by scanning the e.jsx(...) call's outer parens
paren_start = content.find('(', OLD_START + len('Lx&&e.jsx'))
depth = 0
idx = paren_start
while idx < len(content):
    c = content[idx]
    if c == '(':
        depth += 1
    elif c == ')':
        depth -= 1
        if depth == 0:
            OLD_END = idx + 1
            break
    idx += 1
else:
    raise AssertionError("Could not find end of New Travel form block")

print(f"Boundaries OK: OLD_START={OLD_START} OLD_END={OLD_END} len={OLD_END-OLD_START}")

FF = '"Inter,sans-serif"'
BLUE = '#1a56db'

# ── Inline SVG helpers ──────────────────────────────────────────────────────────
def isvg(w, h, vb, children_expr, extra=''):
    return (
        'e.jsx("svg",{width:' + str(w) + ',height:' + str(h) + ',viewBox:"' + vb + '",'
        'fill:"none",stroke:"currentColor",strokeWidth:1.5,'
        'strokeLinecap:"round",strokeLinejoin:"round"'
        + (',' + extra if extra else '') +
        ',children:' + children_expr + '})'
    )

# Plane icon (for External button)
PLANE_IC = isvg(14, 14, '0 0 24 24',
    'e.jsx("path",{d:"m22 2-7 20-4-9-9-4Z"})',
    'stroke:"#6b7280"'
)
PLANE_IC_BLUE = isvg(14, 14, '0 0 24 24',
    'e.jsx("path",{d:"m22 2-7 20-4-9-9-4Z"})',
    'stroke:"' + BLUE + '"'
)

# Person icon (for My Self button)
PERSON_IC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),'
    'e.jsx("circle",{cx:12,cy:7,r:4})'
    ']})',
    'stroke:"#6b7280"'
)
PERSON_IC_BLUE = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),'
    'e.jsx("circle",{cx:12,cy:7,r:4})'
    ']})',
    'stroke:"' + BLUE + '"'
)

# Person icon for employee field (larger, colored)
PERSON_FIELD_IC = isvg(18, 18, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),'
    'e.jsx("circle",{cx:12,cy:7,r:4})'
    ']})',
    'stroke:"' + BLUE + '"'
)

# Message/chat icon
MSG_IC = isvg(18, 18, '0 0 24 24',
    'e.jsx("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"})',
    'stroke:"#8b5cf6"'
)

# Internal circle icon (for Internal toggle)
INTERNAL_IC = isvg(12, 12, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("circle",{cx:12,cy:12,r:3})'
    ']})',
    'stroke:"#6b7280"'
)
INTERNAL_IC_BLUE = isvg(12, 12, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:12,cy:12,r:10}),'
    'e.jsx("circle",{cx:12,cy:12,r:3})'
    ']})',
    'stroke:"' + BLUE + '"'
)

# Floppy-disk / save icon
SAVE_IC = isvg(18, 18, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"}),'
    'e.jsx("polyline",{points:"17 21 17 13 7 13 7 21"}),'
    'e.jsx("polyline",{points:"7 3 7 8 15 8"})'
    ']})',
    'stroke:"#fff"'
)

# ── Toggle-button row helper ────────────────────────────────────────────────────
def toggle_btn(label, value, state_var, set_var, icon_active, icon_inactive):
    sel = state_var + '==="' + value + '"'
    return (
        'e.jsxs("button",{onClick:function(){' + set_var + '("' + value + '");},style:{'
        'display:"flex",alignItems:"center",gap:5,'
        'padding:"7px 12px",borderRadius:8,'
        'border:"1.5px solid "+(' + sel + '?"' + BLUE + '":"#e5e7eb"),'
        'background:' + sel + '?"#eff6ff":"#f9fafb",'
        'color:' + sel + '?"' + BLUE + '":"#6b7280",'
        'fontSize:12,fontWeight:600,fontFamily:' + FF + ',cursor:"pointer",flex:1},children:['
        + ('e.jsx("span",{style:{color:' + sel + '?"' + BLUE + '":"#6b7280"},children:' + icon_active + '})' if icon_active == icon_inactive else
           '(' + sel + '?' + 'e.jsx("span",{style:{color:"' + BLUE + '"},children:' + icon_active + '})' + ':e.jsx("span",{style:{color:"#6b7280"},children:' + icon_inactive + '}))') +
        ',"' + label + '"'
        ']})'
    )

# ── Icon-field card (label + value + chevron) ───────────────────────────────────
def icon_field(bg_color, icon_expr, label, value_expr, required=False, right_btn=''):
    req_star = ('+e.jsx("span",{style:{color:"#ef4444"},children:" *"})' if required else '')
    return (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,'
        'border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 12px",'
        'background:"#fff",marginBottom:10},children:['
        'e.jsx("div",{style:{width:36,height:36,borderRadius:9,'
        'background:"' + bg_color + '",'
        'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:' + icon_expr + '}),'
        'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
        'e.jsxs("p",{style:{fontSize:10,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ','
        'letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 2px"},children:["' + label + '"' + req_star + ']}),'
        'e.jsx("p",{style:{fontSize:13,fontWeight:600,color:"#111827",fontFamily:' + FF + ',margin:0,'
        'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:' + value_expr + '})'
        ']}),'
        + (right_btn + ',') +
        'e.jsx(qe,{size:16,style:{color:"#9ca3af",flexShrink:0}})'
        ']})'
    )

# ── Compact contact field ───────────────────────────────────────────────────────
def contact_field(bg, icon_expr, label, value_var, set_var, required=False):
    req_star = ('+e.jsx("span",{style:{color:"#ef4444"},children:" *"})' if required else '')
    return (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,'
        'border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 10px",'
        'background:"#fff",flex:1},children:['
        'e.jsx("div",{style:{width:30,height:30,borderRadius:8,'
        'background:"' + bg + '",'
        'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:' + icon_expr + '}),'
        'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
        'e.jsxs("p",{style:{fontSize:9,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ','
        'letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 2px"},children:["' + label + '"' + req_star + ']}),'
        'e.jsx("input",{type:"tel",value:' + value_var + ',onChange:function(ev){' + set_var + '(ev.target.value);},'
        'style:{border:"none",padding:0,fontSize:12,fontWeight:600,color:"#111827",'
        'fontFamily:' + FF + ',outline:"none",width:"100%",background:"transparent"},'
        'placeholder:"—"})'
        ']})'
        ']})'
    )

# ── Dropdown field ───────────────────────────────────────────────────────────────
def dropdown_field(label, value_var, set_var, options, full_width=True):
    opts = ','.join(
        'e.jsx("option",{value:"' + o + '",children:"' + o + '"})' for o in options
    )
    return (
        'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
        'padding:"10px 12px",position:"relative",background:"#fff"'
        + (',flex:1' if not full_width else '') +
        '},children:['
        'e.jsxs("p",{style:{fontSize:10,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ','
        'letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 2px"},children:["' + label + '",'
        'e.jsx("span",{style:{color:"#ef4444"},children:" *"})]}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
        'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827",fontFamily:' + FF + '},'
        'children:' + value_var + '}),'
        'e.jsx(qe,{size:16,style:{color:"#9ca3af"}})'
        ']}),'
        'e.jsx("select",{value:' + value_var + ',onChange:function(ev){' + set_var + '(ev.target.value);},'
        'style:{position:"absolute",inset:0,opacity:0,width:"100%",cursor:"pointer"},'
        'children:[' + opts + ']})'
        ']})'
    )

STATES = ['Andhra Pradesh','Delhi','Gujarat','Karnataka','Kerala',
          'Madhya Pradesh','Maharashtra','Punjab','Rajasthan',
          'Tamil Nadu','Telangana','Uttar Pradesh','West Bengal']
SRC_CITIES = ['Lucknow','Varanasi','Kanpur','Agra','Prayagraj','Mumbai','Delhi','Bengaluru']
DST_CITIES = ['Varanasi','Lucknow','Kanpur','Agra','Mumbai','Delhi','Bengaluru']
OFFICES = ['Lucknow Office','Varanasi Office','Mumbai Office','Delhi Office','Bengaluru Office']

# ── Date field ──────────────────────────────────────────────────────────────────
def date_field(label, value_var, set_var):
    def fmt(v):
        return (
            '(function(){var _d='+v+';if(!_d)return"Select Date";'
            'var _p=_d.split("-");if(_p.length<3)return _d;'
            'var _mo=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];'
            'return parseInt(_p[2],10)+" "+_mo[parseInt(_p[1],10)]+" "+_p[0];})()'
        )
    return (
        'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
        'padding:"10px 12px",position:"relative",background:"#fff",flex:1},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:2},children:['
        'e.jsx(Au,{size:12,style:{color:"#9ca3af"}}),'
        'e.jsxs("p",{style:{fontSize:10,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ','
        'letterSpacing:"0.08em",textTransform:"uppercase",margin:0},children:["' + label + '",'
        'e.jsx("span",{style:{color:"#ef4444"},children:" *"})]})'
        ']}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
        'e.jsx("span",{style:{fontSize:13,fontWeight:600,'
        'color:' + value_var + '?"#111827":"#9ca3af",fontFamily:' + FF + '},'
        'children:' + fmt(value_var) + '}),'
        'e.jsx(Au,{size:14,style:{color:"#9ca3af"}})'
        ']}),'
        'e.jsx("input",{type:"date",value:' + value_var + ','
        'onChange:function(ev){' + set_var + '(ev.target.value);},'
        'style:{position:"absolute",inset:0,opacity:0,width:"100%",cursor:"pointer"}})'
        ']})'
    )

# ── Source / Destination section ────────────────────────────────────────────────
def src_dst_section(label, type_var, set_type, state_var, set_state, city_var, set_city, office_var, set_office, cities):
    return (
        'e.jsxs("div",{style:{marginBottom:16},children:['
        # Section header row
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:10},children:['
        'e.jsx(Vu,{size:14,style:{color:"#111827"}}),'
        'e.jsx("span",{style:{fontSize:12,fontWeight:800,color:"#111827",fontFamily:' + FF + ','
        'letterSpacing:"0.06em",textTransform:"uppercase",flex:1},children:"' + label + '"}),'
        # Internal button
        'e.jsxs("button",{onClick:function(){' + set_type + '("internal");},style:{'
        'display:"flex",alignItems:"center",gap:4,'
        'padding:"5px 10px",borderRadius:20,'
        'border:"1.5px solid "+(' + type_var + '==="internal"?"' + BLUE + '":"#e5e7eb"),'
        'background:' + type_var + '==="internal"?"#eff6ff":"#f9fafb",'
        'color:' + type_var + '==="internal"?"' + BLUE + '":"#6b7280",'
        'fontSize:11,fontWeight:600,fontFamily:' + FF + ',cursor:"pointer"},children:['
        'e.jsx("span",{style:{color:' + type_var + '==="internal"?"' + BLUE + '":"#6b7280"},'
        'children:' + INTERNAL_IC_BLUE + '}),"Internal"'
        ']}),'
        # External button
        'e.jsxs("button",{onClick:function(){' + set_type + '("external");},style:{'
        'display:"flex",alignItems:"center",gap:4,'
        'padding:"5px 10px",borderRadius:20,'
        'border:"1.5px solid "+(' + type_var + '==="external"?"' + BLUE + '":"#e5e7eb"),'
        'background:' + type_var + '==="external"?"#eff6ff":"#f9fafb",'
        'color:' + type_var + '==="external"?"' + BLUE + '":"#6b7280",'
        'fontSize:11,fontWeight:600,fontFamily:' + FF + ',cursor:"pointer"},children:['
        'e.jsx(eg,{size:12}),"External"'
        ']})'
        ']}),'
        # State dropdown
        + dropdown_field('State', state_var, set_state, STATES) + ','
        # City + Office row
        'e.jsxs("div",{style:{display:"flex",gap:8,marginTop:8},children:['
        + dropdown_field('City', city_var, set_city, cities, full_width=False) + ','
        + dropdown_field('Office', office_var, set_office, OFFICES, full_width=False) +
        ']})'
        ']})'
    )

# ── HEADER ──────────────────────────────────────────────────────────────────────
HEADER = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,'
    'padding:"48px 14px 12px",borderBottom:"1px solid #e5e7eb",flexShrink:0,'
    'background:"#fff"},children:['
    'e.jsx("button",{onClick:function(){Tr(!1);},style:{'
    'width:34,height:34,borderRadius:9,border:"1px solid #e5e7eb",'
    'background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",'
    'cursor:"pointer",flexShrink:0},'
    'children:e.jsx(ke,{size:17,color:"#374151"})}),'
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#111827",fontFamily:' + FF + ',margin:"0 0 1px"},'
    'children:"New Travel"}),'
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:' + FF + ',margin:0},'
    'children:"Submit your travel request"})'
    ']}),'
    'e.jsx("button",{style:{width:34,height:34,borderRadius:9,'
    'border:"1.5px solid ' + BLUE + '",'
    'background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",'
    'cursor:"pointer",flexShrink:0},'
    'children:e.jsx(Ba,{size:16,color:"' + BLUE + '"})})'
    ']})'
)

# ── FORM BODY ──────────────────────────────────────────────────────────────────
# Row 1: TYPE OF TRAVEL + ON BEHALF OF
TYPE_ROW = (
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12},children:['
    # Left: TYPE OF TRAVEL
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 10px",background:"#fff"},children:['
    'e.jsx("p",{style:{fontSize:9,fontWeight:800,color:"#9ca3af",fontFamily:' + FF + ','
    'letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 8px"},children:"TYPE OF TRAVEL"}),'
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:6},children:['
    # In House button
    'e.jsxs("button",{onClick:function(){_setTrvType("inhouse");},style:{'
    'display:"flex",alignItems:"center",gap:5,padding:"6px 8px",borderRadius:7,'
    'border:"1.5px solid "+(_trvType==="inhouse"?"' + BLUE + '":"#e5e7eb"),'
    'background:_trvType==="inhouse"?"#eff6ff":"#f9fafb",'
    'color:_trvType==="inhouse"?"' + BLUE + '":"#6b7280",'
    'fontSize:11,fontWeight:600,fontFamily:' + FF + ',cursor:"pointer",width:"100%"},children:['
    'e.jsx(U1,{size:12,style:{color:_trvType==="inhouse"?"' + BLUE + '":"#9ca3af"}}),"In House"'
    ']}),'
    # External button
    'e.jsxs("button",{onClick:function(){_setTrvType("external");},style:{'
    'display:"flex",alignItems:"center",gap:5,padding:"6px 8px",borderRadius:7,'
    'border:"1.5px solid "+(_trvType==="external"?"' + BLUE + '":"#e5e7eb"),'
    'background:_trvType==="external"?"#eff6ff":"#f9fafb",'
    'color:_trvType==="external"?"' + BLUE + '":"#6b7280",'
    'fontSize:11,fontWeight:600,fontFamily:' + FF + ',cursor:"pointer",width:"100%"},children:['
    'e.jsx("span",{style:{display:"inline-flex",alignItems:"center",'
    'color:_trvType==="external"?"' + BLUE + '":"#9ca3af"},'
    'children:' + PLANE_IC + '}),"External"'
    ']})'
    ']})'
    ']}),'
    # Right: ON BEHALF OF
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 10px",background:"#fff"},children:['
    'e.jsx("p",{style:{fontSize:9,fontWeight:800,color:"#9ca3af",fontFamily:' + FF + ','
    'letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 8px"},children:"ON BEHALF OF"}),'
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:6},children:['
    # My Self button
    'e.jsxs("button",{onClick:function(){_setTrvBehalf("self");},style:{'
    'display:"flex",alignItems:"center",gap:5,padding:"6px 8px",borderRadius:7,'
    'border:"1.5px solid "+(_trvBehalf==="self"?"' + BLUE + '":"#e5e7eb"),'
    'background:_trvBehalf==="self"?"#eff6ff":"#f9fafb",'
    'color:_trvBehalf==="self"?"' + BLUE + '":"#6b7280",'
    'fontSize:11,fontWeight:600,fontFamily:' + FF + ',cursor:"pointer",width:"100%"},children:['
    'e.jsx("span",{style:{display:"inline-flex",color:_trvBehalf==="self"?"' + BLUE + '":"#9ca3af"},'
    'children:' + PERSON_IC + '}),"My Self"'
    ']}),'
    # Other button
    'e.jsxs("button",{onClick:function(){_setTrvBehalf("other");},style:{'
    'display:"flex",alignItems:"center",gap:5,padding:"6px 8px",borderRadius:7,'
    'border:"1.5px solid "+(_trvBehalf==="other"?"' + BLUE + '":"#e5e7eb"),'
    'background:_trvBehalf==="other"?"#eff6ff":"#f9fafb",'
    'color:_trvBehalf==="other"?"' + BLUE + '":"#6b7280",'
    'fontSize:11,fontWeight:600,fontFamily:' + FF + ',cursor:"pointer",width:"100%"},children:['
    'e.jsx(fg,{size:12,style:{color:_trvBehalf==="other"?"' + BLUE + '":"#9ca3af"}}),"Other"'
    ']})'
    ']})'
    ']})'
    ']})'
)

# Employee Name field
EMP_FIELD = icon_field(
    '#eff6ff',
    'e.jsx("span",{style:{display:"inline-flex",color:"' + BLUE + '"},children:' + PERSON_FIELD_IC + '})',
    'Employee Name',
    '_trvEmp||"Harsh Singh (EMP00123)"'
)

# Purpose of Travel field (with + button)
PLUS_BTN = (
    'e.jsx("button",{style:{width:34,height:34,borderRadius:8,'
    'border:"1.5px solid ' + BLUE + '",background:"#fff",'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'cursor:"pointer",flexShrink:0},'
    'children:e.jsx(Ve,{size:16,color:"' + BLUE + '"})})'
)
PURPOSE_TRAVEL_FIELD = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:10},children:['
    'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",gap:10,'
    'border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 12px",background:"#fff"},children:['
    'e.jsx("div",{style:{width:36,height:36,borderRadius:9,background:"#f5f3ff",'
    'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    'children:e.jsx(Ba,{size:16,color:"#8b5cf6"})}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsxs("p",{style:{fontSize:10,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ','
    'letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 2px"},children:['
    '"PURPOSE OF TRAVEL",e.jsx("span",{style:{color:"#ef4444"},children:" *"})]}),'
    'e.jsx("input",{value:_trvProject,onChange:function(ev){_setTrvProject(ev.target.value);},'
    'placeholder:"Attend Project Discussion",'
    'style:{border:"none",padding:0,fontSize:13,fontWeight:600,color:"#111827",'
    'fontFamily:' + FF + ',outline:"none",width:"100%",background:"transparent"}})'
    ']})'
    ']}),'
    + PLUS_BTN +
    ']})'
)

# Contact + Emergency Contact row
CONTACT_ROW = (
    'e.jsxs("div",{style:{display:"flex",gap:8,marginBottom:10},children:['
    + contact_field('#ecfdf5', 'e.jsx(qu,{size:14,color:"#16a34a"})', 'Contact Number', '_trvContact', '_setTrvContact', required=True) + ','
    + contact_field('#eff6ff', 'e.jsx(eo,{size:14,color:"' + BLUE + '"})', 'Emergency Contact', '_trvEmg', '_setTrvEmg') +
    ']})'
)

# Purpose (if any) textarea
PURPOSE_TEXTAREA = (
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'padding:"10px 12px",background:"#fff",marginBottom:14},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6},children:['
    'e.jsx("div",{style:{width:28,height:28,borderRadius:7,background:"#faf5ff",'
    'display:"flex",alignItems:"center",justifyContent:"center"},'
    'children:' + MSG_IC + '}),'
    'e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#9ca3af",fontFamily:' + FF + ','
    'letterSpacing:"0.08em",textTransform:"uppercase"},children:"PURPOSE (IF ANY)"})'
    ']}),'
    'e.jsx("textarea",{value:_trvPurpose,onChange:function(ev){_setTrvPurpose(ev.target.value.slice(0,250));},rows:3,'
    'placeholder:"Enter purpose of travel...",'
    'style:{border:"none",padding:0,fontSize:13,color:"#374151",fontFamily:' + FF + ','
    'outline:"none",width:"100%",resize:"none",background:"transparent",display:"block"}}),'
    'e.jsx("div",{style:{textAlign:"right",fontSize:10,color:"#9ca3af",fontFamily:' + FF + ',marginTop:4},'
    'children:(_trvPurpose||"").length+"/250"})'
    ']})'
)

# ── SOURCE section ──────────────────────────────────────────────────────────────
SOURCE = src_dst_section(
    'SOURCE',
    '_trvSrcType', '_setTrvSrcType',
    '_trvSrcState', '_setTrvSrcState',
    '_trvSrcCity', '_setTrvSrcCity',
    '_trvSrcOffice', '_setTrvSrcOffice',
    SRC_CITIES
)

# ── DESTINATION section ─────────────────────────────────────────────────────────
DESTINATION = src_dst_section(
    'DESTINATION',
    '_trvDstType', '_setTrvDstType',
    '_trvDstState', '_setTrvDstState',
    '_trvDstCity', '_setTrvDstCity',
    '_trvDstOffice', '_setTrvDstOffice',
    DST_CITIES
)

# ── Dates ───────────────────────────────────────────────────────────────────────
DATE_ROW = (
    'e.jsxs("div",{style:{display:"flex",gap:8,marginBottom:14},children:['
    + date_field('Departure Date', '_trvDepDate', '_setTrvDepDate') + ','
    + date_field('Return Date', '_trvRetDate', '_setTrvRetDate') +
    ']})'
)

# ── Advance checkbox ────────────────────────────────────────────────────────────
ADVANCE_CHECK = (
    'e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:10,'
    'marginBottom:16,cursor:"pointer"},children:['
    'e.jsx("input",{type:"checkbox",checked:_trvAdvance,'
    'onChange:function(ev){_setTrvAdvance(ev.target.checked);},'
    'style:{width:18,height:18,accentColor:"' + BLUE + '",cursor:"pointer"}}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:500,color:"#374151",fontFamily:' + FF + '},'
    'children:"Do You Need Advance"})'
    ']})'
)

# ── Special Requirements ────────────────────────────────────────────────────────
SPECIAL_REQ = (
    'e.jsxs("div",{style:{background:"#f0f4ff",borderRadius:10,overflow:"hidden",marginBottom:16},children:['
    'e.jsx("div",{style:{background:"' + BLUE + '",padding:"9px 16px",'
    'clipPath:"polygon(0 0,100% 0,92% 100%,0 100%)"},'
    'children:e.jsx("span",{style:{fontSize:12,fontWeight:800,color:"#fff",fontFamily:' + FF + ','
    'letterSpacing:"0.08em",textTransform:"uppercase"},children:"SPECIAL REQUIREMENTS"})}),'
    'e.jsxs("div",{style:{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8},children:['
    'e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:10,cursor:"pointer"},children:['
    'e.jsx("input",{type:"checkbox",checked:_trvBooking,'
    'onChange:function(ev){_setTrvBooking(ev.target.checked);},'
    'style:{width:16,height:16,accentColor:"' + BLUE + '",cursor:"pointer",flexShrink:0}}),'
    'e.jsx("div",{style:{flex:1,background:"#fff",borderRadius:8,padding:"9px 12px",'
    'fontSize:12,color:"#374151",fontFamily:' + FF + ',fontWeight:500},'
    'children:"Do You Need Booking For Your Travel?"})'
    ']}),'
    'e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:10,cursor:"pointer"},children:['
    'e.jsx("input",{type:"checkbox",checked:_trvHotel,'
    'onChange:function(ev){_setTrvHotel(ev.target.checked);},'
    'style:{width:16,height:16,accentColor:"' + BLUE + '",cursor:"pointer",flexShrink:0}}),'
    'e.jsx("div",{style:{flex:1,background:"#fff",borderRadius:8,padding:"9px 12px",'
    'fontSize:12,color:"#374151",fontFamily:' + FF + ',fontWeight:500},'
    'children:"Hotel Accommodation?"})'
    ']})'
    ']})'
    ']})'
)

# ── Action buttons ──────────────────────────────────────────────────────────────
BOTTOM_BTNS = (
    'e.jsxs("div",{style:{display:"flex",gap:10,marginBottom:14},children:['
    'e.jsxs("button",{onClick:function(){'
    '_setTrvType("inhouse");_setTrvBehalf("self");'
    '_setTrvProject("");_setTrvContact("");_setTrvEmg("");'
    '_setTrvPurpose("");_setTrvSrcState("Uttar Pradesh");_setTrvSrcCity("Lucknow");_setTrvSrcOffice("Lucknow Office");'
    '_setTrvDstState("Uttar Pradesh");_setTrvDstCity("Varanasi");_setTrvDstOffice("Varanasi Office");'
    '_setTrvDepDate("");_setTrvRetDate("");_setTrvAdvance(!1);_setTrvBooking(!1);_setTrvHotel(!1);'
    '},style:{width:60,height:60,background:"#f59e0b",borderRadius:12,border:"none",'
    'display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",'
    'gap:2,cursor:"pointer"},children:['
    'e.jsx(pg,{size:18,color:"#fff"}),'
    'e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#fff",fontFamily:' + FF + '},'
    'children:"Clear"})'
    ']}),'
    'e.jsxs("button",{style:{width:60,height:60,background:"#38bdf8",borderRadius:12,border:"none",'
    'display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",'
    'gap:2,cursor:"pointer"},children:['
    'e.jsx("span",{style:{display:"inline-flex"},children:' + SAVE_IC + '}),'
    'e.jsx("span",{style:{fontSize:10,fontWeight:700,color:"#fff",fontFamily:' + FF + '},'
    'children:"Save Draft"})'
    ']})'
    ']})'
)

SUBMIT_BTN = (
    'e.jsx("button",{onClick:function(){'
    'var _ntr={id:"tr-"+Date.now(),'
    'destination:_trvDstCity||_trvDstState||"TBD",'
    'purpose:_trvProject||_trvPurpose||"Business",'
    'status:"pending",'
    'date:new Date().toISOString().split("T")[0],cost:0};'
    'window._travelReqs=window._travelReqs||[];'
    'window._travelReqs.push(_ntr);'
    'Tr(!1);ye("Travel request submitted successfully!");'
    '},style:{width:"100%",padding:"15px",background:"' + BLUE + '",'
    'color:"#fff",border:"none",borderRadius:10,'
    'fontSize:15,fontWeight:700,fontFamily:' + FF + ',cursor:"pointer"},'
    'children:"Submit Request"})'
)

# ── ASSEMBLE ────────────────────────────────────────────────────────────────────
NEW_FORM = (
    'Lx&&e.jsx("div",{style:{position:"fixed",top:0,bottom:60,left:"50%",'
    'transform:"translateX(-50%)",width:"min(100vw,448px)",maxWidth:448,'
    'zIndex:300,background:"#f3f4f6",display:"flex",flexDirection:"column"},'
    'children:e.jsxs(e.Fragment,{children:['
    + HEADER + ','
    'e.jsxs("div",{className:"no-scrollbar",style:{overflowY:"auto",flex:1,padding:"14px 14px 0"},children:['
    + TYPE_ROW + ','
    + EMP_FIELD + ','
    + PURPOSE_TRAVEL_FIELD + ','
    + CONTACT_ROW + ','
    + PURPOSE_TEXTAREA + ','
    + SOURCE + ','
    + DESTINATION + ','
    + DATE_ROW + ','
    + ADVANCE_CHECK + ','
    + SPECIAL_REQ + ','
    + BOTTOM_BTNS + ','
    + SUBMIT_BTN + ','
    'e.jsx("div",{style:{height:20}})'
    ']})'
    ']})})'
)

print("NEW length:", len(NEW_FORM))
opens = NEW_FORM.count('{') + NEW_FORM.count('(') + NEW_FORM.count('[')
closes = NEW_FORM.count('}') + NEW_FORM.count(')') + NEW_FORM.count(']')
print(f"opens={opens} closes={closes} delta={opens-closes}")

# ── Syntax check ─────────────────────────────────────────────────────────────────
STUBS = (
    'var e={jsx:function(){return null;},jsxs:function(){return null;},Fragment:"fragment"};'
    'var ke={},qe={},Ve={},Ba={},U1={},qu={},eo={},fg={},Vu={},eg={},Au={},pg={};'
    'var _trvType="inhouse",_setTrvType=function(){};'
    'var _trvBehalf="self",_setTrvBehalf=function(){};'
    'var _trvEmp="Harsh Singh (EMP00123)";'
    'var _trvProject="",_setTrvProject=function(){};'
    'var _trvContact="",_setTrvContact=function(){};'
    'var _trvEmg="",_setTrvEmg=function(){};'
    'var _trvPurpose="",_setTrvPurpose=function(){};'
    'var _trvSuggest="",_setTrvSuggest=function(){};'
    'var _trvSrcType="external",_setTrvSrcType=function(){};'
    'var _trvSrcState="Uttar Pradesh",_setTrvSrcState=function(){};'
    'var _trvSrcCity="Lucknow",_setTrvSrcCity=function(){};'
    'var _trvSrcOffice="Lucknow Office",_setTrvSrcOffice=function(){};'
    'var _trvDstType="external",_setTrvDstType=function(){};'
    'var _trvDstState="Uttar Pradesh",_setTrvDstState=function(){};'
    'var _trvDstCity="Varanasi",_setTrvDstCity=function(){};'
    'var _trvDstOffice="Varanasi Office",_setTrvDstOffice=function(){};'
    'var _trvDepDate="2026-05-18",_setTrvDepDate=function(){};'
    'var _trvRetDate="2026-05-20",_setTrvRetDate=function(){};'
    'var _trvAdvance=false,_setTrvAdvance=function(){};'
    'var _trvBooking=false,_setTrvBooking=function(){};'
    'var _trvHotel=false,_setTrvHotel=function(){};'
    'var Lx=true,Tr=function(){};'
    'var ye=function(){};'
)
test_code = STUBS + '(function(){' + NEW_FORM + '})();'
with tempfile.NamedTemporaryFile(suffix='.js', delete=False, mode='w') as f:
    f.write(test_code)
    tmpf = f.name
result = subprocess.run(['node', '--check', tmpf], capture_output=True, text=True)
os.unlink(tmpf)
if result.returncode != 0:
    print("SYNTAX ERROR:", result.stderr[:800])
    exit(1)
print("Syntax OK")

new_content = content[:OLD_START] + NEW_FORM + content[OLD_END:]
open('hrmobileapp.html', 'w').write(new_content)
print(f"Done. Size: {len(new_content)}")
