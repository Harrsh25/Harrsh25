#!/usr/bin/env python3
"""Replace Analytics Reports tab with pixel-perfect UI."""
import subprocess, re, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = 'i===\"reports\"&&e.jsxs(\"div\",{className:\"space-y-4\"'
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

def sicon(paths,col,w=20):
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",'
            +'fill:"none",stroke:"'+col+'",strokeWidth:2,'
            +'children:e.jsxs("g",{children:['+paths+']})})')

# ── REPORT CENTER BANNER ──────────────────────────────────────────────────────
CLIP_IC = ('e.jsx("div",{style:{width:52,height:52,borderRadius:"50%",background:"rgba(99,102,241,0.15)",'
           +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
           +'children:'+sicon(
               'e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
               +'e.jsx("polyline",{points:"14 2 14 8 20 8"}),'
               +'e.jsx("line",{x1:16,y1:13,x2:8,y2:13}),'
               +'e.jsx("line",{x1:16,y1:17,x2:8,y2:17}),'
               +'e.jsx("polyline",{points:"10 9 9 9 8 9"})','#6366f1',22)
           +'})')

BANNER_ILLO = (
    'e.jsx("svg",{width:90,height:70,viewBox:"0 0 90 70",children:'
    +'e.jsxs("g",{children:['
    +'e.jsx("rect",{x:10,y:10,width:50,height:40,rx:5,fill:"rgba(99,102,241,0.12)",stroke:"rgba(99,102,241,0.3)",strokeWidth:1}),'
    +'e.jsx("rect",{x:16,y:22,width:6,height:18,rx:2,fill:"#6366f1",opacity:0.7}),'
    +'e.jsx("rect",{x:26,y:16,width:6,height:24,rx:2,fill:"#818cf8",opacity:0.7}),'
    +'e.jsx("rect",{x:36,y:20,width:6,height:20,rx:2,fill:"#a5b4fc",opacity:0.7}),'
    +'e.jsx("circle",{cx:62,cy:20,r:14,fill:"none",stroke:"rgba(99,102,241,0.3)",strokeWidth:1}),'
    +'e.jsx("path",{d:"M62 6 A14 14 0 0 1 76 20",fill:"#6366f1",opacity:0.6,stroke:"none"}),'
    +'e.jsx("circle",{cx:70,cy:52,r:12,fill:"rgba(99,102,241,0.1)",stroke:"rgba(99,102,241,0.25)",strokeWidth:1}),'
    +'e.jsx("path",{d:"M65 52 L68 55 L75 48",fill:"none",stroke:"#6366f1",strokeWidth:2,strokeLinecap:"round"}),'
    +'e.jsx("text",{x:5,y:8,fontSize:10,fill:"rgba(99,102,241,0.4)",children:"+"}),'
    +'e.jsx("text",{x:75,y:35,fontSize:10,fill:"rgba(99,102,241,0.4)",children:"+"}),'
    +'e.jsx("text",{x:55,y:60,fontSize:8,fill:"rgba(99,102,241,0.3)",children:"✦"})'
    +']})'
    +'})'
)

REPORT_CENTER = (
    'e.jsxs("div",{style:{background:"linear-gradient(135deg,#eef2ff 0%,#e0e7ff 100%)",'
    +'borderRadius:16,padding:"18px 16px",border:"1px solid #c7d2fe",'
    +'display:"flex",alignItems:"center",gap:14},children:['
    +CLIP_IC
    +',e.jsxs("div",{style:{flex:1},children:['
    +'e.jsx("p",{style:{fontSize:16,fontWeight:800,color:"#111827",margin:"0 0 4px"},children:"Report Center"}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:0,lineHeight:1.5},'
    +'children:"Generate and download reports for your records"})'
    +']})'
    +','+BANNER_ILLO
    +']})'
)
print('REPORT_CENTER delta:',delta(REPORT_CENTER))

# ── REPORT CARD ───────────────────────────────────────────────────────────────
def export_chip(label,col):
    return ('e.jsx("span",{style:{fontSize:10,fontWeight:600,color:"'+col+'",'
            +'background:"'+col+'18",borderRadius:6,padding:"3px 10px",'
            +'border:"1px solid '+col+'44"},children:"'+label+'"})')

def report_card(icon_paths,icon_col,icon_bg,title,desc,exports):
    chips = ','.join([export_chip('PDF','#6366f1' if i==0 else '#16a34a') for i,e in enumerate(exports) if e=='PDF' or e=='Excel']
                     if False else
                     [export_chip('PDF','#6366f1')] + ([export_chip('Excel','#16a34a')] if 'Excel' in exports else []))
    return (
        'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
        +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
        +'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:14},children:['
        +'e.jsx("div",{style:{width:50,height:50,borderRadius:"50%",background:"'+icon_bg+'",'
        +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
        +'children:'+sicon(icon_paths,icon_col,22)+'}),'
        +'e.jsxs("div",{style:{flex:1},children:['
        +'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",margin:"0 0 3px"},children:"'+title+'"}),'
        +'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:"0 0 10px",lineHeight:1.4},children:"'+desc+'"})'
        +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
        +'e.jsx("span",{style:{fontSize:10,color:"#9ca3af"},children:"Export as:"}),'
        +chips
        +',e.jsx("span",{style:{fontSize:16,color:"#9ca3af",cursor:"pointer",marginLeft:2},children:"\\u22EE"})'
        +']})'
        +']})'
        +',e.jsx("div",{style:{width:32,height:32,borderRadius:8,background:"#f3f4f6",'
        +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"},'
        +'children:e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",'
        +'stroke:"#6b7280",strokeWidth:2.5,'
        +'children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})})'
        +']})'
        +']})'
    )

