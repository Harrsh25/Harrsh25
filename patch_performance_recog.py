#!/usr/bin/env python3
"""Replace Performance Recognition tab with pixel-perfect UI."""
import subprocess, re, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = '_tab==="recognition"&&e.jsxs("div",{className:"space-y-3"'
END_STR   = ',_tab==="reviews"&&e.jsxs("div",{className:"space-'
assert content.count(START_STR) == 1
assert content.count(END_STR) == 1

START = content.find(START_STR)
END   = content.find(END_STR, START)
OLD   = content[START:END]
ob_o,op_o,sq_o = delta(OLD)
print('OLD: len=%d delta: ob=%d op=%d sq=%d' % (len(OLD), ob_o, op_o, sq_o))

# ── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
ACHIEVEMENTS = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx(Ru,{size:16,color:"#d97706"}),'
        'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Achievements"})'
      ']}),'
      'e.jsx("button",{style:{fontSize:11,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer"},children:"View All"})'
    ']}),'
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8},children:['
      # Safety Champion
      'e.jsxs("div",{style:{background:"#fffbeb",borderRadius:14,padding:"14px 10px",textAlign:"center",'
        'border:"1px solid #fde68a"},children:['
        'e.jsx("div",{style:{width:54,height:54,borderRadius:"50%",background:"#fef3c7",'
          'display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"},children:'
          'e.jsx("svg",{width:26,height:26,viewBox:"0 0 24 24",fill:"none",stroke:"#d97706",strokeWidth:2,'
            'children:e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})})}),'
        'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#111827",marginBottom:4,lineHeight:1.3},children:"Safety Champion"}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:8,lineHeight:1.4},children:"Zero incidents"}),'
        'e.jsx("div",{style:{background:"#fef3c7",borderRadius:6,padding:"2px 6px",marginBottom:6},'
          'children:e.jsx("span",{style:{fontSize:9,fontWeight:700,color:"#d97706"},children:"Q1 2026"})}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af"},children:"2026-03-31"})'
      ']}),'
      # On-Time Delivery
      'e.jsxs("div",{style:{background:"#f0fdf4",borderRadius:14,padding:"14px 10px",textAlign:"center",'
        'border:"1px solid #bbf7d0"},children:['
        'e.jsx("div",{style:{width:54,height:54,borderRadius:"50%",background:"#dcfce7",'
          'display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"},children:'
          'e.jsx("svg",{width:26,height:26,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2,'
            'children:e.jsxs("g",{children:['
              'e.jsx("circle",{cx:12,cy:12,r:10}),'
              'e.jsx("circle",{cx:12,cy:12,r:6}),'
              'e.jsx("circle",{cx:12,cy:12,r:2})'
            ']})})}),'
        'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#111827",marginBottom:4,lineHeight:1.3},children:"On-Time Delivery"}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:8,lineHeight:1.4},children:"Metro Tower milestone ahead of schedule"}),'
        'e.jsx("p",{style:{fontSize:9,color:"#16a34a",fontWeight:600},children:"2026-02-15"})'
      ']}),'
      # Training Excellence
      'e.jsxs("div",{style:{background:"#faf5ff",borderRadius:14,padding:"14px 10px",textAlign:"center",'
        'border:"1px solid #ddd6fe"},children:['
        'e.jsx("div",{style:{width:54,height:54,borderRadius:"50%",background:"#ede9fe",'
          'display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"},children:'
          'e.jsx("svg",{width:26,height:26,viewBox:"0 0 24 24",fill:"none",stroke:"#7c3aed",strokeWidth:2,'
            'children:e.jsxs("g",{children:['
              'e.jsx("path",{d:"M22 10v6M2 10l10-5 10 5-10 5z"}),'
              'e.jsx("path",{d:"M6 12v5c3 3 9 3 12 0v-5"})'
            ']})})}),'
        'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#111827",marginBottom:4,lineHeight:1.3},children:"Training Excellence"}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:8,lineHeight:1.4},children:"Scored 92% in Safety Compliance"}),'
        'e.jsx("p",{style:{fontSize:9,color:"#7c3aed",fontWeight:600},children:"2026-04-15"})'
      ']})'
    ']})'
  ']})'
)
print('ACH delta:', delta(ACHIEVEMENTS))

