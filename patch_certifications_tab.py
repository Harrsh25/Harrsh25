#!/usr/bin/env python3
"""Replace Certifications tab with pixel-perfect UI."""
import subprocess, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = 'i===\"certifications\"&&e.jsxs(e.Fragment,'
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

# ── Top 3 stat cards ─────────────────────────────────────────────────────────
def stat_card(icon_paths, icon_col, icon_bg, num, num_col, label1, label2):
    return ('e.jsxs("div",{style:{background:"#fff",borderRadius:14,padding:"12px 10px",'
            +'border:"1px solid #f0f1f4",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",'
            +'display:"flex",flexDirection:"column",alignItems:"center",gap:6},children:['
            +'e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"'+icon_bg+'",'
            +'display:"flex",alignItems:"center",justifyContent:"center"},'
            +'children:'+sicon(icon_paths,icon_col,18)+'}),'
            +'e.jsx("span",{style:{fontSize:22,fontWeight:800,color:"'+num_col+'",lineHeight:1},children:"'+num+'"}),'
            +'e.jsxs("div",{style:{textAlign:"center"},children:['
            +'e.jsx("p",{style:{fontSize:11,fontWeight:600,color:"#374151",margin:0},children:"'+label1+'"}),'
            +'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",margin:0},children:"'+label2+'"})'
            +']})'
            +']})')

SHIELD_P='e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"})'
CLOCK_P='e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("polyline",{points:"12 6 12 12 16 14"})'
MEDAL_P='e.jsx("circle",{cx:12,cy:8,r:6}),e.jsx("path",{d:"M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"})'

STAT_GRID = (
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8},children:['
    +stat_card(SHIELD_P,'#1a56db','#eff4ff','3','#1a56db','Active','Certifications')+','
    +stat_card(CLOCK_P,'#f97316','#fff7ed','1','#f97316','Expiring Soon','Certification')+','
    +stat_card(MEDAL_P,'#9ca3af','#f3f4f6','0','#9ca3af','Expired','Certifications')
    +']})'
)

# ── Cert footer item ──────────────────────────────────────────────────────────
def cert_footer_item(label, value, val_col='#374151'):
    CAL_P='e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
    FILE_P='e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),e.jsx("polyline",{points:"14 2 14 8 20 8"})'
    ic = FILE_P if label=='Cert ID' else CAL_P
    return ('e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:2},children:['
            +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
            +sicon(ic,'#9ca3af',12)
            +',e.jsx("span",{style:{fontSize:10,color:"#9ca3af"},children:"'+label+'"})'
            +']})'
            +',e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"'+val_col+'"},children:"'+value+'"})'
            +']})')

# ── Status chip ───────────────────────────────────────────────────────────────
def status_chip(label, col, bg):
    return ('e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"'+col+'",'
            +'background:"'+bg+'",borderRadius:20,padding:"3px 10px",'
            +'border:"1px solid '+col+'33"},children:"'+label+'"})')

# ── Logo boxes ────────────────────────────────────────────────────────────────
AWS_LOGO = (
    'e.jsx("div",{style:{width:60,height:60,borderRadius:12,background:"#232f3e",'
    +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    +'children:e.jsxs("svg",{width:44,height:28,viewBox:"0 0 44 28",children:['
    +'e.jsx("text",{x:2,y:20,style:{fontSize:14,fontWeight:900,fill:"#ff9900",fontFamily:"Arial,sans-serif"},children:"aws"}),'
    +'e.jsx("path",{d:"M28 22 Q36 26 40 22",stroke:"#ff9900",strokeWidth:2,fill:"none",strokeLinecap:"round"})'
    +']})'
    +'})'
)

PMP_LOGO = (
    'e.jsx("div",{style:{width:60,height:60,borderRadius:12,background:"#fff",'
    +'border:"1px solid #f0f1f4",display:"flex",alignItems:"center",justifyContent:"center",'
    +'flexShrink:0,overflow:"hidden"},'
    +'children:e.jsxs("svg",{width:48,height:36,viewBox:"0 0 48 36",children:['
    +'e.jsx("rect",{x:2,y:2,width:20,height:32,rx:2,fill:"#e63329"}),'
    +'e.jsx("rect",{x:24,y:2,width:10,height:15,rx:2,fill:"#f5a623"}),'
    +'e.jsx("rect",{x:36,y:2,width:10,height:15,rx:2,fill:"#4a90d9"}),'
    +'e.jsx("rect",{x:24,y:20,width:10,height:14,rx:2,fill:"#7b68ee"}),'
    +'e.jsx("rect",{x:36,y:20,width:10,height:14,rx:2,fill:"#50c878"}),'
    +'e.jsx("text",{x:4,y:22,style:{fontSize:12,fontWeight:900,fill:"#fff",fontFamily:"Arial,sans-serif"},children:"PM"})'
    +']})'
    +'})'
)

