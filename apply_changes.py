#!/usr/bin/env python3
import sys

FILE = '/home/user/Harrsh25/hrmobileapp.html'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
print(f"Original file size: {original_len} bytes")

changes = []

# ── Change 1: Remove bell notification icon ──────────────────────────────────
c1_old = (
    'i==="swap-requests"&&e.jsxs("div",{style:{position:"relative"},children:'
    '[e.jsx("button",{style:{width:36,height:36,borderRadius:10,background:"#f3f4f6",'
    'border:"none",display:"flex",alignItems:"center",justifyContent:"center",'
    'cursor:"pointer"},children:e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",'
    'fill:"none",stroke:"#374151",strokeWidth:2,children:e.jsxs("g",{children:'
    '[e.jsx("path",{d:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"}),'
    'e.jsx("path",{d:"M13.73 21a2 2 0 0 1-3.46 0"})]})})}),e.jsx("div",{style:'
    '{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",'
    'background:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center"},'
    'children:e.jsx("span",{style:{fontSize:13,fontWeight:500,color:"#fff"},children:"3"})})]})'
)
c1_new = ''
cnt1 = content.count(c1_old)
content = content.replace(c1_old, c1_new)
changes.append(('Change 1 (bell notification)', cnt1, 1))

# ── Change 2: Remove lines/filter icon buttons (appears TWICE) ───────────────
c2_old = (
    ',e.jsx("div",{style:{width:34,height:34,borderRadius:10,background:"#fff",'
    'border:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",'
    'cursor:"pointer"},children:e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",'
    'fill:"none",stroke:"#374151",strokeWidth:2,children:e.jsxs("g",{children:'
    '[e.jsx("line",{x1:21,y1:10,x2:7,y2:10}),e.jsx("line",{x1:21,y1:6,x2:3,y2:6}),'
    'e.jsx("line",{x1:21,y1:14,x2:11,y2:14}),e.jsx("line",{x1:21,y1:18,x2:15,y2:18})]})})})'
)
c2_new = ''
cnt2 = content.count(c2_old)
content = content.replace(c2_old, c2_new)
changes.append(('Change 2 (filter icon, expect 2)', cnt2, 2))

# ── Change 3: Remove reason from swap request cards ──────────────────────────
c3_old = (
    ',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6},'
    'children:[e.jsx("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",'
    'stroke:"#9ca3af",strokeWidth:2,children:e.jsxs("g",{children:[e.jsx("path",'
    '{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
    'e.jsx("polyline",{points:"14 2 14 8 20 8"}),e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),'
    'e.jsx("line",{x1:16,y1:17,x2:8,y2:17})]})}),e.jsxs("span",{style:{fontSize:13,'
    'color:"#6b7280"},children:["Reason: ",e.jsx("span",{style:{fontWeight:600,'
    'color:"#111827"},children:g.reason})]})]})'
)
c3_new = ''
cnt3 = content.count(c3_old)
content = content.replace(c3_old, c3_new)
changes.append(('Change 3 (reason from swap cards)', cnt3, 1))

# ── Change 4: Remove "Via:" from swap cards ───────────────────────────────────
c4_old = ',e.jsx("p",{style:{fontSize:13,color:"#9ca3af",margin:"0 0 10px"},children:"Via: "+g.supervisorName})'
c4_new = ''
cnt4 = content.count(c4_old)
content = content.replace(c4_old, c4_new)
changes.append(('Change 4 (Via: from swap cards)', cnt4, 1))

