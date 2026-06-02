import re

content = open('hrmobileapp.html').read()

OLD_START = 811977
OLD_END   = 817149  # includes the closing '});' + '}' of the if block

old_check_start = 'if(i.approvalKind==="leave"){return e.jsxs("div",{className:'
old_check_end   = '4})," Approve"]})]})]}),e.jsx("div",{style:{height:16}})]})]});}if'

assert content[OLD_START:OLD_START+len(old_check_start)] == old_check_start, "START mismatch"
assert content[OLD_END-len(old_check_end):OLD_END] == old_check_end, f"END mismatch: got {content[OLD_END-len(old_check_end):OLD_END]!r}"

# ---- Helper: small inline SVG factory ----
def isvg(w, h, vb, paths_str, extra=''):
    return (
        'e.jsx("svg",{width:'+str(w)+',height:'+str(h)+',viewBox:"'+vb+'",'
        'fill:"none",stroke:"currentColor",strokeWidth:1.5,'
        'strokeLinecap:"round",strokeLinejoin:"round"'
        + ((','+extra) if extra else '') +
        ',children:'+paths_str+'})'
    )

# Calendar icon SVG
CALENDAR_IC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
    'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
    'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
    'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
    ']})'
)

# FileText icon SVG
FILECLOCK_IC = isvg(14, 14, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
    'e.jsx("polyline",{points:"14 2 14 8 20 8"}),'
    'e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),'
    'e.jsx("line",{x1:16,y1:17,x2:8,y2:17}),'
    'e.jsx("polyline",{points:"10 9 9 9 8 9"})'
    ']})'
)

# Paperclip icon SVG
PAPERCLIP_IC = isvg(14, 14, '0 0 24 24',
    'e.jsx("path",{d:"M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"})'
)

# Upload icon SVG
UPLOAD_IC = isvg(13, 13, '0 0 24 24',
    'e.jsxs("g",{children:['
    'e.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),'
    'e.jsx("polyline",{points:"17 8 12 3 7 8"}),'
    'e.jsx("line",{x1:12,y1:3,x2:12,y2:15})'
    ']})'
)

# ---- Status chip colors ----
# use JS ternary for status color
STATUS_CHIP = (
    'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:3,'
    'fontSize:11,fontWeight:700,'
    'color:i.status==="Rejected"?"#dc2626":i.status==="Approved!"?"#16a34a":"#d97706",'
    'background:i.status==="Rejected"?"#fef2f2":i.status==="Approved!"?"#f0fdf4":"#fffbeb",'
    'borderRadius:20,padding:"4px 10px",'
    'border:i.status==="Rejected"?"1px solid #fecaca":i.status==="Approved!"?"1px solid #bbf7d0":"1px solid #fed7aa",'
    'fontFamily:"Inter,sans-serif",flexShrink:0},children:['
    'e.jsx(so,{size:12}),'
    '"\\u00a0"+(i.status||"Pending")'
    ']})'
)

# ---- Header ----
# Avatar circle with initials from parent name
AVATAR = (
    'e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",'
    'background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'flexShrink:0,color:"#fff",fontSize:13,fontWeight:700,fontFamily:"Inter,sans-serif"},'
    'children:(i.parent||"?").split(" ").map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase()})'
)

HEADER = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:8,'
    'padding:"48px 16px 14px",background:"#fff",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsx("button",{onClick:()=>le("approvals"),style:{background:"none",border:"none",'
    'cursor:"pointer",padding:"6px 4px 0 0",flexShrink:0},'
    'children:e.jsx(ke,{size:22,color:"#374151"})}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif",margin:"0 0 6px"},children:i.title}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    + AVATAR + ','
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:600,color:"#111827",'
    'fontFamily:"Inter,sans-serif",margin:0},children:i.parent||"—"}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",'
    'fontFamily:"Inter,sans-serif",margin:"1px 0 0"},'
    'children:(i.role||"Employee")+" • "+(i.department||"Engineering")})'
    ']})'
    ']})'
    ']}),'
    + STATUS_CHIP +
    ']})'
)

# ---- Tabs row ----
TABS = (
    'e.jsxs("div",{style:{display:"flex",gap:0,background:"#fff",'
    'borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,'
    'padding:"10px 16px",borderBottom:"2px solid #1a56db",'
    'color:"#1a56db",fontSize:12,fontWeight:600,fontFamily:"Inter,sans-serif",cursor:"pointer"},children:['
    'e.jsx(fg,{size:13}),'
    '"Leave Request"'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,'
    'padding:"10px 16px",borderBottom:"2px solid transparent",'
    'color:"#6b7280",fontSize:12,fontWeight:500,fontFamily:"Inter,sans-serif",cursor:"pointer"},children:['
    + CALENDAR_IC + ','
    'i.timeline||i.start||"—"'
    ']})'
    ']})'
)

