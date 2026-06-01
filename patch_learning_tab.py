#!/usr/bin/env python3
"""Replace Learning tab with pixel-perfect UI."""
import subprocess, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = 'i===\"learning\"&&e.jsxs("div",{className:"space-y-3",'
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
print('OLD: len=%d ob=%d op=%d sq=%d' % (len(OLD),*delta(OLD)))

def sicon(paths, col, w=16, fill='none', sw=2):
    return ('e.jsx("svg",{width:'+str(w)+',height:'+str(w)+',viewBox:"0 0 24 24",'
            +'fill:"'+fill+'",stroke:"'+col+'",strokeWidth:'+str(sw)+','
            +'children:e.jsxs("g",{children:['+paths+']})})')

# ── Keep Learning banner ──────────────────────────────────────────────────────
BOOK_IC = (
    'e.jsx("div",{style:{width:52,height:52,borderRadius:14,background:"#dbeafe",'
    +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    +'children:'+sicon(
        'e.jsx("path",{d:"M4 19.5A2.5 2.5 0 0 1 6.5 17H20"}),'
        +'e.jsx("path",{d:"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"}),'
        +'e.jsx("line",{x1:12,y1:6,x2:12,y2:10}),'
        +'e.jsx("line",{x1:10,y1:8,x2:14,y2:8})',
        '#1a56db', 26)
    +'})'
)

KEEP_LEARNING_BANNER = (
    'e.jsxs("div",{style:{background:"linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)",'
    +'borderRadius:16,padding:"16px",border:"1px solid #bfdbfe",'
    +'display:"flex",alignItems:"center",gap:12},children:['
    +BOOK_IC
    +',e.jsxs("div",{style:{flex:1},children:['
    +'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",margin:"0 0 4px"},children:"Keep Learning!"}),'
    +'e.jsx("p",{style:{fontSize:12,color:"#374151",margin:0,lineHeight:1.5},'
    +'children:"Track your progress and continue building your expertise."})'
    +']})'
    +',e.jsx("button",{style:{background:"none",color:"#1a56db",border:"1.5px solid #1a56db",'
    +'borderRadius:10,padding:"9px 13px",fontSize:12,fontWeight:700,cursor:"pointer",'
    +'whiteSpace:"nowrap",flexShrink:0},children:"Browse Learning"})'
    +']})'
)

# ── Progress bar ──────────────────────────────────────────────────────────────
def prog_bar(pct):
    return ('e.jsxs("div",{style:{marginTop:6},children:['
            +'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6},children:['
            +'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#374151"},children:"Progress"}),'
            +'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#374151"},children:"'+str(pct)+'%"})'
            +']})'
            +',e.jsx("div",{style:{height:6,background:"#e5e7eb",borderRadius:99,overflow:"hidden"},children:'
            +'e.jsx("div",{style:{height:"100%",width:"'+str(pct)+'%",background:"#1a56db",borderRadius:99}})'
            +'})'
            +']})')

# ── Course card factory ───────────────────────────────────────────────────────
def status_chip(label, col, bg):
    return ('e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"'+col+'",'
            +'background:"'+bg+'",borderRadius:20,padding:"3px 10px",'
            +'border:"1px solid '+col+'33"},children:"'+label+'"})')

