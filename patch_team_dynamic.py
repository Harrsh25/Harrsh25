#!/usr/bin/env python3
"""
1. Fix j array: correct project names to match il + add 4 new mock members
2. Add state: _addMOpen, _addMForm + compute _jAll = j.concat(_mhTeam)
3. Fix back button: Ui (Activity icon) → ke (ChevronLeft)
4. Make Add Member button functional (onClick opens modal)
5. Replace j.filter/slice in team sections with _jAll
6. Add Add-Member bottom-sheet modal
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

def chk_pair(old_s, new_s, tag):
    def bal(s): return (s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']'))
    ob, op, sq = bal(old_s)
    nb, np2, ns = bal(new_s)
    if (ob,op,sq) != (nb,np2,ns):
        print('MISMATCH %s: old(%d,%d,%d) new(%d,%d,%d)' % (tag,ob,op,sq,nb,np2,ns))
        errors.append(tag)
    else:
        print('OK %s old=(%d,%d,%d)' % (tag,ob,op,sq))

# ══════════════════════════════════════════════════════════════════════
# A. Fix project names in j array + add 4 members
# ══════════════════════════════════════════════════════════════════════
OLD_J = (
    'j=[{id:"tm-001",name:"Anita Desai",role:"Team Lead",dept:"Engineering",'
    'email:"anita.d@company.com",phone:"+91 98100 11111",joinDate:"Jan 2021",'
    'avatar:"https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"present",tasks:5,completedTasks:3,attendance:95,efficiency:91,onTimeRate:88,'
    'leaveBalance:{annual:15,remaining:9,sick:5,sickUsed:1},'
    'history:["present","present","present","wfh","present","leave","present"],'
    'shift:"morning",projects:["HR Module","ERP System"],'
    'expertise:["React","Node.js","Team Lead"],'
    'assignments:[{name:"Q2 Appraisal Review",status:"in-progress",progress:60},'
    '{name:"Sprint Planning",status:"done",progress:100},'
    '{name:"Onboarding Docs",status:"pending",progress:10}]},'
    '{id:"tm-002",name:"Raj Kumar",role:"Developer",dept:"Engineering",'
    'email:"raj.k@company.com",phone:"+91 98100 22222",joinDate:"Mar 2022",'
    'avatar:"https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"present",tasks:8,completedTasks:5,attendance:88,efficiency:80,onTimeRate:83,'
    'leaveBalance:{annual:15,remaining:12,sick:6,sickUsed:0},'
    'history:["present","absent","present","present","wfh","present","present"],'
    'shift:"morning",projects:["ERP System","Office Relocation"],'
    'expertise:["Java","Spring Boot","MySQL"],'
    'assignments:[{name:"API Integration",status:"in-progress",progress:55},'
    '{name:"DB Optimisation",status:"pending",progress:0},'
    '{name:"Unit Tests",status:"done",progress:100},'
    '{name:"Code Review",status:"in-progress",progress:40}]},'
    '{id:"tm-003",name:"Priya Singh",role:"Designer",dept:"Design",'
    'email:"priya.s@company.com",phone:"+91 98100 33333",joinDate:"Jun 2022",'
    'avatar:"https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"on-leave",tasks:3,completedTasks:2,attendance:92,efficiency:94,onTimeRate:96,'
    'leaveBalance:{annual:15,remaining:6,sick:6,sickUsed:3},'
    'history:["present","leave","leave","leave","leave","present","present"],'
    'shift:"evening",projects:["HR Module"],'
    'expertise:["Figma","UI/UX","Branding"],'
    'assignments:[{name:"Design System v2",status:"done",progress:100},'
    '{name:"Mobile Wireframes",status:"in-progress",progress:70}]},'
    '{id:"tm-004",name:"Marcus Rivera",role:"Manager",dept:"Operations",'
    'email:"marcus.r@company.com",phone:"+91 98100 44444",joinDate:"Aug 2019",'
    'avatar:"https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"present",tasks:4,completedTasks:4,attendance:98,efficiency:97,onTimeRate:99,'
    'leaveBalance:{annual:20,remaining:16,sick:8,sickUsed:0},'
    'history:["present","present","present","present","present","present","present"],'
    'shift:"morning",projects:["HR Module","ERP System","Office Relocation"],'
    'expertise:["Strategy","OKRs","Agile"],'
    'assignments:[{name:"Q2 Goals Review",status:"done",progress:100},'
    '{name:"Budget Planning",status:"in-progress",progress:80}]}]'
)

NEW_J = (
    'j=[{id:"tm-001",name:"Anita Desai",role:"Team Lead",dept:"Engineering",'
    'email:"anita.d@company.com",phone:"+91 98100 11111",joinDate:"Jan 2021",'
    'avatar:"https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"present",tasks:5,completedTasks:3,attendance:95,efficiency:91,onTimeRate:88,'
    'leaveBalance:{annual:15,remaining:9,sick:5,sickUsed:1},'
    'history:["present","present","present","wfh","present","leave","present"],'
    'shift:"morning",projects:["HR Orbit Development","Activity Orbit Platform"],'
    'expertise:["React","Node.js","Team Lead"],'
    'assignments:[{name:"Q2 Appraisal Review",status:"in-progress",progress:60},'
    '{name:"Sprint Planning",status:"done",progress:100},'
    '{name:"Onboarding Docs",status:"pending",progress:10}]},'
    '{id:"tm-002",name:"Raj Kumar",role:"Developer",dept:"Engineering",'
    'email:"raj.k@company.com",phone:"+91 98100 22222",joinDate:"Mar 2022",'
    'avatar:"https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"present",tasks:8,completedTasks:5,attendance:88,efficiency:80,onTimeRate:83,'
    'leaveBalance:{annual:15,remaining:12,sick:6,sickUsed:0},'
    'history:["present","absent","present","present","wfh","present","present"],'
    'shift:"morning",projects:["Activity Orbit Platform","Office Relocation Project"],'
    'expertise:["Java","Spring Boot","MySQL"],'
    'assignments:[{name:"API Integration",status:"in-progress",progress:55},'
    '{name:"DB Optimisation",status:"pending",progress:0},'
    '{name:"Unit Tests",status:"done",progress:100},'
    '{name:"Code Review",status:"in-progress",progress:40}]},'
    '{id:"tm-003",name:"Priya Singh",role:"Designer",dept:"Design",'
    'email:"priya.s@company.com",phone:"+91 98100 33333",joinDate:"Jun 2022",'
    'avatar:"https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"on-leave",tasks:3,completedTasks:2,attendance:92,efficiency:94,onTimeRate:96,'
    'leaveBalance:{annual:15,remaining:6,sick:6,sickUsed:3},'
    'history:["present","leave","leave","leave","leave","present","present"],'
    'shift:"evening",projects:["HR Orbit Development","Productivity Suite"],'
    'expertise:["Figma","UI/UX","Branding"],'
    'assignments:[{name:"Design System v2",status:"done",progress:100},'
    '{name:"Mobile Wireframes",status:"in-progress",progress:70}]},'
    '{id:"tm-004",name:"Marcus Rivera",role:"Manager",dept:"Operations",'
    'email:"marcus.r@company.com",phone:"+91 98100 44444",joinDate:"Aug 2019",'
    'avatar:"https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"present",tasks:4,completedTasks:4,attendance:98,efficiency:97,onTimeRate:99,'
    'leaveBalance:{annual:20,remaining:16,sick:8,sickUsed:0},'
    'history:["present","present","present","present","present","present","present"],'
    'shift:"morning",projects:["HR Orbit Development","Activity Orbit Platform","Office Relocation Project"],'
    'expertise:["Strategy","OKRs","Agile"],'
    'assignments:[{name:"Q2 Goals Review",status:"done",progress:100},'
    '{name:"Budget Planning",status:"in-progress",progress:80}]},'
    # 4 new members
    '{id:"tm-005",name:"Sneha Mehta",role:"Product Manager",dept:"Product",'
    'email:"sneha.m@company.com",phone:"+91 98100 55555",joinDate:"Feb 2023",'
    'avatar:"https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"present",tasks:6,completedTasks:4,attendance:90,efficiency:87,onTimeRate:92,'
    'leaveBalance:{annual:15,remaining:10,sick:5,sickUsed:1},'
    'history:["present","present","wfh","present","present","present","wfh"],'
    'shift:"morning",projects:["Productivity Suite","Activity Orbit Platform"],'
    'expertise:["Roadmapping","Agile","Stakeholder Mgmt"],'
    'assignments:[{name:"Feature Roadmap Q3",status:"in-progress",progress:50},'
    '{name:"User Research",status:"done",progress:100}]},'
    '{id:"tm-006",name:"Arjun Kapoor",role:"Backend Developer",dept:"Engineering",'
    'email:"arjun.k@company.com",phone:"+91 98100 66666",joinDate:"May 2023",'
    'avatar:"https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"wfh",tasks:7,completedTasks:3,attendance:85,efficiency:78,onTimeRate:80,'
    'leaveBalance:{annual:15,remaining:13,sick:6,sickUsed:0},'
    'history:["wfh","wfh","present","wfh","present","wfh","present"],'
    'shift:"morning",projects:["Activity Orbit Platform","Cost Control System"],'
    'expertise:["Python","Django","PostgreSQL"],'
    'assignments:[{name:"Payment Gateway",status:"in-progress",progress:45},'
    '{name:"Auth Module",status:"done",progress:100},'
    '{name:"Reporting API",status:"pending",progress:0}]},'
    '{id:"tm-007",name:"Kavya Reddy",role:"UI Designer",dept:"Design",'
    'email:"kavya.r@company.com",phone:"+91 98100 77777",joinDate:"Aug 2023",'
    'avatar:"https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"present",tasks:4,completedTasks:3,attendance:93,efficiency:89,onTimeRate:91,'
    'leaveBalance:{annual:15,remaining:11,sick:5,sickUsed:2},'
    'history:["present","present","present","leave","present","present","present"],'
    'shift:"morning",projects:["Productivity Suite","Cost Control System"],'
    'expertise:["Figma","Adobe XD","Prototyping"],'
    'assignments:[{name:"Dashboard Redesign",status:"in-progress",progress:75},'
    '{name:"Icon Library",status:"done",progress:100}]},'
    '{id:"tm-008",name:"Rohit Sharma",role:"DevOps Engineer",dept:"Engineering",'
    'email:"rohit.s@company.com",phone:"+91 98100 88888",joinDate:"Nov 2022",'
    'avatar:"https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:"present",tasks:5,completedTasks:5,attendance:96,efficiency:93,onTimeRate:95,'
    'leaveBalance:{annual:15,remaining:14,sick:6,sickUsed:0},'
    'history:["present","present","present","present","wfh","present","present"],'
    'shift:"morning",projects:["Cost Control System","Office Relocation Project"],'
    'expertise:["Docker","Kubernetes","CI/CD"],'
    'assignments:[{name:"CI Pipeline Setup",status:"done",progress:100},'
    '{name:"K8s Migration",status:"in-progress",progress:60}]}]'
)

chk_pair(OLD_J, NEW_J, 'J_ARRAY')
if OLD_J in content:
    content = content.replace(OLD_J, NEW_J, 1)
    print('A j array replaced: OK')
else:
    errors.append('A'); print('A: FAIL not found')

# ══════════════════════════════════════════════════════════════════════
# B. Add _addMOpen + _addMForm state + _jAll computed value in Bm
# ══════════════════════════════════════════════════════════════════════
OLD_STATE = 'const[_mhSelProj,_mhSetSelProj]=b.useState(null);'
NEW_STATE = (
    'const[_mhSelProj,_mhSetSelProj]=b.useState(null);'
    'const[_addMOpen,_setAddMOpen]=b.useState(false);'
    'const[_addMForm,_setAddMForm]=b.useState({name:"",role:"",dept:"Engineering",proj:"",status:"present"});'
)

if OLD_STATE in content:
    content = content.replace(OLD_STATE, NEW_STATE, 1)
    print('B1 state vars: OK')
else:
    errors.append('B1'); print('B1: FAIL')

# Add _jAll = j.concat(_mhTeam) right before return statement in Bm
OLD_RETURN = 'b.useEffect(()=>{return ()=>{ui("team")};},[]);'
NEW_RETURN = 'b.useEffect(()=>{return ()=>{ui("team")};},[]);const _jAll=j.concat(_mhTeam);'

if OLD_RETURN in content:
    content = content.replace(OLD_RETURN, NEW_RETURN, 1)
    print('B2 _jAll computed: OK')
else:
    errors.append('B2'); print('B2: FAIL')

# ══════════════════════════════════════════════════════════════════════
# C. Fix back button: Ui (Activity) → ke (ChevronLeft)
# ══════════════════════════════════════════════════════════════════════
OLD_BTN = (
    'e.jsx("button",{onClick:()=>_mhSetView("main"),style:{background:"none",'
    'border:"none",padding:"0 8px 0 0",cursor:"pointer",display:"flex",'
    'alignItems:"center",color:"#374151"},'
    'children:e.jsx(Ui,{size:22,style:{color:"#111827"}})})'
)
NEW_BTN = (
    'e.jsx("button",{onClick:()=>_mhSetView("main"),style:{background:"none",'
    'border:"none",padding:"0 8px 0 0",cursor:"pointer",display:"flex",'
    'alignItems:"center",color:"#374151"},'
    'children:e.jsx(ke,{size:22,style:{color:"#111827"}})})'
)

if OLD_BTN in content:
    content = content.replace(OLD_BTN, NEW_BTN, 1)
    print('C back button icon: OK')
else:
    errors.append('C'); print('C: FAIL')

# ══════════════════════════════════════════════════════════════════════
# D. Replace j.filter/slice in team sections with _jAll
# ══════════════════════════════════════════════════════════════════════
# D1: team tab il.map
OLD_D1 = 'var _mems=j.filter(function(h){return h.projects&&h.projects.indexOf(proj.name)>=0;});'
NEW_D1 = 'var _mems=_jAll.filter(function(h){return h.projects&&h.projects.indexOf(proj.name)>=0;});'
if OLD_D1 in content:
    content = content.replace(OLD_D1, NEW_D1, 1)
    print('D1 team tab j→_jAll: OK')
else:
    errors.append('D1'); print('D1: FAIL')

# D2: proj-team view (5 occurrences - all use _mhSelProj.name)
OLD_D2 = 'j.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0'
NEW_D2 = '_jAll.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0'
count_d2 = content.count(OLD_D2)
if count_d2 > 0:
    content = content.replace(OLD_D2, NEW_D2)
    print(f'D2 proj-team j→_jAll: OK ({count_d2} replacements)')
else:
    errors.append('D2'); print('D2: FAIL')

# D3: leave-all view
OLD_D3 = 'j.slice().sort(function(a,b){var ra=a.leaveBalance'
NEW_D3 = '_jAll.slice().sort(function(a,b){var ra=a.leaveBalance'
if OLD_D3 in content:
    content = content.replace(OLD_D3, NEW_D3, 1)
    print('D3 leave-all j→_jAll: OK')
else:
    errors.append('D3'); print('D3: FAIL')

# D4: efficiency-all view
OLD_D4 = 'j.slice().sort(function(a,b){return (b.efficiency||80)-(a.efficiency||80)'
NEW_D4 = '_jAll.slice().sort(function(a,b){return (b.efficiency||80)-(a.efficiency||80)'
if OLD_D4 in content:
    content = content.replace(OLD_D4, NEW_D4, 1)
    print('D4 efficiency-all j→_jAll: OK')
else:
    errors.append('D4'); print('D4: FAIL')

# ══════════════════════════════════════════════════════════════════════
# E. Add onClick to Add Member button
# ══════════════════════════════════════════════════════════════════════
OLD_ADDBTN = (
    'e.jsxs("button",{style:{display:"flex",alignItems:"center",justifyContent:"center",gap:6,'
    'background:"#1a56db",color:"#fff",border:"none",borderRadius:10,padding:"10px 0",'
    'fontSize:12,fontWeight:600,cursor:"pointer",width:"100%"},children:['
    'e.jsx("span",{style:{fontSize:16,lineHeight:1},children:"+"}),'
    'e.jsx("span",{children:"Add Member"})]})'
)
NEW_ADDBTN = (
    'e.jsxs("button",{onClick:function(){_setAddMOpen(true);_setAddMForm({name:"",role:"",dept:"Engineering",proj:_mhSelProj?_mhSelProj.name:"",status:"present"});}'
    ',style:{display:"flex",alignItems:"center",justifyContent:"center",gap:6,'
    'background:"#1a56db",color:"#fff",border:"none",borderRadius:10,padding:"10px 0",'
    'fontSize:12,fontWeight:600,cursor:"pointer",width:"100%"},children:['
    'e.jsx("span",{style:{fontSize:16,lineHeight:1},children:"+"}),'
    'e.jsx("span",{children:"Add Member"})]})'
)

chk_pair(OLD_ADDBTN, NEW_ADDBTN, 'ADDBTN')
if OLD_ADDBTN in content:
    content = content.replace(OLD_ADDBTN, NEW_ADDBTN, 1)
    print('E add member onClick: OK')
else:
    errors.append('E'); print('E: FAIL')

# ══════════════════════════════════════════════════════════════════════
# F. Add modal as last child of screen div (before ]})}function Wm)
# ══════════════════════════════════════════════════════════════════════
# The screen div ends with: ...%complete"]})]},h.id))})]})]})]})}function Wm
OLD_SCREEN_END = (
    ']},h.id))})]})]})]})}function Wm'
)

MODAL_JSX = (
    '_addMOpen&&e.jsx("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",'
    'zIndex:300,display:"flex",flexDirection:"column",justifyContent:"flex-end"},'
    'onClick:function(ev){if(ev.target===ev.currentTarget)_setAddMOpen(false);},'
    'children:e.jsxs("div",{style:{background:"#fff",borderRadius:"16px 16px 0 0",'
    'padding:"20px 16px 40px",maxHeight:"90vh",overflowY:"auto"},'
    'children:['
    # header
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20},children:['
    'e.jsx("h2",{style:{fontSize:16,fontWeight:700,color:"#111827"},children:"Add Member"}),'
    'e.jsx("button",{onClick:function(){_setAddMOpen(false);},style:{background:"none",border:"none",'
    'fontSize:20,cursor:"pointer",color:"#6b7280",padding:4},children:"×"})'
    ']}),'
    # Name
    'e.jsxs("div",{style:{marginBottom:14},children:['
    'e.jsx("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4},children:"Full Name *"}),'
    'e.jsx("input",{type:"text",value:_addMForm.name,placeholder:"e.g. Rahul Gupta",'
    'onChange:function(ev){_setAddMForm(function(p){return Object.assign({},p,{name:ev.target.value});});},'
    'style:{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"9px 12px",'
    'fontSize:13,outline:"none",boxSizing:"border-box"}})'
    ']}),'
    # Role
    'e.jsxs("div",{style:{marginBottom:14},children:['
    'e.jsx("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4},children:"Role *"}),'
    'e.jsx("input",{type:"text",value:_addMForm.role,placeholder:"e.g. Frontend Developer",'
    'onChange:function(ev){_setAddMForm(function(p){return Object.assign({},p,{role:ev.target.value});});},'
    'style:{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"9px 12px",'
    'fontSize:13,outline:"none",boxSizing:"border-box"}})'
    ']}),'
    # Dept
    'e.jsxs("div",{style:{marginBottom:14},children:['
    'e.jsx("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4},children:"Department"}),'
    'e.jsx("select",{value:_addMForm.dept,'
    'onChange:function(ev){_setAddMForm(function(p){return Object.assign({},p,{dept:ev.target.value});});},'
    'style:{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"9px 12px",'
    'fontSize:13,outline:"none",boxSizing:"border-box",background:"#fff"},children:['
    'e.jsx("option",{value:"Engineering",children:"Engineering"}),'
    'e.jsx("option",{value:"Design",children:"Design"}),'
    'e.jsx("option",{value:"Product",children:"Product"}),'
    'e.jsx("option",{value:"Operations",children:"Operations"}),'
    'e.jsx("option",{value:"QA",children:"QA"}),'
    'e.jsx("option",{value:"Marketing",children:"Marketing"})'
    ']})'
    ']}),'
    # Project
    'e.jsxs("div",{style:{marginBottom:14},children:['
    'e.jsx("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4},children:"Project"}),'
    'e.jsx("select",{value:_addMForm.proj,'
    'onChange:function(ev){_setAddMForm(function(p){return Object.assign({},p,{proj:ev.target.value});});},'
    'style:{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"9px 12px",'
    'fontSize:13,outline:"none",boxSizing:"border-box",background:"#fff"},children:'
    'il.map(function(pr){return e.jsx("option",{value:pr.name,children:pr.name},pr.id);})'
    '})'
    ']}),'
    # Status
    'e.jsxs("div",{style:{marginBottom:24},children:['
    'e.jsx("label",{style:{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4},children:"Status"}),'
    'e.jsx("select",{value:_addMForm.status,'
    'onChange:function(ev){_setAddMForm(function(p){return Object.assign({},p,{status:ev.target.value});});},'
    'style:{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"9px 12px",'
    'fontSize:13,outline:"none",boxSizing:"border-box",background:"#fff"},children:['
    'e.jsx("option",{value:"present",children:"Present"}),'
    'e.jsx("option",{value:"wfh",children:"Work From Home"}),'
    'e.jsx("option",{value:"on-leave",children:"On Leave"}),'
    'e.jsx("option",{value:"absent",children:"Absent"})'
    ']})'
    ']}),'
    # Submit button
    'e.jsx("button",{onClick:function(){'
    'if(!_addMForm.name.trim()||!_addMForm.role.trim())return;'
    'var _newId="tm-"+Date.now();'
    'var _newMem={id:_newId,name:_addMForm.name.trim(),role:_addMForm.role.trim(),'
    'dept:_addMForm.dept,email:"",phone:"",joinDate:"Jun 2026",'
    'avatar:"https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150",'
    'status:_addMForm.status,tasks:0,completedTasks:0,attendance:0,efficiency:0,onTimeRate:0,'
    'leaveBalance:{annual:15,remaining:15,sick:6,sickUsed:0},'
    'history:["present","present","present","present","present","present","present"],'
    'shift:"morning",projects:_addMForm.proj?[_addMForm.proj]:[],'
    'expertise:[_addMForm.role],assignments:[]};'
    '_mhSetTeam(function(prev){return prev.concat([_newMem]);});'
    '_setAddMOpen(false);'
    '},style:{width:"100%",background:_addMForm.name.trim()&&_addMForm.role.trim()?"#1a56db":"#93c5fd",'
    'color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontSize:14,'
    'fontWeight:700,cursor:_addMForm.name.trim()&&_addMForm.role.trim()?"pointer":"default"},'
    'children:"Add Member"})'
    ']})})'
)

print('F MODAL_JSX balance check:')
ob = MODAL_JSX.count('{') - MODAL_JSX.count('}')
op = MODAL_JSX.count('(') - MODAL_JSX.count(')')
sq = MODAL_JSX.count('[') - MODAL_JSX.count(']')
print('  ob=%d op=%d sq=%d' % (ob, op, sq))
if ob or op or sq:
    errors.append('F-modal-balance')

# Insert modal as last child of screen div (before screen children ']' at wm_i-3)
wm_i = content.find('}function Wm')
if wm_i < 0:
    errors.append('F'); print('F: FAIL - function Wm not found')
elif content[wm_i-3] != ']' or content[wm_i-2] != '}' or content[wm_i-1] != ')':
    errors.append('F'); print('F: FAIL unexpected chars near Wm:', repr(content[wm_i-5:wm_i+1]))
else:
    content = content[:wm_i-3] + ',' + MODAL_JSX + content[wm_i-3:]
    print('F modal inserted at screen level: OK')

# ══════════════════════════════════════════════════════════════════════
# Validate
# ══════════════════════════════════════════════════════════════════════
print()
if errors:
    print('FAILED:', errors)
else:
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    with open('/tmp/chk_tdyn.js', 'w') as f2:
        f2.write(scripts[0])
    r = subprocess.run(
        ['node', '-e',
         'try{new Function(require("fs").readFileSync("/tmp/chk_tdyn.js","utf8"));'
         'process.stdout.write("OK");}catch(e){process.stdout.write("ERR:"+e.message);}'],
        capture_output=True, text=True)
    print('Node check:', r.stdout)
    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    sq = content.count('[') - content.count(']')
    print('File delta: ob=%d op=%d sq=%d' % (ob, op, sq))
    if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f2:
            f2.write(content)
        print('Done.')
    else:
        print('NOT written.')
        if r.stdout != 'OK':
            print('Node error:', r.stdout[:500])