# ---- Leave Details card ----
LABEL_STYLE = (
    '{fontSize:10,fontWeight:700,color:"#9ca3af",fontFamily:"Inter,sans-serif",'
    'letterSpacing:"0.07em",marginBottom:3,textTransform:"uppercase"}'
)
VAL_STYLE_DARK = (
    '{fontSize:14,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:0}'
)
VAL_STYLE_RED = (
    '{fontSize:13,fontWeight:600,color:"#dc2626",fontFamily:"Inter,sans-serif",margin:0}'
)
VAL_STYLE_MED = (
    '{fontSize:13,fontWeight:600,color:"#374151",fontFamily:"Inter,sans-serif",margin:0}'
)

# Duration helper: try to compute days, fallback to ""
DAYS_LABEL = (
    '(i.days?(" ("+i.days+")"):(i.start===i.end?" (1 day)":""))'
)

LEAVE_DETAILS_CARD = (
    'e.jsxs("div",{style:{margin:"14px 14px 0",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"},children:['
    # card header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7,'
    'padding:"12px 14px 10px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsx("div",{style:{color:"#6b7280"},' + 'children:' + FILECLOCK_IC + '}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},'
    'children:"Leave Details"})'
    ']}),'
    # 2x2 grid
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0},children:['
    # FROM
    'e.jsxs("div",{style:{padding:"12px 14px",borderRight:"1px solid #f3f4f6",borderBottom:"1px solid #f3f4f6"},children:['
    'e.jsx("p",{style:' + LABEL_STYLE + ',children:"From"}),'
    'e.jsx("p",{style:' + VAL_STYLE_DARK + ',children:i.start||"—"}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:"Inter,sans-serif",margin:"2px 0 0"},'
    'children:' + DAYS_LABEL + '})'
    ']}),'
    # TO
    'e.jsxs("div",{style:{padding:"12px 14px",borderBottom:"1px solid #f3f4f6"},children:['
    'e.jsx("p",{style:' + LABEL_STYLE + ',children:"To"}),'
    'e.jsx("p",{style:' + VAL_STYLE_DARK + ',children:i.end||"—"}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:"Inter,sans-serif",margin:"2px 0 0"},'
    'children:' + DAYS_LABEL + '})'
    ']}),'
    # LEAVE TYPE
    'e.jsxs("div",{style:{padding:"12px 14px",borderRight:"1px solid #f3f4f6"},children:['
    'e.jsx("p",{style:' + LABEL_STYLE + ',children:"Leave Type"}),'
    'e.jsx("p",{style:' + VAL_STYLE_RED + ',children:i.title||i.type||"Leave"})'
    ']}),'
    # SUBMITTED ON
    'e.jsxs("div",{style:{padding:"12px 14px"},children:['
    'e.jsx("p",{style:' + LABEL_STYLE + ',children:"Submitted On"}),'
    'e.jsx("p",{style:' + VAL_STYLE_MED + ',children:i.submittedOn||"—"})'
    ']}) '
    ']}),'
    # REASON row
    'e.jsxs("div",{style:{padding:"12px 14px",background:"#fef9f9",borderTop:"1px solid #fee2e2"},children:['
    'e.jsx("p",{style:' + LABEL_STYLE + ',children:"Reason"}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:0},'
    'children:i.reason||"Personal reasons"})'
    ']}),'
    # Available Balance row
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",'
    'padding:"11px 14px",background:"#eff6ff",borderTop:"1px solid #dbeafe"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
    'e.jsx("div",{style:{width:7,height:7,borderRadius:"50%",background:"#1a56db"}}),'
    'e.jsx("span",{style:{fontSize:12,color:"#1e40af",fontFamily:"Inter,sans-serif",fontWeight:500},'
    'children:"Available Leave Balance"})'
    ']}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#1a56db",fontFamily:"Inter,sans-serif"},'
    'children:i.balance||"12 days"})'
    ']}) '
    ']})'
)