# ── BADGES ────────────────────────────────────────────────────────────────────
BADGE_DEFS = [
  ('Team Player',   '#1a56db', '#EFF4FF', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', 'path'),
  ('Innovator',     '#7c3aed', '#ede9fe', 'M9 18h6 M10 22h4 M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26A7 7 0 0 1 12 2z', 'path'),
  ('Mentor',        '#0891b2', '#e0f2fe', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', 'path'),
  ('Leader',        '#16a34a', '#dcfce7', 'M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z', 'polygon'),
  ('Problem Solver','#d97706', '#fef3c7', 'M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z', 'polygon'),
]

def badge_chip(label, col, bg, path_d, el):
    if el == 'path':
        icon = ('e.jsx("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",'
            'stroke:"'+col+'",strokeWidth:2,children:e.jsx("path",{d:"'+path_d+'"})})')
    else:
        icon = ('e.jsx("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",'
            'stroke:"'+col+'",strokeWidth:2,children:e.jsx("polygon",{points:"'+path_d+'"})})')
    return (
      'e.jsxs("div",{style:{display:"inline-flex",alignItems:"center",gap:5,background:"'+bg+'",'
        'borderRadius:20,padding:"6px 12px",border:"1px solid '+col+'33"},children:['
        + icon + ','
        'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"'+col+'"},children:"'+label+'"})'
      ']})'
    )

BADGES_CHIPS = ','.join([badge_chip(*b) for b in BADGE_DEFS])

BADGES = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx(Oa,{size:16,color:"#d97706"}),'
        'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Badges"})'
      ']}),'
      'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#1a56db"},children:"5 Badges Earned"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:8},children:['
    + BADGES_CHIPS +
    ']})'
  ']})'
)
print('BADGES delta:', delta(BADGES))

# ── REWARDS SNAPSHOT ──────────────────────────────────────────────────────────
REWARDS = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx(Ju,{size:16,color:"#f59e0b"}),'
        'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Rewards Snapshot"})'
      ']}),'
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#f3f4f6",'
        'borderRadius:8,padding:"4px 10px"},children:['
        'e.jsx("span",{style:{fontSize:11,color:"#374151"},children:"This Month"}),'
        'e.jsx("span",{style:{fontSize:11,color:"#374151"},children:"\\u2304"})'
      ']})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:16},children:['
      'e.jsxs("div",{style:{flex:1,paddingRight:16,borderRight:"1px solid #f0f1f4"},children:['
        'e.jsx("p",{style:{fontSize:11,color:"#6b7280",marginBottom:6},children:"Total Points"}),'
        'e.jsxs("p",{style:{fontSize:36,fontWeight:900,color:"#f59e0b",margin:"0 0 10px",lineHeight:1},children:['
          '"850",'
          'e.jsx("span",{style:{fontSize:14,fontWeight:600,color:"#f59e0b",marginLeft:4},children:"pts"})'
        ']}),'
        'e.jsxs("div",{style:{display:"inline-flex",alignItems:"center",gap:4,background:"#f0fdf4",'
          'borderRadius:20,padding:"4px 10px",border:"1px solid #bbf7d0"},children:['
          'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#16a34a"},children:"\\u2191 25% vs last month"})'
        ']})'
      ']}),'
      'e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",gap:10},children:['
        '[{ic:"#f59e0b",bg:"#fffbeb",label:"Milestones",val:3,svg:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7"},'
          '{ic:"#7c3aed",bg:"#faf5ff",label:"Recognitions",val:4,svg:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"},'
          '{ic:"#0891b2",bg:"#f0f9ff",label:"Badges",val:5,svg:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}]'
        '.map(function(row,ri){'
          'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
            'e.jsx("div",{style:{width:32,height:32,borderRadius:9,background:row.bg,'
              'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
              'children:e.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",'
                'stroke:row.ic,strokeWidth:2,children:e.jsx("path",{d:row.svg})})}),'
            'e.jsx("span",{style:{flex:1,fontSize:12,color:"#374151"},children:row.label}),'
            'e.jsxs("span",{style:{fontSize:14,fontWeight:800,color:"#111827"},children:[row.val]}),'
            'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#9ca3af",strokeWidth:2.5,'
              'children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})'
          ']},ri);'
        '})'
      ']})'
    ']})'
  ']})'
)
print('REWARDS delta:', delta(REWARDS))

# ── RECOGNITION POINTS ────────────────────────────────────────────────────────
REC_ROWS = [
  ('#d97706','#fef3c7','M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z','polygon','Safety milestone bonus','2026-03-31',200),
  ('#16a34a','#dcfce7','M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4','path','Q1 goal achievement','2026-03-15',350),
  ('#7c3aed','#ede9fe','M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5','path','Training completion','2026-04-15',150),
  ('#d97706','#fff7ed','M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','path','Peer recognition','2026-04-20',150),
]

