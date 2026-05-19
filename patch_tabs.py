#!/usr/bin/env python3
"""Patch hrmobileapp.html with new tab content for Comments, Live Flow, Progress Tracking, Daily Report."""

FILE = '/home/user/Harrsh25/hrmobileapp.html'

# Replacement 1: add state variables to dm function header
OLD_HEADER = (
    'function dm({task:i}){const I=Kx,f=ud,[j,m]=b.useState(""),[p,x]=b.useState("all");'
)
NEW_HEADER = (
    'function dm({task:i}){const I=Kx,f=ud,[j,m]=b.useState(""),[p,x]=b.useState("all")'
    ',[pt,xpt]=b.useState("manual"),[pp,xpp]=b.useState(0),[dr,xdr]=b.useState("manual");'
)

# Replacement 2 anchors
ANCHOR_START = (
    'I==="comments"&&e.jsxs("div",{style:{padding:"0"},children:'
    '[e.jsx("div",{style:{display:"flex",borderBottom:"1px solid #f0f1f4",'
    'padding:"0 16px",background:"#fff",position:"sticky",top:0,zIndex:5}'
)
ANCHOR_END = (
    '"none",border:"none",cursor:"pointer",padding:4,flexShrink:0},'
    'children:e.jsx(oy,{style:{width:18,height:18},style:{color:j.trim()?'
    '"#1a56db":"#d1d5db"}})})]})]}),e.jsx("div",{style:{height:16}})]})]})}'
)

# Build the new tab content as a list of strings, then join
parts = []

# ---- COMMENTS TAB ----
parts.append('I==="comments"&&e.jsxs("div",{style:{padding:0,display:"flex",flexDirection:"column",flex:1},children:[')

# Filter row
parts.append(
    'e.jsxs("div",{style:{display:"flex",borderBottom:"1px solid #f0f1f4",padding:"0 16px",'
    'background:"#fff",position:"sticky",top:0,zIndex:5},children:'
    '[{key:"all",label:"All"},{key:"mentions",label:"Mentions"},{key:"attachments",label:"Attachments"}]'
    '.map(function(T){return e.jsx("button",{onClick:function(){x(T.key)},style:{padding:"10px 10px",'
    'border:"none",background:"none",cursor:"pointer",fontSize:12,fontWeight:p===T.key?700:400,'
    'color:p===T.key?"#1a56db":"#9ca3af",fontFamily:"Inter,sans-serif",'
    'borderBottom:"2px solid "+(p===T.key?"#1a56db":"transparent"),marginBottom:-1},'
    'children:T.label},T.key)})}),'
)

# Comment list wrapper open
parts.append('e.jsxs("div",{style:{padding:"4px 0",flex:1,overflowY:"auto"},children:[')

# Comment 1 - Sarah Chen
parts.append(
    'e.jsxs("div",{key:"c1",style:{display:"flex",gap:10,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsx("div",{style:{width:32,height:32,borderRadius:"50%",background:"#16a34a",display:"flex",'
    'alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,'
    'color:"#fff",fontFamily:"Inter,sans-serif"},children:"SC"}),'
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginBottom:4},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Sarah Chen"}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"2d ago"})'
    ']}),'
    'e.jsxs("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"0 0 6px"},children:['
    '"I\'ve updated the timeline for this item. ",'
    'e.jsx("span",{style:{color:"#1a56db",fontWeight:600},children:"@Marcus Rivera"}),'
    '" can you review the new milestones?"'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:6},children:['
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",background:"#f3f4f6",borderRadius:20,fontSize:12,cursor:"pointer"},children:["👍",e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"3"})]}),'
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",background:"#f3f4f6",borderRadius:20,fontSize:12,cursor:"pointer"},children:["👎",e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"1"})]})'.replace(r'👍','👍').replace(r'👎','👎')
    + ']})'
    + ']})'
    + ']},'
)

# Comment 2 - Marcus Rivera
parts.append(
    'e.jsxs("div",{key:"c2",style:{display:"flex",gap:10,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsx("div",{style:{width:32,height:32,borderRadius:"50%",background:"#7c3aed",display:"flex",'
    'alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,'
    'color:"#fff",fontFamily:"Inter,sans-serif"},children:"MR"}),'
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginBottom:4},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Marcus Rivera"}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"2d ago"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"0 0 6px"},'
    'children:"Looks good! I\'ll adjust the dependencies on my end."}),'
    'e.jsxs("div",{style:{display:"flex",gap:6},children:['
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",background:"#f3f4f6",borderRadius:20,fontSize:12,cursor:"pointer"},children:["🔗",e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"1"})]})'.replace("🔗","🔗")
    + ']})]})]}),'
)

