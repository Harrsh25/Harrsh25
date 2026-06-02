import subprocess, tempfile, os

content = open('hrmobileapp.html').read()

MARKER = 'Bx&&e.jsx("div",{style:{position:"fixed",top:0,bottom:60'
OLD_START = content.find(MARKER)
assert OLD_START != -1, "Could not find New Expense form block"

paren_start = content.find('(', OLD_START + len('Bx&&e.jsx'))
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
    raise AssertionError("Could not find end of New Expense form block")

print(f"Boundaries OK: OLD_START={OLD_START} OLD_END={OLD_END} len={OLD_END-OLD_START}")

FF = '"Inter,sans-serif"'
BLUE = '#1a56db'

# ── Inline SVG helper ───────────────────────────────────────────────────────────
def isvg(w, h, vb, children_expr, extra=''):
    return (
        'e.jsx("svg",{width:' + str(w) + ',height:' + str(h)
        + ',viewBox:"' + vb + '",fill:"none",stroke:"currentColor"'
        + ',strokeWidth:1.5,strokeLinecap:"round",strokeLinejoin:"round"'
        + (',' + extra if extra else '')
        + ',children:' + children_expr + '})'
    )

# Person icon
PERSON_IC = isvg(15, 15, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),'
    'e.jsx("circle",{cx:12,cy:7,r:4})'
    ']})',
    'stroke:"#9ca3af"'
)
PERSON_IC_BLUE = isvg(15, 15, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),'
    'e.jsx("circle",{cx:12,cy:7,r:4})'
    ']})',
    'stroke:"' + BLUE + '"'
)

# Eye-Off icon
EYE_OFF_IC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24"}),'
    'e.jsx("path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"}),'
    'e.jsx("path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"}),'
    'e.jsx("line",{x1:2,y1:2,x2:22,y2:22})'
    ']})',
    'stroke:"#9ca3af"'
)

# Arrow left-right (transaction) icon for Bill Amount
TRANSFER_IC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M8 3 4 7l4 4"}),'
    'e.jsx("path",{d:"M4 7h16"}),'
    'e.jsx("path",{d:"m16 21 4-4-4-4"}),'
    'e.jsx("path",{d:"M20 17H4"})'
    ']})',
    'stroke:"#9ca3af"'
)

# Chat icon for remark
CHAT_IC = isvg(14, 14, '0 0 24 24',
    'e.jsx("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"})',
    'stroke:"#9ca3af"'
)

# ── Field helpers ────────────────────────────────────────────────────────────────
def card(content_str, mb=10, extra_style=''):
    return (
        'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
        'padding:"12px 14px",background:"#fff",marginBottom:' + str(mb)
        + (',' + extra_style if extra_style else '') +
        '},children:[' + content_str + ']})'
    )

def field_label(text, required=False, info=False):
    req = '+e.jsx("span",{style:{color:"#ef4444"},children:" *"})' if required else ''
    inf = '+e.jsx(Wu,{size:12,style:{color:"#9ca3af",marginLeft:3}})' if info else ''
    return (
        'e.jsxs("p",{style:{fontSize:12,fontWeight:600,color:"#374151",'
        'fontFamily:' + FF + ',margin:"0 0 6px"},children:["' + text + '"' + req + inf + ']})'
    )

def dropdown_overlay(value_var, set_var, options, placeholder):
    opts = ','.join(
        'e.jsx("option",{value:"' + o + '",children:"' + o + '"})' for o in options
    )
    return (
        'e.jsxs("div",{style:{position:"relative",display:"flex",alignItems:"center",'
        'justifyContent:"space-between"},children:['
        'e.jsx("span",{style:{fontSize:13,color:' + value_var + '?"#111827":"#9ca3af",'
        'fontFamily:' + FF + ',fontWeight:' + value_var + '?600:400},'
        'children:' + value_var + '||"' + placeholder + '"}),'
        'e.jsx(qe,{size:15,style:{color:"#9ca3af",flexShrink:0}}),'
        'e.jsx("select",{value:' + value_var + ','
        'onChange:function(ev){' + set_var + '(ev.target.value);},'
        'style:{position:"absolute",inset:0,opacity:0,width:"100%",cursor:"pointer"},'
        'children:[e.jsx("option",{value:"",children:"' + placeholder + '"}),' + opts + ']})'
        ']})'
    )

