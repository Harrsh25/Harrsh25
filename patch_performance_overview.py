#!/usr/bin/env python3
"""Replace Performance Overview tab with pixel-perfect UI from reference image."""
import subprocess, re, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = '_tab==="overview"&&e.jsxs("div",{className:"space-y-3"'
END_STR   = ',_tab==="development"&&e.js'
assert content.count(START_STR) == 1, 'START not unique'
assert content.count(END_STR) == 1, 'END not unique'

START = content.find(START_STR)
END   = content.find(END_STR, START)
OLD   = content[START:END]
ob_o,op_o,sq_o = delta(OLD)
print('OLD: len=%d delta: ob=%d op=%d sq=%d' % (len(OLD), ob_o, op_o, sq_o))

# ── Section 1: Overall Score Card ─────────────────────────────────────────────
SCORE_CARD = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:['
      # Circular ring
      'e.jsxs("svg",{width:100,height:100,viewBox:"0 0 100 100",children:['
        'e.jsx("circle",{cx:50,cy:50,r:40,fill:"none",stroke:"#e5e7eb",strokeWidth:8}),'
        'e.jsx("circle",{cx:50,cy:50,r:40,fill:"none",stroke:_scCol,strokeWidth:8,'
          'strokeDasharray:(2*Math.PI*40*_score/100).toFixed(1)+" "+(2*Math.PI*40*(1-_score/100)).toFixed(1),'
          'strokeLinecap:"round",transform:"rotate(-90 50 50)"}),'
        'e.jsx("text",{x:50,y:47,textAnchor:"middle",fontSize:22,fontWeight:"bold",fill:"#111827",children:_score}),'
        'e.jsx("text",{x:50,y:61,textAnchor:"middle",fontSize:11,fill:"#9ca3af",children:"/100"})'
      ']}),'
      # Middle: label + badge + note
      'e.jsxs("div",{style:{flex:1},children:['
        'e.jsx("p",{style:{fontSize:15,fontWeight:700,color:"#111827",marginBottom:8},children:"Overall Score"}),'
        'e.jsxs("div",{style:{display:"inline-flex",alignItems:"center",gap:4,background:"#dcfce7",'
          'borderRadius:8,padding:"4px 10px",marginBottom:8},children:['
          'e.jsx("span",{style:{fontSize:12,color:"#16a34a"},children:"\\u2B50"}),'
          'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#16a34a"},children:_rank})'
        ']}),'
        'e.jsx("p",{style:{fontSize:10,color:"#9ca3af"},children:"Last 30 days \\u24D8"})'
      ']}),'
      # Right: sparkline + delta
      'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4},children:['
        'e.jsxs("svg",{width:72,height:44,viewBox:"0 0 72 44",children:['
          'e.jsxs("defs",{children:['
            'e.jsxs("linearGradient",{id:"spkg",x1:"0",y1:"0",x2:"0",y2:"1",children:['
              'e.jsx("stop",{offset:"0%",stopColor:"#1a56db",stopOpacity:"0.18"}),'
              'e.jsx("stop",{offset:"100%",stopColor:"#1a56db",stopOpacity:"0"})'
            ']})'
          ']}),'
          'e.jsx("path",{d:"M0,38 C10,30 15,35 22,26 C28,18 35,28 44,20 C52,13 60,16 72,4 L72,44 L0,44 Z",'
            'fill:"url(#spkg)"}),'
          'e.jsx("path",{d:"M0,38 C10,30 15,35 22,26 C28,18 35,28 44,20 C52,13 60,16 72,4",'
            'fill:"none",stroke:"#1a56db",strokeWidth:2,strokeLinecap:"round"}),'
          'e.jsx("circle",{cx:72,cy:4,r:4,fill:"#1a56db"})'
        ']}),'
        'e.jsxs("p",{style:{fontSize:13,fontWeight:700,color:"#16a34a",margin:0},children:["\\u2191 ",Math.max(1,Math.round(_score/8))," pts"]}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",margin:0},children:"vs previous 30 days"})'
      ']})'
    ']})'
  ']})'
)

