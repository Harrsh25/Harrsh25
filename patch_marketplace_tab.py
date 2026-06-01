#!/usr/bin/env python3
"""Replace Marketplace tab with pixel-perfect UI."""
import subprocess, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = 'i===\"marketplace\"&&Ny.map('
assert content.count(START_STR) == 1
START = content.find(START_STR)
seg = content[START:]
db=dp=ds=0; ever=False; end_rel=None
for i,ch in enumerate(seg):
    if ch=='{': db+=1; ever=True
    elif ch=='}': db-=1
    elif ch=='(': dp+=1; ever=True
    elif ch==')': dp-=1
    elif ch=='[': ds+=1; ever=True
    elif ch==']': ds-=1
    if ever and db==0 and dp==0 and ds==0: end_rel=i+1; break
END = START + end_rel
OLD = content[START:END]
ob_o,op_o,sq_o = delta(OLD)
print('OLD: len=%d ob=%d op=%d sq=%d' % (len(OLD),ob_o,op_o,sq_o))

def sicon(paths, col, w=16, fill='none', sw=2):
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",'
            +'fill:"'+fill+'",stroke:"'+col+'",strokeWidth:'+str(sw)+','
            +'children:e.jsxs("g",{children:['+paths+']})})')

# ── Search row ──────────────────────────────────────────────────────────────
SEARCH_ROW = (
    'e.jsxs("div",{style:{display:"flex",gap:10,marginBottom:4},children:['
    +'e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",gap:8,'
    +'background:"#fff",borderRadius:12,padding:"10px 14px",'
    +'border:"1px solid #e5e7eb",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"},children:['
    +sicon('e.jsx("circle",{cx:11,cy:11,r:8}),e.jsx("line",{x1:21,y1:21,x2:16.65,y2:16.65})','#9ca3af',16)
    +',e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"Search projects, skills or roles..."})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,'
    +'background:"#fff",borderRadius:12,padding:"10px 14px",'
    +'border:"1px solid #e5e7eb",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",cursor:"pointer"},children:['
    +sicon('e.jsx("polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"})','#374151',16)
    +',e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#374151"},children:"Filters"})'
    +']})'
    +']})'
)

# ── Project card factory ─────────────────────────────────────────────────────
def tag_chip(label, col, bg):
    return ('e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"'+col+'",'
            +'background:"'+bg+'",borderRadius:20,padding:"3px 10px",'
            +'border:"1px solid '+col+'22"},children:"'+label+'"})')

def footer_item(icon_paths, text):
    return ('e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
            +sicon(icon_paths,'#9ca3af',13)
            +',e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"'+text+'"})'
            +']})')

def project_card(border_col, ic_paths, ic_col, ic_bg, title, dept, tags_data, hours, weeks, deadline, btn_col):
    tags_jsx = ','.join([tag_chip(l,c,b) for l,c,b in tags_data])
    return ('e.jsxs("div",{style:{background:"#fff",borderRadius:16,'
            +'border:"1px solid #f0f1f4",borderLeft:"3.5px solid '+border_col+'",'
            +'boxShadow:"0 1px 4px rgba(0,0,0,0.04)",padding:"14px 14px 12px",overflow:"hidden"},children:['
            +'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10},children:['
            +'e.jsx("div",{style:{width:60,height:60,borderRadius:12,background:"'+ic_bg+'",'
            +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
            +'children:'+sicon(ic_paths,ic_col,28)+'}),'
            +'e.jsxs("div",{style:{flex:1},children:['
            +'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",margin:"0 0 3px",lineHeight:1.3},children:"'+title+'"}),'
            +'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:0},children:"'+dept+'"})'
            +']})'
            +',e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"'+btn_col+'",'
            +'background:"'+btn_col+'18",borderRadius:8,padding:"4px 10px",flexShrink:0},children:"Open"})'
            +']})'
            +',e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12},children:['
            +tags_jsx
            +']})'
            +',e.jsx("div",{style:{height:1,background:"#f3f4f6",marginBottom:10}})'
            +',e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
            +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
            +footer_item('e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("polyline",{points:"12 6 12 12 16 14"})', hours)
            +',e.jsx("span",{style:{color:"#e5e7eb"},children:"|"})'
            +','+footer_item('e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),e.jsx("line",{x1:3,y1:10,x2:21,y2:10})', weeks)
            +',e.jsx("span",{style:{color:"#e5e7eb"},children:"|"})'
            +','+footer_item('e.jsx("path",{d:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}),e.jsx("line",{x1:4,y1:22,x2:4,y2:15})', deadline)
            +']})'
            +',e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,'
            +'background:"none",border:"1.5px solid '+btn_col+'",borderRadius:10,'
            +'padding:"6px 12px",cursor:"pointer"},children:['
            +'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"'+btn_col+'"},children:"View Details"}),'
            +sicon('e.jsx("polyline",{points:"9 18 15 12 9 6"})',''+btn_col+'',12)
            +']})'
            +']})'
            +']})')