# Comment 3 - Aisha Patel
parts.append(
    'e.jsxs("div",{key:"c3",style:{display:"flex",gap:10,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsx("div",{style:{width:32,height:32,borderRadius:"50%",background:"#d97706",display:"flex",'
    'alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,'
    'color:"#fff",fontFamily:"Inter,sans-serif"},children:"AP"}),'
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginBottom:4},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Aisha Patel"}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"Yesterday"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"0 0 6px"},'
    'children:"Attached the updated spec document for everyone\'s reference."}),'
    'e.jsxs("div",{style:{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",'
    'background:"#f0f4ff",borderRadius:8,marginBottom:6,cursor:"pointer"},children:['
    'e.jsx("span",{style:{fontSize:14},children:"\U0001f4c4"}),'
    'e.jsxs("div",{children:['
    'e.jsx("div",{style:{fontSize:12,fontWeight:600,color:"#1a56db",fontFamily:"Inter,sans-serif"},children:"spec-v2.pdf"}),'
    'e.jsx("div",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"2.4 MB"})'
    ']})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:6},children:['
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",background:"#f3f4f6",borderRadius:20,fontSize:12,cursor:"pointer"},children:["\U0001f4ce",e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"2"})]})'.replace(r'\U0001f4ce','📎').replace(r'\U0001f4c4','📄')
    + ']})'
    + ']})'
    + ']},'
)

# Comment 4 - Jake Torres
parts.append(
    'e.jsxs("div",{key:"c4",style:{display:"flex",gap:10,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsx("div",{style:{width:32,height:32,borderRadius:"50%",background:"#1a56db",display:"flex",'
    'alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,'
    'color:"#fff",fontFamily:"Inter,sans-serif"},children:"JT"}),'
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginBottom:4},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Jake Torres"}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"5h ago"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:0},'
    'children:"Priority has been bumped to High. Let\'s make sure we\'re aligned on the deliverables before end of week."})'
    ']})'
    ']},'
)

# Comment 5 - Lena Kim
parts.append(
    'e.jsxs("div",{key:"c5",style:{display:"flex",gap:10,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsx("div",{style:{width:32,height:32,borderRadius:"50%",background:"#0d9488",display:"flex",'
    'alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,'
    'color:"#fff",fontFamily:"Inter,sans-serif"},children:"LK"}),'
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginBottom:4},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Lena Kim"}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"3h ago"})'
    ']}),'
    'e.jsxs("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"0 0 6px"},children:['
    'e.jsx("span",{style:{color:"#1a56db",fontWeight:600},children:"@Aisha Patel"}),'
    '" agreed — I\'ll prepare the summary deck."'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:6},children:['
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",background:"#f3f4f6",borderRadius:20,fontSize:12,cursor:"pointer"},children:["👍",e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"2"})]})'.replace("👍","👍")
    + ']})'
    + ']})'
    + ']},'
)

# Comment 6 - Sarah Chen 2nd
parts.append(
    'e.jsxs("div",{key:"c6",style:{display:"flex",gap:10,padding:"12px 16px"},children:['
    'e.jsx("div",{style:{width:32,height:32,borderRadius:"50%",background:"#16a34a",display:"flex",'
    'alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,'
    'color:"#fff",fontFamily:"Inter,sans-serif"},children:"SC"}),'
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginBottom:4},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Sarah Chen"}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"1h ago · edited"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"0 0 6px"},'
    'children:"All blockers cleared. Moving to the next phase."}),'
    'e.jsxs("div",{style:{display:"flex",gap:6},children:['
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",background:"#f3f4f6",borderRadius:20,fontSize:12,cursor:"pointer"},children:["👍",e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"4"})]}),'
    'e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",background:"#f3f4f6",borderRadius:20,fontSize:12,cursor:"pointer"},children:["📎",e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"2"})]})'.replace("👍","👍").replace("📎","📎")
    + ']})'
    + ']})'
    + ']})'  # close comment 6
)