# ── Section 2: 2×2 Metric Cards ───────────────────────────────────────────────
def stat_card(onclick, bg_icon, icon_comp, label, val_jsx, desc, badge_txt, badge_col, badge_bg, extra=''):
    return (
      'e.jsxs("button",{onClick:' + onclick + ',className:"card p-3 text-left",children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
          'e.jsx("span",{style:{background:"'+bg_icon+'",borderRadius:10,padding:"7px",display:"flex"},children:'+icon_comp+'}),'
          'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#374151"},children:"'+label+'"})'
        ']}),'
        'e.jsxs("p",{style:{fontSize:24,fontWeight:800,color:"#111827",margin:"0 0 2px"},children:['+val_jsx+']}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:8},children:"'+desc+'"}),'+
        extra+
        'e.jsx("div",{style:{background:"'+badge_bg+'",borderRadius:6,padding:"4px 8px",textAlign:"center"},'
          'children:e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"'+badge_col+'"},children:"'+badge_txt+'"})})'
      ']})'
    )

TASKS_EXTRA = (
  'e.jsxs("div",{style:{marginBottom:6},children:['
    'e.jsx("div",{style:{width:"100%",height:4,background:"#e5e7eb",borderRadius:2,overflow:"hidden"},children:'
      'e.jsx("div",{style:{width:_outputPct+"%",height:"100%",background:"#1a56db",borderRadius:2}})'
    '}),'
    'e.jsx("p",{style:{fontSize:10,color:"#1a56db",marginTop:3},children:_outputPct+"% completion"})'
  ']}),'
)

UTIL_BADGE = '_utilPct>=100?"Above target":_utilPct>=80?"On target":"Below target"'
UTIL_BADGE_COL = '_utilPct>=80?"#16a34a":"#dc2626"'
UTIL_BADGE_BG  = '_utilPct>=80?"#dcfce7":"#fee2e2"'

METRICS = (
  'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:['
    # Tasks
    'e.jsxs("button",{onClick:function(){_setDet({k:"tasks",t:"My Tasks"});},className:"card p-3 text-left",children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
        'e.jsx("span",{style:{background:"#EFF4FF",borderRadius:10,padding:"7px",display:"flex"},'
          'children:e.jsx(Ks,{size:14,color:"#1a56db"})}),'
        'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#374151"},children:"Tasks"})'
      ']}),'
      'e.jsxs("p",{style:{fontSize:24,fontWeight:800,color:"#111827",margin:"0 0 2px"},children:['
        '_doneTasks.length,'
        'e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"/"+_myTasks.length})'
      ']}),'
      'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:8},children:"Completed"}),'
      'e.jsxs("div",{style:{marginBottom:6},children:['
        'e.jsx("div",{style:{width:"100%",height:4,background:"#e5e7eb",borderRadius:2,overflow:"hidden"},'
          'children:e.jsx("div",{style:{width:_outputPct+"%",height:"100%",background:"#1a56db",borderRadius:2}})}),'
        'e.jsx("p",{style:{fontSize:10,color:"#1a56db",marginTop:3},children:_outputPct+"% completion"})'
      ']})'
    ']}),'\
    # Utilization
    'e.jsxs("button",{onClick:function(){_setDet({k:"util",t:"Utilization"});},className:"card p-3 text-left",children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
        'e.jsx("span",{style:{background:"#fef3c7",borderRadius:10,padding:"7px",display:"flex"},'
          'children:e.jsx(Q1,{size:14,color:"#d97706"})}),'
        'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#374151"},children:"Utilization"})'
      ']}),'
      'e.jsxs("p",{style:{fontSize:24,fontWeight:800,color:"#111827",margin:"0 0 2px"},children:['
        '_utilPct,e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"%"})'
      ']}),'
      'e.jsxs("p",{style:{fontSize:10,color:"#6b7280",marginBottom:8},children:[_totalHrs.toFixed(0),"h logged"]}),'
      'e.jsx("div",{style:{background:_utilPct>=80?"#dcfce7":"#fee2e2",borderRadius:6,padding:"4px 8px",textAlign:"center"},'
        'children:e.jsx("span",{style:{fontSize:11,fontWeight:600,color:_utilPct>=80?"#16a34a":"#dc2626"},'
          'children:_utilPct>=100?"Above target":_utilPct>=80?"On target":"Below target"})})'
    ']}),'\
    # Output
    'e.jsxs("button",{onClick:function(){_setDet({k:"tasks",t:"Output"});},className:"card p-3 text-left",children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
        'e.jsx("span",{style:{background:"#dcfce7",borderRadius:10,padding:"7px",display:"flex"},'
          'children:e.jsx(Yu,{size:14,color:"#16a34a"})}),'
        'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#374151"},children:"Output"})'
      ']}),'
      'e.jsxs("p",{style:{fontSize:24,fontWeight:800,color:"#111827",margin:"0 0 2px"},children:['
        '_outputPct,e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"%"})'
      ']}),'
      'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:8},children:"Completion rate"}),'
      'e.jsx("div",{style:{background:_outputPct>=60?"#dcfce7":"#fee2e2",borderRadius:6,padding:"4px 8px",textAlign:"center"},'
        'children:e.jsx("span",{style:{fontSize:11,fontWeight:600,color:_outputPct>=60?"#16a34a":"#dc2626"},'
          'children:_outputPct>=80?"Excellent":_outputPct>=60?"On target":"Below target"})})'
    ']}),'\
    # Attendance
    'e.jsxs("button",{onClick:function(){_setDet({k:"att",t:"Attendance"});},className:"card p-3 text-left",children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
        'e.jsx("span",{style:{background:"#ede9fe",borderRadius:10,padding:"7px",display:"flex"},'
          'children:e.jsx(vt,{size:14,color:"#7c3aed"})}),'
        'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#374151"},children:"Attendance"})'
      ']}),'
      'e.jsxs("p",{style:{fontSize:24,fontWeight:800,color:"#111827",margin:"0 0 2px"},children:['
        '_attPct,e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"%"})'
      ']}),'
      'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:8},children:"Attendance rate"}),'
      'e.jsx("div",{style:{background:_attPct>=90?"#dcfce7":_attPct>=75?"#fef9c3":"#fee2e2",borderRadius:6,padding:"4px 8px",textAlign:"center"},'
        'children:e.jsx("span",{style:{fontSize:11,fontWeight:600,color:_attPct>=90?"#16a34a":_attPct>=75?"#d97706":"#dc2626"},'
          'children:_attPct>=90?"Excellent":_attPct>=75?"Good":"Low"})})'
    ']})'
  ']})'
)