def course_card(ic_paths, ic_col, ic_bg, title, subtitle, chip_lbl, chip_col, chip_bg,
                hours, lessons, pct, btn_label, btn_icon_paths):
    ic_box = ('e.jsx("div",{style:{width:60,height:60,borderRadius:14,background:"'+ic_bg+'",'
              +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
              +'children:'+sicon(ic_paths,ic_col,26)+'})')
    CLOCK_P='e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("polyline",{points:"12 6 12 12 16 14"})'
    PLAY_P='e.jsx("polygon",{points:"5 3 19 12 5 21 5 3"})'
    return ('e.jsxs("div",{style:{background:"#fff",borderRadius:16,'
            +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",'
            +'padding:"14px 14px 12px"},children:['
            +'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10},children:['
            +ic_box
            +',e.jsxs("div",{style:{flex:1},children:['
            +'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",margin:"0 0 2px",lineHeight:1.3},children:"'+title+'"}),'
            +'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:"0 0 6px"},children:"'+subtitle+'"}),'
            +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
            +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
            +sicon(CLOCK_P,'#9ca3af',13)
            +',e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"'+hours+'"})'
            +']})'
            +',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
            +sicon(PLAY_P,'#9ca3af',13,'#9ca3af')
            +',e.jsx("span",{style:{fontSize:11,color:"#6b7280"},children:"'+lessons+' Lessons"})'
            +']})'
            +']})'
            +']})'
            +','+status_chip(chip_lbl,chip_col,chip_bg)
            +']})'
            +',e.jsx("div",{style:{height:1,background:"#f3f4f6",margin:"2px 0 8px"}})'
            +','+prog_bar(pct)
            +',e.jsxs("button",{style:{display:"flex",alignItems:"center",justifyContent:"center",'
            +'gap:8,width:"100%",background:"#1a56db",color:"#fff",border:"none",'
            +'borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:10},children:['
            +sicon(btn_icon_paths,'#fff',16,'none')
            +',e.jsx("span",{children:"'+btn_label+'"})'
            +']})'
            +']})')

CHART_P = ('e.jsx("rect",{x:3,y:3,width:18,height:14,rx:2}),'
           +'e.jsx("path",{d:"M8 21h8M12 17v4"}),'
           +'e.jsx("polyline",{points:"7 10 10 7 13 10 17 6"})')

SHIELD_P = ('e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}),'
            +'e.jsx("path",{d:"M9 12l2 2 4-4"})')

HARDHAT_P = ('e.jsx("path",{d:"M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"}),'
             +'e.jsx("path",{d:"M10 10V5a2 2 0 0 1 4 0v5"}),'
             +'e.jsx("path",{d:"M4 15V9a8 8 0 0 1 16 0v6"})')

PLAY_P2 = 'e.jsx("polygon",{points:"5 3 19 12 5 21 5 3"})'
REFRESH_P = 'e.jsx("polyline",{points:"23 4 23 10 17 10"}),e.jsx("path",{d:"M20.49 15a9 9 0 1 1-2.12-9.36L23 10"})'

C1 = course_card(CHART_P,'#1a56db','#eff4ff',
                 'Advanced Project Management','Project Management',
                 'In Progress','#f97316','#fff7ed',
                 '12h 30m','8',45,'Continue Learning',PLAY_P2)

C2 = course_card(SHIELD_P,'#16a34a','#f0fdf4',
                 'Workplace Safety & Compliance 2026','Safety & Compliance',
                 'Expiring Soon','#f97316','#fff7ed',
                 '10h','6',67,'Continue Learning',PLAY_P2)

C3 = course_card(HARDHAT_P,'#7c3aed','#f3f0ff',
                 'Construction Quality Leadership','Leadership',
                 'Completed','#16a34a','#f0fdf4',
                 '8h 45m','5',100,'Review Course',REFRESH_P)

NEW_VIEW = (
    'i===\"learning\"&&e.jsxs(e.Fragment,{children:['
    +'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"0 0 80px"},children:['
    +KEEP_LEARNING_BANNER+','
    +C1+','+C2+','+C3
    +']})'
    +']})'
)

print('KEEP_LEARNING_BANNER delta:', delta(KEEP_LEARNING_BANNER))
print('C1 delta:', delta(C1))
print('C2 delta:', delta(C2))
print('C3 delta:', delta(C3))
ob_n,op_n,sq_n = delta(NEW_VIEW)
print('NEW_VIEW delta: %d %d %d' % (ob_n,op_n,sq_n))
assert (ob_n,op_n,sq_n)==(0,0,0), 'NEW_VIEW bracket imbalance!'

new_content = content[:START] + NEW_VIEW + content[END:]
g0,g1,g2 = delta(new_content)
c0,c1,c2 = delta(content)
print('global: %d %d %d' % (g0-c0,g1-c1,g2-c2))
assert (g0-c0,g1-c1,g2-c2)==(0,0,0), 'Global bracket imbalance!'

tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
tmp.write('var i="learning",e={jsx:()=>{},jsxs:()=>{}};void (' + NEW_VIEW + ')')
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