# close comment list children and comment list div
parts.append(']}),')

# Sticky comment input
parts.append(
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",'
    'borderTop:"1px solid #e5e7eb",background:"#fff",position:"sticky",bottom:0,zIndex:5},children:['
    'e.jsx("input",{type:"text",value:j,onChange:function(ev){m(ev.target.value)},'
    'onKeyDown:function(ev){if(ev.key==="Enter"&&j.trim()){ye("Comment posted!");m("")}},'
    'placeholder:"Write a comment... (type @ to mention)",'
    'style:{flex:1,padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:20,fontSize:13,'
    'fontFamily:"Inter,sans-serif",outline:"none",background:"#f9fafb",color:"#111827"}}),'
    'e.jsx("button",{onClick:function(){if(j.trim()){ye("Comment posted!");m("")}},'
    'style:{padding:"8px 16px",'
    'background:j.trim()?"#1a56db":"#e5e7eb",color:j.trim()?"#fff":"#9ca3af",border:"none",'
    'borderRadius:20,fontSize:13,fontWeight:600,fontFamily:"Inter,sans-serif",'
    'cursor:j.trim()?"pointer":"default"},children:"Send"})'
    ']})'
)

# close comments tab outer div children array and outer div
parts.append(']},')

# ---- LIVE FLOW TAB ----
parts.append('I==="liveflow"&&e.jsxs("div",{style:{padding:"0 0 16px",flex:1,overflowY:"auto"},children:[')

# TODAY section
parts.append(
    'e.jsxs("div",{key:"today",children:['
    'e.jsx("div",{style:{padding:"10px 16px",fontSize:11,fontWeight:700,color:"#9ca3af",'
    'letterSpacing:"0.08em",fontFamily:"Inter,sans-serif",background:"#f9fafb",'
    'borderBottom:"1px solid #f0f1f4",borderTop:"1px solid #f0f1f4"},children:"TODAY"}),'
    # Entry 1 - Created subtask
    'e.jsxs("div",{style:{display:"flex",gap:12,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:4},children:['
    'e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"#16a34a",flexShrink:0,marginTop:2}}),'
    'e.jsx("div",{style:{width:2,flex:1,background:"#e5e7eb",minHeight:40}})'
    ']}),'
    'e.jsxs("div",{style:{flex:1,paddingBottom:4},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:2},children:['
    'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"3:02 AM"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#16a34a",background:"#dcfce7",padding:"2px 8px",borderRadius:20,fontFamily:"Inter,sans-serif"},children:"Created"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"2px 0 6px"},'
    'children:\'Subtask "Mix concrete batch" was created under "Foundation Layout".\'}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4},children:['
    'e.jsx("div",{style:{width:20,height:20,borderRadius:"50%",background:"#7c3aed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",fontFamily:"Inter,sans-serif"},children:"AM"}),'
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:"Inter,sans-serif"},children:"Arun Mohta"})'
    ']}),'
    'e.jsx("span",{style:{display:"inline-block",fontSize:11,color:"#1a56db",background:"#eff6ff",padding:"2px 8px",borderRadius:6,fontFamily:"Inter,sans-serif"},children:"Task: Foundation Layout"})'
    ']})'
    ']},'
    # Entry 2 - Updated timeline
    'e.jsxs("div",{style:{display:"flex",gap:12,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:4},children:['
    'e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"#d97706",flexShrink:0,marginTop:2}}),'
    'e.jsx("div",{style:{width:2,flex:1,background:"#e5e7eb",minHeight:40}})'
    ']}),'
    'e.jsxs("div",{style:{flex:1,paddingBottom:4},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:2},children:['
    'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"1:02 AM"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#d97706",background:"#fef3c7",padding:"2px 8px",borderRadius:20,fontFamily:"Inter,sans-serif"},children:"Updated"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"2px 0 6px"},'
    'children:\'Timeline updated on "Site Assessment".\'}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4},children:['
    'e.jsx("div",{style:{width:20,height:20,borderRadius:"50%",background:"#0d9488",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",fontFamily:"Inter,sans-serif"},children:"PS"}),'
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:"Inter,sans-serif"},children:"Priya Sharma"})'
    ']}),'
    'e.jsx("span",{style:{display:"inline-block",fontSize:11,color:"#d97706",background:"#fef3c7",padding:"2px 8px",borderRadius:6,fontFamily:"Inter,sans-serif"},children:"▶ 2 fields updated • Expand to view"})'
    ']})'
    ']})' # end entry 2
    ']},' # end today
)

