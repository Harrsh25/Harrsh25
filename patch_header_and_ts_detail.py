import re
content = open('hrmobileapp.html').read()
changes = 0

# ================================================================
# PART 1: Fix 3 header back buttons
# ================================================================

# 1a. Timesheets: fix outer div alignItems + replace back button + fix h1
old1 = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:10},children:['
    'e.jsx("button",{onClick:function(){le("dashboard");},style:{width:32,height:32,borderRadius:10,background:"#f3f4f6",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0},'
    'children:e.jsx("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"#374151",strokeWidth:2,children:e.jsxs("g",{children:[e.jsx("polyline",{points:"15 18 9 12 15 6"})]})})})'
    ',e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",margin:0},children:"Timesheets"})'
)
new1 = (
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
    'e.jsx("button",{onClick:function(){le("dashboard");},className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})})'
    ',e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:0,flex:1},children:"Timesheets"})'
)
c = content.count(old1); changes += c; print(f'Timesheets btn+h1: {c}x')
content = content.replace(old1, new1)

# 1b. Workforce Directory: replace back button (keep dynamic onClick)
old2 = (
    'e.jsx("button",{onClick:()=>m?p(null):le("dashboard"),style:{width:36,height:36,borderRadius:10,background:"#f3f4f6",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0},'
    'children:e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"#374151",strokeWidth:2,children:e.jsxs("g",{children:[e.jsx("polyline",{points:"15 18 9 12 15 6"})]})})})'
    ',e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:m?"Profile":"Workforce Directory"})'
)
new2 = (
    'e.jsx("button",{onClick:()=>m?p(null):le("dashboard"),className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})})'
    ',e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",flex:1},children:m?"Profile":"Workforce Directory"})'
)
c = content.count(old2); changes += c; print(f'Workforce btn: {c}x')
content = content.replace(old2, new2)

# 1c. Manager Hub: replace hamburger button with standard hdr-icon-btn
old3 = (
    'e.jsx("button",{onClick:()=>le("dashboard"),style:{background:"none",border:"none",padding:0,cursor:"pointer",flexShrink:0,marginRight:12},'
    'children:e.jsxs("svg",{width:22,height:16,viewBox:"0 0 22 16",fill:"none",children:['
    'e.jsx("rect",{x:0,y:0,width:22,height:2,rx:1,fill:"#111827"}),'
    'e.jsx("rect",{x:0,y:7,width:22,height:2,rx:1,fill:"#111827"}),'
    'e.jsx("rect",{x:0,y:14,width:22,height:2,rx:1,fill:"#111827"})]})})'
    ',e.jsx("h1",{className:"text-lg font-bold flex-1",children:"Manager Hub"})'
)
new3 = (
    'e.jsx("button",{onClick:()=>le("dashboard"),className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})})'
    ',e.jsx("h1",{className:"text-lg font-bold flex-1",children:"Manager Hub"})'
)
c = content.count(old3); changes += c; print(f'Manager Hub btn: {c}x')
content = content.replace(old3, new3)

print(f'\nHeader fixes: {changes}')

# ================================================================
# PART 2: Timesheet Detail - pixel-perfect implementation
# ================================================================

OLD_TS_DETAIL = (
    '_selTs&&e.jsxs("div",{style:{position:"absolute",inset:0,background:"#f8fafc",zIndex:150,display:"flex",flexDirection:"column"},children:['
    'e.jsxs("div",{style:{background:"#fff",padding:"44px 16px 16px",borderBottom:"1px solid #f0f1f4",position:"sticky",top:0,zIndex:40},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    'e.jsx("button",{onClick:function(){_setSelTs(null)},className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})})'
    ',e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:0,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:"Timesheet Detail"})'
    ']})]})'
)

c_old = content.count(OLD_TS_DETAIL)
print(f'\nTimesheet Detail OLD marker: {c_old}x')

# Helper to check bracket balance
def check_bal(s, name=''):
    d = 0; ins = False
    for i,ch in enumerate(s):
        if ch == '"' and (i==0 or s[i-1]!='\\'): ins = not ins
        if not ins:
            if ch == '(': d += 1
            elif ch == ')': d -= 1
    if name: print(f'  {name}: depth={d}')
    return d

# ---- BUILD EACH SECTION ----