SCRUM_LOGO = (
    'e.jsx("div",{style:{width:60,height:60,borderRadius:12,background:"#fff",'
    +'border:"1px solid #f0f1f4",display:"flex",flexDirection:"column",'
    +'alignItems:"center",justifyContent:"center",flexShrink:0,gap:2},'
    +'children:e.jsxs("svg",{width:52,height:44,viewBox:"0 0 52 44",children:['
    +'e.jsx("circle",{cx:14,cy:16,r:6,fill:"none",stroke:"#f97316",strokeWidth:2}),'
    +'e.jsx("path",{d:"M8 16 Q14 8 20 16",fill:"none",stroke:"#f97316",strokeWidth:2}),'
    +'e.jsx("circle",{cx:26,cy:16,r:6,fill:"none",stroke:"#f97316",strokeWidth:2}),'
    +'e.jsx("path",{d:"M20 16 Q26 8 32 16",fill:"none",stroke:"#f97316",strokeWidth:2}),'
    +'e.jsx("text",{x:4,y:36,style:{fontSize:8,fontWeight:700,fill:"#374151",fontFamily:"Arial,sans-serif"},children:"Scrum"}),'
    +'e.jsx("text",{x:4,y:44,style:{fontSize:8,fontWeight:700,fill:"#374151",fontFamily:"Arial,sans-serif"},children:"Alliance"})'
    +']})'
    +'})'
)

MS_LOGO = (
    'e.jsx("div",{style:{width:60,height:60,borderRadius:12,background:"#fff",'
    +'border:"1px solid #f0f1f4",display:"flex",alignItems:"center",justifyContent:"center",'
    +'flexShrink:0},'
    +'children:e.jsxs("svg",{width:36,height:36,viewBox:"0 0 36 36",children:['
    +'e.jsx("rect",{x:1,y:1,width:16,height:16,fill:"#f25022"}),'
    +'e.jsx("rect",{x:19,y:1,width:16,height:16,fill:"#7fba00"}),'
    +'e.jsx("rect",{x:1,y:19,width:16,height:16,fill:"#00a4ef"}),'
    +'e.jsx("rect",{x:19,y:19,width:16,height:16,fill:"#ffb900"})'
    +']})'
    +'})'
)

# ── Cert card factory ─────────────────────────────────────────────────────────
def cert_card(logo, title, issuer, chip_label, chip_col, chip_bg,
              issued, expires, cert_id, expire_col='#374151',
              expiry_warning=None, renew_btn=False, border_col='#f0f1f4'):
    footer = (
        'e.jsxs("div",{style:{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"},children:['
        +cert_footer_item('Issued',issued)
        +','+cert_footer_item('Expires',expires,expire_col)
        +','+cert_footer_item('Cert ID',cert_id)
        +']})'
    )
    warning_jsx = ''
    if expiry_warning:
        WARN_P='e.jsx("circle",{cx:12,cy:12,r:10}),e.jsx("line",{x1:12,y1:8,x2:12,y2:12}),e.jsx("line",{x1:12,y1:16,x2:12.01,y2:16})'
        warning_jsx = (
            ',e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,'
            +'background:"#fff7ed",borderRadius:8,padding:"8px 10px",marginTop:10,'
            +'border:"1px solid #fed7aa"},children:['
            +sicon(WARN_P,'#f97316',14)
            +',e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#f97316"},children:"'+expiry_warning+'"})'
            +']})'
        )
    renew_jsx = ''
    if renew_btn:
        REFRESH_P='e.jsx("polyline",{points:"23 4 23 10 17 10"}),e.jsx("path",{d:"M20.49 15a9 9 0 1 1-2.12-9.36L23 10"})'
        renew_jsx = (
            ',e.jsxs("button",{style:{display:"flex",alignItems:"center",justifyContent:"center",'
            +'gap:8,width:"100%",background:"#1a56db",color:"#fff",border:"none",'
            +'borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:10},children:['
            +sicon(REFRESH_P,'#fff',16)
            +',e.jsx("span",{children:"Renew Certification"})'
            +']})'
        )
    return ('e.jsxs("div",{style:{background:"#fff",borderRadius:16,'
            +'border:"1px solid '+border_col+'",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",'
            +'padding:"14px 14px 12px"},children:['
            +'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:['
            +logo
            +',e.jsxs("div",{style:{flex:1},children:['
            +'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",margin:"0 0 2px"},children:"'+title+'"}),'
            +'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:0},children:"'+issuer+'"})'
            +']})'
            +','+status_chip(chip_label,chip_col,chip_bg)
            +',e.jsx("div",{style:{width:28,height:28,borderRadius:8,background:"#f3f4f6",'
            +'display:"flex",alignItems:"center",justifyContent:"center"},'
            +'children:e.jsx("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",'
            +'stroke:"#9ca3af",strokeWidth:2.5,children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})})'
            +']})'
            +',e.jsx("div",{style:{height:1,background:"#f3f4f6",margin:"10px 0"}})'
            +','+footer
            +warning_jsx
            +renew_jsx
            +']})')

CERT1 = cert_card(AWS_LOGO,'AWS Solutions Architect','Amazon Web Services',
                  'Active','#16a34a','#f0fdf4',
                  '15 Jun 2023','15 Jun 2026','AWS-SA-2025-1234')