# YESTERDAY section
parts.append(
    'e.jsxs("div",{key:"yesterday",children:['
    'e.jsx("div",{style:{padding:"10px 16px",fontSize:11,fontWeight:700,color:"#9ca3af",'
    'letterSpacing:"0.08em",fontFamily:"Inter,sans-serif",background:"#f9fafb",'
    'borderBottom:"1px solid #f0f1f4",borderTop:"1px solid #f0f1f4"},children:"YESTERDAY"}),'
    # Entry 3 - Completed
    'e.jsxs("div",{style:{display:"flex",gap:12,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:4},children:['
    'e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"#1a56db",flexShrink:0,marginTop:2}}),'
    'e.jsx("div",{style:{width:2,flex:1,background:"#e5e7eb",minHeight:40}})'
    ']}),'
    'e.jsxs("div",{style:{flex:1,paddingBottom:4},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:2},children:['
    'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"7:02 PM"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#1a56db",background:"#eff6ff",padding:"2px 8px",borderRadius:20,fontFamily:"Inter,sans-serif"},children:"Completed"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"2px 0 6px"},'
    'children:\'Task "Foundation Layout" was marked as completed.\'}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4},children:['
    'e.jsx("div",{style:{width:20,height:20,borderRadius:"50%",background:"#0d9488",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",fontFamily:"Inter,sans-serif"},children:"PS"}),'
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:"Inter,sans-serif"},children:"Priya Sharma"})'
    ']}),'
    'e.jsx("span",{style:{display:"inline-block",fontSize:11,color:"#1a56db",background:"#eff6ff",padding:"2px 8px",borderRadius:6,fontFamily:"Inter,sans-serif"},children:"Activity: Site Assessment"})'
    ']})'
    ']},'
    # Entry 4 - 3 fields updated
    'e.jsxs("div",{style:{display:"flex",gap:12,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:4},children:['
    'e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"#d97706",flexShrink:0,marginTop:2}}),'
    'e.jsx("div",{style:{width:2,flex:1,background:"#e5e7eb",minHeight:40}})'
    ']}),'
    'e.jsxs("div",{style:{flex:1,paddingBottom:4},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:2},children:['
    'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"7:02 AM"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#d97706",background:"#fef3c7",padding:"2px 8px",borderRadius:20,fontFamily:"Inter,sans-serif"},children:"Updated"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"2px 0 6px"},'
    'children:\'3 fields updated on "Site Assessment".\'}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4},children:['
    'e.jsx("div",{style:{width:20,height:20,borderRadius:"50%",background:"#7c3aed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",fontFamily:"Inter,sans-serif"},children:"AM"}),'
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:"Inter,sans-serif"},children:"Arun Mohta"})'
    ']}),'
    'e.jsx("span",{style:{display:"inline-block",fontSize:11,color:"#d97706",background:"#fef3c7",padding:"2px 8px",borderRadius:6,fontFamily:"Inter,sans-serif"},children:"▶ 3 fields updated • Expand to view"})'
    ']})'
    ']})' # end entry 4
    ']},' # end yesterday
)