# ---- Supporting Document card ----
SUPPORT_DOC_CARD = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7,'
    'padding:"12px 14px 10px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsx("div",{style:{color:"#6b7280"},children:' + PAPERCLIP_IC + '}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},'
    'children:"Supporting Document"})'
    ']}),'
    'e.jsxs("div",{style:{padding:"14px 14px",display:"flex",alignItems:"center",'
    'justifyContent:"space-between",gap:10,'
    'border:"1.5px dashed #d1d5db",margin:12,borderRadius:10,background:"#fafafa"},children:['
    'e.jsx("span",{style:{fontSize:12,color:"#9ca3af",fontFamily:"Inter,sans-serif"},'
    'children:"No file attached"}),'
    'e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,'
    'padding:"5px 12px",borderRadius:8,border:"1px solid #1a56db",'
    'background:"#fff",color:"#1a56db",fontSize:12,fontWeight:600,'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},children:['
    + UPLOAD_IC + '," Upload"'
    ']})'
    ']})'
    ']})'
)

# ---- Approval Decision card ----
DECISION_CARD = (
    'e.jsxs("div",{style:{margin:"12px 14px 0",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7,'
    'padding:"12px 14px 10px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"},children:['
    'e.jsx("div",{style:{color:"#6b7280"},children:e.jsx(eo,{size:14})}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},'
    'children:"Approval Decision"})'
    ']}),'
    'e.jsxs("div",{style:{padding:"14px"},children:['
    # textarea wrapper
    'e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",marginBottom:12},children:['
    'e.jsx("textarea",{placeholder:"Add a remark...",rows:3,value:j,onChange:function(ev){m(ev.target.value.slice(0,500));},style:{'
    'width:"100%",padding:"10px 12px",border:"none",fontSize:13,'
    'fontFamily:"Inter,sans-serif",color:"#111827",outline:"none",'
    'resize:"none",boxSizing:"border-box",display:"block"}}),'
    'e.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",'
    'padding:"4px 10px 6px",background:"#f9fafb",borderTop:"1px solid #f3f4f6"},children:['
    'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontFamily:"Inter,sans-serif"},'
    'children:j.length+"/500"})'
    ']})'
    ']}),'
    # buttons
    'e.jsxs("div",{style:{display:"flex",gap:8,justifyContent:"flex-end"},children:['
    'e.jsxs("button",{onClick:function(){ye("Rejected");le("approvals");},style:{'
    'display:"flex",alignItems:"center",gap:5,padding:"10px 20px",'
    'borderRadius:10,border:"1.5px solid #dc2626",background:"#fff",'
    'fontSize:13,fontWeight:600,color:"#dc2626",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},children:['
    'e.jsx(mt,{size:14})," Reject"'
    ']}),'
    'e.jsxs("button",{onClick:function(){ye("Approved!");le("approvals");},style:{'
    'display:"flex",alignItems:"center",gap:5,padding:"10px 20px",'
    'borderRadius:10,border:"none",background:"#1a56db",'
    'fontSize:13,fontWeight:600,color:"#fff",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},children:['
    'e.jsx(ps,{size:14})," Approve"'
    ']}) '
    ']})'
    ']})'
    ']})'
)

# ---- Assemble full screen ----
NEW_SCREEN = (
    'if(i.approvalKind==="leave"){return e.jsxs("div",{className:"screen",'
    'style:{background:"#f3f4f6",display:"flex",flexDirection:"column"},children:['
    + HEADER + ','
    + TABS + ','
    'e.jsxs("div",{style:{flex:1,overflowY:"auto"},children:['
    + LEAVE_DETAILS_CARD + ','
    + SUPPORT_DOC_CARD + ','
    + DECISION_CARD + ','
    'e.jsx("div",{style:{height:24}})'
    ']})'
    ']})'
    '}'
)

print("NEW length:", len(NEW_SCREEN))

# Validate brackets
opens = NEW_SCREEN.count('{') + NEW_SCREEN.count('(') + NEW_SCREEN.count('[')
closes = NEW_SCREEN.count('}') + NEW_SCREEN.count(')') + NEW_SCREEN.count(']')
print(f"opens={opens} closes={closes} delta={opens-closes}")

# ---- Node.js syntax check ----
import subprocess, tempfile, os
STUBS = (
    'var e={jsx:function(){},jsxs:function(){}};'
    'var i={title:"Sick Leave",type:"Leave",parent:"Raj Kumar",parentIcon:"",start:"Apr 18",end:"Apr 18",status:"Rejected",submittedOn:"2026-04-16",timeline:"Apr 18",reason:"",balance:"",role:"",department:"",days:""};'
    'var le=function(){};var ye=function(){};'
    'var b={useState:function(){return ["",function(){}];}};'
    'var ke={},fg={},eo={},so={},mt={},ps={};'
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
else:
    print("Syntax OK")

# ---- Apply patch ----
new_content = content[:OLD_START] + NEW_SCREEN + content[OLD_END:]
assert len(new_content) > len(content) - 1000
open('hrmobileapp.html', 'w').write(new_content)
print("Patched. New file size:", len(new_content))