# ── Change 5: Remove reason + divider from changes cards ─────────────────────
c5_old = (
    ',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:10},'
    'children:[e.jsx("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",'
    'stroke:"#9ca3af",strokeWidth:2,children:e.jsxs("g",{children:[e.jsx("path",'
    '{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
    'e.jsx("polyline",{points:"14 2 14 8 20 8"}),e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),'
    'e.jsx("line",{x1:16,y1:17,x2:8,y2:17})]})}),e.jsxs("span",{style:{fontSize:13,'
    'color:"#111827"},children:["Reason: ",e.jsx("span",{style:{fontWeight:500,'
    'color:"#6b7280"},children:g.reason})]})]}),e.jsx("div",{style:{height:1,'
    'background:"#f3f4f6",marginBottom:10}}),'
)
c5_new = ''
cnt5 = content.count(c5_old)
content = content.replace(c5_old, c5_new)
changes.append(('Change 5 (reason+divider from changes cards)', cnt5, 1))

# ── Change 6: Add dropdown state variables ────────────────────────────────────
c6_old = (
    'var _stateCvOpen=b.useState(false);\n'
    '  var _cvOpen=_stateCvOpen[0],_setCvOpen=_stateCvOpen[1];\n'
    '  // Status filters'
)
c6_new = (
    'var _stateCvOpen=b.useState(false);\n'
    '  var _cvOpen=_stateCvOpen[0],_setCvOpen=_stateCvOpen[1];\n'
    '  var _stateSwDd=b.useState(false);\n'
    '  var _swDd=_stateSwDd[0],_setSwDd=_stateSwDd[1];\n'
    '  var _stateChDd=b.useState(false);\n'
    '  var _chDd=_stateChDd[0],_setChDd=_stateChDd[1];\n'
    '  // Status filters'
)
cnt6 = content.count(c6_old)
content = content.replace(c6_old, c6_new)
changes.append(('Change 6 (dropdown state vars)', cnt6, 1))

# ── Change 7: Change swap filter to dropdown ──────────────────────────────────
c7_old = (
    '(function(){var _swStatuses=["all","pending","approved","declined"];'
    'var _swNext=_swStatuses[(_swStatuses.indexOf(_swFlt)+1)%_swStatuses.length];'
    'var _swLabel=_swFlt==="all"?"All Status":_swFlt.charAt(0).toUpperCase()+_swFlt.slice(1);'
    'var _swActive=_swFlt!=="all";return e.jsxs("div",{onClick:function(){_setSwFlt(_swNext);},'
    'style:{display:"flex",alignItems:"center",gap:6,background:_swActive?"#eff4ff":"#fff",'
    'border:"1px solid "+(_swActive?"#1a56db":"#e5e7eb"),borderRadius:10,padding:"6px 12px",'
    'cursor:"pointer"},children:[e.jsx("span",{style:{fontSize:13,fontWeight:600,'
    'color:_swActive?"#1a56db":"#111827"},children:_swLabel}),e.jsx("svg",{width:12,height:12,'
    'viewBox:"0 0 24 24",fill:"none",stroke:_swActive?"#1a56db":"#374151",strokeWidth:2,'
    'children:e.jsxs("g",{children:[e.jsx("polyline",{points:"6 9 12 15 18 9"})]})})]});})() '
)
c7_new = (
    '(function(){var _swStatuses=["all","pending","approved","declined"];'
    'var _swLabel=_swFlt==="all"?"All Status":_swFlt.charAt(0).toUpperCase()+_swFlt.slice(1);'
    'var _swActive=_swFlt!=="all";return e.jsxs("div",{style:{position:"relative"},children:'
    '[e.jsxs("div",{onClick:function(ev){ev.stopPropagation();_setSwDd(!_swDd);},style:'
    '{display:"flex",alignItems:"center",gap:6,background:_swActive?"#eff4ff":"#fff",'
    'border:"1px solid "+(_swActive?"#1a56db":"#e5e7eb"),borderRadius:10,padding:"6px 12px",'
    'cursor:"pointer"},children:[e.jsx("span",{style:{fontSize:13,fontWeight:600,'
    'color:_swActive?"#1a56db":"#111827"},children:_swLabel}),e.jsx("svg",{width:12,height:12,'
    'viewBox:"0 0 24 24",fill:"none",stroke:_swActive?"#1a56db":"#374151",strokeWidth:2,'
    'children:e.jsxs("g",{children:[e.jsx("polyline",{points:"6 9 12 15 18 9"})]})})]})'
    ',_swDd&&e.jsxs("div",{style:{position:"absolute",top:"100%",left:0,zIndex:200,'
    'background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,'
    'boxShadow:"0 4px 16px rgba(0,0,0,0.10)",minWidth:140,padding:"4px",marginTop:4},'
    'children:[_swStatuses.map(function(s){return e.jsx("div",{onClick:function(){'
    '_setSwFlt(s);_setSwDd(false);},style:{padding:"8px 12px",borderRadius:7,cursor:"pointer",'
    'background:_swFlt===s?"#eff4ff":"transparent",color:_swFlt===s?"#1a56db":"#374151",'
    'fontSize:13,fontWeight:_swFlt===s?700:500},children:s==="all"?"All Status":'
    's.charAt(0).toUpperCase()+s.slice(1)},s);})]})]});})() '
)
cnt7 = content.count(c7_old)
content = content.replace(c7_old, c7_new)
changes.append(('Change 7 (swap filter to dropdown)', cnt7, 1))

