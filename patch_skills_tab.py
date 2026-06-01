#!/usr/bin/env python3
"""Replace Skills tab with pixel-perfect UI."""
import subprocess, re, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = 'i===\"skills\"&&e.jsxs(e.Fragment,{children:['
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
END=START+end_rel; OLD=content[START:END]
ob_o,op_o,sq_o=delta(OLD)
print('OLD: len=%d ob=%d op=%d sq=%d'%(len(OLD),ob_o,op_o,sq_o))

def sicon(paths,col,w=16,fill='none'):
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",'
            +'fill:"'+fill+'",stroke:"'+col+'",strokeWidth:2,'
            +'children:e.jsxs("g",{children:['+paths+']})})')

# ── SKILL DOTS (5-dot rating) ─────────────────────────────────────────────────
def skill_dots(filled):
    dots=[]
    for i in range(5):
        col='#f97316' if i<filled else '#e5e7eb'
        dots.append('e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"'+col+'"}})')
    return ','.join(dots)

# ── SEGMENTED PROGRESS BAR ────────────────────────────────────────────────────
def seg_bar(score,col,total=22,h=7):
    filled=round(score/5*total)
    sw=13; gap=2; tw=total*sw+(total-1)*gap
    rects=[]
    for i in range(total):
        x=i*(sw+gap); fc=col if i<filled else '#e5e7eb'
        rects.append('e.jsx("rect",{x:'+str(x)+',y:0,width:'+str(sw)+',height:'+str(h)+',rx:2,fill:"'+fc+'"})')
    return ('e.jsx("svg",{width:"100%",height:'+str(h)+',viewBox:"0 0 '+str(tw)+' '+str(h)+'",'
            +'preserveAspectRatio:"none",'
            +'children:e.jsxs("g",{children:['+','.join(rects)+']})})')

# ── SKILL ROW ICONS ───────────────────────────────────────────────────────────
def row_icon(paths,col,bg,w=18):
    return ('e.jsx("div",{style:{width:32,height:32,borderRadius:8,background:"'+bg+'",'
            +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
            +'children:'+sicon(paths,col,w)+'})')

PM_IC=row_icon('e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),e.jsx("circle",{cx:9,cy:7,r:4})','#f97316','#fff7ed')
RISK_IC=row_icon('e.jsx("path",{d:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"}),e.jsx("line",{x1:12,y1:9,x2:12,y2:13}),e.jsx("line",{x1:12,y1:17,x2:12.01,y2:17})','#f97316','#fff7ed')
COST_IC=row_icon('e.jsx("rect",{x:3,y:3,width:18,height:18,rx:2}),e.jsx("path",{d:"M3 9h18M9 21V9"})','#16a34a','#f0fdf4')
QA_IC=row_icon('e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"})','#1a56db','#eff4ff')
SAFETY_IC=row_icon('e.jsx("path",{d:"M20 7h-3a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"}),e.jsx("path",{d:"M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0"})','#ef4444','#fef2f2')
CONTRACT_IC=row_icon('e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),e.jsx("polyline",{points:"14 2 14 8 20 8"}),e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),e.jsx("line",{x1:16,y1:17,x2:8,y2:17})','#f97316','#fff7ed')
P6_IC=('e.jsx("div",{style:{width:32,height:32,borderRadius:8,background:"#f3f0ff",'
       +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
       +'children:e.jsx("span",{style:{fontSize:11,fontWeight:800,color:"#7c3aed"},children:"P6"})})')

SKILL_ROWS=[
    (PM_IC,'Project Management',3,'Need 5'),
    (RISK_IC,'Risk Assessment',3,'Need 4'),
    (COST_IC,'Cost Estimation',3,'Need 4'),
    (QA_IC,'Quality Assurance',4,'Need 5'),
    (SAFETY_IC,'Safety Compliance',4,'Need 5'),
    (CONTRACT_IC,'Contract Management',3,'Need 4'),
    (P6_IC,'Primavera P6',2,'Need 4'),
]

def skill_row(icon,name,dots,need,last=False):
    bb='' if last else ',borderBottom:"1px solid #f3f4f6"'
    return ('e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"10px 0"'+bb+'},children:['
            +icon
            +',e.jsx("span",{style:{flex:1,fontSize:13,fontWeight:500,color:"#111827"},children:"'+name+'"}),'
            +'e.jsxs("div",{style:{display:"flex",gap:4,alignItems:"center"},children:['
            +skill_dots(dots)
            +']})'
            +',e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#f97316",minWidth:42,textAlign:"right"},children:"'+need+'"}),'
            +'e.jsx("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#9ca3af",strokeWidth:2.5,'
            +'children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})'
            +']})')