def date_input_det(label, field_key, required=True):
    """Date field for inside _expDetails array"""
    req = '+e.jsx("span",{style:{color:"#ef4444"},children:" *"})' if required else ''
    return (
        'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,'
        'padding:"10px 12px",background:"#fff",position:"relative",flex:1},children:['
        'e.jsxs("p",{style:{fontSize:11,fontWeight:600,color:"#374151",'
        'fontFamily:' + FF + ',margin:"0 0 5px"},children:["' + label + '"' + req + ']}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
        'e.jsx(Au,{size:13,style:{color:"#9ca3af",flexShrink:0}}),'
        'e.jsx("span",{style:{fontSize:13,color:det["' + field_key + '"]?"#111827":"#9ca3af",'
        'fontFamily:' + FF + '},children:det["' + field_key + '"]||(function(){'
        'var _d=det["' + field_key + '"];if(!_d)return"dd/mm/yyyy";'
        'var _p=_d.split("-");return _p[2]+"/"+_p[1]+"/"+_p[0];})()||"dd/mm/yyyy"})'
        ']}),'
        'e.jsx("input",{type:"date",value:det["' + field_key + '"]||"",'
        'onChange:function(ev){'
        'var v=ev.target.value;'
        '_setExpDetails(function(prev){return prev.map(function(d,i){return i===idx?Object.assign({},d,{"' + field_key + '":v}):d;});});'
        '},style:{position:"absolute",inset:0,opacity:0,width:"100%",cursor:"pointer"}})'
        ']})'
    )

PROJECTS = ['HR Module','ERP System','Office Relocation','IT Implementation','Payroll System']
EXP_TYPES = ['Client Entertainment','Travel','Accommodation','Meals','Local Transport','Medical','Office Supplies','Other']
PARTICULARS = ['Hotel','Flight','Train','Bus','Taxi','Meal','Conference Fee','Miscellaneous','Other']

# ── HEADER ───────────────────────────────────────────────────────────────────────
HEADER = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,'
    'padding:"48px 14px 13px",borderBottom:"1px solid #e5e7eb",'
    'flexShrink:0,background:"#fff"},children:['
    'e.jsx("button",{onClick:function(){zr(!1);},style:{'
    'width:34,height:34,borderRadius:9,border:"1px solid #e5e7eb",'
    'background:"#fff",display:"flex",alignItems:"center",'
    'justifyContent:"center",cursor:"pointer",flexShrink:0},'
    'children:e.jsx(ke,{size:17,color:"#374151"})}),'
    'e.jsx("span",{style:{flex:1,fontSize:19,fontWeight:800,'
    'color:"#111827",fontFamily:' + FF + '},children:"New Expense"}),'
    'e.jsx("button",{style:{width:34,height:34,borderRadius:9,'
    'border:"1.5px solid ' + BLUE + '",'
    'background:"#fff",display:"flex",alignItems:"center",'
    'justifyContent:"center",cursor:"pointer",flexShrink:0},'
    'children:e.jsx(Ba,{size:16,color:"' + BLUE + '"})})'
    ']})'
)

# ── PURPOSE FIELD ────────────────────────────────────────────────────────────────
PURPOSE_FIELD = (
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'padding:"12px 14px",background:"#fff",marginBottom:10},children:['
    + field_label('Purpose', required=True) + ','
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    'e.jsx("input",{value:_expPurpose,'
    'onChange:function(ev){_setExpPurpose(ev.target.value);},'
    'placeholder:"Enter purpose of expense",'
    'style:{flex:1,border:"none",outline:"none",fontSize:13,'
    'color:"#374151",fontFamily:' + FF + ',background:"transparent",'
    'padding:0}}),'
    'e.jsx(Ba,{size:15,style:{color:"#9ca3af",flexShrink:0}})'
    ']})'
    ']})'
)