# ── Change 8: Change changes filter to dropdown ───────────────────────────────
c8_old = (
    '(function(){var _chStatuses=["all","pending","approved","rejected"];'
    'var _chNext=_chStatuses[(_chStatuses.indexOf(_chFlt)+1)%_chStatuses.length];'
    'var _chLabel=_chFlt==="all"?"All Status":_chFlt.charAt(0).toUpperCase()+_chFlt.slice(1);'
    'var _chActive=_chFlt!=="all";return e.jsxs("div",{onClick:function(){_setChFlt(_chNext);},'
    'style:{display:"flex",alignItems:"center",gap:6,background:_chActive?"#eff4ff":"#fff",'
    'border:"1px solid "+(_chActive?"#1a56db":"#e5e7eb"),borderRadius:10,padding:"6px 12px",'
    'cursor:"pointer"},children:[e.jsx("span",{style:{fontSize:13,fontWeight:600,'
    'color:_chActive?"#1a56db":"#111827"},children:_chLabel}),e.jsx("svg",{width:12,height:12,'
    'viewBox:"0 0 24 24",fill:"none",stroke:_chActive?"#1a56db":"#374151",strokeWidth:2,'
    'children:e.jsxs("g",{children:[e.jsx("polyline",{points:"6 9 12 15 18 9"})]})})]});})() '
)
c8_new = (
    '(function(){var _chStatuses=["all","pending","approved","rejected"];'
    'var _chLabel=_chFlt==="all"?"All Status":_chFlt.charAt(0).toUpperCase()+_chFlt.slice(1);'
    'var _chActive=_chFlt!=="all";return e.jsxs("div",{style:{position:"relative"},children:'
    '[e.jsxs("div",{onClick:function(ev){ev.stopPropagation();_setChDd(!_chDd);},style:'
    '{display:"flex",alignItems:"center",gap:6,background:_chActive?"#eff4ff":"#fff",'
    'border:"1px solid "+(_chActive?"#1a56db":"#e5e7eb"),borderRadius:10,padding:"6px 12px",'
    'cursor:"pointer"},children:[e.jsx("span",{style:{fontSize:13,fontWeight:600,'
    'color:_chActive?"#1a56db":"#111827"},children:_chLabel}),e.jsx("svg",{width:12,height:12,'
    'viewBox:"0 0 24 24",fill:"none",stroke:_chActive?"#1a56db":"#374151",strokeWidth:2,'
    'children:e.jsxs("g",{children:[e.jsx("polyline",{points:"6 9 12 15 18 9"})]})})]})'
    ',_chDd&&e.jsxs("div",{style:{position:"absolute",top:"100%",left:0,zIndex:200,'
    'background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,'
    'boxShadow:"0 4px 16px rgba(0,0,0,0.10)",minWidth:140,padding:"4px",marginTop:4},'
    'children:[_chStatuses.map(function(s){return e.jsx("div",{onClick:function(){'
    '_setChFlt(s);_setChDd(false);},style:{padding:"8px 12px",borderRadius:7,cursor:"pointer",'
    'background:_chFlt===s?"#eff4ff":"transparent",color:_chFlt===s?"#1a56db":"#374151",'
    'fontSize:13,fontWeight:_chFlt===s?700:500},children:s==="all"?"All Status":'
    's.charAt(0).toUpperCase()+s.slice(1)},s);})]})]});})() '
)
cnt8 = content.count(c8_old)
content = content.replace(c8_old, c8_new)
changes.append(('Change 8 (changes filter to dropdown)', cnt8, 1))

