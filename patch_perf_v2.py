#!/usr/bin/env python3
"""
Performance module v2: full rewrite of vm() with 5-tab bar.
Each section is validated for bracket balance before assembly.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def chk(name, s):
    ob = s.count('{') - s.count('}')
    op = s.count('(') - s.count(')')
    sq = s.count('[') - s.count(']')
    ok = ob == 0 and op == 0 and sq == 0
    if not ok:
        print(f'  FAIL {name}: ob={ob} op={op} sq={sq}')
    return ok

errors = []

# ── Find old vm() ──────────────────────────────────────────────────────────────
OLD_VM_IDX = content.find('function vm(){', 975000, 976000)
if OLD_VM_IDX == -1:
    print('FAIL: vm() not found'); exit(1)
depth = 0
brace_start = content.find('{', OLD_VM_IDX)
for k in range(brace_start, brace_start + 200000):
    if content[k] == '{': depth += 1
    elif content[k] == '}':
        depth -= 1
        if depth == 0:
            vm_end = k
            break
OLD_VM = content[OLD_VM_IDX:vm_end+1]
print('OLD vm: ob=%d op=%d sq=%d len=%d' % (
    OLD_VM.count('{') - OLD_VM.count('}'),
    OLD_VM.count('(') - OLD_VM.count(')'),
    OLD_VM.count('[') - OLD_VM.count(']'), len(OLD_VM)))

# ══════════════════════════════════════════════════════════════════════════════
# SECTION BUILDER
# ══════════════════════════════════════════════════════════════════════════════

# ── Computed vars (no JSX, just JS) ──────────────────────────────────────────
COMPUTED = (
    'var _wd=jt.filter(function(r){return r.status!=="week-off";});'
    'var _pres=jt.filter(function(r){return r.status==="present"||r.status==="late"||r.status==="half-day";});'
    'var _onTime=jt.filter(function(r){return !r.isLate&&(r.status==="present"||r.status==="late");});'
    'var _attPct=_wd.length?Math.round(_pres.length/_wd.length*100):0;'
    'var _punctPct=_pres.length?Math.round(_onTime.length/_pres.length*100):0;'
    'var _lates=jt.filter(function(r){return r.isLate;}).length;'
    'var _leaves=jt.filter(function(r){return r.status==="on-leave";}).length;'
    'var _halfs=jt.filter(function(r){return r.status==="half-day";}).length;'
    'var _totalHrs=jt.reduce(function(s,r){return s+(r.totalHours||0);},0);'
    'var _expHrs=_wd.length*8;'
    'var _utilPct=_expHrs?Math.round(_totalHrs/_expHrs*100):0;'
    'var _myTasks=rl.filter(function(r){return r.assignee==="Harsh";});'
    'var _doneTasks=_myTasks.filter(function(r){return r.status==="done";});'
    'var _inProg=_myTasks.filter(function(r){return r.status==="in-progress";});'
    'var _outputPct=_myTasks.length?Math.round(_doneTasks.length/_myTasks.length*100):0;'
    'var _avgGP=Gt.length?Math.round(Gt.reduce(function(s,g){return s+g.progress;},0)/Gt.length):0;'
    'var _otG=Gt.filter(function(g){return g.status==="on-track";}).length;'
    'var _arG=Gt.filter(function(g){return g.status==="at-risk";}).length;'
    'var _bhG=Gt.filter(function(g){return g.status==="behind";}).length;'
    'var _compC=c0.filter(function(t){return t.myStatus==="completed";});'
    'var _avgSc=_compC.length?Math.round(_compC.reduce(function(s,t){return s+t.myScore;},0)/_compC.length):0;'
    'var _score=Math.min(100,Math.round(_attPct*.25+_punctPct*.15+_avgGP*.35+_avgSc*.15+_outputPct*.1));'
    'var _scCol=_score>=80?"#16a34a":_score>=60?"#d97706":"#dc2626";'
    'var _rank=_score>=90?"Top 10%":_score>=75?"Top 25%":_score>=60?"Top 50%":"Below Avg";'
)
if not chk('COMPUTED', COMPUTED): errors.append('COMPUTED')

# ── Tab bar ───────────────────────────────────────────────────────────────────
TAB_BAR = (
    'e.jsx("div",{className:"seg-tabs seg-tabs-header",'
    'children:[{key:"overview",label:"Overview",icon:e.jsx(Yu,{size:12})},'
    '{key:"attendance",label:"Attend.",icon:e.jsx(Ns,{size:12})},'
    '{key:"development",label:"Develop.",icon:e.jsx(Wa,{size:12})},'
    '{key:"recognition",label:"Recog.",icon:e.jsx(Ru,{size:12})},'
    '{key:"reviews",label:"Reviews",icon:e.jsx(fg,{size:12})}'
    '].map(function(v){'
    'return e.jsxs("button",{onClick:function(){_setTab(v.key);_setDet(null);},'
    'className:N("seg-tab flex-1",_tab===v.key?"active":""),'
    'style:{display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontSize:10,padding:"6px 2px"},'
    'children:[v.icon,v.label]},v.key);})'
    '})'
)
if not chk('TAB_BAR', TAB_BAR): errors.append('TAB_BAR')

# ── Progress bar helper (used multiple times) ─────────────────────────────────
def prog_bar(bg_col, fill_col, width_expr, height=5):
    return (
        f'e.jsx("div",{{style:{{background:{bg_col},borderRadius:4,height:{height},overflow:"hidden"}},children:'
        f'e.jsx("div",{{style:{{background:{fill_col},width:{width_expr},height:"100%",borderRadius:4}}}})'
        f'}})'
    )

# ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
TAB_OVERVIEW = (
    '_tab==="overview"&&e.jsxs("div",{className:"space-y-3",children:['
    # Score card
    'e.jsxs("div",{className:"card p-4",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:16},children:['
    'e.jsxs("svg",{width:84,height:84,viewBox:"0 0 84 84",children:['
    'e.jsx("circle",{cx:42,cy:42,r:34,fill:"none",stroke:"#e5e7eb",strokeWidth:7}),'
    'e.jsx("circle",{cx:42,cy:42,r:34,fill:"none",stroke:_scCol,strokeWidth:7,'
    'strokeDasharray:(2*Math.PI*34*_score/100).toFixed(1)+" "+(2*Math.PI*34*(1-_score/100)).toFixed(1),'
    'strokeLinecap:"round",transform:"rotate(-90 42 42)"}),'
    'e.jsx("text",{x:42,y:47,textAnchor:"middle",fontSize:19,fontWeight:"bold",fill:_scCol,children:_score}),'
    'e.jsx("text",{x:42,y:58,textAnchor:"middle",fontSize:9,fill:"#9ca3af",children:"/100"})'
    ']}),'
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827"},children:"Overall Score"}),'
    'e.jsxs("div",{style:{display:"inline-flex",alignItems:"center",gap:4,'
    'background:_score>=80?"#dcfce7":_score>=60?"#fef9c3":"#fee2e2",'
    'color:_scCol,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:8,marginTop:6},children:['
    'e.jsx(Oa,{size:11,color:_scCol}),_rank'
    ']}),'
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",marginTop:6},children:"Last 30 days"})'
    ']})'  # close info div
    ']})'  # close flex row
    ']}),'  # close score card
    # KPI grid (2x2)
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:['
    # Tasks
    'e.jsxs("button",{onClick:function(){_setDet({k:"tasks",t:"My Tasks"});},className:"card p-3 text-left",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6},children:['
    'e.jsx("span",{style:{background:"#EFF4FF",borderRadius:8,padding:6},children:e.jsx(Ks,{size:14,color:"#1a56db"})}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600},children:"Tasks"})'
    ']}),'
    'e.jsxs("p",{style:{fontSize:22,fontWeight:800,color:"#111827"},children:[_doneTasks.length,e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"/"+_myTasks.length})]}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginTop:2},children:"Completed"})'
    ']}),'
    # Utilization
    'e.jsxs("button",{onClick:function(){_setDet({k:"util",t:"Utilization"});},className:"card p-3 text-left",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6},children:['
    'e.jsx("span",{style:{background:"#fef3c7",borderRadius:8,padding:6},children:e.jsx(Q1,{size:14,color:"#d97706"})}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600},children:"Utilization"})'
    ']}),'
    'e.jsxs("p",{style:{fontSize:22,fontWeight:800,color:"#111827"},children:[_utilPct,e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"%"})]}),'
    'e.jsxs("p",{style:{fontSize:10,color:"#6b7280",marginTop:2},children:[_totalHrs.toFixed(1),"h logged"]})'
    ']}),'
    # Output
    'e.jsxs("button",{onClick:function(){_setDet({k:"tasks",t:"Output"});},className:"card p-3 text-left",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6},children:['
    'e.jsx("span",{style:{background:"#dcfce7",borderRadius:8,padding:6},children:e.jsx(Yu,{size:14,color:"#16a34a"})}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600},children:"Output"})'
    ']}),'
    'e.jsxs("p",{style:{fontSize:22,fontWeight:800,color:"#111827"},children:[_outputPct,e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"%"})]}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginTop:2},children:"Completion rate"})'
    ']}),'
    # Attendance
    'e.jsxs("button",{onClick:function(){_setTab("attendance");},className:"card p-3 text-left",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6},children:['
    'e.jsx("span",{style:{background:"#ede9fe",borderRadius:8,padding:6},children:e.jsx(Ns,{size:14,color:"#7c3aed"})}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:600},children:"Attendance"})'
    ']}),'
    'e.jsxs("p",{style:{fontSize:22,fontWeight:800,color:"#111827"},children:[_attPct,e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"%"})]}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginTop:2},children:"Adherence rate"})'
    ']})'  # close attendance btn
    ']}),'  # close KPI grid
    # Goal progress card
    'e.jsxs("button",{onClick:function(){_setDet({k:"goals",t:"Goal Progress"});},className:"w-full card p-4 text-left",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
    'e.jsx(Ks,{size:14,color:"#1a56db"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"Goal Progress"})'
    ']}),'
    'e.jsxs("span",{style:{fontSize:20,fontWeight:800,color:"#1a56db"},children:[_avgGP,"%"]})'
    ']}),'
    + prog_bar('"#e5e7eb"', '"#1a56db"', '_avgGP+"%"', 8) + ','
    'e.jsxs("div",{style:{display:"flex",gap:6,marginTop:8},children:['
    'e.jsxs("span",{style:{flex:1,textAlign:"center",background:"#dcfce7",color:"#16a34a",fontSize:11,fontWeight:600,padding:"3px 0",borderRadius:6},children:[_otG," On Track"]}),'
    'e.jsxs("span",{style:{flex:1,textAlign:"center",background:"#fef9c3",color:"#d97706",fontSize:11,fontWeight:600,padding:"3px 0",borderRadius:6},children:[_arG," At Risk"]}),'
    'e.jsxs("span",{style:{flex:1,textAlign:"center",background:"#fee2e2",color:"#dc2626",fontSize:11,fontWeight:600,padding:"3px 0",borderRadius:6},children:[_bhG," Behind"]})'
    ']})'  # close status chips
    ']}),'  # close goal btn
    # Productivity card
    'e.jsxs("div",{className:"card p-4",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:10},children:['
    'e.jsx(Ju,{size:14,color:"#d97706"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"Productivity"})'
    ']}),'
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8},children:['
    'e.jsxs("div",{style:{textAlign:"center"},children:['
    'e.jsx("p",{style:{fontSize:20,fontWeight:800,color:"#d97706"},children:_inProg.length}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:"In Progress"})'
    ']}),'
    'e.jsxs("div",{style:{textAlign:"center"},children:['
    'e.jsx("p",{style:{fontSize:20,fontWeight:800,color:"#16a34a"},children:_doneTasks.length}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:"Done"})'
    ']}),'
    'e.jsxs("div",{style:{textAlign:"center"},children:['
    'e.jsxs("p",{style:{fontSize:20,fontWeight:800,color:"#1a56db"},children:[_totalHrs.toFixed(0),"h"]}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:"Hrs Logged"})'
    ']})'  # close col
    ']})'  # close grid
    ']})'  # close productivity card
    ']})'  # close overview space-y-3
)
if not chk('TAB_OVERVIEW', TAB_OVERVIEW): errors.append('TAB_OVERVIEW')

# ── ATTENDANCE TAB ────────────────────────────────────────────────────────────
TAB_ATTENDANCE = (
    '_tab==="attendance"&&e.jsxs("div",{className:"space-y-3",children:['
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:['
    'e.jsxs("div",{className:"card p-3",children:['
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:2},children:"Adherence"}),'
    'e.jsxs("p",{style:{fontSize:26,fontWeight:800,color:_attPct>=90?"#16a34a":_attPct>=75?"#d97706":"#dc2626"},children:[_attPct,"%"]}),'
    'e.jsxs("p",{style:{fontSize:10,color:"#9ca3af"},children:[_pres.length," / ",_wd.length," workdays"]})'
    ']}),'
    'e.jsxs("div",{className:"card p-3",children:['
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginBottom:2},children:"Punctuality"}),'
    'e.jsxs("p",{style:{fontSize:26,fontWeight:800,color:_punctPct>=90?"#16a34a":_punctPct>=75?"#d97706":"#dc2626"},children:[_punctPct,"%"]}),'
    'e.jsxs("p",{style:{fontSize:10,color:"#9ca3af"},children:[_lates," late arrival",_lates===1?"":"s"]})'
    ']})'
    ']}),'
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8},children:['
    'e.jsxs("div",{className:"card p-2.5 text-center",children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#d97706"},children:_lates}),'
    'e.jsx("p",{style:{fontSize:9,color:"#6b7280"},children:"Late"})'
    ']}),'
    'e.jsxs("div",{className:"card p-2.5 text-center",children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#7c3aed"},children:_leaves}),'
    'e.jsx("p",{style:{fontSize:9,color:"#6b7280"},children:"On Leave"})'
    ']}),'
    'e.jsxs("div",{className:"card p-2.5 text-center",children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#0891b2"},children:_halfs}),'
    'e.jsx("p",{style:{fontSize:9,color:"#6b7280"},children:"Half-day"})'
    ']})'
    ']}),'
    # 30-day calendar
    'e.jsxs("div",{className:"card p-4",children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:700,marginBottom:10},children:"30-Day Calendar"}),'
    'e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:4},children:'
    'jt.map(function(r,ri){'
    'var col=r.status==="present"&&!r.isLate?"#16a34a":r.status==="late"||r.isLate?"#d97706":r.status==="half-day"?"#0891b2":r.status==="on-leave"?"#7c3aed":r.status==="week-off"?"#e5e7eb":"#dc2626";'
    'var dt=new Date(r.date);'
    'return e.jsx("div",{title:r.date+" \xb7 "+r.status,style:{width:24,height:24,borderRadius:4,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:col==="#e5e7eb"?"#9ca3af":"#fff"},children:dt.getDate()},r.id);'
    '})'
    '}),'
    'e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:10},children:'
    '[["#16a34a","Present"],["#d97706","Late"],["#0891b2","Half-day"],["#7c3aed","Leave"],["#e5e7eb","Off"]]'
    '.map(function(it,li){'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:3},children:['
    'e.jsx("div",{style:{width:8,height:8,borderRadius:2,background:it[0]}}),'
    'e.jsx("span",{style:{fontSize:9,color:"#6b7280"},children:it[1]})'
    ']},li);'
    '})'
    '})'
    ']})'  # close calendar card
    ']})'  # close attendance space-y-3
)
if not chk('TAB_ATTENDANCE', TAB_ATTENDANCE): errors.append('TAB_ATTENDANCE')

# ── DEVELOPMENT TAB ───────────────────────────────────────────────────────────
TAB_DEVELOPMENT = (
    '_tab==="development"&&e.jsxs("div",{className:"space-y-3",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
    'e.jsx(qi,{size:14,color:"#1a56db"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"Learning"})'
    ']}),'
    'e.jsxs("span",{style:{fontSize:11,color:"#6b7280"},children:[_compC.length," / ",c0.length," done"]})'
    ']}),'
    # Course cards map
    'c0.map(function(course,ci){'
    'var done=course.myStatus==="completed";'
    'var sc=done?"#16a34a":course.myStatus==="enrolled"?"#d97706":"#6b7280";'
    'var bg=done?"#dcfce7":course.myStatus==="enrolled"?"#fef9c3":"#f3f4f6";'
    'return e.jsxs("button",{onClick:function(){_setDet({k:"course",t:course.title,d:course});},className:"w-full card-interactive p-4 text-left",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between"},children:['
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:600,color:"#111827"},children:course.title}),'
    'e.jsxs("p",{style:{fontSize:10,color:"#6b7280",marginTop:2},children:[course.category," \xb7 ",course.type]})'
    ']}),'
    'e.jsx("span",{style:{fontSize:10,fontWeight:600,color:sc,background:bg,padding:"2px 7px",borderRadius:6,marginLeft:8,flexShrink:0},children:done?"Completed":course.myStatus})'
    ']}),'
    'done&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginTop:8},children:['
    'e.jsx(Oa,{size:12,color:"#d97706"}),'
    'e.jsxs("span",{style:{fontSize:12,fontWeight:700},children:["Score: ",course.myScore,"%"]}),'
    'course.myScore>=90?e.jsx("span",{style:{fontSize:10,background:"#dcfce7",color:"#16a34a",padding:"1px 6px",borderRadius:4},children:"Distinction"}):'
    'e.jsx("span",{style:{fontSize:10,background:"#EFF4FF",color:"#1a56db",padding:"1px 6px",borderRadius:4},children:"Pass"})'
    ']})'  # close done div
    ']},ci);'  # close button children+props, key=ci
    '}),'  # close c0.map
    # Certifications label
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginTop:4},children:['
    'e.jsx(Wa,{size:14,color:"#7c3aed"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"Certifications"})'
    ']}),'
    '_compC.filter(function(c){return c.hasAssessment&&c.myScore>=75;}).map(function(cert,ci){'
    'return e.jsxs("div",{className:"card p-3",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
    'e.jsx("div",{style:{width:36,height:36,borderRadius:8,background:"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:e.jsx(Ru,{size:18,color:"#7c3aed"})}),'
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:600},children:cert.title}),'
    'e.jsxs("p",{style:{fontSize:10,color:"#9ca3af",marginTop:2},children:["Completed ",cert.endDate," \xb7 ",cert.myScore,"%"]})'
    ']})'
    ']})'  # close flex row
    ']},ci);'  # close cert card
    '}),'  # close filter.map
    # Coaching label
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginTop:4},children:['
    'e.jsx(fg,{size:14,color:"#0891b2"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"Coaching"})'
    ']}),'
    # Coaching card
    'e.jsxs("div",{className:"card p-4",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:600},children:"Q2 2026 Development Plan"}),'
    'e.jsx("span",{style:{fontSize:10,background:"#EFF4FF",color:"#1a56db",padding:"2px 7px",borderRadius:6},children:"Active"})'
    ']}),'
    '[{s:"Project risk communication",p:60},{s:"Stakeholder management",p:40},{s:"Data-driven decisions",p:25}]'
    '.map(function(it,ii){'
    'return e.jsxs("div",{style:{marginBottom:10},children:['
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3},children:['
    'e.jsx("span",{style:{fontSize:11,color:"#374151"},children:it.s}),'
    'e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:"#1a56db"},children:[it.p,"%"]})'
    ']}),'
    + prog_bar('"#e5e7eb"', '"#1a56db"', 'it.p+"%"') +
    ']},ii);'  # close coaching item
    '})'  # close coaching map
    ']})'  # close coaching card
    ']})'  # close development space-y-3
)
if not chk('TAB_DEVELOPMENT', TAB_DEVELOPMENT): errors.append('TAB_DEVELOPMENT')

# ── RECOGNITION TAB ───────────────────────────────────────────────────────────
TAB_RECOGNITION = (
    '_tab==="recognition"&&e.jsxs("div",{className:"space-y-3",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
    'e.jsx(Ru,{size:14,color:"#d97706"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"Achievements"})'
    ']}),'
    '[{title:"Safety Champion",desc:"Zero incidents Q1 2026",date:"2026-03-31",ic:Oa,col:"#d97706",bg:"#fef3c7"},'
    '{title:"On-Time Delivery",desc:"Metro Tower milestone ahead of schedule",date:"2026-02-15",ic:Ks,col:"#16a34a",bg:"#dcfce7"},'
    '{title:"Training Excellence",desc:"Scored 92% in Safety Compliance",date:"2026-04-15",ic:Wa,col:"#7c3aed",bg:"#ede9fe"}]'
    '.map(function(ach,ai){'
    'return e.jsxs("div",{className:"card p-4",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:['
    'e.jsx("div",{style:{width:42,height:42,borderRadius:10,background:ach.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:e.jsx(ach.ic,{size:20,color:ach.col})}),'
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:600},children:ach.title}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",marginTop:2},children:ach.desc}),'
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",marginTop:2},children:ach.date})'
    ']})'
    ']})'  # close flex row
    ']},ai);'  # close achievement card
    '}),'
    # Badges
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginTop:4},children:['
    'e.jsx(Oa,{size:14,color:"#d97706"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"Badges"})'
    ']}),'
    'e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:8},children:'
    '[{l:"Team Player",c:"#1a56db",b:"#EFF4FF"},{l:"Innovator",c:"#7c3aed",b:"#ede9fe"},'
    '{l:"Mentor",c:"#0891b2",b:"#e0f2fe"},{l:"Leader",c:"#16a34a",b:"#dcfce7"},'
    '{l:"Problem Solver",c:"#d97706",b:"#fef3c7"}]'
    '.map(function(bd,bi){'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:bd.b,color:bd.c,fontSize:11,fontWeight:600,padding:"5px 10px",borderRadius:8},children:[e.jsx(Oa,{size:10,color:bd.c}),bd.l]},bi);'
    '})'
    '}),'
    # Rewards
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginTop:4},children:['
    'e.jsx(Ju,{size:14,color:"#16a34a"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"Rewards"})'
    ']}),'
    'e.jsxs("div",{className:"card p-4",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:600},children:"Recognition Points"}),'
    'e.jsx("span",{style:{fontSize:22,fontWeight:800,color:"#d97706"},children:"850 pts"})'
    ']}),'
    '[{desc:"Safety milestone bonus",pts:200,date:"2026-03-31"},'
    '{desc:"Q1 goal achievement",pts:350,date:"2026-03-15"},'
    '{desc:"Training completion",pts:150,date:"2026-04-15"},'
    '{desc:"Peer recognition",pts:150,date:"2026-04-20"}]'
    '.map(function(rw,ri){'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderTop:ri>0?"1px solid #f3f4f6":"none"},children:['
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:11,fontWeight:500,color:"#374151"},children:rw.desc}),'
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af"},children:rw.date})'
    ']}),'
    'e.jsxs("span",{style:{fontSize:12,fontWeight:700,color:"#16a34a"},children:["+",rw.pts]})'
    ']},ri);'
    '})'
    ']})'  # close rewards card
    ']})'  # close recognition space-y-3
)
if not chk('TAB_RECOGNITION', TAB_RECOGNITION): errors.append('TAB_RECOGNITION')

# ── REVIEWS TAB ───────────────────────────────────────────────────────────────
TAB_REVIEWS = (
    '_tab==="reviews"&&e.jsxs("div",{className:"space-y-3",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
    'e.jsx(fg,{size:14,color:"#1a56db"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"Feedback"})'
    ']}),'
    '[{from:"Marcus Rivera",role:"Project Director",date:"2026-05-15",rating:4,'
    'text:"Excellent commitment to safety protocols. Documentation is consistently strong. '
    'Cross-team communication could be more proactive.",tag:"Manager"},'
    '{from:"Priya Kapoor",role:"HR Manager",date:"2026-04-28",rating:5,'
    'text:"Outstanding contribution to HR Orbit Development. Delivered high-quality work and supported team effectively.",tag:"Manager"},'
    '{from:"Arjun Sharma",role:"Senior Engineer",date:"2026-04-10",rating:4,'
    'text:"Great collaboration on Office Relocation. Always available to help.",tag:"Peer"}]'
    '.map(function(fb,fi){'
    'return e.jsxs("button",{onClick:function(){_setDet({k:"feedback",t:"Feedback from "+fb.from,d:fb});},className:"w-full card-interactive p-4 text-left",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6},children:['
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700},children:fb.from}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:fb.role})'
    ']}),'
    'e.jsx("span",{style:{fontSize:10,fontWeight:600,color:fb.tag==="Manager"?"#1a56db":"#16a34a",background:fb.tag==="Manager"?"#EFF4FF":"#dcfce7",padding:"2px 7px",borderRadius:6},children:fb.tag})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:2,marginBottom:6},children:'
    '[1,2,3,4,5].map(function(n){return e.jsx(Oa,{size:12,color:n<=fb.rating?"#d97706":"#e5e7eb"},n);})'
    '}),'
    'e.jsx("p",{style:{fontSize:11,color:"#374151",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"},children:fb.text}),'
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",marginTop:4},children:fb.date})'
    ']},fi);'
    '}),'
    # Manager Review label
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginTop:4},children:['
    'e.jsx(Ks,{size:14,color:"#7c3aed"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"Manager Review"})'
    ']}),'
    'e.jsxs("button",{onClick:function(){_setDet({k:"mgr-review",t:"Q1 2026 Manager Review",d:'
    '{quarter:"Q1 2026",reviewer:"Marcus Rivera",overallRating:4.0,'
    'sections:['
    '{name:"Technical Skills",rating:4,comment:"Strong foundation in project management tools."},'
    '{name:"Communication",rating:3,comment:"Good written skills; verbal presentation needs development."},'
    '{name:"Teamwork",rating:5,comment:"Exceptional team player, always supports colleagues."},'
    '{name:"Delivery",rating:4,comment:"Meets deadlines consistently."},'
    '{name:"Initiative",rating:4,comment:"Proactively identifies risks and proposes solutions."}'
    ']}'
    '});},className:"w-full card-interactive p-4 text-left",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8},children:['
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700},children:"Q1 2026 Annual Review"}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:"by Marcus Rivera"})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:3},children:['
    'e.jsx(Oa,{size:14,color:"#d97706"}),'
    'e.jsx("span",{style:{fontSize:16,fontWeight:800},children:"4.0"}),'
    'e.jsx("span",{style:{fontSize:10,color:"#9ca3af"},children:"/5"})'
    ']})'
    ']}),'
    'e.jsx("div",{style:{display:"flex",gap:4,flexWrap:"wrap"},children:'
    '["Technical","Communication","Teamwork","Delivery","Initiative"]'
    '.map(function(s,si){return e.jsx("span",{style:{fontSize:10,background:"#f3f4f6",color:"#6b7280",padding:"2px 7px",borderRadius:6},children:s},si);})'
    '})'
    ']}),'
    # 360 label
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginTop:4},children:['
    'e.jsx(fg,{size:14,color:"#0891b2"}),'
    'e.jsx("span",{style:{fontSize:13,fontWeight:700},children:"360\xb0 Reviews"})'
    ']}),'
    'e.jsxs("button",{onClick:function(){_setDet({k:"360",t:"360\xb0 Review Summary"});},className:"w-full card-interactive p-4 text-left",children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,marginBottom:6},children:"Q1 2026 \xb7 360\xb0 Feedback"}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
    'e.jsxs("div",{style:{display:"flex",gap:2},children:'
    '[1,2,3,4,5].map(function(n){return e.jsx(Oa,{size:13,color:n<=4?"#d97706":"#e5e7eb"},n);})'
    '}),'
    'e.jsx("span",{style:{fontSize:14,fontWeight:700},children:"4.1 / 5"})'
    ']}),'
    'e.jsx("div",{style:{display:"flex",gap:4,flexWrap:"wrap"},children:'
    '["Leadership","Collaboration","Problem Solving","Communication"]'
    '.map(function(s,si){return e.jsx("span",{style:{fontSize:10,background:"#f3f4f6",color:"#374151",padding:"2px 7px",borderRadius:6},children:s},si);})'
    '})'
    ']})'  # close 360 btn
    ']})'  # close reviews space-y-3
)
if not chk('TAB_REVIEWS', TAB_REVIEWS): errors.append('TAB_REVIEWS')

# ── DETAIL VIEWS ──────────────────────────────────────────────────────────────
DET_TASKS = (
    'e.jsxs("div",{className:"space-y-2",children:['
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4},children:['
    'e.jsxs("span",{style:{fontSize:11,color:"#6b7280"},children:[_myTasks.length," tasks assigned"]}),'
    'e.jsxs("span",{style:{fontSize:11,fontWeight:600,color:"#16a34a"},children:[_doneTasks.length," completed"]})'
    ']}),'
    '_myTasks.map(function(r,ri){'
    'var sc=r.status==="done"?"#16a34a":r.status==="in-progress"?"#d97706":"#9ca3af";'
    'var bg=r.status==="done"?"#dcfce7":r.status==="in-progress"?"#fef9c3":"#f3f4f6";'
    'return e.jsxs("div",{className:"card p-3",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between"},children:['
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:600,color:"#111827"},children:r.name}),'
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280",marginTop:2},children:r.type})'
    ']}),'
    'e.jsx("span",{style:{fontSize:10,fontWeight:600,color:sc,background:bg,padding:"2px 7px",borderRadius:5},children:r.status})'
    ']}),'
    'r.progress>0&&e.jsxs("div",{style:{marginTop:6},children:['
    + prog_bar('"#e5e7eb"', 'sc', 'r.progress+"%"', 4) + ','
    'e.jsxs("p",{style:{fontSize:9,color:"#9ca3af",marginTop:2},children:[r.progress,"%"]})'
    ']})'
    ']},ri);'
    '})'
    ']})'
)
if not chk('DET_TASKS', DET_TASKS): errors.append('DET_TASKS')

DET_GOALS = (
    'e.jsxs("div",{className:"space-y-3",children:['
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:4},children:['
    'e.jsxs("div",{className:"card p-2.5 text-center",children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#16a34a"},children:_otG}),'
    'e.jsx("p",{style:{fontSize:9,color:"#6b7280"},children:"On Track"})'
    ']}),'
    'e.jsxs("div",{className:"card p-2.5 text-center",children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#d97706"},children:_arG}),'
    'e.jsx("p",{style:{fontSize:9,color:"#6b7280"},children:"At Risk"})'
    ']}),'
    'e.jsxs("div",{className:"card p-2.5 text-center",children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#dc2626"},children:_bhG}),'
    'e.jsx("p",{style:{fontSize:9,color:"#6b7280"},children:"Behind"})'
    ']})'
    ']}),'
    'Gt.map(function(g,gi){'
    'var sc=g.status==="on-track"?"#16a34a":g.status==="at-risk"?"#d97706":"#dc2626";'
    'var bg=g.status==="on-track"?"#dcfce7":g.status==="at-risk"?"#fef9c3":"#fee2e2";'
    'return e.jsxs("div",{className:"card p-4",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:600,color:"#111827",flex:1,minWidth:0,marginRight:6},children:g.title}),'
    'e.jsx("span",{style:{fontSize:10,fontWeight:600,color:sc,background:bg,padding:"2px 7px",borderRadius:5,flexShrink:0},children:g.status})'
    ']}),'
    + prog_bar('"#e5e7eb"', 'sc', 'g.progress+"%"') + ','
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginTop:4},children:['
    'e.jsxs("span",{style:{fontSize:10,color:"#6b7280"},children:[g.metric,": ",g.currentValue,"/",g.targetValue]}),'
    'e.jsxs("span",{style:{fontSize:11,fontWeight:700,color:sc},children:[g.progress,"%"]})'
    ']})'
    ']},gi);'
    '})'
    ']})'
)
if not chk('DET_GOALS', DET_GOALS): errors.append('DET_GOALS')

DET_UTIL = (
    'e.jsxs("div",{className:"space-y-3",children:['
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:['
    'e.jsxs("div",{className:"card p-3",children:['
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:"Total Logged"}),'
    'e.jsxs("p",{style:{fontSize:22,fontWeight:800,color:"#111827",marginTop:2},children:[_totalHrs.toFixed(1),"h"]})'
    ']}),'
    'e.jsxs("div",{className:"card p-3",children:['
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:"Utilization"}),'
    'e.jsxs("p",{style:{fontSize:22,fontWeight:800,color:_utilPct>=80?"#16a34a":_utilPct>=60?"#d97706":"#dc2626",marginTop:2},children:[_utilPct,"%"]})'
    ']}),'
    'e.jsxs("div",{className:"card p-3",children:['
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:"Expected Hrs"}),'
    'e.jsxs("p",{style:{fontSize:22,fontWeight:800,color:"#111827",marginTop:2},children:[_expHrs,"h"]})'
    ']}),'
    'e.jsxs("div",{className:"card p-3",children:['
    'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:"Avg per Day"}),'
    'e.jsxs("p",{style:{fontSize:22,fontWeight:800,color:"#111827",marginTop:2},children:[_wd.length?(_totalHrs/_wd.length).toFixed(1):"0","h"]})'
    ']})'
    ']}),'
    'e.jsxs("div",{className:"card p-4",children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:700,marginBottom:10},children:"Daily Log"}),'
    'jt.filter(function(r){return r.totalHours>0;}).map(function(r,ri){'
    'return e.jsxs("div",{style:{marginBottom:8},children:['
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:2},children:['
    'e.jsx("span",{style:{fontSize:10,color:"#374151"},children:r.date}),'
    'e.jsxs("span",{style:{fontSize:10,fontWeight:600,color:"#1a56db"},children:[r.totalHours,"h"]})'
    ']}),'
    + prog_bar('"#e5e7eb"', '"#1a56db"', 'Math.min(Math.round(r.totalHours/9*100),100)+"%"', 4) +
    ']},ri);'
    '})'
    ']})'
    ']})'
)
if not chk('DET_UTIL', DET_UTIL): errors.append('DET_UTIL')

DET_FEEDBACK = (
    'e.jsxs("div",{className:"space-y-3",children:['
    'e.jsxs("div",{className:"card p-5",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10},children:['
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:14,fontWeight:700},children:_det.d.from}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",marginTop:2},children:_det.d.role})'
    ']}),'
    'e.jsx("span",{style:{fontSize:10,fontWeight:600,color:_det.d.tag==="Manager"?"#1a56db":"#16a34a",background:_det.d.tag==="Manager"?"#EFF4FF":"#dcfce7",padding:"3px 8px",borderRadius:6},children:_det.d.tag})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:2,marginBottom:12},children:'
    '[1,2,3,4,5].map(function(n){return e.jsx(Oa,{size:16,color:n<=_det.d.rating?"#d97706":"#e5e7eb"},n);})'
    '}),'
    'e.jsx("p",{style:{fontSize:13,color:"#374151",lineHeight:1.6},children:_det.d.text}),'
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af",marginTop:12},children:_det.d.date})'
    ']})'
    ']})'
)
if not chk('DET_FEEDBACK', DET_FEEDBACK): errors.append('DET_FEEDBACK')

DET_MGR_REVIEW = (
    'e.jsxs("div",{className:"space-y-3",children:['
    'e.jsxs("div",{className:"card p-4",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:['
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:14,fontWeight:700},children:_det.d.quarter}),'
    'e.jsxs("p",{style:{fontSize:11,color:"#6b7280",marginTop:2},children:["by ",_det.d.reviewer]})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
    'e.jsx(Oa,{size:16,color:"#d97706"}),'
    'e.jsxs("span",{style:{fontSize:18,fontWeight:800,color:"#111827"},children:[_det.d.overallRating.toFixed(1),"/5"]})'
    ']})'
    ']}),'
    '_det.d.sections.map(function(sec,si){'
    'return e.jsxs("div",{style:{marginBottom:12},children:['
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4},children:['
    'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:"#374151"},children:sec.name}),'
    'e.jsxs("span",{style:{fontSize:12,fontWeight:700,color:"#1a56db"},children:[sec.rating,"/5"]})'
    ']}),'
    + prog_bar('"#e5e7eb"', '"#1a56db"', '(sec.rating/5*100)+"%"', 6) + ','
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",marginTop:4},children:sec.comment})'
    ']},si);'
    '})'
    ']})'
    ']})'
)
if not chk('DET_MGR_REVIEW', DET_MGR_REVIEW): errors.append('DET_MGR_REVIEW')

DET_360 = (
    'e.jsxs("div",{className:"space-y-3",children:['
    'e.jsxs("div",{className:"card p-4",children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:700,marginBottom:10},children:"Q1 2026 \xb7 360\xb0 Review"}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:14},children:['
    'e.jsxs("div",{style:{display:"flex",gap:2},children:'
    '[1,2,3,4,5].map(function(n){return e.jsx(Oa,{size:14,color:n<=4?"#d97706":"#e5e7eb"},n);})'
    '}),'
    'e.jsx("span",{style:{fontSize:15,fontWeight:800},children:"4.1 / 5"})'
    ']}),'
    '[{comp:"Leadership",score:4.2},{comp:"Collaboration",score:4.5},'
    '{comp:"Problem Solving",score:3.8},{comp:"Communication",score:3.9},{comp:"Delivery",score:4.3}]'
    '.map(function(c,ci){'
    'return e.jsxs("div",{style:{marginBottom:10},children:['
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3},children:['
    'e.jsx("span",{style:{fontSize:12,color:"#374151"},children:c.comp}),'
    'e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"#1a56db"},children:c.score.toFixed(1)})'
    ']}),'
    + prog_bar('"#e5e7eb"', '"#1a56db"', '(c.score/5*100)+"%"') +
    ']},ci);'
    '})'
    ']}),'
    'e.jsxs("div",{className:"card p-4",children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:600,marginBottom:10},children:"Reviewer Comments"}),'
    '[{from:"Arjun Sharma",text:"Reliable team member with impressive technical depth."},'
    '{from:"Priya Kapoor",text:"Great attitude and willingness to help. Communication can be more assertive."},'
    '{from:"Kavita Singh",text:"Strong ownership of tasks. Would benefit from more cross-team visibility."}]'
    '.map(function(rv,ri){'
    'return e.jsxs("div",{style:{borderTop:ri>0?"1px solid #f3f4f6":"none",paddingTop:ri>0?8:0,marginTop:ri>0?8:0},children:['
    'e.jsx("p",{style:{fontSize:11,fontWeight:600,color:"#374151",marginBottom:3},children:rv.from}),'
    'e.jsx("p",{style:{fontSize:11,color:"#6b7280",lineHeight:1.5},children:rv.text})'
    ']},ri);'
    '})'
    ']})'
    ']})'
)
if not chk('DET_360', DET_360): errors.append('DET_360')

DET_COURSE = (
    'e.jsxs("div",{className:"space-y-3",children:['
    'e.jsxs("div",{className:"card p-5",children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12},children:['
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:700},children:_det.d.title}),'
    'e.jsxs("p",{style:{fontSize:11,color:"#6b7280",marginTop:3},children:[_det.d.category," \xb7 ",_det.d.type]})'
    ']}),'
    '_det.d.myStatus==="completed"&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:3,background:"#fef3c7",padding:"4px 8px",borderRadius:8,marginLeft:8,flexShrink:0},children:['
    'e.jsx(Oa,{size:11,color:"#d97706"}),'
    'e.jsxs("span",{style:{fontSize:12,fontWeight:700,color:"#d97706"},children:[_det.d.myScore,"%"]})'
    ']})'
    ']}),'
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12},children:['
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af"},children:"Start"}),'
    'e.jsx("p",{style:{fontSize:12,fontWeight:600},children:_det.d.startDate})'
    ']}),'
    'e.jsxs("div",{children:['
    'e.jsx("p",{style:{fontSize:10,color:"#9ca3af"},children:"End"}),'
    'e.jsx("p",{style:{fontSize:12,fontWeight:600},children:_det.d.endDate})'
    ']})'
    ']}),'
    'e.jsxs("div",{style:{display:"flex",gap:6,flexWrap:"wrap"},children:['
    '_det.d.isMandatory&&e.jsx("span",{style:{fontSize:10,background:"#fee2e2",color:"#dc2626",padding:"2px 8px",borderRadius:6,fontWeight:600},children:"Mandatory"}),'
    '_det.d.hasAssessment&&e.jsx("span",{style:{fontSize:10,background:"#EFF4FF",color:"#1a56db",padding:"2px 8px",borderRadius:6,fontWeight:600},children:"Has Assessment"}),'
    'e.jsx("span",{style:{fontSize:10,background:"#f3f4f6",color:"#374151",padding:"2px 8px",borderRadius:6},children:_det.d.venue})'
    ']})'
    ']})'
    ']})'
)
if not chk('DET_COURSE', DET_COURSE): errors.append('DET_COURSE')

# ── Detail content dispatch ────────────────────────────────────────────────────
DET_CONTENT = (
    '_det.k==="tasks"?' + DET_TASKS + ':'
    '_det.k==="goals"?' + DET_GOALS + ':'
    '_det.k==="util"?' + DET_UTIL + ':'
    '_det.k==="feedback"?' + DET_FEEDBACK + ':'
    '_det.k==="mgr-review"?' + DET_MGR_REVIEW + ':'
    '_det.k==="360"?' + DET_360 + ':'
    '_det.k==="course"?' + DET_COURSE + ':'
    'e.jsx("div",{children:"Loading..."})'
)
if not chk('DET_CONTENT', DET_CONTENT): errors.append('DET_CONTENT')

# ── Detail screen (early return when _det is set) ─────────────────────────────
DET_SCREEN = (
    'if(_det){'
    'return e.jsxs("div",{className:"screen",style:{background:"#f8fafc"},children:['
    'e.jsxs("div",{className:"screen-header px-4 pt-11 pb-2",children:['
    'e.jsxs("div",{className:"flex items-center gap-3",children:['
    'e.jsx("button",{onClick:function(){_setDet(null);},className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})}),'
    'e.jsx("h1",{className:"text-base font-bold truncate",children:_det.t})'
    ']})'
    ']}),'
    'e.jsx("div",{style:{flex:1,overflowY:"auto",paddingBottom:80},children:'
    'e.jsx("div",{className:"px-4 py-4 space-y-3",children:'
    + DET_CONTENT +
    '})'
    '})'
    ']})'
    ';}'  # close return statement and if block
)
if not chk('DET_SCREEN', DET_SCREEN): errors.append('DET_SCREEN')

# ── Main screen content ───────────────────────────────────────────────────────
MAIN_CONTENT = (
    'e.jsx("div",{style:{flex:1,overflowY:"auto",paddingBottom:80},children:'
    'e.jsxs("div",{className:"px-4 py-4 space-y-3",children:['
    + TAB_OVERVIEW + ','
    + TAB_ATTENDANCE + ','
    + TAB_DEVELOPMENT + ','
    + TAB_RECOGNITION + ','
    + TAB_REVIEWS +
    ']})'
    '})'
)
if not chk('MAIN_CONTENT', MAIN_CONTENT): errors.append('MAIN_CONTENT')

# ── Assemble vm() ─────────────────────────────────────────────────────────────
NEW_VM = (
    'function vm(){'
    'const[_tab,_setTab]=b.useState("overview");'
    'const[_det,_setDet]=b.useState(null);'
    + COMPUTED
    + DET_SCREEN
    + 'return e.jsxs("div",{className:"screen",style:{background:"#f8fafc"},children:['
    'e.jsxs("div",{className:"screen-header px-4 pt-11 pb-2",children:['
    'e.jsxs("div",{className:"flex items-center justify-between",children:['
    'e.jsxs("div",{className:"flex items-center gap-3",children:['
    'e.jsx("button",{onClick:function(){le("dashboard");},className:"hdr-icon-btn flex-shrink-0",children:e.jsx(ke,{size:18})}),'
    'e.jsx("h1",{className:"text-base font-bold truncate",children:"Performance"})'
    ']}),'
    'e.jsx("span",{style:{background:"#EFF4FF",color:"#1a56db",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:12},children:"Harsh"})'
    ']}),'
    + TAB_BAR +
    ']}),'
    + MAIN_CONTENT +
    ']})'  # close screen div
    '}'    # close vm()
)

print()
ob_o = OLD_VM.count('{') - OLD_VM.count('}')
ob_n = NEW_VM.count('{') - NEW_VM.count('}')
op_o = OLD_VM.count('(') - OLD_VM.count(')')
op_n = NEW_VM.count('(') - NEW_VM.count(')')
sq_o = OLD_VM.count('[') - OLD_VM.count(']')
sq_n = NEW_VM.count('[') - NEW_VM.count(']')
print('OLD vm: ob=%d op=%d sq=%d len=%d' % (ob_o, op_o, sq_o, len(OLD_VM)))
print('NEW vm: ob=%d op=%d sq=%d len=%d' % (ob_n, op_n, sq_n, len(NEW_VM)))

if errors:
    print('Sections with errors:', errors); exit(1)
if ob_o != ob_n or op_o != op_n or sq_o != sq_n:
    print('FINAL BALANCE MISMATCH'); exit(1)

print('All sections balanced. Running Node.js syntax check...')
new_content = content.replace(OLD_VM, NEW_VM, 1)
if new_content == content:
    print('FAIL: no replacement made'); exit(1)

scripts = re.findall(r'<script[^>]*>(.*?)</script>', new_content, re.DOTALL)
with open('/tmp/chk_perf.js', 'w') as f:
    f.write(scripts[0])
r = subprocess.run(
    ['node', '-e',
     'try{new Function(require("fs").readFileSync("/tmp/chk_perf.js","utf8"));'
     'process.stdout.write("OK");}catch(e){process.stdout.write("ERR:"+e.message);}'],
    capture_output=True, text=True)
print('Node check:', r.stdout)
ob = new_content.count('{') - new_content.count('}')
op = new_content.count('(') - new_content.count(')')
sq = new_content.count('[') - new_content.count(']')
print('File delta: ob=%d op=%d sq=%d' % (ob, op, sq))

if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
    with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Done. Performance module written successfully.')
else:
    print('NOT written.')
    if r.stdout != 'OK':
        print('Node error:', r.stdout[:500])