# ── PROJECT + EXPENSE TYPE (2-col) ────────────────────────────────────────────
PROJECT_ROW = (
    'e.jsxs("div",{style:{display:"flex",gap:8,marginBottom:10},children:['
    # Project
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'padding:"12px 14px",background:"#fff",flex:1,minWidth:0},children:['
    + field_label('Project', required=True) + ','
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
    'e.jsx("span",{style:{flex:1,fontSize:13,'
    'color:_expProject?"#111827":"#9ca3af",fontFamily:' + FF + ','
    'fontWeight:_expProject?600:400},'
    'children:_expProject||"Select project"}),'
    'e.jsx(qe,{size:14,style:{color:"#9ca3af"}}),'
    'e.jsx("button",{style:{width:28,height:28,borderRadius:7,'
    'border:"1.5px solid ' + BLUE + '",background:"#fff",'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'cursor:"pointer",flexShrink:0},'
    'children:e.jsx(Ve,{size:13,color:"' + BLUE + '"})}),'
    'e.jsx("select",{value:_expProject,'
    'onChange:function(ev){_setExpProject(ev.target.value);},'
    'style:{position:"absolute",opacity:0,inset:0,cursor:"pointer"},'
    'children:[e.jsx("option",{value:"",children:"Select project"}),'
    + ','.join('e.jsx("option",{value:"' + p + '",children:"' + p + '"})' for p in PROJECTS) +
    ']})'
    ']}),'
    'e.jsx("div",{style:{position:"relative"}})'  # dummy to make select work
    ']}),'
    # Expense Type
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'padding:"12px 14px",background:"#fff",flex:1,minWidth:0,position:"relative"},children:['
    + field_label('Expense Type', required=True) + ','
    + dropdown_overlay('_expType', '_setExpType', EXP_TYPES, 'Select expense type') +
    ']})'
    ']})'
)

# ── SUGGESTED BY ─────────────────────────────────────────────────────────────────
SUGGESTED_BY = (
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'padding:"12px 14px",background:"#fff",marginBottom:10},children:['
    + field_label('Suggested By') + ','
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    'e.jsx("div",{style:{color:"#9ca3af"},children:' + PERSON_IC + '}),'
    'e.jsx("input",{value:_expSuggest,'
    'onChange:function(ev){_setExpSuggest(ev.target.value);},'
    'placeholder:"Enter name or select from directory",'
    'style:{flex:1,border:"none",outline:"none",fontSize:13,'
    'color:"#374151",fontFamily:' + FF + ',background:"transparent",padding:0}}),'
    'e.jsx(qe,{size:15,style:{color:"#9ca3af"}})'
    ']})'
    ']})'
)

# ── CLIENT + BILL AMOUNT + CONFIDENTIAL (3-col) ───────────────────────────────
THREE_COL = (
    'e.jsxs("div",{style:{display:"flex",gap:8,marginBottom:10},children:['
    # Client
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'padding:"12px 10px",background:"#fff",flex:1,minWidth:0},children:['
    + field_label('Client', required=True) + ','
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,marginTop:2},children:['
    'e.jsx("div",{style:{color:"#9ca3af",flexShrink:0},children:' + PERSON_IC + '}),'
    'e.jsx("input",{value:_expClient,'
    'onChange:function(ev){_setExpClient(ev.target.value);},'
    'placeholder:"Enter client name",'
    'style:{flex:1,border:"none",outline:"none",fontSize:12,'
    'color:"#374151",fontFamily:' + FF + ',background:"transparent",padding:0,minWidth:0}})'
    ']})'
    ']}),'
    # Bill Amount
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'padding:"12px 10px",background:"#fff",flex:1,minWidth:0},children:['
    + field_label('Bill Amount', required=True) + ','
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827",fontFamily:' + FF + '},'
    'children:"\\u20b9"}),'
    'e.jsx("input",{type:"number",value:_expBillAmt,'
    'onChange:function(ev){_setExpBillAmt(ev.target.value);},'
    'placeholder:"0.00",'
    'style:{flex:1,border:"none",outline:"none",fontSize:13,fontWeight:600,'
    'color:"#111827",fontFamily:' + FF + ',background:"transparent",padding:0,minWidth:0}}),'
    'e.jsx("div",{style:{color:"#9ca3af",flexShrink:0},children:' + TRANSFER_IC + '})'
    ']})'
    ']}),'
    # Confidential Amount
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'padding:"12px 10px",background:"#fff",flex:1,minWidth:0},children:['
    'e.jsxs("p",{style:{fontSize:12,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',margin:"0 0 6px",display:"flex",alignItems:"center",gap:2},'
    'children:["Confidential Amount",e.jsx(Wu,{size:11,style:{color:"#9ca3af"}})]}), '
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827",fontFamily:' + FF + '},'
    'children:"\\u20b9"}),'
    'e.jsx("input",{type:"number",value:_expContrib,'
    'onChange:function(ev){_setExpContrib(ev.target.value);},'
    'placeholder:"0.00",'
    'style:{flex:1,border:"none",outline:"none",fontSize:13,fontWeight:600,'
    'color:"#111827",fontFamily:' + FF + ',background:"transparent",padding:0,minWidth:0}}),'
    'e.jsx("div",{style:{color:"#9ca3af",flexShrink:0},children:' + EYE_OFF_IC + '})'
    ']})'
    ']})  '
    ']})'
)