ATT_PATHS = ('e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
             +'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
             +'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
             +'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})')

LEAVE_PATHS = ('e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
               +'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
               +'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
               +'e.jsx("line",{x1:3,y1:10,x2:21,y2:10}),'
               +'e.jsx("polyline",{points:"9 15 11 17 15 13"})')

RUPEE_PATHS = 'e.jsx("path",{d:"M6 3h12M6 8h12M15 21l-9-13h3a4 4 0 0 0 0-8"})'

TAX_PATHS = ('e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),'
             +'e.jsx("polyline",{points:"14 2 14 8 20 8"}),'
             +'e.jsx("line",{x1:9,y1:15,x2:15,y2:15}),'
             +'e.jsx("path",{d:"M9 12h6"})')

PERF_PATHS = ('e.jsx("circle",{cx:12,cy:12,r:10}),'
              +'e.jsx("circle",{cx:12,cy:12,r:6}),'
              +'e.jsx("circle",{cx:12,cy:12,r:2})')

EXP_PATHS = ('e.jsx("rect",{x:2,y:5,width:20,height:14,rx:2}),'
             +'e.jsx("line",{x1:2,y1:10,x2:22,y2:10}),'
             +'e.jsx("path",{d:"M9 15h2m4 0h2"})')

CARD1 = report_card(ATT_PATHS,'#1a56db','#eff4ff','Attendance Report','Monthly attendance summary with daily status',['PDF','Excel'])
CARD2 = report_card(LEAVE_PATHS,'#16a34a','#f0fdf4','Leave Utilization Report','Leave balance and usage breakdown',['PDF','Excel'])
CARD3 = report_card(RUPEE_PATHS,'#f59e0b','#fff7ed','Payroll Summary','Earnings, deductions, and net pay details',['PDF'])
CARD4 = report_card(TAX_PATHS,'#ef4444','#fef2f2','Tax Declaration Report','Section-wise investment declarations',['PDF'])
CARD5 = report_card(PERF_PATHS,'#16a34a','#f0fdf4','Performance Report','Goals, OKRs, and review history',['PDF','Excel'])
CARD6 = report_card(EXP_PATHS,'#1a56db','#eff4ff','Expense Report','Travel and expense claims summary',['PDF','Excel'])

for i,(n,c) in enumerate([('CARD1',CARD1),('CARD2',CARD2),('CARD3',CARD3),('CARD4',CARD4),('CARD5',CARD5),('CARD6',CARD6)]):
    print(n,'delta:',delta(c))

# ── SECURE BANNER ─────────────────────────────────────────────────────────────
SHIELD_IC = ('e.jsx("div",{style:{width:52,height:52,borderRadius:"50%",background:"#16a34a",'
             +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
             +'children:'+sicon(
                 'e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}),'
                 +'e.jsx("polyline",{points:"9 12 11 14 15 10"})','#fff',22)
             +'})')

SECURE_ILLO = (
    'e.jsx("svg",{width:80,height:60,viewBox:"0 0 80 60",children:'
    +'e.jsxs("g",{children:['
    +'e.jsx("path",{d:"M40 5 L56 11 L56 28 C56 38 48 46 40 50 C32 46 24 38 24 28 L24 11 Z",'
    +'fill:"rgba(22,163,74,0.15)",stroke:"rgba(22,163,74,0.4)",strokeWidth:1}),'
    +'e.jsx("polyline",{points:"33 28 37 32 48 21",fill:"none",stroke:"#16a34a",strokeWidth:2.5,strokeLinecap:"round"}),'
    +'e.jsx("rect",{x:60,y:15,width:16,height:2,rx:1,fill:"rgba(22,163,74,0.4)"}),'
    +'e.jsx("rect",{x:60,y:22,width:12,height:2,rx:1,fill:"rgba(22,163,74,0.3)"}),'
    +'e.jsx("rect",{x:60,y:29,width:14,height:2,rx:1,fill:"rgba(22,163,74,0.3)"}),'
    +'e.jsx("text",{x:5,y:12,fontSize:10,fill:"rgba(22,163,74,0.4)",children:"+"}),'
    +'e.jsx("text",{x:70,y:50,fontSize:8,fill:"rgba(22,163,74,0.3)",children:"✦"})'
    +']})'
    +'})'
)

SECURE_BANNER = (
    'e.jsxs("div",{style:{background:"linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",'
    +'borderRadius:16,padding:"18px 16px",border:"1px solid #bbf7d0",'
    +'display:"flex",alignItems:"center",gap:14},children:['
    +SHIELD_IC
    +',e.jsxs("div",{style:{flex:1},children:['
    +'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",margin:"0 0 4px"},children:"Secure & Accurate"}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#374151",margin:0,lineHeight:1.5},'
    +'children:"All reports are generated with real-time data and are 100% secure."})'
    +']})'
    +','+SECURE_ILLO
    +']})'
)
print('SECURE_BANNER delta:',delta(SECURE_BANNER))

# ── ASSEMBLE ──────────────────────────────────────────────────────────────────
NEW_VIEW = (
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"0 0 80px"},children:['
    +REPORT_CENTER+','
    +CARD1+','+CARD2+','+CARD3+','+CARD4+','+CARD5+','+CARD6+','
    +SECURE_BANNER
    +']})'
)
ob_v,op_v,sq_v=delta(NEW_VIEW)
print('NEW_VIEW delta:',ob_v,op_v,sq_v)
if ob_v!=0 or op_v!=0 or sq_v!=0: print('IMBALANCED'); exit(1)

NEW='i==="reports"&&'+NEW_VIEW
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