# ── Section 3: Goal Progress ───────────────────────────────────────────────────
GOALS = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx("span",{style:{background:"#EFF4FF",borderRadius:10,padding:"7px",display:"flex"},'
          'children:e.jsx(wt,{size:14,color:"#1a56db"})}),'
        'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Goal Progress"})'
      ']}),'
      'e.jsxs("p",{style:{fontSize:18,fontWeight:800,color:"#1a56db",margin:0},children:[_avgGP,"%"]})'
    ']}),'
    # Progress bar
    'e.jsx("div",{style:{width:"100%",height:8,background:"#e5e7eb",borderRadius:4,overflow:"hidden",marginBottom:12},'
      'children:e.jsx("div",{style:{width:_avgGP+"%",height:"100%",'
        'background:"linear-gradient(90deg,#1a56db,#60a5fa)",borderRadius:4}})}),'
    # Status pills
    'e.jsxs("div",{style:{display:"flex",gap:8},children:['
      'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",gap:5,'
        'background:"#f0fdf4",borderRadius:8,padding:"6px 10px"},children:['
        'e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:"#16a34a",flexShrink:0}}),'
        'e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:"#16a34a"},children:[_otG.length," On Track"]})'
      ']}),'
      'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",gap:5,'
        'background:"#fffbeb",borderRadius:8,padding:"6px 10px"},children:['
        'e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:"#d97706",flexShrink:0}}),'
        'e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:"#d97706"},children:[_arG.length," At Risk"]})'
      ']}),'
      'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",gap:5,'
        'background:"#fff1f2",borderRadius:8,padding:"6px 10px"},children:['
        'e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:"#dc2626",flexShrink:0}}),'
        'e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:"#dc2626"},children:[_bhG.length," Behind"]})'
      ']})'
    ']})'
  ']})'
)

# ── Section 4: Productivity Card ──────────────────────────────────────────────
PRODUCTIVITY = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx("span",{style:{fontSize:20},children:"\\u26A1"}),'
        'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Productivity"})'
      ']}),'
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#EFF4FF",'
        'borderRadius:8,padding:"4px 10px"},children:['
        'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#1a56db"},children:"This Month"}),'
        'e.jsx("span",{style:{fontSize:11,color:"#1a56db"},children:"\\u2304"})'
      ']})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center"},children:['
      'e.jsxs("div",{style:{flex:1,textAlign:"center"},children:['
        'e.jsxs("p",{style:{fontSize:28,fontWeight:800,color:"#1a56db",margin:"0 0 2px"},children:[_inProg.length]}),'
        'e.jsx("p",{style:{fontSize:11,color:"#6b7280",margin:0},children:"In Progress"})'
      ']}),'
      'e.jsx("div",{style:{width:1,height:40,background:"#f0f1f4"}}),'
      'e.jsxs("div",{style:{flex:1,textAlign:"center"},children:['
        'e.jsxs("p",{style:{fontSize:28,fontWeight:800,color:"#16a34a",margin:"0 0 2px"},children:[_doneTasks.length]}),'
        'e.jsx("p",{style:{fontSize:11,color:"#6b7280",margin:0},children:"Done"})'
      ']}),'
      'e.jsx("div",{style:{width:1,height:40,background:"#f0f1f4"}}),'
      'e.jsxs("div",{style:{flex:1,textAlign:"center"},children:['
        'e.jsxs("p",{style:{fontSize:28,fontWeight:800,color:"#7c3aed",margin:"0 0 2px"},children:[_totalHrs.toFixed(0),"h"]}),'
        'e.jsx("p",{style:{fontSize:11,color:"#6b7280",margin:0},children:"Hours Logged"})'
      ']})'
    ']})'
  ']})'
)