# MAY 17, 2026 section
parts.append(
    'e.jsxs("div",{key:"may17",children:['
    'e.jsx("div",{style:{padding:"10px 16px",fontSize:11,fontWeight:700,color:"#9ca3af",'
    'letterSpacing:"0.08em",fontFamily:"Inter,sans-serif",background:"#f9fafb",'
    'borderBottom:"1px solid #f0f1f4",borderTop:"1px solid #f0f1f4"},children:"MAY 17, 2026"}),'
    # Entry 5 - Created task
    'e.jsxs("div",{style:{display:"flex",gap:12,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:4},children:['
    'e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"#16a34a",flexShrink:0,marginTop:2}}),'
    'e.jsx("div",{style:{width:2,flex:1,background:"#e5e7eb",minHeight:40}})'
    ']}),'
    'e.jsxs("div",{style:{flex:1,paddingBottom:4},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:2},children:['
    'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"7:02 PM"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#16a34a",background:"#dcfce7",padding:"2px 8px",borderRadius:20,fontFamily:"Inter,sans-serif"},children:"Created"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"2px 0 6px"},'
    'children:\'Task "Foundation Layout" was created under "Site Assessment".\'}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4},children:['
    'e.jsx("div",{style:{width:20,height:20,borderRadius:"50%",background:"#7c3aed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",fontFamily:"Inter,sans-serif"},children:"AM"}),'
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:"Inter,sans-serif"},children:"Arun Mohta"})'
    ']}),'
    'e.jsx("span",{style:{display:"inline-block",fontSize:11,color:"#1a56db",background:"#eff6ff",padding:"2px 8px",borderRadius:6,fontFamily:"Inter,sans-serif"},children:"Activity: Site Assessment"})'
    ']})'
    ']},'
    # Entry 6 - Priority Changed
    'e.jsxs("div",{style:{display:"flex",gap:12,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:4},children:['
    'e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"#7c3aed",flexShrink:0,marginTop:2}}),'
    'e.jsx("div",{style:{width:2,flex:1,background:"#e5e7eb",minHeight:40}})'
    ']}),'
    'e.jsxs("div",{style:{flex:1,paddingBottom:4},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:2},children:['
    'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"7:02 AM"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#7c3aed",background:"#f5f3ff",padding:"2px 8px",borderRadius:20,fontFamily:"Inter,sans-serif"},children:"Priority Changed"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"2px 0 6px"},'
    'children:\'Priority changed on "Site Assessment".\'}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4},children:['
    'e.jsx("div",{style:{width:20,height:20,borderRadius:"50%",background:"#0d9488",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",fontFamily:"Inter,sans-serif"},children:"PS"}),'
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",fontFamily:"Inter,sans-serif"},children:"Priya Sharma"})'
    ']}),'
    'e.jsxs("div",{style:{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontFamily:"Inter,sans-serif"},children:['
    'e.jsx("span",{style:{color:"#6b7280"},children:"Priority:"}),'
    'e.jsx("span",{style:{color:"#6b7280",background:"#f3f4f6",padding:"1px 6px",borderRadius:4,fontSize:11},children:"Low"}),'
    'e.jsx("span",{style:{color:"#6b7280",margin:"0 2px"},children:"→"}),'
    'e.jsx("span",{style:{color:"#dc2626",background:"#fee2e2",padding:"1px 6px",borderRadius:4,fontSize:11,fontWeight:600},children:"High"})'
    ']}'
    ']})'
    ']})' # end entry 6
    ']},' # end may17
)

# MAY 16, 2026 section
parts.append(
    'e.jsxs("div",{key:"may16",children:['
    'e.jsx("div",{style:{padding:"10px 16px",fontSize:11,fontWeight:700,color:"#9ca3af",'
    'letterSpacing:"0.08em",fontFamily:"Inter,sans-serif",background:"#f9fafb",'
    'borderBottom:"1px solid #f0f1f4",borderTop:"1px solid #f0f1f4"},children:"MAY 16, 2026"}),'
    # Entry 7 - Created activity
    'e.jsxs("div",{style:{display:"flex",gap:12,padding:"12px 16px",borderBottom:"1px solid #f9fafb"},children:['
    'e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"#16a34a",flexShrink:0,marginTop:14}}),'
    'e.jsxs("div",{style:{flex:1,paddingBottom:4},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:2},children:['
    'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"7:02 AM"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#16a34a",background:"#dcfce7",padding:"2px 8px",borderRadius:20,fontFamily:"Inter,sans-serif"},children:"Created"})'
    ']}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",fontFamily:"Inter,sans-serif",lineHeight:"18px",margin:"2px 0"},'
    'children:\'Activity "Site Assessment" was created.\'})'
    ']})'
    ']})'  # end entry 7 and children
    ']})'  # end may16 div
)

# close liveflow children array and outer div
parts.append(']},')

# ---- PROGRESS TRACKING TAB ----
parts.append('I==="progress"&&e.jsxs("div",{style:{padding:"12px 16px",flex:1,overflowY:"auto"},children:[')