# Target illustration
TARGET_ILLO=(
    'e.jsx("svg",{width:95,height:85,viewBox:"0 0 95 85",children:'
    +'e.jsxs("g",{children:['
    +'e.jsx("rect",{x:18,y:55,width:9,height:22,rx:3,fill:"#fed7aa",opacity:0.7}),'
    +'e.jsx("rect",{x:31,y:47,width:9,height:30,rx:3,fill:"#fed7aa",opacity:0.8}),'
    +'e.jsx("circle",{cx:62,cy:38,r:30,fill:"none",stroke:"#f97316",strokeWidth:6,opacity:0.18}),'
    +'e.jsx("circle",{cx:62,cy:38,r:21,fill:"none",stroke:"#f97316",strokeWidth:6,opacity:0.35}),'
    +'e.jsx("circle",{cx:62,cy:38,r:12,fill:"none",stroke:"#f97316",strokeWidth:6,opacity:0.65}),'
    +'e.jsx("circle",{cx:62,cy:38,r:4,fill:"#f97316"}),'
    +'e.jsx("line",{x1:28,y1:12,x2:59,y2:35,stroke:"#f97316",strokeWidth:3,strokeLinecap:"round"}),'
    +'e.jsx("polygon",{points:"59 30 65 40 55 38",fill:"#f97316"})'
    +']})'
    +'})'
)

# ── SKILL GAPS CARD ───────────────────────────────────────────────────────────
ROWS_JSX=','.join([skill_row(ic,nm,d,n,i==len(SKILL_ROWS)-1) for i,(ic,nm,d,n) in enumerate(SKILL_ROWS)])

SKILL_GAPS_CARD=(
    'e.jsxs("div",{style:{background:"linear-gradient(135deg,#fff7ed 0%,#fef3c7 100%)",'
    +'borderRadius:16,padding:"16px",border:"1px solid #fed7aa"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between"},children:['
    +'e.jsxs("div",{style:{flex:1},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8},children:['
    +sicon('e.jsx("path",{d:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"}),e.jsx("line",{x1:12,y1:9,x2:12,y2:13}),e.jsx("line",{x1:12,y1:17,x2:12.01,y2:17})','#f97316',20)
    +',e.jsx("span",{style:{fontSize:17,fontWeight:800,color:"#111827"},children:"Skill Gaps"}),'
    +'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#fff",background:"#f97316",'
    +'borderRadius:20,padding:"2px 8px"},children:"7"})'
    +']})'
    +',e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:"0 0 14px",lineHeight:1.5},'
    +'children:"These are the key skills identified for your role growth."})'
    +',e.jsxs("button",{style:{display:"inline-flex",alignItems:"center",gap:6,'
    +'background:"#fff",borderRadius:20,padding:"8px 14px",border:"1px solid #f97316",'
    +'cursor:"pointer"},children:['
    +sicon('e.jsx("path",{d:"M4 19.5A2.5 2.5 0 0 1 6.5 17H20"}),e.jsx("path",{d:"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"})','#f97316',14)
    +',e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#f97316"},children:"View Learning Plan"})'
    +']})'
    +']})'
    +','+TARGET_ILLO
    +']})'
    +',e.jsx("div",{style:{height:1,background:"rgba(249,115,22,0.15)",margin:"14px 0"}})'
    +','+ROWS_JSX
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:14,marginTop:12,paddingTop:10,borderTop:"1px solid rgba(249,115,22,0.15)"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    +'e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"#f97316"}}),'
    +'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"Strong"})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    +'e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"#fed7aa"}}),'
    +'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"Moderate"})'
    +']})'
    +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    +'e.jsx("div",{style:{width:10,height:10,borderRadius:"50%",background:"#e5e7eb"}}),'
    +'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"Needs Improvement"})'
    +']})'
    +']})'
    +']})'
)
print('SKILL_GAPS_CARD delta:',delta(SKILL_GAPS_CARD))

# ── SKILL PROFICIENCY CARDS ───────────────────────────────────────────────────
def skill_card(ic_paths,ic_col,ic_bg,name,level,score,score_label,bar_col):
    score_str=str(score)
    ic_box=('e.jsx("div",{style:{width:48,height:48,borderRadius:14,background:"'+ic_bg+'",'
            +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
            +'children:'+sicon(ic_paths,ic_col,22)+'})')
    return ('e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"14px 16px",'
            +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
            +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:14,marginBottom:10},children:['
            +ic_box
            +',e.jsxs("div",{style:{flex:1},children:['
            +'e.jsx("p",{style:{fontSize:15,fontWeight:700,color:"#111827",margin:"0 0 3px"},children:"'+name+'"}),'
            +'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:0},children:"'+level+'"})'
            +']})'
            +',e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:2},children:['
            +'e.jsx("span",{style:{fontSize:16,fontWeight:800,color:"#16a34a",background:"#f0fdf4",'
            +'borderRadius:8,padding:"3px 10px",border:"1px solid #bbf7d0"},children:"'+score_str+'"}),'
            +'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"'+score_label+'"})'
            +']})'
            +',e.jsx("div",{style:{width:28,height:28,borderRadius:8,background:"#f3f4f6",'
            +'display:"flex",alignItems:"center",justifyContent:"center"},'
            +'children:e.jsx("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",'
            +'stroke:"#6b7280",strokeWidth:2.5,children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})})'
            +']})'
            +','+seg_bar(score,bar_col)
            +']})')

