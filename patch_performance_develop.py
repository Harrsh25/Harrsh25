#!/usr/bin/env python3
"""Replace Performance Development tab with pixel-perfect UI."""
import subprocess, re, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = '_tab==="development"&&e.jsxs("div",{className:"space-y-3"'
END_STR   = ',_tab==="recognition"&&e.jsxs("div",{className:"sp'
assert content.count(START_STR) == 1, 'START not unique'
assert content.count(END_STR) == 1, 'END not unique'

START = content.find(START_STR)
END   = content.find(END_STR, START)
OLD   = content[START:END]
ob_o,op_o,sq_o = delta(OLD)
print('OLD: len=%d delta: ob=%d op=%d sq=%d' % (len(OLD), ob_o, op_o, sq_o))

# ── BANNER: Overall Development ───────────────────────────────────────────────
BANNER = (
  '(function(){'
    'var _tot=c0.length;'
    'var _cmpN=_compC.length;'
    'var _enrN=c0.filter(function(c){return c.myStatus==="enrolled"||c.myStatus==="self-enrolled";}).length;'
    'var _inpN=c0.filter(function(c){return c.myStatus==="enrolled";}).length;'
    'var _ovPct=_tot?Math.round(_cmpN/_tot*100):0;'
    'var R=38,C=2*Math.PI*R;'
    'return e.jsxs("div",{style:{background:"linear-gradient(135deg,#1a56db 0%,#1e40af 70%,#312e81 100%)",'
      'borderRadius:20,padding:"20px 16px 20px",position:"relative",overflow:"hidden",marginBottom:4},children:['
      # Background decorative circles
      'e.jsx("div",{style:{position:"absolute",top:-30,right:-30,width:120,height:120,'
        'borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}),'
      'e.jsx("div",{style:{position:"absolute",bottom:-20,right:60,width:80,height:80,'
        'borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}),'
      # Content row
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,position:"relative"},children:['
        # Circular ring
        'e.jsxs("div",{style:{flexShrink:0,textAlign:"center"},children:['
          'e.jsxs("svg",{width:90,height:90,viewBox:"0 0 90 90",children:['
            'e.jsx("circle",{cx:45,cy:45,r:R,fill:"none",stroke:"rgba(255,255,255,0.2)",strokeWidth:7}),'
            'e.jsx("circle",{cx:45,cy:45,r:R,fill:"none",stroke:"#ffffff",strokeWidth:7,'
              'strokeDasharray:(C*_ovPct/100).toFixed(1)+" "+(C*(1-_ovPct/100)).toFixed(1),'
              'strokeLinecap:"round",transform:"rotate(-90 45 45)"}),'
            'e.jsxs("text",{x:45,y:41,textAnchor:"middle",fontSize:18,fontWeight:"bold",fill:"#ffffff",children:[_ovPct,"%"]}),'
            'e.jsx("text",{x:45,y:56,textAnchor:"middle",fontSize:7.5,fill:"rgba(255,255,255,0.8)",children:"Overall Progress"})'
          ']})'
        ']}),'
        # Middle: title + badge + stats
        'e.jsxs("div",{style:{flex:1},children:['
          'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#ffffff",marginBottom:8},children:"Overall Development"}),'
          'e.jsxs("div",{style:{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(255,255,255,0.15)",'
            'borderRadius:20,padding:"4px 10px",marginBottom:12},children:['
            'e.jsx("span",{style:{color:"#4ade80",fontSize:12,fontWeight:700},children:"\\u2191 12% vs last month"})'
          ']}),'
          'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:6},children:['
            'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
              'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"rgba(255,255,255,0.8)",strokeWidth:2,'
                'children:e.jsxs("g",{children:[e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),e.jsx("circle",{cx:9,cy:7,r:4}),e.jsx("path",{d:"M23 21v-2a4 4 0 0 0-3-3.87"}),e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})]})}), '
              'e.jsxs("span",{style:{fontSize:12,color:"#ffffff"},children:['
                'e.jsx("span",{style:{fontWeight:800},children:_tot})," ","Enrolled"'
              ']})'
            ']}),'
            'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
              'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"rgba(255,255,255,0.8)",strokeWidth:2,'
                'children:e.jsxs("g",{children:[e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}),e.jsx("polyline",{points:"9 12 11 14 15 10"})]})}), '
              'e.jsxs("span",{style:{fontSize:12,color:"#ffffff"},children:['
                'e.jsx("span",{style:{fontWeight:800},children:_cmpN})," ","Completed"'
              ']})'
            ']}),'
            'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
              'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"rgba(255,255,255,0.8)",strokeWidth:2,'
                'children:e.jsxs("g",{children:[e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("polyline",{points:"12 6 12 12 16 14"})]})}), '
              'e.jsxs("span",{style:{fontSize:12,color:"#ffffff"},children:['
                'e.jsx("span",{style:{fontWeight:800},children:_inpN})," ","In Progress"'
              ']})'
            ']})'
          ']})'
        ']}),'
        # Right: graduation cap emoji
        'e.jsx("div",{style:{fontSize:44,lineHeight:1,flexShrink:0,alignSelf:"flex-end"},children:"\\uD83C\\uDF93"})'
      ']})'
    ']});'
  '})()'
)
ob_b,op_b,sq_b = delta(BANNER)
print('BANNER delta:', ob_b, op_b, sq_b)