# Sub-tab pills
parts.append(
    'e.jsxs("div",{style:{display:"flex",gap:0,marginBottom:16,border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"},children:'
    '["manual","quantity"].map(function(T){return e.jsx("button",{onClick:function(){xpt(T)},style:{'
    'flex:1,padding:"9px 0",border:"none",background:pt===T?"#eff6ff":"#fff",'
    'color:pt===T?"#1a56db":"#6b7280",fontSize:13,fontWeight:pt===T?600:400,'
    'fontFamily:"Inter,sans-serif",cursor:"pointer",borderRight:T==="manual"?"1px solid #e5e7eb":"none"},'
    'children:T==="manual"?"Manual Entry":"Quantity Based"},T)})'
    '}),'
)

# Label row
parts.append(
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},children:['
    'e.jsx("label",{style:{fontSize:13,fontWeight:600,color:"#374151",fontFamily:"Inter,sans-serif"},children:"Add Progress (%)"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#1a56db",fontFamily:"Inter,sans-serif"},children:"Current Progress: 40%"})'
    ']},'
)

# Number input + %
parts.append(
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12},children:['
    'e.jsx("input",{type:"number",min:0,max:100,value:pp,'
    'onChange:function(ev){var v=parseInt(ev.target.value)||0;xpp(Math.min(100,Math.max(0,v)))},'
    'style:{width:80,padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:14,'
    'fontFamily:"Inter,sans-serif",outline:"none",textAlign:"center"}}),'
    'e.jsx("span",{style:{fontSize:14,fontWeight:600,color:"#374151",fontFamily:"Inter,sans-serif"},children:"%"})'
    ']},'
)

# Progress bar
parts.append(
    'e.jsxs("div",{style:{marginBottom:4},children:['
    'e.jsx("div",{style:{width:"100%",height:10,background:"#e5e7eb",borderRadius:20,overflow:"hidden",marginBottom:4},children:'
    'e.jsx("div",{style:{width:"40%",height:"100%",background:"#1a56db",borderRadius:20,transition:"width 0.3s"}})}),'
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:['
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"0%"}),'
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"100%"})'
    ']}'
    ']},'
)

# Helper text
parts.append(
    'e.jsx("p",{style:{fontSize:12,color:"#9ca3af",fontFamily:"Inter,sans-serif",marginBottom:16},'
    'children:"Enter progress made today. Now total will be 40%."}),'
)

# Remark label
parts.append(
    'e.jsx("label",{style:{fontSize:13,fontWeight:600,color:"#374151",fontFamily:"Inter,sans-serif",display:"block",marginBottom:6},children:"Remark"}),'
)

# Textarea
parts.append(
    'e.jsx("textarea",{rows:3,placeholder:"Describe today\'s progress...",style:{width:"100%",padding:"8px 12px",'
    'border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontFamily:"Inter,sans-serif",'
    'outline:"none",resize:"vertical",boxSizing:"border-box",marginBottom:12}}),'
)

# Attach button
parts.append(
    'e.jsxs("button",{style:{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",'
    'border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer",'
    'fontSize:13,fontFamily:"Inter,sans-serif",color:"#374151",marginBottom:16},children:['
    'e.jsx("span",{style:{fontSize:16},children:"\U0001f4ce"}),'
    '"Attach"'
    ']},'
)