CERT2 = cert_card(PMP_LOGO,'PMP Certification','PMI',
                  'Active','#16a34a','#f0fdf4',
                  '01 Sept 2024','01 Sept 2027','PMP-2024-5678')

CERT3 = cert_card(SCRUM_LOGO,'Scrum Master (CSM)','Scrum Alliance',
                  'Expiring Soon','#f97316','#fff7ed',
                  '10 Jan 2025','10 Jul 2026','CSM-2025-9012',
                  expire_col='#f97316',
                  expiry_warning='Renewal required before 10 Jul 2026',
                  renew_btn=True, border_col='#fed7aa')

CERT4 = cert_card(MS_LOGO,'Azure Fundamentals','Microsoft',
                  'Active','#16a34a','#f0fdf4',
                  '20 Mar 2025','20 Mar 2026','AZ-900-2025-3456')

# ── Training Status card ─────────────────────────────────────────────────────
BOOK_P='e.jsx("path",{d:"M4 19.5A2.5 2.5 0 0 1 6.5 17H20"}),e.jsx("path",{d:"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"})'
CHECK_P='e.jsx("path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}),e.jsx("polyline",{points:"22 4 12 14.01 9 11.01"})'

def training_icon(ic_paths, ic_col, ic_bg):
    return ('e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"'+ic_bg+'",'
            +'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
            +'children:'+sicon(ic_paths,ic_col,16)+'})')

def training_row(ic_paths, ic_col, ic_bg, title, subtitle, status_lbl, st_col, st_bg, last=False):
    bb = '' if last else ',borderBottom:"1px solid #f3f4f6"'
    return ('e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"10px 0"'+bb+'},children:['
            +training_icon(ic_paths,ic_col,ic_bg)
            +',e.jsxs("div",{style:{flex:1},children:['
            +'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",margin:"0 0 2px"},children:"'+title+'"}),'
            +'e.jsx("p",{style:{fontSize:11,color:"#6b7280",margin:0},children:"'+subtitle+'"})'
            +']})'
            +','+status_chip(status_lbl,st_col,st_bg)
            +',e.jsx("div",{style:{width:24,height:24,borderRadius:6,background:"#f3f4f6",'
            +'display:"flex",alignItems:"center",justifyContent:"center"},'
            +'children:e.jsx("svg",{width:10,height:10,viewBox:"0 0 24 24",fill:"none",'
            +'stroke:"#9ca3af",strokeWidth:2.5,children:e.jsx("polyline",{points:"9 18 15 12 9 6"})})})'
            +']})')

T1=training_row(BOOK_P,'#1a56db','#eff4ff','Advanced Project Risk Management','Project Management','Upcoming','#1a56db','#eff4ff')
T2=training_row(CHECK_P,'#16a34a','#f0fdf4','Workplace Safety Compliance 2026','Safety','Completed','#16a34a','#f0fdf4')
T3=training_row(BOOK_P,'#1a56db','#eff4ff','Leadership & Team Management','Leadership','Upcoming','#1a56db','#eff4ff')
T4=training_row(CHECK_P,'#16a34a','#f0fdf4','Construction Quality Standards','Quality','Completed','#16a34a','#f0fdf4',last=True)

TRAINING_CARD = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,'
    +'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",'
    +'padding:"14px 14px 4px"},children:['
    +'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},children:['
    +'e.jsx("p",{style:{fontSize:15,fontWeight:800,color:"#111827",margin:0},children:"Training Status"}),'
    +'e.jsx("span",{style:{fontSize:13,fontWeight:600,color:"#1a56db",cursor:"pointer"},children:"View all"})'
    +']})'
    +','+T1+','+T2+','+T3+','+T4
    +']})'
)

# ── Assemble ─────────────────────────────────────────────────────────────────
NEW_VIEW = (
    'i===\"certifications\"&&e.jsxs(e.Fragment,{children:['
    +'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"0 0 80px"},children:['
    +STAT_GRID+','
    +CERT1+','+CERT2+','+CERT3+','+CERT4+','
    +TRAINING_CARD
    +']})'
    +']})'
)

print('STAT_GRID delta:', delta(STAT_GRID))
print('CERT1 delta:', delta(CERT1))
print('CERT2 delta:', delta(CERT2))
print('CERT3 delta:', delta(CERT3))
print('CERT4 delta:', delta(CERT4))
print('TRAINING_CARD delta:', delta(TRAINING_CARD))
ob_n,op_n,sq_n = delta(NEW_VIEW)
print('NEW_VIEW delta: %d %d %d' % (ob_n,op_n,sq_n))
assert (ob_n,op_n,sq_n)==(0,0,0), 'NEW_VIEW bracket imbalance!'

new_content = content[:START] + NEW_VIEW + content[END:]
g0,g1,g2 = delta(new_content)
c0,c1,c2 = delta(content)
print('global: %d %d %d' % (g0-c0,g1-c1,g2-c2))
assert (g0-c0,g1-c1,g2-c2)==(0,0,0), 'Global bracket imbalance!'

tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
tmp.write('var i="certifications",e={jsx:()=>{},jsxs:()=>{}};void (' + NEW_VIEW + ')')
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