PEOPLE_P='e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),e.jsx("circle",{cx:9,cy:7,r:4}),e.jsx("path",{d:"M23 21v-2a4 4 0 0 0-3-3.87"}),e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})'
BUILD_P='e.jsx("rect",{x:2,y:6,width:20,height:14,rx:2}),e.jsx("path",{d:"M12 6V2m0 0L9 5m3-3 3 3"}),e.jsx("line",{x1:2,y1:12,x2:22,y2:12})'
BRIEF_P='e.jsx("rect",{x:2,y:7,width:20,height:14,rx:2}),e.jsx("path",{d:"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"})'

C1=skill_card(PEOPLE_P,'#1a56db','#eff4ff','Stakeholder Management','Advanced',4.0,'Advanced','#1a56db')
C2=skill_card(BUILD_P,'#16a34a','#f0fdf4','Construction Methods','Expert',4.8,'Expert','#16a34a')
C3=skill_card(BRIEF_P,'#7c3aed','#f3f0ff','MS Project','Advanced',4.0,'Advanced','#1a56db')

for n,c in [('C1',C1),('C2',C2),('C3',C3)]:
    print(n,'delta:',delta(c))

# ── KEEP GROWING BANNER ───────────────────────────────────────────────────────
STAR_IC=('e.jsx("div",{style:{width:48,height:48,borderRadius:"50%",background:"#dbeafe",'
         +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
         +'children:'+sicon('e.jsx("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"})','#1a56db',22,'#1a56db')
         +'})')

KEEP_GROWING=(
    'e.jsxs("div",{style:{background:"linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)",'
    +'borderRadius:16,padding:"16px",border:"1px solid #bfdbfe",'
    +'display:"flex",alignItems:"center",gap:12},children:['
    +STAR_IC
    +',e.jsxs("div",{style:{flex:1},children:['
    +'e.jsx("p",{style:{fontSize:14,fontWeight:800,color:"#1a56db",margin:"0 0 4px"},children:"Keep Growing!"}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#374151",margin:0,lineHeight:1.5},'
    +'children:"Keep enhancing your skills to unlock new opportunities and accelerate your career."})'
    +']})'
    +',e.jsx("button",{style:{background:"#1a56db",color:"#fff",border:"none",'
    +'borderRadius:10,padding:"10px 14px",fontSize:12,fontWeight:700,cursor:"pointer",'
    +'whiteSpace:"nowrap",flexShrink:0},children:"Explore Learning"})'
    +']})'
)
print('KEEP_GROWING delta:',delta(KEEP_GROWING))

# ── ASSEMBLE ──────────────────────────────────────────────────────────────────
NEW_VIEW=(
    'e.jsxs(e.Fragment,{children:['
    +'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"0 0 80px"},children:['
    +SKILL_GAPS_CARD+','
    +C1+','+C2+','+C3+','
    +KEEP_GROWING
    +']})'
    +']})'
)
ob_v,op_v,sq_v=delta(NEW_VIEW)
print('NEW_VIEW delta:',ob_v,op_v,sq_v)
if ob_v!=0 or op_v!=0 or sq_v!=0: print('IMBALANCED'); exit(1)

NEW='i==="skills"&&'+NEW_VIEW
ob_n,op_n,sq_n=delta(NEW)
if (ob_n,op_n,sq_n)!=(ob_o,op_o,sq_o): print('DELTA MISMATCH',ob_n,op_n,sq_n,'vs',ob_o,op_o,sq_o); exit(1)

content2=content[:START]+NEW+content[END:]
ob_g,op_g,sq_g=delta(content2)
print('global:',ob_g,op_g,sq_g)
if ob_g!=0 or op_g!=0 or sq_g!=0: print('GLOBAL IMBALANCE'); exit(1)

m_re=re.search(r'<script[^>]*>([\s\S]*?)</script>',content2)
script=m_re.group(1) if m_re else content2
with tempfile.NamedTemporaryFile(mode='w',suffix='.js',delete=False,encoding='utf-8') as tf:
    tf.write('try{new Function('+repr(script)+')}catch(e){process.stdout.write("ERR:"+e.message)}\nprocess.stdout.write("OK")')
    tname=tf.name
r=subprocess.run(['node',tname],capture_output=True,text=True)
os.unlink(tname)
node_out=r.stdout+r.stderr
print('Node:',node_out[:160])
if 'OK' in node_out and 'ERR' not in node_out:
    with open('/home/user/Harrsh25/hrmobileapp.html','w',encoding='utf-8') as f:
        f.write(content2)
    print('Done.')
else:
    print('Node FAILED')