SOLAR_IC = ('e.jsx("rect",{x:2,y:12,width:20,height:8,rx:2}),'
            +'e.jsx("path",{d:"M6 12V8a6 6 0 0 1 12 0v4"}),'
            +'e.jsx("line",{x1:12,y1:2,x2:12,y2:4}),'
            +'e.jsx("line",{x1:4.22,y1:4.22,x2:5.64,y2:5.64}),'
            +'e.jsx("line",{x1:19.78,y1:4.22,x2:18.36,y2:5.64})')

PEOPLE_IC = ('e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),'
             +'e.jsx("circle",{cx:9,cy:7,r:4}),'
             +'e.jsx("path",{d:"M23 21v-2a4 4 0 0 0-3-3.87"}),'
             +'e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})')

SHIELD_IC = ('e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}),'
             +'e.jsx("path",{d:"M9 12l2 2 4-4"})')

CARD1 = project_card(
    '#1a56db', SOLAR_IC, '#1a56db', '#eff4ff',
    'Lead the Solar Farm Site Commissioning', 'Engineering · Project',
    [('Solar Energy','#1a56db','#eff4ff'),('Commissioning','#1a56db','#eff4ff'),('Quality Assurance','#1a56db','#eff4ff')],
    '120h', '4 weeks', 'By 10 May 2026', '#1a56db'
)

CARD2 = project_card(
    '#16a34a', PEOPLE_IC, '#16a34a', '#f0fdf4',
    'Mentor Junior Engineers - Q2 Program', 'Engineering · Mentorship',
    [('Project Management','#16a34a','#f0fdf4'),('Construction Methods','#16a34a','#f0fdf4')],
    '24h', '12 weeks', 'By 15 May 2026', '#16a34a'
)

CARD3 = project_card(
    '#7c3aed', SHIELD_IC, '#7c3aed', '#f3f0ff',
    'Safety Audit Committee Member', 'Safety · Committee',
    [('Safety Compliance','#7c3aed','#f3f0ff'),('Risk Assessment','#7c3aed','#f3f0ff')],
    '8h', '2 weeks', 'By 05 May 2026', '#7c3aed'
)

# ── Grow Your Impact banner ───────────────────────────────────────────────────
STAR_IC = ('e.jsx("div",{style:{width:44,height:44,borderRadius:"50%",background:"#f97316",'
           +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
           +'children:'+sicon('e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})','#fff',20,'#fff')
           +'})')

GROW_BANNER = (
    'e.jsxs("div",{style:{background:"linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)",'
    +'borderRadius:16,padding:"16px",border:"1px solid #fde68a",'
    +'display:"flex",alignItems:"center",gap:12},children:['
    +STAR_IC
    +',e.jsxs("div",{style:{flex:1},children:['
    +'e.jsx("p",{style:{fontSize:14,fontWeight:800,color:"#111827",margin:"0 0 4px"},children:"Grow Your Impact"}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:0,lineHeight:1.5},'
    +'children:"Explore projects that match your skills and interests and make a bigger difference."})'
    +']})'
    +',e.jsx("button",{style:{background:"none",color:"#f97316",border:"1.5px solid #f97316",'
    +'borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",'
    +'whiteSpace:"nowrap",flexShrink:0},children:"How It Works"})'
    +']})'
)

NEW_VIEW = (
    'i===\"marketplace\"&&e.jsxs(e.Fragment,{children:['
    +'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"0 0 80px"},children:['
    +SEARCH_ROW+','
    +CARD1+','
    +CARD2+','
    +CARD3+','
    +GROW_BANNER
    +']})'
    +']})'
)

ob_n,op_n,sq_n = delta(NEW_VIEW)
print('SEARCH_ROW delta:', delta(SEARCH_ROW))
print('CARD1 delta:', delta(CARD1))
print('CARD2 delta:', delta(CARD2))
print('CARD3 delta:', delta(CARD3))
print('GROW_BANNER delta:', delta(GROW_BANNER))
print('NEW_VIEW delta: %d %d %d' % (ob_n,op_n,sq_n))
assert (ob_n,op_n,sq_n)==(0,0,0), 'NEW_VIEW bracket imbalance!'

new_content = content[:START] + NEW_VIEW + content[END:]
g0,g1,g2 = delta(new_content)
c0,c1,c2 = delta(content)
print('global: %d %d %d' % (g0-c0, g1-c1, g2-c2))
assert (g0-c0, g1-c1, g2-c2) == (0,0,0), 'Global bracket imbalance!'

tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
tmp.write('var i="marketplace",e={jsx:()=>{},jsxs:()=>{}};void (' + NEW_VIEW + ')')
tmp.close()
r = subprocess.run(['node', tmp.name], capture_output=True, text=True)
os.unlink(tmp.name)
if r.returncode != 0:
    print('ERR:' + r.stderr[:600])
else:
    print('Node: OK')
    with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Done.')
