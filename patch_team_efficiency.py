#!/usr/bin/env python3
"""Replace efficiency-all view with pixel-perfect Team Efficiency UI."""
import subprocess, re, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

# OLD: _mhView==="efficiency-all"?<VIEW> ends just before :e.jsxs("div",{className:"px-5 py-4 space-y-3"
START_STR = '_mhView==="efficiency-all"?e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"16px 16px 80px"}'
END_STR   = ':e.jsxs("div",{className:"px-5 py-4 space-y-3"'
assert content.count(START_STR) == 1, 'START_STR not unique'
assert content.count(END_STR) == 1, 'END_STR not unique'

START = content.find(START_STR)
END   = content.find(END_STR, START)
OLD   = content[START:END]
ob_o, op_o, sq_o = delta(OLD)
print('OLD: len=%d delta: ob=%d op=%d sq=%d' % (len(OLD), ob_o, op_o, sq_o))

# ── Build sections ─────────────────────────────────────────────────────────────

# Stats summary card (4 stats: Team Average, Top Performer, On-Time Rate, Attendance)
STATS = (
  'e.jsxs("div",{style:{background:"#fff",margin:"12px 16px 8px",borderRadius:16,'
  'padding:"16px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:"1px solid #f0f1f4"},children:['
    # Row 1: Team Average | Top Performer
    'e.jsxs("div",{style:{display:"flex"},children:['
      'e.jsxs("div",{style:{flex:1,paddingRight:12,borderRight:"1px solid #f0f1f4"},children:['
        'e.jsx("p",{style:{fontSize:11,color:"#6b7280",marginBottom:4},children:"Team Average"}),'
        'e.jsxs("p",{style:{fontSize:24,fontWeight:800,color:"#16a34a",margin:"0 0 2px"},children:[_avgEff,"%"]}),'
        'e.jsxs("p",{style:{fontSize:11,color:"#16a34a",margin:0},children:["↑ ",_avgEff-86,"% vs last month"]})'
      ']}),'
      'e.jsxs("div",{style:{flex:1,paddingLeft:12},children:['
        'e.jsx("p",{style:{fontSize:11,color:"#6b7280",marginBottom:6},children:"Top Performer"}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
          'e.jsxs("div",{style:{position:"relative"},children:['
            'e.jsx("div",{style:{width:32,height:32,borderRadius:"50%",overflow:"hidden"},'
              'children:e.jsx("img",{src:_topPM.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}})}),'
            'e.jsx("div",{style:{position:"absolute",bottom:0,right:0,width:9,height:9,'
              'borderRadius:"50%",background:"#16a34a",border:"2px solid #fff"}})'
          ']}),'
          'e.jsxs("div",{children:['
            'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",margin:0},children:_topPM.name}),'
            'e.jsxs("p",{style:{fontSize:11,fontWeight:700,color:"#16a34a",margin:0},children:[_topPM.efficiency||0,"%"]})'
          ']})'
        ']})'
      ']})'
    ']}),'
    'e.jsx("div",{style:{height:1,background:"#f0f1f4",margin:"12px 0"}}),'
    # Row 2: On-Time Rate | Attendance
    'e.jsxs("div",{style:{display:"flex"},children:['
      'e.jsxs("div",{style:{flex:1,paddingRight:12,borderRight:"1px solid #f0f1f4"},children:['
        'e.jsx("p",{style:{fontSize:11,color:"#6b7280",marginBottom:4},children:"On-Time Rate"}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4},children:['
          'e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"#7c3aed",strokeWidth:2,'
            'children:e.jsxs("g",{children:['
              'e.jsx("circle",{cx:12,cy:12,r:10}),'
              'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
            ']})}),'
          'e.jsxs("p",{style:{fontSize:20,fontWeight:800,color:"#7c3aed",margin:0},children:[_avgOtr,"%"]})'
        ']}),'
        'e.jsx("p",{style:{fontSize:11,color:"#16a34a",margin:0},children:"↑ 2% vs last month"})'
      ']}),'
      'e.jsxs("div",{style:{flex:1,paddingLeft:12},children:['
        'e.jsx("p",{style:{fontSize:11,color:"#6b7280",marginBottom:4},children:"Attendance"}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4},children:['
          'e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"#0891b2",strokeWidth:2,'
            'children:e.jsxs("g",{children:['
              'e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),'
              'e.jsx("circle",{cx:9,cy:7,r:4}),'
              'e.jsx("path",{d:"M23 21v-2a4 4 0 0 1-3-3.87"}),'
              'e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})'
            ']})}),'
          'e.jsxs("p",{style:{fontSize:20,fontWeight:800,color:"#0891b2",margin:0},children:[_avgAtt,"%"]})'
        ']}),'
        'e.jsx("p",{style:{fontSize:11,color:"#16a34a",margin:0},children:"↑ 3% vs last month"})'
      ']})'
    ']})'
  ']})'
)
ob_s,op_s,sq_s = delta(STATS)
print('STATS delta:', ob_s, op_s, sq_s)