# ── EXPENSE DETAILS SECTION ────────────────────────────────────────────────────
# Per-detail-item fields (render first item)
DETAIL_ITEMS = (
    '_expDetails.map(function(det,idx){'
    'return e.jsxs("div",{key:"det-"+idx,'
    'style:{marginTop:idx>0?14:0,paddingTop:idx>0?14:0,'
    'borderTop:idx>0?"2px dashed #e5e7eb":"none"},children:['
    'idx>0?e.jsxs("div",{style:{display:"flex",alignItems:"center",'
    'justifyContent:"space-between",marginBottom:8},children:['
    'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"' + BLUE + '",'
    'fontFamily:' + FF + '},children:"Expense #"+(idx+1)}),'
    'e.jsx("button",{onClick:function(){'
    '_setExpDetails(function(prev){return prev.filter(function(_,i){return i!==idx;});});'
    '},style:{fontSize:11,color:"#ef4444",background:"none",border:"none",'
    'cursor:"pointer",fontFamily:' + FF + '},children:"Remove"})'
    ']}):null,'
    # Expense Date + Bill Date
    'e.jsxs("div",{style:{display:"flex",gap:8,marginBottom:8},children:['
    + date_input_det('Expense Date', 'expDate') + ','
    + date_input_det('Bill Date', 'billDate') +
    ']}),'
    # Expense Detail
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,'
    'padding:"10px 12px",background:"#fff",marginBottom:8},children:['
    'e.jsxs("p",{style:{fontSize:11,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',margin:"0 0 5px"},children:["Expense Detail",'
    'e.jsx("span",{style:{color:"#ef4444"},children:" *"})]}),'
    'e.jsx("input",{value:det.detail||"",'
    'onChange:function(ev){var v=ev.target.value;'
    '_setExpDetails(function(prev){return prev.map(function(d,i){return i===idx?Object.assign({},d,{detail:v}):d;});});},'
    'placeholder:"Enter expense details",'
    'style:{border:"none",outline:"none",fontSize:13,color:"#374151",'
    'fontFamily:' + FF + ',width:"100%",background:"transparent",padding:0}})'
    ']}), '
    # Particular + Total Amount
    'e.jsxs("div",{style:{display:"flex",gap:8,marginBottom:8},children:['
    # Particular dropdown
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,'
    'padding:"10px 12px",background:"#fff",flex:1,position:"relative"},children:['
    'e.jsxs("p",{style:{fontSize:11,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',margin:"0 0 5px"},children:["Particular",'
    'e.jsx("span",{style:{color:"#ef4444"},children:" *"})]}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
    'e.jsx("span",{style:{fontSize:13,color:det.particular?"#111827":"#9ca3af",'
    'fontFamily:' + FF + ',fontWeight:det.particular?600:400},'
    'children:det.particular||"Select particular"}),'
    'e.jsx(qe,{size:14,style:{color:"#9ca3af"}})'
    ']}),'
    'e.jsx("select",{value:det.particular||"",'
    'onChange:function(ev){var v=ev.target.value;'
    '_setExpDetails(function(prev){return prev.map(function(d,i){return i===idx?Object.assign({},d,{particular:v}):d;});});},'
    'style:{position:"absolute",inset:0,opacity:0,width:"100%",cursor:"pointer"},'
    'children:[e.jsx("option",{value:"",children:"Select particular"}),'
    + ','.join('e.jsx("option",{value:"' + p + '",children:"' + p + '"})' for p in PARTICULARS) +
    ']})'
    ']}), '
    # Total Amount
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,'
    'padding:"10px 12px",background:"#fff",flex:1},children:['
    'e.jsxs("p",{style:{fontSize:11,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',margin:"0 0 5px"},children:["Total Amount",'
    'e.jsx("span",{style:{color:"#ef4444"},children:" *"})]}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:2},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827",fontFamily:' + FF + '},'
    'children:"\\u20b9"}),'
    'e.jsx("input",{type:"number",value:det.totalAmt||"",'
    'onChange:function(ev){var v=ev.target.value;'
    '_setExpDetails(function(prev){return prev.map(function(d,i){return i===idx?Object.assign({},d,{totalAmt:v}):d;});});},'
    'placeholder:"0.00",'
    'style:{flex:1,border:"none",outline:"none",fontSize:13,fontWeight:600,'
    'color:"#111827",fontFamily:' + FF + ',background:"transparent",padding:0}})'
    ']})'
    ']})'
    ']}),'
    # Calculation Amount + GST Claim
    'e.jsxs("div",{style:{display:"flex",gap:8,marginBottom:8},children:['
    # Calculation Amount (read-only)
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,'
    'padding:"10px 12px",background:"#fff",flex:1},children:['
    'e.jsxs("p",{style:{fontSize:11,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',margin:"0 0 5px",display:"flex",alignItems:"center",gap:2},'
    'children:["Calculation Amount",e.jsx(Wu,{size:10,style:{color:"#9ca3af"}})]}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:2},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827",fontFamily:' + FF + '},'
    'children:"\\u20b9"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#111827",fontFamily:' + FF + '},'
    'children:(function(){'
    'var t=parseFloat(det.totalAmt||0),c=parseFloat(det.contribAmt||0);'
    'return(t-c).toFixed(2);})()||"0.00"})'
    ']})'
    ']}), '
    # GST Claim
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,'
    'padding:"10px 12px",background:"#fff",flex:1},children:['
    'e.jsxs("p",{style:{fontSize:11,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',margin:"0 0 5px",display:"flex",alignItems:"center",gap:2},'
    'children:["GST Claim",e.jsx(Wu,{size:10,style:{color:"#9ca3af"}})]}),'
    'e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer"},children:['
    'e.jsx("input",{type:"checkbox",checked:det.gstClaim||false,'
    'onChange:function(ev){var v=ev.target.checked;'
    '_setExpDetails(function(prev){return prev.map(function(d,i){return i===idx?Object.assign({},d,{gstClaim:v}):d;});});},'
    'style:{width:16,height:16,accentColor:"' + BLUE + '",cursor:"pointer"}}),'
    'e.jsx("span",{style:{fontSize:13,color:"#374151",fontFamily:' + FF + '},'
    'children:"Claim GST"})'
    ']})'
    ']})'
    ']}),'
    # Remark (if any)
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,'
    'padding:"10px 12px",background:"#fff"},children:['
    'e.jsxs("p",{style:{fontSize:11,fontWeight:600,color:"#374151",'
    'fontFamily:' + FF + ',margin:"0 0 5px",display:"flex",alignItems:"center",gap:2},'
    'children:["Remark (if any)",e.jsx(Wu,{size:10,style:{color:"#9ca3af"}})]}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7},children:['
    'e.jsx("div",{style:{color:"#9ca3af",flexShrink:0},children:' + CHAT_IC + '}),'
    'e.jsx("input",{value:det.remark||"",'
    'onChange:function(ev){var v=ev.target.value;'
    '_setExpDetails(function(prev){return prev.map(function(d,i){return i===idx?Object.assign({},d,{remark:v}):d;});});},'
    'placeholder:"Enter remarks",'
    'style:{flex:1,border:"none",outline:"none",fontSize:13,'
    'color:"#374151",fontFamily:' + FF + ',background:"transparent",padding:0}})'
    ']})'
    ']}) '
    ']},"det-"+idx);'
    '})'
)