# ── Change 9a: Compact swap stats cards padding (borderRight variants) ────────
c9a_old = 'style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"12px 6px",borderRight:"1px solid #f3f4f6"}'
c9a_new = 'style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 4px",borderRight:"1px solid #f3f4f6"}'
cnt9a = content.count(c9a_old)
content = content.replace(c9a_old, c9a_new)
changes.append(('Change 9a (stats card padding with borderRight, expect 3)', cnt9a, 3))

# ── Change 9b: Compact swap stats cards padding (no borderRight variant) ──────
c9b_old = 'style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"12px 6px"}'
c9b_new = 'style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 4px"}'
cnt9b = content.count(c9b_old)
content = content.replace(c9b_old, c9b_new)
changes.append(('Change 9b (stats card padding without borderRight, expect 1)', cnt9b, 1))

# ── Change 9c: Compact icon circle sizes ──────────────────────────────────────
c9c_old = 'style:{width:40,height:40,borderRadius:"50%"'
c9c_new = 'style:{width:32,height:32,borderRadius:"50%"'
cnt9c = content.count(c9c_old)
content = content.replace(c9c_old, c9c_new)
changes.append(('Change 9c (icon circle 40->32, replace all)', cnt9c, None))

# ── Change 9d: Compact stats SVG sizes ────────────────────────────────────────
c9d_old = 'width:22,height:22,viewBox:"0 0 24 24"'
c9d_new = 'width:16,height:16,viewBox:"0 0 24 24"'
cnt9d = content.count(c9d_old)
content = content.replace(c9d_old, c9d_new)
changes.append(('Change 9d (stats SVG 22->16, replace all)', cnt9d, None))

# ── Change 10: Compact swap request card outer style ─────────────────────────
c10_old = 'style:{background:"#fff",borderRadius:16,border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",padding:"14px",cursor:"pointer"}'
c10_new = 'style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",padding:"10px",cursor:"pointer"}'
cnt10 = content.count(c10_old)
content = content.replace(c10_old, c10_new)
changes.append(('Change 10 (swap card padding 14->10)', cnt10, None))

# ── Change 11: Compact changes card outer style ───────────────────────────────
c11_old = 'style:{background:"#fff",borderRadius:16,border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",borderLeft:"4px solid "+stCol,padding:"14px 14px 14px 12px"}'
c11_new = 'style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",borderLeft:"4px solid "+stCol,padding:"10px 10px 10px 8px"}'
cnt11 = content.count(c11_old)
content = content.replace(c11_old, c11_new)
changes.append(('Change 11 (changes card padding 14->10)', cnt11, None))

# ── Print summary ─────────────────────────────────────────────────────────────
print("\n=== Change counts ===")
all_ok = True
for name, found, expected in changes:
    status = ""
    if expected is not None:
        if found == expected:
            status = "OK"
        else:
            status = f"MISMATCH (expected {expected})"
            all_ok = False
    else:
        status = f"found {found}"
    print(f"  {name}: {found} -> {status}")

print(f"\nNew file size: {len(content)} bytes (delta {len(content)-original_len:+d})")

if all_ok:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("\nFile saved successfully.")
else:
    print("\nWARNING: Some patterns had unexpected counts. File saved anyway for inspection.")
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
