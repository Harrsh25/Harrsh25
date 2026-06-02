import subprocess, tempfile, os

content = open('hrmobileapp.html').read()

OLD_START = 835003
OLD_END   = 839604

old_check_s = 'if(i.approvalKind==="expense"){return e.jsxs("div",{classNam'
old_check_e = '" Approve"]})]})]}),e.jsx("div",{style:{height:16}})]})]});}'
assert content[OLD_START:OLD_START+len(old_check_s)] == old_check_s, "START mismatch"
assert content[OLD_END-len(old_check_e):OLD_END] == old_check_e, "END mismatch"
print("Boundaries OK")

FF = '"Inter,sans-serif"'
GREEN = '#059669'
GREEN_DARK = '#065f46'
GREEN_BG = '#ecfdf5'
GREEN_BORDER = '#a7f3d0'

# ── Inline SVG helpers ─────────────────────────────────────────────────────────
def isvg(w, h, vb, children_expr, extra=''):
    return (
        'e.jsx("svg",{width:'+str(w)+',height:'+str(h)+',viewBox:"'+vb+'",'
        'fill:"none",stroke:"currentColor",strokeWidth:1.5,'
        'strokeLinecap:"round",strokeLinejoin:"round"'
        +(','+extra if extra else '')+
        ',children:'+children_expr+'})'
    )

CAL_IC = isvg(13,13,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2}),'
    'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
    'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
    'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
    ']})'
)

RECEIPT_IC = isvg(14,14,'0 0 24 24',  # FileText
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
    'e.jsx("polyline",{points:"14 2 14 8 20 8"}),'
    'e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),'
    'e.jsx("line",{x1:16,y1:17,x2:8,y2:17})'
    ']})'
)

WALLET_IC = isvg(28,28,'0 0 24 24',  # CreditCard/wallet
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:1,y:4,width:22,height:16,rx:2,ry:2}),'
    'e.jsx("line",{x1:1,y1:10,x2:23,y2:10})'
    ']})',
    'stroke:"#059669",strokeWidth:2'
)

TAG_IC = isvg(16,16,'0 0 24 24',
    'e.jsx("path",{d:"M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"}),'
    'stroke:"#059669",strokeWidth:2'
)

USER_IC = isvg(14,14,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),'
    'e.jsx("circle",{cx:12,cy:7,r:4})'
    ']})'
)

CLIP_IC = isvg(14,14,'0 0 24 24',
    'e.jsx("path",{d:"M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"})'
)

FILTEXT_IC = isvg(14,14,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
    'e.jsx("polyline",{points:"14 2 14 8 20 8"}),'
    'e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),'
    'e.jsx("line",{x1:16,y1:17,x2:8,y2:17})'
    ']})'
)

BUILDING_IC = isvg(14,14,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:2,y:7,width:20,height:14,rx:0}),'
    'e.jsx("path",{d:"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"}),'
    'e.jsx("line",{x1:6,y1:11,x2:6,y2:11}),'
    'e.jsx("line",{x1:10,y1:11,x2:10,y2:11}),'
    'e.jsx("line",{x1:6,y1:15,x2:6,y2:15}),'
    'e.jsx("line",{x1:10,y1:15,x2:10,y2:15})'
    ']})'
)

DOWNLOAD_IC = isvg(16,16,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),'
    'e.jsx("polyline",{points:"7 10 12 15 17 10"}),'
    'e.jsx("line",{x1:12,y1:15,x2:12,y2:3})'
    ']})',
    'stroke:"#059669"'
)

SHIELD_CHECK = isvg(16,16,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}),'
    'e.jsx("polyline",{points:"9 12 11 14 15 10"})'
    ']})',
    'stroke:"#059669"'
)

SHIELD_SM = isvg(15,15,'0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}),'
    'e.jsx("polyline",{points:"9 12 11 14 15 10"})'
    ']})',
    'stroke:"#059669"'
)