# Filter tabs
TABS = (
  'e.jsxs("div",{style:{display:"flex",alignItems:"center",padding:"4px 16px 12px",gap:8},children:['
    'e.jsx("button",{style:{background:"#e8f0fe",color:"#1a56db",border:"none",borderRadius:20,'
      'padding:"5px 14px",fontSize:12,fontWeight:700,cursor:"pointer"},children:"All ("+_jAll.length+")"}),'
    'e.jsx("button",{style:{background:"#f3f4f6",color:"#6b7280",border:"none",borderRadius:20,'
      'padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer"},children:"Managers ("+_mgrs+")"}),'
    'e.jsx("button",{style:{background:"#f3f4f6",color:"#6b7280",border:"none",borderRadius:20,'
      'padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer"},children:"Members ("+_mems+")"}),'
    'e.jsxs("button",{style:{background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 10px",'
      'fontSize:12,color:"#374151",display:"flex",alignItems:"center",gap:4,marginLeft:"auto",cursor:"pointer"},children:['
      'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,'
        'children:e.jsx("path",{d:"M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"})}),'
      '"Sort"'
    ']})'
  ']})'
)
ob_t,op_t,sq_t = delta(TABS)
print('TABS delta:', ob_t, op_t, sq_t)

# Single member card (used inside .map callback)
CARD = (
  'e.jsxs("div",{style:{background:"#fff",borderRadius:16,border:"1px solid #f0f1f4",'
    'padding:"14px 14px 12px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
    # Header row
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",marginBottom:12},children:['
      # Avatar
      'e.jsxs("div",{style:{position:"relative",flexShrink:0,marginRight:10},children:['
        'e.jsx("div",{style:{width:52,height:52,borderRadius:"50%",overflow:"hidden"},'
          'children:e.jsx("img",{src:mem.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}})}),'
        'e.jsx("div",{style:{position:"absolute",bottom:1,right:1,width:12,height:12,'
          'borderRadius:"50%",background:mem.status==="present"?"#16a34a":"#f59e0b",border:"2.5px solid #fff"}})'
      ']}),'
      # Name + role + badge
      'e.jsxs("div",{style:{flex:1},children:['
        'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",margin:"0 0 2px"},children:mem.name}),'
        'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:"0 0 6px"},children:mem.role}),'
        '_isTop?e.jsxs("div",{style:{display:"inline-flex",alignItems:"center",gap:4,'
          'background:"#fffbeb",border:"1px solid #fde68a",borderRadius:20,padding:"2px 10px"},children:['
          'e.jsx("span",{style:{fontSize:12},children:"\\uD83D\\uDC51"}),'
          'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#b45309"},children:"Top Performer"})'
        ']}):null'
      ']}),'
      # Score + rating badge + chevron
      'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
        'e.jsxs("div",{style:{textAlign:"right"},children:['
          'e.jsxs("p",{style:{fontSize:26,fontWeight:800,color:_numCol,margin:"0 0 4px",lineHeight:1},children:[_eff,"%"]}),'
          'e.jsx("div",{style:{display:"inline-block",background:_ratingBg,borderRadius:8,padding:"2px 8px"},'
            'children:e.jsx("span",{style:{fontSize:11,fontWeight:700,color:_ratingCol},children:_rating})})'
        ']}),'
        'e.jsx("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"#9ca3af",strokeWidth:2.5,'
          'children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})'
      ']})'
    ']}),'
    # Stat chips row
    'e.jsxs("div",{style:{display:"flex",gap:6},children:['
      # Efficiency chip
      'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",gap:5,'
        'background:"#f8f9fb",borderRadius:10,padding:"7px 8px"},children:['
        'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:_numCol,strokeWidth:2,'
          'children:e.jsx("polyline",{points:"23 6 13.5 15.5 8.5 10.5 1 18"})}),'
        'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"Efficiency"}),'
        'e.jsxs("span",{style:{fontSize:10,fontWeight:700,color:_numCol,marginLeft:"auto"},children:[_eff,"%"]})'
      ']}),'
      # On-Time Rate chip
      'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",gap:5,'
        'background:"#f8f9fb",borderRadius:10,padding:"7px 8px"},children:['
        'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#7c3aed",strokeWidth:2,'
          'children:e.jsxs("g",{children:['
            'e.jsx("circle",{cx:12,cy:12,r:10}),'
            'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
          ']})}),'
        'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"On-Time Rate"}),'
        'e.jsxs("span",{style:{fontSize:10,fontWeight:700,color:"#7c3aed",marginLeft:"auto"},children:[_otr,"%"]})'
      ']}),'
      # Attendance chip
      'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",gap:5,'
        'background:"#f8f9fb",borderRadius:10,padding:"7px 8px"},children:['
        'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#0891b2",strokeWidth:2,'
          'children:e.jsxs("g",{children:['
            'e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),'
            'e.jsx("circle",{cx:9,cy:7,r:4})'
          ']})}),'
        'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"Attendance"}),'
        'e.jsxs("span",{style:{fontSize:10,fontWeight:700,color:"#0891b2",marginLeft:"auto"},children:[_att,"%"]})'
      ']})'
    ']})'
  '],key:mi})'
)