# STATUS CARD
shield_svg = 'e.jsx("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:e.jsxs("g",{children:[e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}),e.jsx("polyline",{points:"9 12 11 14 15 10"})]})})'

status_card = (
    'e.jsxs("div",{style:{background:"#f0fdf4",borderRadius:14,border:"1px solid #bbf7d0",padding:"16px"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:['
    'e.jsxs("div",{style:{width:46,height:46,borderRadius:"50%",background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:[' + shield_svg + ']}),'
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:16,fontWeight:700,color:"#16a34a",fontFamily:"Inter,sans-serif",margin:"0 0 2px"},children:"Approved"}),'
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:"Inter,sans-serif",margin:0},children:"This timesheet has been approved"})'
    ']})'
    ']}),'
    'e.jsxs("div",{style:{textAlign:"right"},children:['
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:"Inter,sans-serif",margin:"0 0 4px"},children:"Approved on"}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"},children:['
    'e.jsx(Au,{size:13,color:"#374151"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"18 May 2026"})'
    ']})'
    ']})'
    ']})'
    ']})'
)

check_bal(status_card, 'status_card')

# ICON BOX helper
def ib(bg, icon): return 'e.jsx("div",{style:{width:36,height:36,borderRadius:9,background:"'+bg+'",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:'+icon+'})'

briefcase = 'e.jsx("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"#3b82f6",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:e.jsxs("g",{children:[e.jsx("rect",{x:2,y:7,width:20,height:14,rx:2,ry:2}),e.jsx("path",{d:"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"})]})})'
cal_g = 'e.jsx("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2,strokeLinecap:"round",children:e.jsxs("g",{children:[e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2}),e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),e.jsx("line",{x1:3,y1:10,x2:21,y2:10})]})})'
cal_p = 'e.jsx("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"#7c3aed",strokeWidth:2,strokeLinecap:"round",children:e.jsxs("g",{children:[e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2}),e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),e.jsx("line",{x1:3,y1:10,x2:21,y2:10}),e.jsx("line",{x1:8,y1:15,x2:16,y2:15})]})})'
user_ic = 'e.jsx("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2,strokeLinecap:"round",children:e.jsxs("g",{children:[e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),e.jsx("circle",{cx:12,cy:7,r:4})]})})'

def lbl(t): return 'e.jsx("p",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif",margin:"0 0 2px",fontWeight:500},children:"'+t+'"})'
def val(v): return 'e.jsx("p",{style:{fontSize:14,fontWeight:600,color:"#111827",fontFamily:"Inter,sans-serif",margin:0},children:'+v+'})'
def div_row(icon,label,val_code,right=''):
    right_part = (','+right) if right else ''
    return ('e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,padding:"12px 16px"},children:['
            + ib("#eff6ff" if icon=="brief" else "#ecfdf5" if icon=="calg" else "#f5f3ff" if icon=="calp" else "#fff7ed" if icon=="clock" else "#f0fdf4",
               briefcase if icon=="brief" else cal_g if icon=="calg" else cal_p if icon=="calp" else 'e.jsx(Q1,{size:16,color:"#f97316"})' if icon=="clock" else user_ic) + ','
            + 'e.jsxs("div",{style:{flex:1},children:[' + lbl(label) + ',' + val_code + ']})'
            + right_part
            + ']})')

div_sep = 'e.jsx("div",{style:{height:1,background:"#f3f4f6",margin:"0 16px"}})'

dur_chip = 'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,padding:"4px 8px",flexShrink:0},children:[e.jsx(Ns,{size:11,color:"#6b7280"}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#374151",fontFamily:"Inter,sans-serif"},children:"7 Days"})]})'
hrs_chip = 'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"4px 8px",flexShrink:0},children:[e.jsx(Q1,{size:11,color:"#1a56db"}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#1a56db",fontFamily:"Inter,sans-serif"},children:"Total Hours"})]})'

summary_card = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #e5e7eb",overflow:"hidden"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"14px 16px",borderBottom:"1px solid #f3f4f6"},children:['
    'e.jsx(Ba,{size:16,color:"#1a56db"}),'
    'e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Timesheet Summary"})'
    ']}),'
    'e.jsxs("div",{style:{padding:"4px 0"},children:['
    + div_row("brief","Project",val('_selTs.parentNames.join(", ")')) + ','
    + div_sep + ','
    + div_row("calg","Timesheet",val('_selTs.name')) + ','
    + div_sep + ','
    + div_row("calp","Duration",val('_selTs.duration'),dur_chip) + ','
    + div_sep + ','
    + div_row("clock","Logged Hours",'e.jsxs("p",{style:{fontSize:22,fontWeight:700,color:"#1a56db",fontFamily:"Inter,sans-serif",margin:0},children:[_selTs.loggedHours,"h"]})',hrs_chip) + ','
    + div_sep + ','
    + div_row("user","Added By",val('_selTs.addedBy'))
    + ']})'
    ']})'
)

