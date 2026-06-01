#!/usr/bin/env python3
"""
Manager Hub improvements:
 A – Escalation Alerts: limit to 2, add "View All" → esc-all full page
 B – Leave Balance: top 5 + "View All" → leave-all full page
 C – Team tab: by project first, drill into project → proj-team members
 D – Analytics: proper bar chart for attendance, Team Efficiency "View All" → efficiency-all page
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

def chk(name, s):
    ob = s.count('{') - s.count('}')
    op = s.count('(') - s.count(')')
    sq = s.count('[') - s.count(']')
    if ob or op or sq:
        print(f'  IMBAL {name}: ob={ob} op={op} sq={sq}')
        errors.append(name)
    return not (ob or op or sq)

# ══ A – Escalation Alerts: add "View All" button, limit to 2 items ════════════
OLD_ESC = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #fecaca",marginBottom:12},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderBottom:"1px solid #fef2f2"},children:['
    'e.jsx("div",{style:{width:8,height:8,borderRadius:"50%",background:"#dc2626"}}),'
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#dc2626"},children:"Escalation Alerts"}),'
    'e.jsx("span",{style:{marginLeft:"auto",fontSize:10,background:"#fef2f2",color:"#dc2626",padding:"2px 6px",borderRadius:8,fontWeight:600},children:m.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).length+" overdue"})'
    ']}),'
    'e.jsx("div",{style:{padding:"8px 12px"},children:'
    'e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6},children:'
    'm.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).map(function(r){'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #fef2f2"},children:['
    'e.jsx("div",{style:{width:28,height:28,borderRadius:"50%",background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:'
    'e.jsx("span",{style:{fontSize:9,fontWeight:700,color:"#dc2626"},children:r.requester.split(" ")[0][0]+r.requester.split(" ")[1][0]})'
    '}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:11,fontWeight:600,color:"#111827"},children:r.requester}),'
    'e.jsx("p",{style:{fontSize:9,color:"#6b7280"},children:r.type+" · "+r.date})'
    ']})'
    ']},r.id);'
    '})'
    '}'
    ')'
    '})'
    ']})'
)

NEW_ESC = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #fecaca",marginBottom:12},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderBottom:"1px solid #fef2f2"},children:['
    'e.jsx("div",{style:{width:8,height:8,borderRadius:"50%",background:"#dc2626"}}),'
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#dc2626"},children:"Escalation Alerts"}),'
    'e.jsx("span",{style:{marginLeft:"auto",fontSize:10,background:"#fef2f2",color:"#dc2626",padding:"2px 6px",borderRadius:8,fontWeight:600},children:m.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).length+" overdue"}),'
    'e.jsx("button",{onClick:function(){_mhSetView("esc-all");},style:{marginLeft:8,fontSize:10,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer",padding:0},children:"View All"})'
    ']}),'
    'e.jsx("div",{style:{padding:"8px 12px"},children:'
    'e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6},children:'
    'm.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).slice(0,2).map(function(r){'
    'return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #fef2f2"},children:['
    'e.jsx("div",{style:{width:28,height:28,borderRadius:"50%",background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:'
    'e.jsx("span",{style:{fontSize:9,fontWeight:700,color:"#dc2626"},children:r.requester.split(" ")[0][0]+r.requester.split(" ")[1][0]})'
    '}),'
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("p",{style:{fontSize:11,fontWeight:600,color:"#111827"},children:r.requester}),'
    'e.jsx("p",{style:{fontSize:9,color:"#6b7280"},children:r.type+" · "+r.date})'
    ']})'
    ']},r.id);'
    '})'
    '}'
    ')'
    '})'
    ']})'
)

chk('OLD_ESC', OLD_ESC); chk('NEW_ESC', NEW_ESC)
if OLD_ESC in content:
    content = content.replace(OLD_ESC, NEW_ESC, 1)
    print('A escalation: OK')
else:
    errors.append('A'); print('A: FAIL')

# ══ B – Leave Balance: top 5 + View All button ═══════════════════════════════
OLD_LB = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",marginBottom:12},children:['
    'e.jsxs("div",{style:{padding:"10px 12px",borderBottom:"1px solid #f0f1f4"},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827"},children:"Leave Balance"})'
    ']}),'
    'e.jsx("div",{style:{padding:"8px 12px",display:"flex",flexDirection:"column",gap:8},children:'
    'j.map(function(mem){var _rem=mem.leaveBalance?mem.leaveBalance.remaining:0;var _ann=mem.leaveBalance?mem.leaveBalance.annual:15;var _pct=Math.round(_rem/_ann*100);return e.jsxs("div",{style:{},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3},children:[e.jsx("span",{style:{fontSize:11,fontWeight:500,color:"#111827"},children:mem.name.split(" ")[0]}),e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:_rem+"/"+_ann+" d"})]}),e.jsx("div",{style:{width:"100%",background:"#e5e7eb",borderRadius:4,height:5},children:e.jsx("div",{style:{width:_pct+"%",background:_pct>60?"#16a34a":_pct>30?"#f59e0b":"#dc2626",height:"100%",borderRadius:4}})})]},mem.id);})'
    '})'
    ']})'
)

NEW_LB = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",marginBottom:12},children:['
    'e.jsxs("div",{style:{padding:"10px 12px",borderBottom:"1px solid #f0f1f4",display:"flex",alignItems:"center"},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",flex:1},children:"Leave Balance"}),'
    'e.jsx("button",{onClick:function(){_mhSetView("leave-all");},style:{fontSize:10,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer",padding:0},children:"View All"})'
    ']}),'
    'e.jsx("div",{style:{padding:"8px 12px",display:"flex",flexDirection:"column",gap:8},children:'
    'j.slice(0,5).map(function(mem){var _rem=mem.leaveBalance?mem.leaveBalance.remaining:0;var _ann=mem.leaveBalance?mem.leaveBalance.annual:15;var _pct=Math.round(_rem/_ann*100);return e.jsxs("div",{style:{},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3},children:[e.jsx("span",{style:{fontSize:11,fontWeight:500,color:"#111827"},children:mem.name.split(" ")[0]}),e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:_rem+"/"+_ann+" d"})]}),e.jsx("div",{style:{width:"100%",background:"#e5e7eb",borderRadius:4,height:5},children:e.jsx("div",{style:{width:_pct+"%",background:_pct>60?"#16a34a":_pct>30?"#f59e0b":"#dc2626",height:"100%",borderRadius:4}})})]},mem.id);})'
    '})'
    ']})'
)

chk('OLD_LB', OLD_LB); chk('NEW_LB', NEW_LB)
if OLD_LB in content:
    content = content.replace(OLD_LB, NEW_LB, 1)
    print('B leave balance: OK')
else:
    errors.append('B'); print('B: FAIL')

# ══ C – Team tab: by project + members count ═════════════════════════════════
OLD_TEAM = (
    'i==="team"&&e.jsxs(e.Fragment,{children:['
    'e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:['
    'e.jsxs("div",{className:"card p-3 text-center",children:[e.jsx("p",{className:"text-xl font-bold text-blue-600",children:j.length}),e.jsx("p",{className:"text-[9px] text-neutral-500",children:"Team Size"})]}),e.jsxs("div",{className:"card p-3 text-center",children:[e.jsx("p",{className:"text-xl font-bold text-emerald-600",children:j.filter(h=>h.status==="present").length}),e.jsx("p",{className:"text-[9px] text-neutral-500",children:"Present Today"})]}),e.jsxs("div",{className:"card p-3 text-center",children:[e.jsx("p",{className:"text-xl font-bold text-amber-600",children:m.filter(h=>h.status==="pending").length}),e.jsx("p",{className:"text-[9px] text-neutral-500",children:"Pending"})]})]}),'
    'e.jsx("h3",{className:"text-xs font-semibold text-neutral-700 mt-2",children:"Team Members"}),'
    'j.map(h=>e.jsxs("div",{onClick:()=>{_mhSetSelMember(h);_mhSetView("team-detail");},className:"card p-3",style:{cursor:"pointer"}'
)

# Find the actual old team content up to end
ti = content.find(OLD_TEAM)
if ti < 0:
    print('C OLD_TEAM start: FAIL'); errors.append('C-find')
else:
    # find end of the team fragment: i==="team"&&e.jsxs(e.Fragment,{...})
    depth = 0
    sp = content.find('(', ti + len('i==="team"&&e.jsxs'))
    for k in range(sp, sp+50000):
        if content[k]=='(': depth+=1
        elif content[k]==')':
            depth-=1
            if depth==0:
                te=k; break
    OLD_TEAM_FULL = content[ti:te+1]
    print('C OLD_TEAM_FULL len=%d ob=%d op=%d sq=%d' % (
        len(OLD_TEAM_FULL),
        OLD_TEAM_FULL.count('{')-OLD_TEAM_FULL.count('}'),
        OLD_TEAM_FULL.count('(')-OLD_TEAM_FULL.count(')'),
        OLD_TEAM_FULL.count('[')-OLD_TEAM_FULL.count(']')))

    # Build per-project counts helper (inline JS)
    # j[n].projects is an array of project names matching il[n].name
    NEW_TEAM = (
        'i==="team"&&e.jsxs(e.Fragment,{children:['
        # Stats row
        'e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:['
        'e.jsxs("div",{className:"card p-3 text-center",children:['
        'e.jsx("p",{className:"text-xl font-bold text-blue-600",children:j.length}),'
        'e.jsx("p",{className:"text-[9px] text-neutral-500",children:"Team Size"})'
        ']}),'
        'e.jsxs("div",{className:"card p-3 text-center",children:['
        'e.jsx("p",{className:"text-xl font-bold text-emerald-600",children:j.filter(function(h){return h.status==="present";}).length}),'
        'e.jsx("p",{className:"text-[9px] text-neutral-500",children:"Present Today"})'
        ']}),'
        'e.jsxs("div",{className:"card p-3 text-center",children:['
        'e.jsx("p",{className:"text-xl font-bold text-amber-600",children:m.filter(function(h){return h.status==="pending";}).length}),'
        'e.jsx("p",{className:"text-[9px] text-neutral-500",children:"Pending"})'
        ']})'
        ']}),'
        # Project list header
        'e.jsx("h3",{className:"text-xs font-semibold text-neutral-700 mt-2",children:"Team by Project"}),'
        # Project cards
        'il.map(function(proj,pi){'
        'var _mems=j.filter(function(h){return h.projects&&h.projects.indexOf(proj.name)>=0;});'
        'var _pres=_mems.filter(function(h){return h.status==="present";}).length;'
        'return e.jsxs("div",{onClick:function(){_mhSetSelProj(proj);_mhSetView("proj-team");},className:"card p-3",style:{cursor:"pointer"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
        'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:600,color:"#111827"},children:proj.name}),'
        'e.jsxs("p",{style:{fontSize:10,color:"#6b7280",marginTop:2},children:[_mems.length," member",_mems.length===1?"":"s"," · ",_pres," present"]})'
        ']}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
        '_mems.slice(0,3).map(function(h,hi){'
        'return e.jsx("div",{style:{width:24,height:24,borderRadius:"50%",overflow:"hidden",border:"2px solid #fff",marginLeft:hi>0?-6:0},children:e.jsx("img",{src:h.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}})},hi);'
        '}),'
        '_mems.length>3&&e.jsx("div",{style:{width:24,height:24,borderRadius:"50%",background:"#e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#374151",marginLeft:-6},children:"+"+(_mems.length-3)})'
        ']})'
        ']})'
        ']},pi);'
        '})'
        ']})'
    )
    chk('NEW_TEAM', NEW_TEAM)
    if OLD_TEAM_FULL in content:
        content = content.replace(OLD_TEAM_FULL, NEW_TEAM, 1)
        print('C team tab: OK')
    else:
        errors.append('C'); print('C: FAIL replace')

# ══ D – Analytics: improved chart + Team Efficiency "View All" ════════════════
OLD_ANA = (
    'i==="analytics"&&e.jsxs("div",{style:{padding:"14px 16px 80px"},children:['
    'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",marginBottom:14},children:"Workforce Analytics"}),'
    # attendance trend
    'e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"12px 14px",marginBottom:12},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:12},children:"Attendance Trend (7 Days)"}),'
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-end",gap:6,height:80},children:'
    '[{d:"Mon",v:95,c:"#1a56db"},{d:"Tue",v:82,c:"#1a56db"},{d:"Wed",v:88,c:"#1a56db"},{d:"Thu",v:100,c:"#16a34a"},{d:"Fri",v:75,c:"#f59e0b"},{d:"Sat",v:88,c:"#1a56db"},{d:"Sun",v:93,c:"#1a56db"}]'
    '.map(function(bar){return e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2},children:[e.jsx("span",{style:{fontSize:8,color:"#6b7280"},children:bar.v+"%"}),e.jsx("div",{style:{width:"100%",background:bar.c,borderRadius:"3px 3px 0 0",height:bar.v+"%"}})]},bar.d);})'
    '}),'
    'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginTop:6},children:'
    '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(function(d,di){return e.jsx("span",{style:{fontSize:8,color:"#6b7280",flex:1,textAlign:"center"},children:d},di);})'
    '})'
    ']}),'
    # team efficiency
    'e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"12px 14px",marginBottom:12},children:['
    'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:10},children:"Team Efficiency"}),'
    'e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:'
    'j.map(function(mem){var _eff=mem.efficiency||80;var _col=_eff>=90?"#16a34a":_eff>=80?"#1a56db":"#f59e0b";return e.jsxs("div",{style:{},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3},children:[e.jsx("span",{style:{fontSize:11,color:"#374151"},children:mem.name.split(" ")[0]}),e.jsx("span",{style:{fontSize:11,fontWeight:700,color:_col},children:_eff+"%"})]}),e.jsx("div",{style:{width:"100%",background:"#e5e7eb",borderRadius:4,height:6},children:e.jsx("div",{style:{width:_eff+"%",background:_col,height:"100%",borderRadius:4}})})]},mem.id);})'
    '}'
    ')'
    ']})'
)

# Find end of analytics block
ai = content.find(OLD_ANA)
if ai < 0:
    print('D OLD_ANA: FAIL'); errors.append('D-find')
else:
    # find end of analytics div
    depth = 0
    sp = content.find('(', ai + len('i==="analytics"&&e.jsxs'))
    for k in range(sp, sp+50000):
        if content[k]=='(': depth+=1
        elif content[k]==')':
            depth-=1
            if depth==0:
                ae=k; break
    OLD_ANA_FULL = content[ai:ae+1]
    # get the approval breakdown part (after team efficiency - we want to keep it)
    approval_start = OLD_ANA_FULL.find('e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"12px 14px"},children:[e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",marginBottom:10},children:"Approval Breakdown"})')
    APPROVAL_BLOCK = OLD_ANA_FULL[approval_start:-2] if approval_start >= 0 else ''

    print('D OLD_ANA_FULL len=%d ob=%d op=%d sq=%d' % (
        len(OLD_ANA_FULL),
        OLD_ANA_FULL.count('{')-OLD_ANA_FULL.count('}'),
        OLD_ANA_FULL.count('(')-OLD_ANA_FULL.count(')'),
        OLD_ANA_FULL.count('[')-OLD_ANA_FULL.count(']')))
    print('  approval_start in analytics:', approval_start)
    print('  APPROVAL_BLOCK len:', len(APPROVAL_BLOCK))

    # Bar chart data with y-axis labels
    BAR_DATA = '[{d:"Mon",v:95},{d:"Tue",v:82},{d:"Wed",v:88},{d:"Thu",v:100},{d:"Fri",v:75},{d:"Sat",v:88},{d:"Sun",v:93}]'

    NEW_ANA = (
        'i==="analytics"&&e.jsxs("div",{style:{padding:"14px 16px 80px"},children:['
        'e.jsx("p",{style:{fontSize:13,fontWeight:700,color:"#111827",marginBottom:14},children:"Workforce Analytics"}),'
        # Attendance Trend - improved chart
        'e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"14px",marginBottom:12},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827"},children:"Attendance Trend"}),'
        'e.jsx("span",{style:{fontSize:10,color:"#6b7280"},children:"Last 7 days"})'
        ']}),'
        # chart with y-axis
        'e.jsxs("div",{style:{display:"flex",gap:6},children:['
        # y-axis labels
        'e.jsxs("div",{style:{display:"flex",flexDirection:"column",justifyContent:"space-between",paddingBottom:18,width:22},children:['
        'e.jsx("span",{style:{fontSize:8,color:"#9ca3af",textAlign:"right"},children:"100%"}),'
        'e.jsx("span",{style:{fontSize:8,color:"#9ca3af",textAlign:"right"},children:"75%"}),'
        'e.jsx("span",{style:{fontSize:8,color:"#9ca3af",textAlign:"right"},children:"50%"})'
        ']}),'
        # chart area
        'e.jsxs("div",{style:{flex:1},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"flex-end",gap:4,height:90,borderBottom:"1px solid #e5e7eb",borderLeft:"1px solid #e5e7eb",position:"relative"},children:['
        # grid lines
        'e.jsx("div",{style:{position:"absolute",left:0,right:0,top:0,borderTop:"1px dashed #f3f4f6"}}),'
        'e.jsx("div",{style:{position:"absolute",left:0,right:0,top:"25%",borderTop:"1px dashed #f3f4f6"}}),'
        'e.jsx("div",{style:{position:"absolute",left:0,right:0,top:"50%",borderTop:"1px dashed #f3f4f6"}}),'
        + BAR_DATA +
        '.map(function(bar,bi){'
        'var _col=bar.v>=95?"#16a34a":bar.v>=80?"#1a56db":"#f59e0b";'
        'return e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,justifyContent:"flex-end",height:"100%",paddingBottom:2},children:['
        'e.jsx("span",{style:{fontSize:7,color:"#6b7280"},children:bar.v+"%"}),'
        'e.jsx("div",{style:{width:"80%",background:_col,borderRadius:"3px 3px 0 0",height:bar.v+"%",transition:"height 0.3s"}})'
        ']},bi);'
        '})'
        ']}),'
        # x-axis
        'e.jsxs("div",{style:{display:"flex",gap:4,marginTop:4},children:'
        + BAR_DATA +
        '.map(function(bar,bi){return e.jsx("span",{style:{flex:1,fontSize:8,color:"#6b7280",textAlign:"center"},children:bar.d},bi);})'
        '}'
        ')'
        ']})'
        ']})'
        ']}),'
        # Team Efficiency with View All
        'e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"12px 14px",marginBottom:12},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",marginBottom:10},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827",flex:1},children:"Team Efficiency"}),'
        'e.jsx("button",{onClick:function(){_mhSetView("efficiency-all");},style:{fontSize:10,fontWeight:600,color:"#1a56db",background:"none",border:"none",cursor:"pointer",padding:0},children:"View All"})'
        ']}),'
        'e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:'
        'j.slice(0,4).map(function(mem){var _eff=mem.efficiency||80;var _col=_eff>=90?"#16a34a":_eff>=80?"#1a56db":"#f59e0b";return e.jsxs("div",{style:{},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3},children:[e.jsx("span",{style:{fontSize:11,color:"#374151"},children:mem.name.split(" ")[0]}),e.jsx("span",{style:{fontSize:11,fontWeight:700,color:_col},children:_eff+"%"})]}),e.jsx("div",{style:{width:"100%",background:"#e5e7eb",borderRadius:4,height:6},children:e.jsx("div",{style:{width:_eff+"%",background:_col,height:"100%",borderRadius:4}})})]},mem.id);})'
        '}'
        ')'
        ']}),'
        # Approval Breakdown (preserved)
        + APPROVAL_BLOCK +
        '})'
    )
    chk('NEW_ANA', NEW_ANA)
    if OLD_ANA_FULL in content:
        content = content.replace(OLD_ANA_FULL, NEW_ANA, 1)
        print('D analytics: OK')
    else:
        errors.append('D'); print('D: FAIL replace')

# ══ E – Add new view pages + new state + update title ════════════════════════
# E1: Add _mhSelProj state
OLD_STATE = 'const[_mhSelPerson,_mhSetSelPerson]=b.useState(null);'
NEW_STATE = 'const[_mhSelPerson,_mhSetSelPerson]=b.useState(null);const[_mhSelProj,_mhSetSelProj]=b.useState(null);'
if OLD_STATE in content:
    content = content.replace(OLD_STATE, NEW_STATE, 1)
    print('E1 state: OK')
else:
    errors.append('E1'); print('E1: FAIL')

# E2: Update header title to include new view names
OLD_TITLE = '_mhView==="team-detail"&&_mhSelMember?_mhSelMember.name:_mhSelPerson||"Approvals"'
NEW_TITLE = (
    '_mhView==="team-detail"&&_mhSelMember?_mhSelMember.name:'
    '_mhView==="esc-all"?"Escalation Alerts":'
    '_mhView==="leave-all"?"Leave Balance":'
    '_mhView==="proj-team"&&_mhSelProj?_mhSelProj.name+" Team":'
    '_mhView==="efficiency-all"?"Team Efficiency":'
    '_mhSelPerson||"Approvals"'
)
if OLD_TITLE in content:
    content = content.replace(OLD_TITLE, NEW_TITLE, 1)
    print('E2 title: OK')
else:
    errors.append('E2'); print('E2: FAIL')

# E3: Add new view pages into ternary chain (insert before main content fallback)
# Current chain: _mhView==="team-detail"?X:_mhView==="person-approvals"?Y:Z
# Insert: ...Y: new views : Z
OLD_CHAIN_END = (
    '\']):\'e.jsxs("div",{className:"px-5 py-4 space-y-3",children:['
)
# find the exact transition
ci = content.find('):e.jsxs("div",{className:"px-5 py-4 space-y-3",children:[i===\"overview\"')
ci += 2  # skip '):' so insertion happens after the person-approvals closing paren
print('chain end at:', ci)
if ci < 0:
    errors.append('E3-find'); print('E3: FAIL find chain end')
else:
    OLD_CHAIN_TAIL = content[ci:ci+58]
    print('OLD_CHAIN_TAIL:', repr(OLD_CHAIN_TAIL))

    # Build new view pages
    # Escalation All page
    ESC_ALL = (
        '_mhView==="esc-all"?e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"16px 16px 80px"},children:'
        'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10},children:['
        'e.jsxs("div",{style:{background:"#fef2f2",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8},children:['
        'e.jsx("div",{style:{width:8,height:8,borderRadius:"50%",background:"#dc2626",flexShrink:0}}),'
        'e.jsxs("span",{style:{fontSize:11,color:"#dc2626",fontWeight:600},children:[m.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).length," overdue approval",m.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).length===1?"":"s"]})'
        ']}),'
        'm.filter(function(r){return r.status==="pending"&&r.date<="2026-04-24";}).map(function(r,ri){'
        'return e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #fecaca",padding:"12px 14px"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:10},children:['
        'e.jsx("div",{style:{width:34,height:34,borderRadius:"50%",background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:'
        'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#dc2626"},children:r.requester.split(" ")[0][0]+r.requester.split(" ")[1][0]})'
        '}),'
        'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827"},children:r.requester}),'
        'e.jsx("p",{style:{fontSize:11,color:"#374151",marginTop:2},children:r.description}),'
        'e.jsxs("div",{style:{display:"flex",gap:6,marginTop:6},children:['
        'e.jsx("span",{style:{fontSize:10,background:"#fef2f2",color:"#dc2626",padding:"2px 7px",borderRadius:6,fontWeight:600},children:r.type}),'
        'e.jsx("span",{style:{fontSize:10,color:"#9ca3af"},children:r.date})'
        ']})'
        ']})'
        ']})'
        ']},ri);'
        '})'
        ']})'
        '}'
        '):'
    )

    # Leave All page
    LEAVE_ALL = (
        '_mhView==="leave-all"?e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"16px 16px 80px"},children:'
        'e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:'
        'j.slice().sort(function(a,b){var ra=a.leaveBalance?a.leaveBalance.remaining:0;var rb=b.leaveBalance?b.leaveBalance.remaining:0;return rb-ra;}).map(function(mem,mi){'
        'var _rem=mem.leaveBalance?mem.leaveBalance.remaining:0;'
        'var _ann=mem.leaveBalance?mem.leaveBalance.annual:15;'
        'var _sick=mem.leaveBalance?mem.leaveBalance.sick:0;'
        'var _sickUsed=mem.leaveBalance?mem.leaveBalance.sickUsed:0;'
        'var _pct=Math.round(_rem/_ann*100);'
        'var _col=_pct>60?"#16a34a":_pct>30?"#f59e0b":"#dc2626";'
        'return e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"12px 14px"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:8},children:['
        'e.jsx("div",{style:{width:36,height:36,borderRadius:"50%",overflow:"hidden",flexShrink:0},children:e.jsx("img",{src:mem.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}})}),'
        'e.jsxs("div",{style:{flex:1},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827"},children:mem.name}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:mem.role})'
        ']})'
        ']}),'
        'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8},children:['
        'e.jsxs("div",{style:{background:"#f8fafc",borderRadius:8,padding:"8px 10px"},children:['
        'e.jsx("p",{style:{fontSize:9,color:"#6b7280"},children:"Annual Leave"}),'
        'e.jsxs("p",{style:{fontSize:14,fontWeight:800,color:_col},children:[_rem," / ",_ann," d"]})'
        ']}),'
        'e.jsxs("div",{style:{background:"#f8fafc",borderRadius:8,padding:"8px 10px"},children:['
        'e.jsx("p",{style:{fontSize:9,color:"#6b7280"},children:"Sick Leave"}),'
        'e.jsxs("p",{style:{fontSize:14,fontWeight:800,color:"#374151"},children:[_sick-_sickUsed," / ",_sick," d"]})'
        ']})'
        ']}),'
        'e.jsx("div",{style:{width:"100%",background:"#e5e7eb",borderRadius:4,height:5},children:'
        'e.jsx("div",{style:{width:_pct+"%",background:_col,height:"100%",borderRadius:4}})'
        '})'
        ']},mi);'
        '})'
        '}'
        ')'
        '}):'
    )

    # Project Team page
    PROJ_TEAM = (
        '_mhView==="proj-team"&&_mhSelProj?e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"16px 16px 80px"},children:'
        'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10},children:['
        'e.jsxs("div",{style:{background:"#EFF4FF",borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:['
        'e.jsxs("span",{style:{fontSize:11,color:"#1a56db",fontWeight:600},children:['
        'j.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0;}).length," member",'
        'j.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0;}).length===1?"":"s"," assigned"'
        ']}),'
        'e.jsx("span",{style:{fontSize:10,background:"#1a56db",color:"#fff",padding:"2px 8px",borderRadius:6},children:_mhSelProj.status})'
        ']}),'
        'j.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0;}).map(function(h,hi){'
        'return e.jsxs("div",{onClick:function(){_mhSetSelMember(h);_mhSetView("team-detail");},style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"12px 14px",cursor:"pointer"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:['
        'e.jsxs("div",{style:{position:"relative",flexShrink:0},children:['
        'e.jsx("div",{style:{width:40,height:40,borderRadius:"50%",overflow:"hidden"},children:e.jsx("img",{src:h.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}})}),'
        'e.jsx("div",{style:{position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:"50%",background:h.status==="present"?"#16a34a":"#f59e0b",border:"2px solid #fff"}})'
        ']}),'
        'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827"},children:h.name}),'
        'e.jsxs("p",{style:{fontSize:10,color:"#6b7280",marginTop:1},children:[h.role," · ",h.dept]})'
        ']}),'
        'e.jsxs("div",{style:{textAlign:"right"},children:['
        'e.jsxs("p",{style:{fontSize:13,fontWeight:800,color:"#1a56db"},children:[h.completedTasks,"/",h.tasks]}),'
        'e.jsx("p",{style:{fontSize:9,color:"#9ca3af"},children:"Tasks"})'
        ']})'
        ']}),'
        'e.jsxs("div",{style:{marginTop:8,display:"flex",gap:6},children:['
        'e.jsxs("div",{style:{flex:1,background:"#f8fafc",borderRadius:6,padding:"5px 8px",textAlign:"center"},children:['
        'e.jsxs("p",{style:{fontSize:11,fontWeight:700,color:"#111827"},children:[h.efficiency,"%"]}),'
        'e.jsx("p",{style:{fontSize:8,color:"#6b7280"},children:"Efficiency"})'
        ']}),'
        'e.jsxs("div",{style:{flex:1,background:"#f8fafc",borderRadius:6,padding:"5px 8px",textAlign:"center"},children:['
        'e.jsxs("p",{style:{fontSize:11,fontWeight:700,color:"#111827"},children:[h.attendance,"%"]}),'
        'e.jsx("p",{style:{fontSize:8,color:"#6b7280"},children:"Attendance"})'
        ']})'
        ']})'
        ']},hi);'
        '})'
        ']})'
        '}'
        '):'
    )

    # Efficiency All page
    EFF_ALL = (
        '_mhView==="efficiency-all"?e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"16px 16px 80px"},children:'
        'e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:'
        'j.slice().sort(function(a,b){return (b.efficiency||80)-(a.efficiency||80);}).map(function(mem,mi){'
        'var _eff=mem.efficiency||80;'
        'var _otr=mem.onTimeRate||80;'
        'var _att=mem.attendance||80;'
        'var _col=_eff>=90?"#16a34a":_eff>=80?"#1a56db":"#f59e0b";'
        'return e.jsxs("div",{style:{background:"#fff",borderRadius:12,border:"1px solid #f0f1f4",padding:"12px 14px"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10},children:['
        'e.jsxs("div",{style:{position:"relative",flexShrink:0},children:['
        'e.jsx("div",{style:{width:40,height:40,borderRadius:"50%",overflow:"hidden"},children:e.jsx("img",{src:mem.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}})}),'
        'e.jsx("div",{style:{position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:"50%",background:mem.status==="present"?"#16a34a":"#f59e0b",border:"2px solid #fff"}})'
        ']}),'
        'e.jsxs("div",{style:{flex:1},children:['
        'e.jsx("p",{style:{fontSize:12,fontWeight:700,color:"#111827"},children:mem.name}),'
        'e.jsx("p",{style:{fontSize:10,color:"#6b7280"},children:mem.role})'
        ']}),'
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4,background:_eff>=90?"#dcfce7":_eff>=80?"#EFF4FF":"#fef9c3",padding:"4px 10px",borderRadius:8},children:['
        'e.jsxs("span",{style:{fontSize:14,fontWeight:800,color:_col},children:[_eff,"%"]})'
        ']})'
        ']}),'
        '[{label:"Efficiency",val:_eff,col:_col},{label:"On-Time Rate",val:_otr,col:"#7c3aed"},{label:"Attendance",val:_att,col:"#0891b2"}]'
        '.map(function(stat,si){'
        'return e.jsxs("div",{style:{marginBottom:6},children:['
        'e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:2},children:['
        'e.jsx("span",{style:{fontSize:10,color:"#374151"},children:stat.label}),'
        'e.jsxs("span",{style:{fontSize:10,fontWeight:700,color:stat.col},children:[stat.val,"%"]})'
        ']}),'
        'e.jsx("div",{style:{width:"100%",background:"#e5e7eb",borderRadius:4,height:5},children:'
        'e.jsx("div",{style:{width:stat.val+"%",background:stat.col,height:"100%",borderRadius:4}})'
        '}'
        ')'
        ']},si);'
        '})'
        ']},mi);'
        '})'
        '}'
        ')'
        '}):'
    )

    NEW_VIEWS = ESC_ALL + LEAVE_ALL + PROJ_TEAM + EFF_ALL
    chk('ESC_ALL', ESC_ALL); chk('LEAVE_ALL', LEAVE_ALL)
    chk('PROJ_TEAM', PROJ_TEAM); chk('EFF_ALL', EFF_ALL)

    NEW_CHAIN_TAIL = NEW_VIEWS + OLD_CHAIN_TAIL
    content = content[:ci] + NEW_CHAIN_TAIL + content[ci+len(OLD_CHAIN_TAIL):]
    print('E3 view pages: OK')

# ══ Validate ═════════════════════════════════════════════════════════════════
print()
if errors:
    print('FAILED:', errors)
else:
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    with open('/tmp/chk_mh.js', 'w') as f:
        f.write(scripts[0])
    r = subprocess.run(
        ['node', '-e',
         'try{new Function(require("fs").readFileSync("/tmp/chk_mh.js","utf8"));'
         'process.stdout.write("OK");}catch(e){process.stdout.write("ERR:"+e.message);}'],
        capture_output=True, text=True)
    print('Node check:', r.stdout)
    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    sq = content.count('[') - content.count(']')
    print('File delta: ob=%d op=%d sq=%d' % (ob, op, sq))
    if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
        if r.stdout != 'OK':
            print('Node error:', r.stdout[:500])