# Member list with local vars computed per item
MLIST = (
  'e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10,padding:"0 16px 80px"},'
    'children:_effs.map(function(mem,mi){'
      'var _eff=mem.efficiency||80,_otr=mem.onTimeRate||80,_att=mem.attendance||80;'
      'var _rating=_eff>=93?"Excellent":_eff>=88?"Very Good":_eff>=80?"Good":"Average";'
      'var _ratingCol=_eff>=88?"#16a34a":_eff>=80?"#1a56db":"#d97706";'
      'var _ratingBg=_eff>=88?"#dcfce7":_eff>=80?"#eff4ff":"#fef9c3";'
      'var _numCol=_eff>=80?"#16a34a":"#d97706";'
      'var _isTop=_topPM&&mem.id===_topPM.id;'
      'return ' + CARD + ';'
    '})'
  '})'
)
ob_m,op_m,sq_m = delta(MLIST)
print('MLIST delta:', ob_m, op_m, sq_m)

# Full IIFE view (must be delta 0,0,0)
NEW_VIEW = (
  '(function(){'
    'var _effs=_jAll.slice().sort(function(a,b){return (b.efficiency||0)-(a.efficiency||0);});'
    'var _mgrs=_jAll.filter(function(m){return m.role==="Manager";}).length;'
    'var _mems=_jAll.filter(function(m){return m.role!=="Manager";}).length;'
    'var _avgEff=Math.round(_jAll.reduce(function(s,m){return s+(m.efficiency||0);},0)/(_jAll.length||1));'
    'var _avgOtr=Math.round(_jAll.reduce(function(s,m){return s+(m.onTimeRate||0);},0)/(_jAll.length||1));'
    'var _avgAtt=Math.round(_jAll.reduce(function(s,m){return s+(m.attendance||0);},0)/(_jAll.length||1));'
    'var _topPM=_jAll.reduce(function(best,m){return (m.efficiency||0)>(best.efficiency||0)?m:best;},_jAll[0]||{name:"",efficiency:0,avatar:""});'
    'return e.jsx("div",{style:{flex:1,overflowY:"auto",background:"#f4f6fb"},'
      'children:e.jsxs("div",{style:{display:"flex",flexDirection:"column"},children:['
        + STATS + ','
        + TABS + ','
        + MLIST
      + ']})});'
  '})()'
)
ob_v,op_v,sq_v = delta(NEW_VIEW)
print('NEW_VIEW delta:', ob_v, op_v, sq_v)

# Build NEW = ternary prefix + IIFE view
NEW = '_mhView==="efficiency-all"?' + NEW_VIEW
ob_n,op_n,sq_n = delta(NEW)
print('NEW delta: ob=%d op=%d sq=%d' % (ob_n, op_n, sq_n))

if (ob_n,op_n,sq_n) != (ob_o,op_o,sq_o):
    print('DELTA MISMATCH - aborting'); exit(1)

content2 = content[:START] + NEW + content[END:]
ob_g,op_g,sq_g = delta(content2)
print('global: ob=%d op=%d sq=%d' % (ob_g, op_g, sq_g))
if ob_g!=0 or op_g!=0 or sq_g!=0:
    print('GLOBAL IMBALANCE - aborting'); exit(1)

m_re = re.search(r'<script[^>]*>([\s\S]*?)</script>', content2)
script = m_re.group(1) if m_re else content2
with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as tf:
    tf.write('try{new Function(' + repr(script) + ')}catch(e){process.stdout.write("ERR:"+e.message)}\nprocess.stdout.write("OK")')
    tname = tf.name
r = subprocess.run(['node', tname], capture_output=True, text=True)
os.unlink(tname)
node_out = r.stdout + r.stderr
print('Node:', node_out[:120])
if 'OK' in node_out and 'ERR' not in node_out:
    with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
        f.write(content2)
    print('Done.')
else:
    print('Node FAILED')
