#!/usr/bin/env python3
"""Replace analytics tab with pixel-perfect design matching reference image."""
import subprocess, re, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

START = content.find('i==="analytics"&&e.jsxs("div",{style:{padding:"14px 16px 80px"},children:[e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",marginBottom:14},children:"Workforce Analytics"}),')
END   = content.find('i==="assignments"&&e.jsxs(e.Fragment', START)
print('OLD start=%d end=%d len=%d' % (START, END, END-START))
if START < 0 or END < 0:
    print('FAIL - anchors not found'); exit(1)

OLD_BLOCK = content[START:END]

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

S1 = (  # title row
  'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 16px 12px"},children:['
    'e.jsx("span",{style:{fontSize:17,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Workforce Analytics"}),'
    'e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:5,background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,padding:"6px 10px",fontSize:11,color:"#374151",cursor:"pointer"},children:['
      'e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"#6b7280",strokeWidth:2,children:['
        'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
        'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
        'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
        'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
      ']}),'
      '"Last 7 days",'
      'e.jsxs("svg",{width:10,height:10,viewBox:"0 0 24 24",fill:"none",stroke:"#6b7280",strokeWidth:2.5,children:['
        'e.jsx("polyline",{points:"6 9 12 15 18 9"})'
      ']})'
    ']})'
  ']})'
)

S2 = (  # attendance trend card
  'e.jsxs("div",{style:{background:"#fff",borderRadius:14,margin:"0 16px 12px",padding:"14px 14px 10px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},children:['
      'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827"},children:"Attendance Trend"}),'
      'e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#6b7280"},children:['
        'e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:"#1a56db",display:"inline-block"}}),'
        '"Attendance %"'
      ']})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:4},children:['
      'e.jsxs("div",{style:{display:"flex",flexDirection:"column",justifyContent:"space-between",paddingBottom:20,width:28,flexShrink:0},children:['
        'e.jsx("span",{style:{fontSize:9,color:"#9ca3af",textAlign:"right"},children:"100%"}),'
        'e.jsx("span",{style:{fontSize:9,color:"#9ca3af",textAlign:"right"},children:"75%"}),'
        'e.jsx("span",{style:{fontSize:9,color:"#9ca3af",textAlign:"right"},children:"50%"}),'
        'e.jsx("span",{style:{fontSize:9,color:"#9ca3af",textAlign:"right"},children:"25%"}),'
        'e.jsx("span",{style:{fontSize:9,color:"#9ca3af",textAlign:"right"},children:"0%"})'
      ']}),'
      'e.jsxs("div",{style:{flex:1},children:['
        'e.jsxs("div",{style:{position:"relative",height:110,display:"flex",alignItems:"flex-end",gap:3,borderLeft:"1px solid #e5e7eb",borderBottom:"1px solid #e5e7eb",paddingLeft:4},children:['
          'e.jsx("div",{style:{position:"absolute",left:0,right:0,bottom:"75%",borderTop:"1.5px dashed #d1d5db"}}),'
          '[{d:"Mon",v:95},{d:"Tue",v:82},{d:"Wed",v:88},{d:"Thu",v:100},{d:"Fri",v:75},{d:"Sat",v:88},{d:"Sun",v:93}].map(function(bar,bi){'
            'var _c=bar.v>=85?"linear-gradient(180deg,#22c55e,#16a34a)":bar.v>=80?"linear-gradient(180deg,#3b82f6,#1a56db)":"linear-gradient(180deg,#fbbf24,#f59e0b)";'
            'return e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:"100%"},children:['
              'e.jsx("span",{style:{fontSize:8,color:"#374151",fontWeight:600,marginBottom:2},children:bar.v+"%"}),'
              'e.jsx("div",{style:{width:"78%",background:_c,borderRadius:"4px 4px 0 0",height:bar.v+"%"}})'
            ']},bi);'
          '})'
        ']}),'
        'e.jsx("div",{style:{display:"flex",gap:3,paddingLeft:4,marginTop:4},children:'
          '[{d:"Mon"},{d:"Tue"},{d:"Wed"},{d:"Thu"},{d:"Fri"},{d:"Sat"},{d:"Sun"}].map(function(bar,bi){'
            'return e.jsx("span",{style:{flex:1,fontSize:9,color:"#6b7280",textAlign:"center"},children:bar.d},bi);'
          '})'
        '})'
      ']})'
    ']})'
  ']})'
)

TE = (  # team efficiency card
  'e.jsxs("div",{style:{background:"#fff",borderRadius:14,margin:"0 16px 12px",padding:"14px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},children:['
      'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827"},children:"Team Efficiency"}),'
      'e.jsx("button",{onClick:function(){_mhSetView("efficiency-all");},style:{fontSize:12,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer"},children:"View All"})'
    ']}),'
    'e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:'
      'j.slice(0,4).map(function(mem){'
        'var _eff=mem.efficiency||80;'
        'var _c=_eff>=90?"#16a34a":_eff>=80?"#1a56db":"#f59e0b";'
        'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
          'e.jsx("img",{src:mem.avatar,alt:mem.name,style:{width:36,height:36,borderRadius:18,objectFit:"cover",flexShrink:0}}),'
          'e.jsxs("div",{style:{flex:1},children:['
            'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5},children:['
              'e.jsxs("div",{children:['
                'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#111827",display:"block"},children:mem.name}),'
                'e.jsx("span",{style:{fontSize:10,color:"#9ca3af"},children:mem.role})'
              ']}),'
              'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:_c},children:_eff+"%"})'
            ']}),'
            'e.jsx("div",{style:{width:"100%",background:"#f0f1f4",borderRadius:4,height:6},children:'
              'e.jsx("div",{style:{width:_eff+"%",background:_c,height:"100%",borderRadius:4}})'
            '})'
          ']})'
        ']},mem.id);'
      '})'
    '})'
  ']})'
)