# ── LEARNING SECTION ──────────────────────────────────────────────────────────
# Course icon SVGs by category
def course_icon(bg, stroke, path_d):
    return (
      'e.jsx("div",{style:{width:46,height:46,borderRadius:12,background:"'+bg+'",'
        'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",'
          'stroke:"'+stroke+'",strokeWidth:2,children:e.jsx("path",{d:"'+path_d+'"})})})'
    )

COURSE_ICONS = {
    'Project Management': ('e.jsx("div",{style:{width:46,height:46,borderRadius:12,background:"#EFF4FF",'
        'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",'
          'stroke:"#1a56db",strokeWidth:2,children:e.jsxs("g",{children:['
          'e.jsx("line",{x1:18,y1:20,x2:18,y2:10}),'
          'e.jsx("line",{x1:12,y1:20,x2:12,y2:4}),'
          'e.jsx("line",{x1:6,y1:20,x2:6,y2:14})'
        ']})})})'),
    'Safety': ('e.jsx("div",{style:{width:46,height:46,borderRadius:12,background:"#dcfce7",'
        'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",'
          'stroke:"#16a34a",strokeWidth:2,children:e.jsxs("g",{children:['
          'e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}),'
          'e.jsx("polyline",{points:"9 12 11 14 15 10"})'
        ']})})})'),
    'Leadership': ('e.jsx("div",{style:{width:46,height:46,borderRadius:12,background:"#ede9fe",'
        'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",'
          'stroke:"#7c3aed",strokeWidth:2,children:e.jsxs("g",{children:['
          'e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),'
          'e.jsx("circle",{cx:9,cy:7,r:4}),'
          'e.jsx("path",{d:"M23 21v-2a4 4 0 0 0-3-3.87"}),'
          'e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})'
        ']})})})'),
    'Quality': ('e.jsx("div",{style:{width:46,height:46,borderRadius:12,background:"#dcfce7",'
        'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        'children:e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",'
          'stroke:"#16a34a",strokeWidth:2,children:e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})})})')
}