# PDF thumbnail SVG
PDF_THUMB = (
    'e.jsx("div",{style:{width:50,height:58,borderRadius:6,overflow:"hidden",'
    'border:"1px solid #e5e7eb",background:"#fff",flexShrink:0,display:"flex",'
    'flexDirection:"column",alignItems:"center",justifyContent:"center",'
    'position:"relative"},children:'
    'e.jsx("svg",{width:50,height:58,viewBox:"0 0 50 58",fill:"none",children:'
    'e.jsxs("g",{children:['
    'e.jsx("rect",{width:50,height:58,fill:"#f9fafb"}),'
    'e.jsx("path",{d:"M10 0 L36 0 L50 14 L50 58 L10 58 Z",fill:"#fff",stroke:"#e5e7eb",strokeWidth:1}),'
    'e.jsx("path",{d:"M36 0 L36 14 L50 14",fill:"#e5e7eb"}),'
    'e.jsx("rect",{x:8,y:22,width:34,height:3,rx:1,fill:"#d1fae5"}),'
    'e.jsx("rect",{x:8,y:28,width:28,height:2,rx:1,fill:"#e5e7eb"}),'
    'e.jsx("rect",{x:8,y:33,width:30,height:2,rx:1,fill:"#e5e7eb"}),'
    'e.jsx("rect",{x:8,y:38,width:22,height:2,rx:1,fill:"#e5e7eb"}),'
    'e.jsx("rect",{x:10,y:14,width:18,height:6,rx:1,fill:"#ef4444"}),'
    'e.jsx("text",{x:11,y:20,fontSize:5,fill:"#fff",fontFamily:"sans-serif",fontWeight:"bold",children:"PDF"})'
    ']})'
    '})'
    '})'
)

# ── Icon in colored square ─────────────────────────────────────────────────────
def icon_sq(icon_expr, bg='#eef2ff', color='#4f46e5', sz=32):
    return (
        'e.jsx("div",{style:{width:'+str(sz)+',height:'+str(sz)+',borderRadius:8,'
        'background:"'+bg+'",'
        'display:"flex",alignItems:"center",justifyContent:"center",'
        'color:"'+color+'",flexShrink:0},children:'+icon_expr+'})'
    )

# ── STATUS CHIP (green for approved) ──────────────────────────────────────────
STATUS_CHIP = (
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,'
    'fontSize:11,fontWeight:700,'
    'color:i.status==="Approved!"||i.status==="Approved"?"#059669":i.status==="Rejected"?"#dc2626":"#d97706",'
    'background:i.status==="Approved!"||i.status==="Approved"?"#ecfdf5":i.status==="Rejected"?"#fef2f2":"#fffbeb",'
    'borderRadius:20,padding:"5px 12px",'
    'border:i.status==="Approved!"||i.status==="Approved"?"1px solid #a7f3d0":i.status==="Rejected"?"1px solid #fecaca":"1px solid #fed7aa",'
    'fontFamily:'+FF+',flexShrink:0},children:['
    'e.jsx(ps,{size:13}),"\\u00a0"+(i.status||"Pending")'
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
    'e.jsx("button",{style:{background:"none",border:"none",cursor:"pointer",padding:"4px 0 0 4px",'
    'flexShrink:0,color:"#374151"},children:e.jsx(lg,{size:18})})'
    ']})'
)

# ── TABS ───────────────────────────────────────────────────────────────────────
TABS = (
    'e.jsxs("div",{style:{display:"flex",background:"#fff",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,'
    'padding:"10px 16px",borderBottom:"2px solid #059669",'
    'color:"#059669",fontSize:12,fontWeight:600,fontFamily:'+FF+',cursor:"pointer"},children:['
    + RECEIPT_IC + ',"Expense Claim"'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,'
    'padding:"10px 16px",borderBottom:"2px solid transparent",'
    'color:"#6b7280",fontSize:12,fontWeight:500,fontFamily:'+FF+',cursor:"pointer"},children:['
    + CAL_IC + ','
    'i.timeline||i.start||"—"'
    ']})'
    ']})'
)