# ── Section 5: Charts Row ─────────────────────────────────────────────────────
# Performance Trend line chart - use IIFE for local JS var _ty
TREND_CHART = (
  '(function(){'
    'var _ty=Math.max(5,Math.round(80-_score*0.7));'
    'var _ty2=Math.max(27,_ty+22);'
    'var _pts="0,42 27,38 53,44 80,36 107,40 133,38 160,"+_ty;'
    'var _pth="M0,42 L27,38 L53,44 L80,36 L107,40 L133,38 L160,"+_ty+" L160,80 L0,80 Z";'
    'return e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"14px",'
      'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",margin:0},children:"Performance Trend"}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:3,background:"#f3f4f6",borderRadius:6,padding:"3px 8px"},children:['
          'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"6M"}),'
          'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"\\u25BE"})'
        ']})'
      ']}),'
      'e.jsxs("div",{style:{display:"flex",gap:4},children:['
        'e.jsxs("div",{style:{display:"flex",flexDirection:"column",justifyContent:"space-between",height:80,paddingRight:2},children:['
          'e.jsx("span",{style:{fontSize:8,color:"#9ca3af"},children:"100"}),'
          'e.jsx("span",{style:{fontSize:8,color:"#9ca3af"},children:"75"}),'
          'e.jsx("span",{style:{fontSize:8,color:"#9ca3af"},children:"50"}),'
          'e.jsx("span",{style:{fontSize:8,color:"#9ca3af"},children:"25"}),'
          'e.jsx("span",{style:{fontSize:8,color:"#9ca3af"},children:"0"})'
        ']}),'
        'e.jsxs("div",{style:{flex:1},children:['
          'e.jsxs("svg",{width:"100%",height:80,viewBox:"0 0 160 80",preserveAspectRatio:"none",children:['
            'e.jsxs("defs",{children:['
              'e.jsxs("linearGradient",{id:"trdg",x1:"0",y1:"0",x2:"0",y2:"1",children:['
                'e.jsx("stop",{offset:"0%",stopColor:"#1a56db",stopOpacity:"0.15"}),'
                'e.jsx("stop",{offset:"100%",stopColor:"#1a56db",stopOpacity:"0"})'
              ']})'
            ']}),'
            'e.jsx("path",{d:_pth,fill:"url(#trdg)"}),'
            'e.jsx("polyline",{points:_pts,fill:"none",stroke:"#1a56db",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"}),'
            'e.jsx("circle",{cx:160,cy:_ty,r:4,fill:"#1a56db"}),'
            'e.jsxs("g",{children:['
              'e.jsx("rect",{x:118,y:_ty-22,width:40,height:18,rx:4,fill:"#EFF4FF"}),'
              'e.jsxs("text",{x:138,y:_ty-10,textAnchor:"middle",fontSize:8,fontWeight:"bold",fill:"#1a56db",children:[_score," \\u25BE"]})'
            ']})'
          ']}),'
          'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginTop:4},children:['
            '["Oct","Nov","Dec","Jan","Feb","Mar"].map(function(m,i){return e.jsx("span",{style:{fontSize:8,color:"#9ca3af"},children:m},i);})'
          ']})'
        ']})'
      ']})'
    ']});'
  '})()'
)