AB = (  # approval breakdown card
  'e.jsxs("div",{style:{background:"#fff",borderRadius:14,margin:"0 16px 12px",padding:"14px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",display:"block",marginBottom:12},children:"Approval Breakdown"}),'
    'e.jsx("div",{style:{display:"flex",gap:8},children:'
      '[{label:"Pending",num:5,clr:"#d97706",bg:"#fffbeb",delta:"+2 vs last week",icon:"clock"},'
      '{label:"Approved",num:4,clr:"#16a34a",bg:"#f0fdf4",delta:"+1 vs last week",icon:"check"},'
      '{label:"Rejected",num:1,clr:"#dc2626",bg:"#fef2f2",delta:"-1 vs last week",icon:"x"}].map(function(s){'
        'return e.jsxs("div",{style:{flex:1,background:s.bg,borderRadius:12,padding:"12px 8px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:4},children:['
          's.icon==="clock"?e.jsxs("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:s.clr,strokeWidth:2,children:['
            'e.jsx("circle",{cx:12,cy:12,r:10}),'
            'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
          ']}):s.icon==="check"?e.jsxs("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:s.clr,strokeWidth:2,children:['
            'e.jsx("circle",{cx:12,cy:12,r:10}),'
            'e.jsx("polyline",{points:"9 12 11 14 15 10"})'
          ']}):e.jsxs("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:s.clr,strokeWidth:2,children:['
            'e.jsx("circle",{cx:12,cy:12,r:10}),'
            'e.jsx("line",{x1:15,y1:9,x2:9,y2:15}),'
            'e.jsx("line",{x1:9,y1:9,x2:15,y2:15})'
          ']})'
          ',e.jsx("span",{style:{fontSize:24,fontWeight:800,color:s.clr,lineHeight:1},children:s.num})'
          ',e.jsx("span",{style:{fontSize:11,fontWeight:600,color:s.clr},children:s.label})'
          ',e.jsx("span",{style:{fontSize:9,color:"#9ca3af"},children:s.delta})'
        ']},s.label);'
      '})'
    '})'
  ']})'
)

OI = (  # other insights
  'e.jsxs("div",{style:{margin:"0 16px 12px"},children:['
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",display:"block",marginBottom:10},children:"Other Insights"}),'
    'e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},children:'
      '[{label:"Avg Attendance",val:"88%",delta:"+5% vs last week",up:true,clr:"#1a56db",pts:"0,18 10,12 20,14 30,8 40,10 50,6 60,10",icon:"users"},'
      '{label:"Overtime Hours",val:"45 hrs",delta:"12% vs last week",up:false,clr:"#7c3aed",pts:"0,10 10,14 20,8 30,16 40,6 50,12 60,8",icon:"clock"},'
      '{label:"Leave Requests",val:"12",delta:"8% vs last week",up:false,clr:"#16a34a",pts:"0,8 10,12 20,10 30,16 40,8 50,14 60,10",icon:"cal"},'
      '{label:"No. of Late Arrivals",val:"7",delta:"16% vs last week",up:true,clr:"#f59e0b",pts:"0,14 10,10 20,16 30,8 40,14 50,10 60,16",icon:"note"}].map(function(ins){'
        'return e.jsxs("div",{style:{background:"#fff",borderRadius:12,padding:"12px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},children:['
          'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6},children:['
            'ins.icon==="users"?e.jsxs("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:ins.clr,strokeWidth:2,children:['
              'e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),'
              'e.jsx("circle",{cx:9,cy:7,r:4}),'
              'e.jsx("path",{d:"M23 21v-2a4 4 0 0 0-3-3.87"}),'
              'e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})'
            ']}):ins.icon==="clock"?e.jsxs("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:ins.clr,strokeWidth:2,children:['
              'e.jsx("circle",{cx:12,cy:12,r:10}),'
              'e.jsx("polyline",{points:"12 6 12 12 16 14"})'
            ']}):ins.icon==="cal"?e.jsxs("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:ins.clr,strokeWidth:2,children:['
              'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
              'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
              'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
              'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
            ']}):e.jsxs("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:ins.clr,strokeWidth:2,children:['
              'e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
              'e.jsx("polyline",{points:"14 2 14 8 20 8"}),'
              'e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),'
              'e.jsx("line",{x1:16,y1:17,x2:8,y2:17})'
            ']})'
            ',e.jsx("span",{style:{fontSize:10,color:"#6b7280",fontWeight:500},children:ins.label})'
          ']}),'
          'e.jsx("div",{style:{fontSize:20,fontWeight:800,color:ins.clr,lineHeight:1,marginBottom:3},children:ins.val}),'
          'e.jsxs("div",{style:{fontSize:10,fontWeight:500,marginBottom:6,color:ins.up?"#16a34a":"#dc2626"},children:['
            'ins.up?"+ ":"- "'
            ',ins.delta'
          ']}),'
          'e.jsx("svg",{width:"100%",height:30,viewBox:"0 0 60 20",preserveAspectRatio:"none",children:'
            'e.jsx("polyline",{points:ins.pts,fill:"none",stroke:ins.clr,strokeWidth:1.5,strokeLinejoin:"round",strokeLinecap:"round"})'
          '})'
        ']},ins.label);'
      '})'
    '})'
  ']})'
)