# ── AMOUNT CARD ─────────────────────────────────────────────────────────────────
AMOUNT_CARD = (
    'e.jsxs("div",{style:{margin:"14px 14px 0",borderRadius:16,'
    'background:"linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)",'
    'border:"1px solid #a7f3d0",padding:"18px 16px",'
    'display:"flex",alignItems:"stretch",gap:0},children:['
    # left: wallet icon + amount
    'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",gap:14},children:['
    'e.jsx("div",{style:{width:56,height:56,borderRadius:"50%",'
    'background:"rgba(5,150,105,0.12)",'
    'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    'children:' + WALLET_IC + '}),'
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:10,fontWeight:700,color:"#6b7280",fontFamily:'+FF+','
    'letterSpacing:"0.07em",textTransform:"uppercase",margin:"0 0 3px"},'
    'children:"Claim Amount"}),'
    'e.jsx("p",{style:{fontSize:26,fontWeight:800,color:"#111827",fontFamily:'+FF+',margin:"0 0 3px",'
    'lineHeight:"1.1"},children:i.amount||"\\u20b92,450.00"}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",fontFamily:'+FF+',margin:0},'
    'children:i.amountWords||"Two Thousand Four Hundred Fifty Rupees Only"})'
    ']})'
    ']}),'
    # separator
    'e.jsx("div",{style:{width:1,background:"#a7f3d0",margin:"0 16px",alignSelf:"stretch"}}),'
    # right: category
    'e.jsxs("div",{style:{flexShrink:0,display:"flex",flexDirection:"column",'
    'alignItems:"center",justifyContent:"center",minWidth:80},children:['
    'e.jsx("p",{style:{fontSize:10,fontWeight:700,color:"#6b7280",fontFamily:'+FF+','
    'letterSpacing:"0.07em",textTransform:"uppercase",margin:"0 0 8px"},'
    'children:"Category"}),'
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:4},children:['
    'e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"rgba(5,150,105,0.1)",'
    'display:"flex",alignItems:"center",justifyContent:"center"},children:'
    + TAG_IC + '}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:'+FF+'},'
    'children:i.expenseCategory||i.type||"Expense"})'
    ']})'
    ']})'
    ']})'
)

# ── CLAIM DETAILS CARD ─────────────────────────────────────────────────────────
def detail_row_exp(icon_expr, label, val_expr, val_style='', is_last=False):
    return (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,'
        'padding:"12px 0"'
        + ('' if is_last else ',borderBottom:"1px solid #f3f4f6"') +
        '},children:['
        + icon_expr + ','
        'e.jsx("span",{style:{fontSize:13,color:"#6b7280",fontFamily:'+FF+',flex:1},'
        'children:"'+label+'"}),'
        'e.jsx("span",{style:{fontSize:13,fontWeight:600,fontFamily:'+FF+',textAlign:"right"'
        + (','+val_style if val_style else '') +
        '},children:'+val_expr+'})'
        ']})'
    )

CLAIM_DETAILS = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:14,border:"1px solid #e5e7eb",'
    'background:"#fff",overflow:"hidden"},children:['
    # card header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,'
    'padding:"12px 14px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"},children:['
    + icon_sq(RECEIPT_IC, '#dcfce7', '#059669') + ','
    'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827",fontFamily:'+FF+'},'
    'children:"Claim Details"})'
    ']}),'
    'e.jsxs("div",{style:{padding:"0 14px"},children:['
    + detail_row_exp(icon_sq(USER_IC,'#eef2ff','#4f46e5'), 'Submitted By', 'i.parent||"—"', 'color:"#111827"')
    + ','
    + detail_row_exp(icon_sq(CAL_IC,'#eff6ff','#3b82f6'), 'Date',
        '(function(){var d=i.submittedOn||i.start||"";var m=d.match(/(\\d{4})-(\\d{2})-(\\d{2})/);if(m){var mo=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return mo[parseInt(m[2],10)]+" "+parseInt(m[3],10)+", "+m[1];}return (i.start||"Apr 28")+", 2026";})()',
        'color:"#111827"')
    + ','
    + detail_row_exp(icon_sq(FILTEXT_IC,'#fff7ed','#ea580c'), 'Description', 'i.description||i.purpose||"Business expense"', 'color:"#111827"')
    + ','
    # Receipts row with green chevron
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,'
    'padding:"12px 0",borderBottom:"1px solid #f3f4f6"},children:['
    + icon_sq(CLIP_IC,'#dcfce7','#059669') + ','
    'e.jsx("span",{style:{fontSize:13,color:"#6b7280",fontFamily:'+FF+',flex:1},children:"Receipts"}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:3,cursor:"pointer"},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#059669",fontFamily:'+FF+'},'
    'children:i.receiptCount||"1 Attachment"}),'
    'e.jsx(qe,{size:13,style:{color:"#059669",transform:"rotate(-90deg)"}})'
    ']})'
    ']}),'
    + detail_row_exp(icon_sq(BUILDING_IC,'#f0f9ff','#0891b2'), 'Project / Cost Center', 'i.project||"—"', 'color:"#6b7280"', True)
    + ' '
    ']})'
    ']})'
)