# Score Breakdown donut chart
BREAKDOWN_CHART = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"14px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:10},children:"Score Breakdown"}),'
    # Donut SVG
    '(function(){'
      'var _tot=Gt.length||1;'
      'var _pA=_otG.length/_tot,_pO=_arG.length/_tot,_pB=_bhG.length/_tot,_pN=Math.max(0,1-_pA-_pO-_pB);'
      'var R=32,cx=40,cy=40,sw=14;'
      'var C=2*Math.PI*R;'
      'var dA=C*_pA,dO=C*_pO,dB=C*_pB,dN=C*_pN;'
      'var offA=C*0.25,offO=offA-dA,offB=offO-dO,offN=offB-dB;'
      'return e.jsxs("svg",{width:80,height:80,viewBox:"0 0 80 80",style:{margin:"0 auto",display:"block"},children:['
        'e.jsx("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:"#e5e7eb",strokeWidth:sw}),'
        '_pA>0?e.jsx("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:"#1a56db",strokeWidth:sw,'
          'strokeDasharray:dA.toFixed(1)+" "+(C-dA).toFixed(1),strokeDashoffset:offA.toFixed(1),'
          'transform:"rotate(-90 40 40)"}):null,'
        '_pO>0?e.jsx("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:"#f59e0b",strokeWidth:sw,'
          'strokeDasharray:dO.toFixed(1)+" "+(C-dO).toFixed(1),strokeDashoffset:offO.toFixed(1),'
          'transform:"rotate(-90 40 40)"}):null,'
        '_pB>0?e.jsx("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:"#dc2626",strokeWidth:sw,'
          'strokeDasharray:dB.toFixed(1)+" "+(C-dB).toFixed(1),strokeDashoffset:offB.toFixed(1),'
          'transform:"rotate(-90 40 40)"}):null,'
        '_pN>0?e.jsx("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:"#d1d5db",strokeWidth:sw,'
          'strokeDasharray:dN.toFixed(1)+" "+(C-dN).toFixed(1),strokeDashoffset:offN.toFixed(1),'
          'transform:"rotate(-90 40 40)"}):null'
      ']});'
    '})(),'
    # Legend
    'e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:"6px 10px",marginTop:8},children:['
      '[{c:"#1a56db",l:"Above"},{c:"#f59e0b",l:"At Target"},{c:"#dc2626",l:"Below"},{c:"#d1d5db",l:"Not Started"}]'
        '.map(function(item,i){return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
          'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:item.c,flexShrink:0}}),'
          'e.jsx("span",{style:{fontSize:9,color:"#6b7280"},children:item.l})'
        ']},i);})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",borderTop:"1px solid #f3f4f6",marginTop:8,paddingTop:8},children:['
      'e.jsx("span",{style:{fontSize:11,color:"#374151"},children:"Total Goals"}),'
      'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#111827"},children:Gt.length})'
    ']})'
  ']})'
)

CHARTS_ROW = (
  'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:['
  + TREND_CHART + ','
  + BREAKDOWN_CHART
  + ']})'
)