DO = (  # department overview card
  'e.jsxs("div",{style:{background:"#fff",borderRadius:14,margin:"0 16px 16px",padding:"14px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12},children:['
      'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827"},children:"Department Overview"}),'
      'e.jsx("button",{style:{fontSize:12,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer"},children:"View All"})'
    ']}),'
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr",gap:4,marginBottom:8,paddingBottom:8,borderBottom:"1px solid #f0f1f4"},children:['
      'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontWeight:500},children:"Department"}),'
      'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontWeight:500,textAlign:"center"},children:"Avg Attend."}),'
      'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontWeight:500,textAlign:"center"},children:"Efficiency"}),'
      'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontWeight:500,textAlign:"center"},children:"Pending"})'
    ']}),'
    'e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:'
      '[{name:"Development",clr:"#3b82f6",bg:"#eff6ff",att:92,eff:89,pend:2,icon:"code"},'
      '{name:"Design",clr:"#7c3aed",bg:"#f5f3ff",att:88,eff:93,pend:1,icon:"design"},'
      '{name:"Operations",clr:"#f59e0b",bg:"#fffbeb",att:85,eff:78,pend:2,icon:"ops"},'
      '{name:"Marketing",clr:"#16a34a",bg:"#f0fdf4",att:90,eff:91,pend:1,icon:"mkt"}].map(function(dept){'
        'return e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr",gap:4,alignItems:"center"},children:['
          'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7},children:['
            'e.jsx("div",{style:{width:26,height:26,borderRadius:7,background:dept.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:'
              'dept.icon==="code"?e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:dept.clr,strokeWidth:2,children:['
                'e.jsx("polyline",{points:"16 18 22 12 16 6"}),'
                'e.jsx("polyline",{points:"8 6 2 12 8 18"})'
              ']}):dept.icon==="design"?e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:dept.clr,strokeWidth:2,children:['
                'e.jsx("circle",{cx:12,cy:12,r:10}),'
                'e.jsx("circle",{cx:12,cy:12,r:3})'
              ']}):dept.icon==="ops"?e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:dept.clr,strokeWidth:2,children:['
                'e.jsx("circle",{cx:12,cy:12,r:3}),'
                'e.jsx("path",{d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"})'
              ']}):e.jsxs("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:dept.clr,strokeWidth:2,children:['
                'e.jsx("path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"})'
              ']})'
            '})'
            ',e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#111827"},children:dept.name})'
          ']}),'
          'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#16a34a",textAlign:"center"},children:dept.att+"%"}),'
          'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#1a56db",textAlign:"center"},children:dept.eff+"%"}),'
          'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#f59e0b",textAlign:"center"},children:dept.pend})'
        ']},dept.name);'
      '})'
    '})'
  ']})'
)

# Verify sections
for name, s in [('S1',S1),('S2',S2),('TE',TE),('AB',AB),('OI',OI),('DO',DO)]:
    d = delta(s)
    print('%s: ob=%d op=%d sq=%d' % (name, d[0], d[1], d[2]))
    if d != (0,0,0):
        print('  FAIL'); exit(1)

NEW = (
  'i==="analytics"&&e.jsxs("div",{style:{padding:"0 0 80px",background:"#f4f6fb",flex:1,overflowY:"auto"},children:['
  + S1 + ','
  + S2 + ','
  + TE + ','
  + AB + ','
  + OI + ','
  + DO
  + ']}),'
)


ob_old,op_old,sq_old = delta(OLD_BLOCK)
ob_new,op_new,sq_new = delta(NEW)
print('OLD delta: ob=%d op=%d sq=%d' % (ob_old,op_old,sq_old))
print('NEW delta: ob=%d op=%d sq=%d' % (ob_new,op_new,sq_new))
if (ob_old,op_old,sq_old) != (ob_new,op_new,sq_new):
    print('BRACKET MISMATCH'); exit(1)

content2 = content[:START] + NEW + content[END:]
ob,op,sq = delta(content2)
print('global: ob=%d op=%d sq=%d' % (ob,op,sq))
if ob!=0 or op!=0 or sq!=0:
    print('GLOBAL IMBALANCE'); exit(1)

m = re.search(r'<script[^>]*>([\s\S]*?)</script>', content2)
script = m.group(1) if m else content2
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