# ── ATTACHED RECEIPT CARD ──────────────────────────────────────────────────────
RECEIPT_CARD = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:14,border:"1px solid #e5e7eb",'
    'background:"#fff",padding:"14px"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7,marginBottom:12},children:['
    'e.jsx("div",{style:{color:"#059669"},children:' + CLIP_IC + '}),'
    'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827",fontFamily:'+FF+'},'
    'children:"Attached Receipt"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,'
    'padding:"12px",borderRadius:12,border:"1px solid #e5e7eb",background:"#f9fafb"},children:['
    + PDF_THUMB + ','
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:600,color:"#111827",fontFamily:'+FF+',margin:"0 0 3px",'
    'overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:i.receiptFile||"Entertainment_Receipt.pdf"}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:'+FF+',margin:0},'
    'children:"PDF \\u2022 "+(i.receiptSize||"245 KB")})'
    ']}),'
    'e.jsx("button",{style:{width:36,height:36,borderRadius:10,'
    'background:"#ecfdf5",border:"1px solid #a7f3d0",'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'cursor:"pointer",flexShrink:0},'
    'children:' + DOWNLOAD_IC + '})'
    ']})'
    ']})'
)

# ── COMPLIANCE BANNER ──────────────────────────────────────────────────────────
COMPLIANCE = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:12,'
    'background:"#ecfdf5",border:"1px solid #a7f3d0",'
    'padding:"12px 14px",display:"flex",alignItems:"center",gap:8},children:['
    'e.jsx("div",{style:{color:"#059669",flexShrink:0},children:' + SHIELD_CHECK + '}),'
    'e.jsx("span",{style:{fontSize:12,color:"#065f46",fontFamily:'+FF+',lineHeight:"16px"},'
    'children:"This expense claim is compliant with company policy."})'
    ']})'
)

# ── APPROVAL DECISION CARD ─────────────────────────────────────────────────────
DECISION_CARD = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:14,border:"1px solid #e5e7eb",'
    'background:"#fff",overflow:"hidden"},children:['
    'e.jsxs("div",{style:{padding:"14px 14px 0"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12},children:['
    'e.jsx("div",{style:{width:32,height:32,borderRadius:8,background:"#ecfdf5",'
    'display:"flex",alignItems:"center",justifyContent:"center"},'
    'children:' + SHIELD_SM + '}),'
    'e.jsx("span",{style:{fontSize:15,fontWeight:700,color:"#111827",fontFamily:'+FF+'},'
    'children:"Approval Decision"})'
    ']}),'
    # textarea
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",marginBottom:0},children:['
    'e.jsx("p",{style:{fontSize:12,color:"#9ca3af",fontFamily:'+FF+',margin:"10px 12px 2px",'
    'fontWeight:500},children:"Add a remark (optional)"}),'
    'e.jsx("textarea",{placeholder:"Write your remark here...",rows:3,value:j,'
    'onChange:function(ev){m(ev.target.value.slice(0,500));},style:{'
    'width:"100%",padding:"4px 12px 4px",border:"none",fontSize:13,'
    'fontFamily:'+FF+',color:"#111827",outline:"none",'
    'resize:"none",boxSizing:"border-box",display:"block"}}),'
    'e.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",'
    'padding:"2px 10px 6px"},children:['
    'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontFamily:'+FF+'},'
    'children:j.length+"/500"})'
    ']})'
    ']})'
    ']}),'
    # buttons
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
    'padding:"15px 0",border:"none",background:"#059669",'
    'fontSize:13,fontWeight:700,color:"#fff",'
    'fontFamily:'+FF+',cursor:"pointer"},children:['
    'e.jsx(ps,{size:15}),"Approve"'
    ']})'
    ']})'
    ']})'
)

# ── ASSEMBLE ───────────────────────────────────────────────────────────────────
NEW_SCREEN = (
    'if(i.approvalKind==="expense"){'
    'return e.jsxs("div",{className:"screen",'
    'style:{background:"#f3f4f6",display:"flex",flexDirection:"column"},children:['
    + HEADER + ','
    + TABS + ','
    'e.jsxs("div",{style:{flex:1,overflowY:"auto"},children:['
    + AMOUNT_CARD + ','
    + CLAIM_DETAILS + ','
    + RECEIPT_CARD + ','
    + COMPLIANCE + ','
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
    'var i={title:"Client Entertainment",approvalKind:"expense",parent:"Raj Kumar",'
    'status:"Approved",timeline:"Apr 28",start:"Apr 28",submittedOn:"2026-04-28",'
    'amount:"\\u20b92,450.00",amountWords:"Two Thousand Four Hundred Fifty Rupees Only",'
    'expenseCategory:"Expense",description:"Business expense",receiptCount:"1 Attachment",'
    'project:null,receiptFile:"Entertainment_Receipt.pdf",receiptSize:"245 KB"};'
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