# ── Section 6: Additional Insights ───────────────────────────────────────────
INSIGHTS = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},children:['
      'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",margin:0},children:"Additional Insights"}),'
      'e.jsx("button",{style:{fontSize:11,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer"},children:"View All"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:10,overflowX:"auto",paddingBottom:4},children:['
      # Team Rank
      'e.jsxs("div",{style:{minWidth:120,background:"#f8f9fb",borderRadius:12,padding:"12px"},children:['
        'e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
          'children:e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"#7c3aed",strokeWidth:2,'
            'children:e.jsxs("g",{children:[e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),e.jsx("circle",{cx:9,cy:7,r:4})]})})}), '
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",margin:"0 0 2px"},children:"Team Rank"}),'
        'e.jsxs("p",{style:{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 4px"},children:["#",_score>=90?1:_score>=75?2:_score>=60?4:6]}),'
        'e.jsxs("p",{style:{fontSize:10,color:"#16a34a",margin:0},children:["\\u2191 2 vs last month"]})'
      ']}),'
      # Avg Daily Hours
      'e.jsxs("div",{style:{minWidth:120,background:"#f8f9fb",borderRadius:12,padding:"12px"},children:['
        'e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"#e0f2fe",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
          'children:e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"#0891b2",strokeWidth:2,'
            'children:e.jsxs("g",{children:[e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("polyline",{points:"12 6 12 12 16 14"})]})})}), '
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",margin:"0 0 2px"},children:"Avg. Daily Hours"}),'
        'e.jsxs("p",{style:{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 4px"},children:[(_wd.length?(_totalHrs/_wd.length):0).toFixed(1),"h"]}),'
        'e.jsxs("p",{style:{fontSize:10,color:"#dc2626",margin:0},children:["\\u2193 0.5h vs last month"]})'
      ']}),'
      # Quality Score
      'e.jsxs("div",{style:{minWidth:120,background:"#f8f9fb",borderRadius:12,padding:"12px"},children:['
        'e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
          'children:e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2,'
            'children:e.jsxs("g",{children:[e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}),e.jsx("polyline",{points:"9 12 11 14 15 10"})]})})}), '
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",margin:"0 0 2px"},children:"Quality Score"}),'
        'e.jsxs("p",{style:{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 4px"},children:[_avgSc||92,"%"]}),'
        'e.jsxs("p",{style:{fontSize:10,color:"#16a34a",margin:0},children:["\\u2191 6% vs last month"]})'
      ']}),'
      # Consistency
      'e.jsxs("div",{style:{minWidth:120,background:"#f8f9fb",borderRadius:12,padding:"12px"},children:['
        'e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8},'
          'children:e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"#d97706",strokeWidth:2,'
            'children:e.jsxs("g",{children:[e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})]})})}), '
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",margin:"0 0 2px"},children:"Consistency"}),'
        'e.jsxs("p",{style:{fontSize:20,fontWeight:800,color:"#111827",margin:"0 0 4px"},children:[_punctPct||85,"%"]}),'
        'e.jsxs("p",{style:{fontSize:10,color:"#16a34a",margin:0},children:["\\u2191 10% vs last month"]})'
      ']})'
    ']}),'
    # Pagination dots
    'e.jsxs("div",{style:{display:"flex",justifyContent:"center",gap:6,marginTop:12},children:['
      'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:"#1a56db"}}),'
      'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:"#d1d5db"}}),'
      'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:"#d1d5db"}})'
    ']})'
  ']})'
)

# ── Assemble NEW ───────────────────────────────────────────────────────────────
NEW_VIEW = (
  'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"4px 0 0"},children:['
  + SCORE_CARD + ','
  + METRICS + ','
  + GOALS + ','
  + PRODUCTIVITY + ','
  + CHARTS_ROW + ','
  + INSIGHTS
  + ']})'
)

ob_v,op_v,sq_v = delta(NEW_VIEW)
print('NEW_VIEW delta:', ob_v, op_v, sq_v)
if ob_v!=0 or op_v!=0 or sq_v!=0:
    print('NEW_VIEW IMBALANCED'); exit(1)

NEW = '_tab==="overview"&&' + NEW_VIEW
ob_n,op_n,sq_n = delta(NEW)
print('NEW delta:', ob_n, op_n, sq_n)

if (ob_n,op_n,sq_n) != (ob_o,op_o,sq_o):
    print('DELTA MISMATCH'); exit(1)

content2 = content[:START] + NEW + content[END:]
ob_g,op_g,sq_g = delta(content2)
print('global: ob=%d op=%d sq=%d' % (ob_g, op_g, sq_g))
if ob_g!=0 or op_g!=0 or sq_g!=0:
    print('GLOBAL IMBALANCE'); exit(1)

m_re = re.search(r'<script[^>]*>([\s\S]*?)</script>', content2)
script = m_re.group(1) if m_re else content2
with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as tf:
    tf.write('try{new Function(' + repr(script) + ')}catch(e){process.stdout.write("ERR:"+e.message)}\nprocess.stdout.write("OK")')
    tname = tf.name
r = subprocess.run(['node', tname], capture_output=True, text=True)
os.unlink(tname)
node_out = r.stdout + r.stderr
print('Node:', node_out[:140])
if 'OK' in node_out and 'ERR' not in node_out:
    with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
        f.write(content2)
    print('Done.')
else:
    print('Node FAILED')