check_bal(summary_card, 'summary_card')

# DONUT CHART CARD
def legend_item(bg, label, hrs, pct, tc, lbg):
    return (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx("div",{style:{width:8,height:8,borderRadius:"50%",background:"'+bg+'",flexShrink:0}}),'
        'e.jsx("span",{style:{flex:1,fontSize:12,color:"#374151",fontFamily:"Inter,sans-serif"},children:"'+label+'"}),'
        'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",marginRight:6},children:"'+hrs+'"}),'
        'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"'+tc+'",background:"'+lbg+'",borderRadius:6,padding:"2px 6px"},children:"'+pct+'"})'
        ']})'
    )

donut_card = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #e5e7eb",padding:"16px"},children:['
    'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:"0 0 14px"},children:"Time Distribution"}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:16},children:['
    # Donut wrapper (position:relative)
    'e.jsxs("div",{style:{position:"relative",flexShrink:0,width:110,height:110},children:['
    'e.jsx("svg",{width:110,height:110,viewBox:"0 0 120 120",style:{transform:"rotate(-90deg)"},children:'
    'e.jsxs("g",{children:['
    'e.jsx("circle",{cx:60,cy:60,r:45,fill:"none",stroke:"#f3f4f6",strokeWidth:18}),'
    'e.jsx("circle",{cx:60,cy:60,r:45,fill:"none",stroke:"#3b82f6",strokeWidth:18,strokeDasharray:"141.4 141.4",strokeDashoffset:0}),'
    'e.jsx("circle",{cx:60,cy:60,r:45,fill:"none",stroke:"#22c55e",strokeWidth:18,strokeDasharray:"70.7 212.1",strokeDashoffset:-141.4}),'
    'e.jsx("circle",{cx:60,cy:60,r:45,fill:"none",stroke:"#f59e0b",strokeWidth:18,strokeDasharray:"42.4 240.4",strokeDashoffset:-212.1}),'
    'e.jsx("circle",{cx:60,cy:60,r:45,fill:"none",stroke:"#7c3aed",strokeWidth:18,strokeDasharray:"28.3 254.5",strokeDashoffset:-254.5})'
    ']})' # closes g
    '}),' # closes svg
    # Center text overlay
    'e.jsxs("div",{style:{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},children:['
    'e.jsxs("span",{style:{fontSize:18,fontWeight:800,color:"#111827",fontFamily:"Inter,sans-serif",lineHeight:1},children:[_selTs.loggedHours,"h"]}),'
    'e.jsx("span",{style:{fontSize:10,color:"#9ca3af",fontFamily:"Inter,sans-serif",marginTop:2},children:"Total"})'
    ']})'  # closes center text div
    ']})'  # closes position:relative wrapper
    ','
    # Legend
    'e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",gap:8},children:['
    + legend_item("#3b82f6","Development","20h","50%","#3b82f6","#eff6ff") + ','
    + legend_item("#22c55e","Testing","10h","25%","#16a34a","#dcfce7") + ','
    + legend_item("#f59e0b","Meetings","6h","15%","#d97706","#fef3c7") + ','
    + legend_item("#7c3aed","Documentation","4h","10%","#7c3aed","#ede9fe")
    + ']})'  # closes legend div
    + ']})'  # closes flex row div
    + ']})'  # closes outer card div
)

check_bal(donut_card, 'donut_card')

# ACTIVITY TIMELINE CARD
check_svg = 'e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2.5,strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("polyline",{points:"20 6 9 17 4 12"})})'