def rec_row(ic, bg, path_d, el, desc, date, pts, first=False):
    if el == 'path':
        icon_inner = 'e.jsx("path",{d:"'+path_d+'"})'
    else:
        icon_inner = 'e.jsx("polygon",{points:"'+path_d+'"})'
    border = '' if first else ',borderTop:"1px solid #f3f4f6"'
    return (
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,padding:"10px 0"'+border+'},children:['
        'e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"'+bg+'",'
          'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
          'children:e.jsx("svg",{width:17,height:17,viewBox:"0 0 24 24",fill:"none",'
            'stroke:"'+ic+'",strokeWidth:2,children:'+icon_inner+'})}),'
        'e.jsxs("div",{style:{flex:1},children:['
          'e.jsx("p",{style:{fontSize:12,fontWeight:600,color:"#111827",margin:"0 0 2px"},children:"'+desc+'"}),'
          'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",margin:0},children:"'+date+'"})'
        ']}),'
        'e.jsxs("span",{style:{fontSize:13,fontWeight:700,color:"#16a34a"},children:["+'+str(pts)+'"]})'
      ']})'
    )

REC_ROWS_JSX = ','.join([rec_row(*r, first=(i==0)) for i,r in enumerate(REC_ROWS)])

REC_POINTS = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
    'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:['
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx("span",{style:{fontSize:16},children:"\\uD83C\\uDF81"}),'
        'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:"Recognition Points"})'
      ']}),'
      'e.jsxs("span",{style:{fontSize:13,fontWeight:800,color:"#f59e0b"},children:["850 pts"]})'
    ']}),'
    + REC_ROWS_JSX
  + ']})'
)
print('REC_POINTS delta:', delta(REC_POINTS))

# ── MOTIVATIONAL BANNER ───────────────────────────────────────────────────────
BANNER = (
  'e.jsxs("div",{style:{background:"linear-gradient(135deg,#eff6ff 0%,#dbeafe 60%,#ede9fe 100%)",'
    'borderRadius:16,padding:"20px 16px",border:"1px solid #bfdbfe",position:"relative",overflow:"hidden"},children:['
    'e.jsx("div",{style:{position:"absolute",top:-20,right:-20,width:100,height:100,'
      'borderRadius:"50%",background:"rgba(99,102,241,0.06)"}}),'
    'e.jsx("div",{style:{position:"absolute",bottom:-10,right:60,width:60,height:60,'
      'borderRadius:"50%",background:"rgba(59,130,246,0.06)"}}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,position:"relative"},children:['
      'e.jsxs("div",{style:{flex:1},children:['
        'e.jsxs("p",{style:{fontSize:15,fontWeight:800,color:"#1d4ed8",marginBottom:8,lineHeight:1.3},'
          'children:["Keep it up, Harsh! ","\\uD83C\\uDF89"]}),'
        'e.jsx("p",{style:{fontSize:12,color:"#374151",marginBottom:14,lineHeight:1.5},'
          'children:"You\'re in the top 10% of high performers."}),'
        'e.jsx("button",{style:{background:"#1a56db",color:"#ffffff",border:"none",'
          'borderRadius:10,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:"pointer"},'
          'children:"View Leaderboard"})'
      ']}),'
      'e.jsx("div",{style:{fontSize:62,lineHeight:1,flexShrink:0,filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.15))"},'
        'children:"\\uD83C\\uDFC6"})'
    ']})'
  ']})'
)
print('BANNER delta:', delta(BANNER))

# ── ASSEMBLE ──────────────────────────────────────────────────────────────────
NEW_VIEW = (
  'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"4px 0 0"},children:['
  + ACHIEVEMENTS + ','
  + BADGES + ','
  + REWARDS + ','
  + REC_POINTS + ','
  + BANNER
  + ']})'
)
ob_v,op_v,sq_v = delta(NEW_VIEW)
print('NEW_VIEW delta:', ob_v, op_v, sq_v)
if ob_v!=0 or op_v!=0 or sq_v!=0:
    print('IMBALANCED'); exit(1)

NEW = '_tab==="recognition"&&' + NEW_VIEW
ob_n,op_n,sq_n = delta(NEW)
if (ob_n,op_n,sq_n) != (ob_o,op_o,sq_o):
    print('DELTA MISMATCH:', ob_n,op_n,sq_n,'vs',ob_o,op_o,sq_o); exit(1)

content2 = content[:START] + NEW + content[END:]
ob_g,op_g,sq_g = delta(content2)
print('global:', ob_g, op_g, sq_g)
if ob_g!=0 or op_g!=0 or sq_g!=0:
    print('GLOBAL IMBALANCE'); exit(1)

m_re = re.search(r'<script[^>]*>([\s\S]*?)</script>', content2)
script = m_re.group(1) if m_re else content2
with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as tf:
    tf.write('try{new Function('+repr(script)+')}catch(e){process.stdout.write("ERR:"+e.message)}\nprocess.stdout.write("OK")')
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