EXPENSE_DETAILS_SECTION = (
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:12,'
    'background:"#fff",overflow:"hidden",marginBottom:10},children:['
    # Collapsible header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,'
    'padding:"12px 14px",background:"#f8fafc",borderBottom:"1px solid #e5e7eb",'
    'cursor:"pointer"},children:['
    'e.jsx(Ba,{size:16,color:"' + BLUE + '"}),'
    'e.jsx("span",{style:{flex:1,fontSize:14,fontWeight:700,color:"#111827",'
    'fontFamily:' + FF + '},children:"Expense Details"}),'
    'e.jsx(qe,{size:16,style:{color:"#6b7280",transform:"rotate(180deg)"}})'
    ']}),'
    # Detail items
    'e.jsx("div",{style:{padding:"12px 14px"},children:'
    + DETAIL_ITEMS +
    '})'
    ']})'
)

# ── ADD MORE EXPENSES ──────────────────────────────────────────────────────────
ADD_MORE = (
    'e.jsx("button",{onClick:function(){'
    '_setExpDetails(function(prev){'
    'return prev.concat([{id:prev.length+1,expDate:"",billDate:"",'
    'billNumber:"",detail:"",particular:"",totalAmt:"",contribAmt:"",'
    'remark:"",gstClaim:false}]);'
    '});'
    '},style:{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:10,'
    'padding:"14px 16px",background:"#fff",cursor:"pointer",marginBottom:10},'
    'children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    'e.jsx("div",{style:{width:32,height:32,borderRadius:"50%",'
    'border:"1.5px solid ' + BLUE + '",'
    'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    'children:e.jsx(Ve,{size:16,color:"' + BLUE + '"})}),'
    'e.jsxs("div",{style:{textAlign:"left"},children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"' + BLUE + '",'
    'fontFamily:' + FF + ',margin:"0 0 2px"},children:"Add More Expenses"}),'
    'e.jsx("p",{style:{fontSize:11,color:"#9ca3af",fontFamily:' + FF + ',margin:0},'
    'children:"Add multiple expenses in one go"})'
    ']})'
    ']})})'
)

# ── SUBMIT BUTTON ──────────────────────────────────────────────────────────────
SUBMIT_BTN = (
    'e.jsx("button",{onClick:function(){'
    'var _nec={id:"ec-"+Date.now(),'
    'category:_expType||"General",'
    'amount:parseFloat(_expBillAmt||0),'
    'date:new Date().toISOString().split("T")[0],'
    'status:"pending",'
    'submittedBy:"Harsh",'
    'description:_expPurpose||"Expense claim"};'
    'window._expenseClaims=window._expenseClaims||[];'
    'window._expenseClaims.push(_nec);'
    'zr(!1);ye("Expense claim submitted successfully!");'
    '},style:{width:"100%",padding:"16px",'
    'background:"' + BLUE + '",color:"#fff",border:"none",borderRadius:10,'
    'fontSize:15,fontWeight:700,fontFamily:' + FF + ',cursor:"pointer"},'
    'children:"Submit Expense"})'
)

# ── ASSEMBLE ───────────────────────────────────────────────────────────────────
NEW_FORM = (
    'Bx&&e.jsx("div",{style:{position:"fixed",top:0,bottom:60,left:"50%",'
    'transform:"translateX(-50%)",width:"min(100vw,448px)",maxWidth:448,'
    'zIndex:300,background:"#f3f4f6",display:"flex",flexDirection:"column"},'
    'children:e.jsxs(e.Fragment,{children:['
    + HEADER + ','
    'e.jsxs("div",{className:"no-scrollbar",'
    'style:{overflowY:"auto",flex:1,padding:"14px 14px 0"},children:['
    + PURPOSE_FIELD + ','
    + PROJECT_ROW + ','
    + SUGGESTED_BY + ','
    + THREE_COL + ','
    + EXPENSE_DETAILS_SECTION + ','
    + ADD_MORE + ','
    + SUBMIT_BTN + ','
    'e.jsx("div",{style:{height:24}})'
    ']})'
    ']})})'
)

print("NEW length:", len(NEW_FORM))
opens = NEW_FORM.count('{') + NEW_FORM.count('(') + NEW_FORM.count('[')
closes = NEW_FORM.count('}') + NEW_FORM.count(')') + NEW_FORM.count(']')
print(f"opens={opens} closes={closes} delta={opens-closes}")

# ── Syntax check ────────────────────────────────────────────────────────────────
STUBS = (
    'var e={jsx:function(){return null;},jsxs:function(){return null;},'
    'Fragment:"fragment"};'
    'var ke={},qe={},Ve={},Ba={},Wu={},Au={},fg={};'
    'var _expPurpose="",_setExpPurpose=function(){};'
    'var _expProject="",_setExpProject=function(){};'
    'var _expType="",_setExpType=function(){};'
    'var _expSuggest="",_setExpSuggest=function(){};'
    'var _expClient="",_setExpClient=function(){};'
    'var _expBillAmt="",_setExpBillAmt=function(){};'
    'var _expContrib="",_setExpContrib=function(){};'
    'var _expClaim="",_setExpClaim=function(){};'
    'var _expDetails=[{id:1,expDate:"",billDate:"",billNumber:"",'
    'detail:"",particular:"",totalAmt:"",contribAmt:"",remark:"",gstClaim:false}];'
    'var _setExpDetails=function(){};'
    'var Bx=true,zr=function(){},ye=function(){};'
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