COURSES_JS = (
  'c0.map(function(course,ci){'
    'var _done=course.myStatus==="completed";'
    'var _sc=_done?"#16a34a":course.myStatus==="self-enrolled"?"#6b7280":"#d97706";'
    'var _bg=_done?"#dcfce7":course.myStatus==="self-enrolled"?"#f3f4f6":"#fff7ed";'
    'var _lbl=_done?"Completed":course.myStatus==="self-enrolled"?"Self-enrolled":"Enrolled";'
    'var _prog=_done?100:course.myStatus==="enrolled"?60:course.myStatus==="self-enrolled"?45:0;'
    'var _icBg=course.category==="Safety"||course.category==="Quality"?"#dcfce7":'
      'course.category==="Leadership"?"#ede9fe":"#EFF4FF";'
    'var _icStroke=course.category==="Leadership"?"#7c3aed":'
      'course.category==="Safety"||course.category==="Quality"?"#16a34a":"#1a56db";'
    'return e.jsxs("button",{onClick:function(){_setDet({k:"course",t:course.title,d:course});},style:{'
      'width:"100%",background:"#fff",borderRadius:14,border:"1px solid #f0f1f4",'
      'padding:"14px",textAlign:"left",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",cursor:"pointer"},children:['
      # Top row: icon + title/category + badge + chevron
      'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:12,marginBottom:_done?12:10},children:['
        # Icon
        'e.jsxs("div",{style:{width:46,height:46,borderRadius:12,background:_icBg,'
          'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:['
          'course.category==="Safety"?e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",'
            'stroke:"#16a34a",strokeWidth:2,children:e.jsxs("g",{children:['
              'e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}),'
              'e.jsx("polyline",{points:"9 12 11 14 15 10"})'
            ']})})'
          ':course.category==="Leadership"?e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",'
            'stroke:"#7c3aed",strokeWidth:2,children:e.jsxs("g",{children:['
              'e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),'
              'e.jsx("circle",{cx:9,cy:7,r:4}),'
              'e.jsx("path",{d:"M23 21v-2a4 4 0 0 0-3-3.87"}),'
              'e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})'
            ']})})'
          ':course.category==="Quality"?e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",'
            'stroke:"#16a34a",strokeWidth:2,children:e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})})'
          ':e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",'
            'stroke:"#1a56db",strokeWidth:2,children:e.jsxs("g",{children:['
              'e.jsx("line",{x1:18,y1:20,x2:18,y2:10}),'
              'e.jsx("line",{x1:12,y1:20,x2:12,y2:4}),'
              'e.jsx("line",{x1:6,y1:20,x2:6,y2:14})'
            ']})})'
        ']}),'
        # Title + category
        'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
          'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",marginBottom:2,lineHeight:1.3},children:course.title}),'
          'e.jsxs("p",{style:{fontSize:11,color:"#6b7280"},children:[course.category," \\u2022 ",course.type.charAt(0).toUpperCase()+course.type.slice(1)]})'
        ']}),'
        # Badge + chevron
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,flexShrink:0},children:['
          'e.jsx("span",{style:{fontSize:10,fontWeight:600,color:_sc,background:_bg,'
            'padding:"3px 8px",borderRadius:6,border:"1px solid "+_sc+"33"},children:_lbl}),'
          'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#9ca3af",strokeWidth:2.5,'
            'children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})'
        ']})'
      ']}),'
      # Progress bar + %
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx("div",{style:{flex:1,height:5,background:"#e5e7eb",borderRadius:3,overflow:"hidden"},'
          'children:e.jsx("div",{style:{width:_prog+"%",height:"100%",'
            'background:_done?"#16a34a":"#1a56db",borderRadius:3}})}),'
        'e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:_done?"#16a34a":"#6b7280",minWidth:30},children:[_prog,"%"]})'
      ']}),'
      # Score row (only for completed with score)
      '_done&&course.myScore>0?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginTop:8},children:['
        'e.jsx("span",{style:{fontSize:14},children:"\\u2B50"}),'
        'e.jsxs("span",{style:{fontSize:12,fontWeight:700,color:"#374151"},children:["Score: ",course.myScore,"%"]}),'
        'e.jsx("span",{style:{fontSize:11,fontWeight:600,'
          'color:course.myScore>=90?"#16a34a":"#1a56db",'
          'background:course.myScore>=90?"#dcfce7":"#EFF4FF",'
          'padding:"2px 7px",borderRadius:5},'
          'children:course.myScore>=90?"Distinction":"Pass"})'
      ']}):null'
    ']},ci);'
  '})'
)

LEARNING = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    # Header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx(qi,{size:16,color:"#1a56db"}),'
        'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Learning"})'
      ']}),'
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:['
        'e.jsxs("span",{style:{fontSize:11,color:"#6b7280"},children:[_compC.length," / ",c0.length," completed"]}),'
        'e.jsx("button",{style:{fontSize:11,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer"},children:"View All"})'
      ']})'
    ']}),'
    # Courses
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10},children:['
    + COURSES_JS +
    ']})'
  ']})'
)
ob_l,op_l,sq_l = delta(LEARNING)
print('LEARNING delta:', ob_l, op_l, sq_l)

# ── LEARNING SUMMARY + SKILLS IN PROGRESS ─────────────────────────────────────
SUMMARY_SKILLS = (
  '(function(){'
    'var _tot=c0.length||1;'
    'var _cmpN=_compC.length;'
    'var _inpN=c0.filter(function(c){return c.myStatus==="enrolled";}).length;'
    'var _enrN=c0.filter(function(c){return c.myStatus==="self-enrolled";}).length;'
    'var _notN=Math.max(0,_tot-_cmpN-_inpN-_enrN);'
    'var R=38,C=2*Math.PI*R;'
    'var dCmp=C*_cmpN/_tot,dInp=C*_inpN/_tot,dEnr=C*_enrN/_tot,dNot=C*_notN/_tot;'
    'var offCmp=C*0.25,offInp=offCmp-dCmp,offEnr=offInp-dInp,offNot=offEnr-dEnr;'
    'var _skills=[{s:"Risk Management",p:60,ic:"#1a56db",bg:"#EFF4FF"},'
      '{s:"Stakeholder Mgmt",p:40,ic:"#7c3aed",bg:"#ede9fe"},'
      '{s:"Data-driven Dec.",p:25,ic:"#d97706",bg:"#fef3c7"}];'
    'return e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:['
      # Learning Summary
      'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"14px",'
        'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10},children:['
          'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#111827",margin:0},children:"Learning Summary"}),'
          'e.jsx("button",{style:{fontSize:10,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer"},children:"View All"})'
        ']}),'
        'e.jsxs("div",{style:{display:"flex",gap:10,alignItems:"center"},children:['
          # Donut
          'e.jsxs("svg",{width:72,height:72,viewBox:"0 0 90 90",children:['
            'e.jsx("circle",{cx:45,cy:45,r:R,fill:"none",stroke:"#f3f4f6",strokeWidth:12}),'
            '_cmpN>0?e.jsx("circle",{cx:45,cy:45,r:R,fill:"none",stroke:"#16a34a",strokeWidth:12,'
              'strokeDasharray:dCmp.toFixed(1)+" "+(C-dCmp).toFixed(1),strokeDashoffset:offCmp.toFixed(1),'
              'transform:"rotate(-90 45 45)"}):null,'
            '_inpN>0?e.jsx("circle",{cx:45,cy:45,r:R,fill:"none",stroke:"#1a56db",strokeWidth:12,'
              'strokeDasharray:dInp.toFixed(1)+" "+(C-dInp).toFixed(1),strokeDashoffset:offInp.toFixed(1),'
              'transform:"rotate(-90 45 45)"}):null,'
            '_enrN>0?e.jsx("circle",{cx:45,cy:45,r:R,fill:"none",stroke:"#f59e0b",strokeWidth:12,'
              'strokeDasharray:dEnr.toFixed(1)+" "+(C-dEnr).toFixed(1),strokeDashoffset:offEnr.toFixed(1),'
              'transform:"rotate(-90 45 45)"}):null,'
            'e.jsxs("text",{x:45,y:42,textAnchor:"middle",fontSize:14,fontWeight:"bold",fill:"#111827",children:[_tot]}),'
            'e.jsx("text",{x:45,y:55,textAnchor:"middle",fontSize:8,fill:"#9ca3af",children:"Total"})'
          ']}),'
          # Legend
          'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:5},children:['
            '[{c:"#16a34a",l:"Completed",n:_cmpN},'
              '{c:"#1a56db",l:"In Progress",n:_inpN},'
              '{c:"#f59e0b",l:"Enrolled",n:_enrN},'
              '{c:"#9ca3af",l:"Not Started",n:_notN}]'
            '.map(function(item,i){'
              'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5},children:['
                'e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:item.c,flexShrink:0}}),'
                'e.jsxs("span",{style:{fontSize:9,color:"#374151"},children:['
                  'e.jsx("span",{style:{fontWeight:700},children:item.n})," ",item.l'
                ']})'
              ']},i);'
            '})'
          ']})'
        ']})'
      ']}),'
      # Skills in Progress
      'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"14px",'
        'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10},children:['
          'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#111827",margin:0},children:"Skills in Progress"}),'
          'e.jsx("button",{style:{fontSize:10,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer"},children:"View All"})'
        ']}),'
        'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10},children:['
          '_skills.map(function(sk,si){'
            'return e.jsxs("div",{children:['
              'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4},children:['
                'e.jsx("div",{style:{width:20,height:20,borderRadius:5,background:sk.bg,'
                  'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
                  'children:e.jsx("div",{style:{width:8,height:8,borderRadius:"50%",background:sk.ic}})}),'
                'e.jsx("span",{style:{fontSize:10,color:"#374151",flex:1},children:sk.s}),'
                'e.jsxs("span",{style:{fontSize:10,fontWeight:700,color:sk.ic},children:[sk.p,"%"]})'
              ']}),'
              'e.jsx("div",{style:{width:"100%",height:4,background:"#e5e7eb",borderRadius:2,overflow:"hidden"},'
                'children:e.jsx("div",{style:{width:sk.p+"%",height:"100%",background:sk.ic,borderRadius:2}})})'
            ']},si);'
          '})'
        ']})'
      ']})'
    ']});'
  '})()'
)
ob_ss,op_ss,sq_ss = delta(SUMMARY_SKILLS)
print('SUMMARY_SKILLS delta:', ob_ss, op_ss, sq_ss)

# ── CERTIFICATIONS ─────────────────────────────────────────────────────────────
CERTS = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    # Header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx(Wa,{size:16,color:"#7c3aed"}),'
        'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Certifications"})'
      ']}),'
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:['
        'e.jsxs("span",{style:{fontSize:11,color:"#6b7280"},children:[_compC.filter(function(c){return c.hasAssessment&&c.myScore>=75;}).length," Earned"]}),'
        'e.jsx("button",{style:{fontSize:11,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer"},children:"View All"})'
      ']})'
    ']}),'
    # Cert cards
    'e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},'
      'children:_compC.filter(function(c){return c.hasAssessment&&c.myScore>=75;}).map(function(cert,ci){'
        'return e.jsxs("div",{style:{background:"#f8f9fb",borderRadius:12,padding:"12px"},children:['
          'e.jsx("div",{style:{width:40,height:40,borderRadius:12,background:"#ede9fe",'
            'display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10},'
            'children:e.jsx(Ru,{size:20,color:"#7c3aed"})}),'
          'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#111827",marginBottom:4,lineHeight:1.3},children:cert.title}),'
          'e.jsxs("p",{style:{fontSize:10,color:"#9ca3af",marginBottom:10},children:["Completed on ",cert.endDate]}),'
          'e.jsxs("p",{style:{fontSize:13,fontWeight:800,color:"#111827",marginBottom:2},children:[cert.myScore,"%"]}),'
          'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:10},children:"Score"}),'
          'e.jsx("div",{style:{background:"#dcfce7",borderRadius:6,padding:"4px 8px",textAlign:"center"},'
            'children:e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#16a34a"},children:"Completed"})})'
        ']},ci);'
      '})'
    '})'
  ']})'
)
ob_c,op_c,sq_c = delta(CERTS)
print('CERTS delta:', ob_c, op_c, sq_c)

# ── COACHING ──────────────────────────────────────────────────────────────────
COACHING = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    # Header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx(fg,{size:16,color:"#0891b2"}),'
        'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Coaching"})'
      ']}),'
      'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#16a34a"},children:"Active Plan"})'
    ']}),'
    # Plan card
    'e.jsxs("div",{style:{background:"linear-gradient(135deg,#f0f9ff,#e0f2fe)",borderRadius:14,'
      'padding:"14px",border:"1px solid #bae6fd"},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14},children:['
        # Icon
        'e.jsx("div",{style:{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#0891b2,#06b6d4)",'
          'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
          'children:e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:"#ffffff",strokeWidth:2,'
            'children:e.jsxs("g",{children:['
              'e.jsx("circle",{cx:12,cy:12,r:10}),'
              'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
            ']})})}),'
        # Title + badge
        'e.jsxs("div",{style:{flex:1},children:['
          'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#0c4a6e",marginBottom:4},children:"Q2 2026 Development Plan"}),'
          'e.jsx("span",{style:{fontSize:10,fontWeight:600,color:"#1a56db",background:"#EFF4FF",'
            'padding:"2px 8px",borderRadius:6},children:"Active"})'
        ']})'
      ']}),'
      # Skills progress
      '[{s:"Project risk communication",p:60},{s:"Stakeholder management",p:40},{s:"Data-driven decisions",p:25}]'
        '.map(function(it,ii){'
          'return e.jsxs("div",{style:{marginBottom:10},children:['
            'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4},children:['
              'e.jsx("span",{style:{fontSize:11,color:"#0c4a6e"},children:it.s}),'
              'e.jsxs("span",{style:{fontSize:11,fontWeight:700,color:"#0891b2"},children:[it.p,"%"]})'
            ']}),'
            'e.jsx("div",{style:{width:"100%",height:5,background:"rgba(8,145,178,0.15)",borderRadius:3,overflow:"hidden"},'
              'children:e.jsx("div",{style:{width:it.p+"%",height:"100%",'
                'background:"linear-gradient(90deg,#0891b2,#06b6d4)",borderRadius:3}})})'
          ']},ii);'
        '}),'
      # Next session
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,borderTop:"1px solid rgba(8,145,178,0.15)",'
        'paddingTop:10,marginTop:4},children:['
        'e.jsx("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"#0891b2",strokeWidth:2,'
          'children:e.jsxs("g",{children:['
            'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2}),'
            'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
            'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
            'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
          ']})}),'
        'e.jsx("span",{style:{fontSize:11,color:"#0c4a6e",flex:1},children:"Next session: 20 May 2026, 11:00 AM"})'
      ']}),'
      # View coaching sessions button
      'e.jsxs("button",{style:{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,'
        'width:"100%",background:"none",border:"none",marginTop:10,cursor:"pointer"},children:['
        'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#0891b2"},children:"View Coaching Sessions"}),'
        'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#0891b2",strokeWidth:2.5,'
          'children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})'
      ']})'
    ']})'
  ']})'
)
ob_co,op_co,sq_co = delta(COACHING)
print('COACHING delta:', ob_co, op_co, sq_co)

# ── Assemble ──────────────────────────────────────────────────────────────────
NEW_VIEW = (
  'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"4px 0 0"},children:['
  + BANNER + ','
  + LEARNING + ','
  + SUMMARY_SKILLS + ','
  + CERTS + ','
  + COACHING
  + ']})'
)
ob_v,op_v,sq_v = delta(NEW_VIEW)
print('NEW_VIEW delta:', ob_v, op_v, sq_v)
if ob_v!=0 or op_v!=0 or sq_v!=0:
    print('IMBALANCED'); exit(1)

NEW = '_tab==="development"&&' + NEW_VIEW
ob_n,op_n,sq_n = delta(NEW)
if (ob_n,op_n,sq_n) != (ob_o,op_o,sq_o):
    print('DELTA MISMATCH:', ob_n,op_n,sq_n,'!=',ob_o,op_o,sq_o); exit(1)

content2 = content[:START] + NEW + content[END:]
ob_g,op_g,sq_g = delta(content2)
print('global:', ob_g, op_g, sq_g)
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