# Bottom row
parts.append(
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:['
    'e.jsx("span",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif"},children:"Saving adds an entry to the Daily Report."}),'
    'e.jsx("button",{onClick:function(){ye("Progress saved!")},style:{padding:"9px 18px",'
    'background:"#1a56db",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},children:"Save Progress"})'
    ']}'
)

# close progress tab
parts.append(']},')

# ---- DAILY REPORT TAB ----
parts.append('I==="dailyreport"&&e.jsxs("div",{style:{padding:"12px 16px",flex:1,overflowY:"auto"},children:[')

# Sub-tab pills
parts.append(
    'e.jsxs("div",{style:{display:"flex",gap:0,marginBottom:16,border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"},children:'
    '["manual","quantity"].map(function(T){return e.jsx("button",{onClick:function(){xdr(T)},style:{'
    'flex:1,padding:"9px 0",border:"none",background:dr===T?"#eff6ff":"#fff",'
    'color:dr===T?"#1a56db":"#6b7280",fontSize:13,fontWeight:dr===T?600:400,'
    'fontFamily:"Inter,sans-serif",cursor:"pointer",borderRight:T==="manual"?"1px solid #e5e7eb":"none"},'
    'children:T==="manual"?"Manual Entry":"Quantity Based"},T)})'
    '}),'
)

# Table
parts.append(
    'e.jsx("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden",marginBottom:16},children:'
    'e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"Inter,sans-serif"},children:['
    'e.jsx("thead",{children:'
    'e.jsxs("tr",{style:{background:"#f9fafb"},children:'
    '["Date","Progress Added","Total Progress","Remark","Attachments"].map(function(h){return e.jsx("th",{style:{padding:"10px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #e5e7eb",whiteSpace:"nowrap"},children:h},h)})'
    '})}),'
    'e.jsx("tbody",{children:'
    'e.jsxs("tr",{children:['
    'e.jsx("td",{style:{padding:"10px 10px",color:"#374151",borderBottom:"1px solid #f3f4f6",whiteSpace:"nowrap"},children:"Mar 06, 2026"}),'
    'e.jsx("td",{style:{padding:"10px 10px",color:"#16a34a",fontWeight:600,borderBottom:"1px solid #f3f4f6"},children:"+40%"}),'
    'e.jsx("td",{style:{padding:"10px 10px",color:"#374151",borderBottom:"1px solid #f3f4f6"},children:"40%"}),'
    'e.jsx("td",{style:{padding:"10px 10px",color:"#374151",borderBottom:"1px solid #f3f4f6",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:"Work in progress — initial deliverables submi..."}),'
    'e.jsx("td",{style:{padding:"10px 10px",color:"#9ca3af",borderBottom:"1px solid #f3f4f6",textAlign:"center"},children:"—"})'
    ']})'
    '})]})'
    '}),'
)

# Bottom action buttons
parts.append(
    'e.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",gap:8},children:['
    'e.jsxs("button",{style:{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",'
    'border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer",'
    'fontSize:13,fontFamily:"Inter,sans-serif",color:"#374151"},children:['
    'e.jsx("span",{style:{fontSize:14},children:"➕"}),'
    '"Add Report"'
    ']}),'
    'e.jsxs("button",{style:{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",'
    'border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer",'
    'fontSize:13,fontFamily:"Inter,sans-serif",color:"#374151"},children:['
    'e.jsx("span",{style:{fontSize:14},children:"⬇"}),'
    '"Export Report"'
    ']}'
    ']}'
)

# close daily report tab
parts.append(']},')

# Closing spacer - must match exactly what the original file needs
parts.append('e.jsx("div",{style:{height:16}})]})]})}'  )

NEW_TABS = ''.join(parts)


def main():
    with open(FILE, 'r', encoding='utf-8') as fh:
        content = fh.read()

    original_size = len(content)
    print(f"Original file size: {original_size:,} bytes")

    # Replacement 1
    count1 = content.count(OLD_HEADER)
    if count1 == 0:
        raise ValueError("ERROR: Replacement 1 anchor NOT found!")
    if count1 > 1:
        raise ValueError(f"ERROR: Replacement 1 anchor found {count1} times (expected 1)!")

    content = content.replace(OLD_HEADER, NEW_HEADER, 1)
    print("Replacement 1 OK: dm function header updated")

    # Replacement 2
    start_pos = content.find(ANCHOR_START)
    if start_pos == -1:
        raise ValueError("ERROR: Replacement 2 start anchor NOT found!")
    print(f"Replacement 2 start at: {start_pos}")

    end_anchor_pos = content.find(ANCHOR_END, start_pos)
    if end_anchor_pos == -1:
        raise ValueError("ERROR: Replacement 2 end anchor NOT found!")

    end_pos = end_anchor_pos + len(ANCHOR_END)
    old_len = end_pos - start_pos
    print(f"Replacement 2 end at: {end_pos}  (old section: {old_len:,} chars, new: {len(NEW_TABS):,} chars)")

    content = content[:start_pos] + NEW_TABS + content[end_pos:]

    new_size = len(content)
    print(f"New file size: {new_size:,} bytes  (delta: {new_size - original_size:+,})")

    # Verifications
    assert NEW_HEADER in content, "FAIL: NEW_HEADER not in output"
    assert OLD_HEADER not in content, "FAIL: OLD_HEADER still in output"
    assert ANCHOR_START not in content, "FAIL: old tab start still in output"
    print("All verifications passed.")

    with open(FILE, 'w', encoding='utf-8') as fh:
        fh.write(content)

    print("File written successfully.")


if __name__ == '__main__':
    main()