def timeline_item(icon_bg, icon, title, sub, date, time_, is_last=False):
    line = '' if is_last else 'e.jsx("div",{style:{width:2,flex:1,background:"#e5e7eb",margin:"4px 0",minHeight:20}}),'
    return (
        'e.jsxs("div",{style:{display:"flex",gap:12},children:['
        'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0},children:['
        'e.jsxs("div",{style:{width:32,height:32,borderRadius:"50%",background:"'+icon_bg+'",display:"flex",alignItems:"center",justifyContent:"center"},children:['+icon+']}),'
        + line +
        ']})'
        ','
        'e.jsxs("div",{style:{flex:1,paddingBottom:'+('20' if not is_last else '0')+'},children:['
        'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"},children:['
        'e.jsxs("div",{children:['
        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:"0 0 2px"},children:"'+title+'"}),'
        'e.jsx("p",{style:{fontSize:12,color:"#6b7280",fontFamily:"Inter,sans-serif",margin:0},children:"'+sub+'"})'
        ']}),'
        'e.jsxs("div",{style:{textAlign:"right",flexShrink:0,marginLeft:8},children:['
        'e.jsx("p",{style:{fontSize:11,color:"#6b7280",fontFamily:"Inter,sans-serif",margin:"0 0 2px"},children:"'+date+'"}),'
        'e.jsx("p",{style:{fontSize:11,color:"#9ca3af",fontFamily:"Inter,sans-serif",margin:0},children:"'+time_+'"})'
        ']})'
        ']})'
        ']})'
        ']})'
    )

t1 = timeline_item("#dcfce7", check_svg, "Timesheet Approved", "Approved by Sarah Chen", "18 May 2026", "10:30 AM", False)
t2 = timeline_item("#dbeafe", 'e.jsx(Ve,{size:14,color:"#1a56db"})', "Timesheet Submitted", "Submitted by Harsh", "17 May 2026", "09:15 PM", True)

check_bal(t1, 't1')
check_bal(t2, 't2')

activity_card = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:14,border:"1px solid #e5e7eb",padding:"16px",marginBottom:80},children:['
    'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:"0 0 16px"},children:"Activity Timeline"}),'
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column"},children:['
    + t1 + ','
    + t2
    + ']})'  # closes timeline list div
    + ']})'  # closes outer card div
)

check_bal(activity_card, 'activity_card')

# FULL DETAIL SCREEN
NEW_TS_DETAIL = (
    '_selTs&&e.jsxs("div",{style:{position:"absolute",inset:0,background:"#f9fafb",zIndex:150,display:"flex",flexDirection:"column"},children:['
    # Header
    'e.jsxs("div",{style:{background:"#fff",padding:"48px 16px 12px",borderBottom:"1px solid #e5e7eb",position:"sticky",top:0,zIndex:40,flexShrink:0},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    'e.jsx("button",{onClick:function(){_setSelTs(null)},className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})}),'
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsx("h1",{style:{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif",margin:"0 0 1px"},children:"Timesheet Detail"}),'
    'e.jsx("p",{style:{fontSize:12,color:"#9ca3af",fontFamily:"Inter,sans-serif",margin:0},children:"View timesheet summary and details"})'
    ']}),'
    'e.jsx("button",{style:{width:32,height:32,borderRadius:9,border:"1px solid #e5e7eb",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0},children:e.jsx(lg,{size:17,color:"#374151"})})'
    ']})'  # closes header row div
    ']})'  # closes header bar div
    # Content
    ',e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:14},children:['
    + status_card + ','
    + summary_card + ','
    + donut_card + ','
    + activity_card
    + ']})'  # closes content scrollable div
    + ']})'  # closes outer screen div
)

check_bal(NEW_TS_DETAIL, 'NEW_TS_DETAIL_FINAL')

if c_old > 0:
    start_idx = content.find(OLD_TS_DETAIL)
    print(f'Old TS detail found at: {start_idx}')
    if start_idx >= 0:
        # Find end by brace scanning
        idx = start_idx; depth = 0; in_str = False; i = idx
        while i < len(content):
            ch = content[i]
            if ch == '"' and (i==0 or content[i-1]!='\\'): in_str = not in_str
            if not in_str:
                if ch == '(': depth += 1
                elif ch == ')':
                    depth -= 1
                    if depth == 0: break
            i += 1
        old_end = i + 1
        print(f'Old block ends at: {old_end}, length: {old_end-start_idx}')
        content = content[:start_idx] + NEW_TS_DETAIL + content[old_end:]
        print('Replaced!')
        changes += 1

print(f'\nTotal changes: {changes}')
open('hrmobileapp.html', 'w').write(content)
print('Written.')
