#!/usr/bin/env python3
"""
P1 – Add 2 more critical WBS Activities (endDate 2026-08-01 = cp_ed)
     so the Critical Path view shows 3 critical entities instead of 1.
P2 – Remove the + FAB button from the Projects page bottom area.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Add 2 root-level Activities with endDate 2026-08-01 (same as cp_ed)
#       IDs w087–w092; appended at the end of the rl[] WBS array.
# ──────────────────────────────────────────────────────────────────────────────
OLD1 = ('{id:"w086",name:"Daily Standup Notes",type:"Sub-Task",'
        'parentId:"w084",assignee:"Vaibhav",startDate:"2026-05-21",'
        'endDate:"2026-05-21",progress:80,status:"in-progress",'
        'scope:"",children:[]}]')

NEW_ITEMS = (
    # Activity 1: Budget Review & Approval
    ',{id:"w087",name:"Budget Review & Approval",type:"Activity",'
    'parentId:void 0,assignee:"Harsh",startDate:"2026-04-15",'
    'endDate:"2026-08-01",progress:30,status:"in-progress",'
    'scope:"",children:[]}'
    ',{id:"w088",name:"Financial Audit",type:"Task",'
    'parentId:"w087",assignee:"Prem Sir",startDate:"2026-04-15",'
    'endDate:"2026-06-30",progress:50,status:"in-progress",'
    'scope:"",children:[]}'
    ',{id:"w089",name:"Final Sign-off",type:"Sub-Task",'
    'parentId:"w087",assignee:"Harsh",startDate:"2026-07-01",'
    'endDate:"2026-08-01",progress:0,status:"to-do",'
    'scope:"",children:[]}'
    # Activity 2: System Integration Testing
    ',{id:"w090",name:"System Integration Testing",type:"Activity",'
    'parentId:void 0,assignee:"Vaibhav",startDate:"2026-05-01",'
    'endDate:"2026-08-01",progress:20,status:"in-progress",'
    'scope:"",children:[]}'
    ',{id:"w091",name:"UAT Testing",type:"Task",'
    'parentId:"w090",assignee:"Shweta",startDate:"2026-05-01",'
    'endDate:"2026-07-15",progress:35,status:"in-progress",'
    'scope:"",children:[]}'
    ',{id:"w092",name:"Test Report Submission",type:"Sub-Task",'
    'parentId:"w091",assignee:"Vaibhav",startDate:"2026-07-15",'
    'endDate:"2026-08-01",progress:0,status:"to-do",'
    'scope:"",children:[]}'
)

NEW1 = ('{id:"w086",name:"Daily Standup Notes",type:"Sub-Task",'
         'parentId:"w084",assignee:"Vaibhav",startDate:"2026-05-21",'
         'endDate:"2026-05-21",progress:80,status:"in-progress",'
         'scope:"",children:[]}' + NEW_ITEMS + ']')

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 new critical activities added: OK')
else:
    errors.append('P1'); print('P1 new WBS items: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Remove the + FAB button from the Projects page
# ──────────────────────────────────────────────────────────────────────────────
OLD2 = (',e.jsx("div",{style:{position:"fixed",bottom:82,left:"50%",'
        'transform:"translateX(-50%)",width:"min(100vw,448px)",maxWidth:448,'
        'pointerEvents:"none",display:"flex",justifyContent:"flex-end",'
        'paddingRight:20,zIndex:50},children:e.jsx("button",{type:"button",'
        'onClick:()=>p(!0),style:{pointerEvents:"auto",width:54,height:54,'
        'borderRadius:"50%",background:"#1a56db",border:"none",cursor:"pointer",'
        'display:"flex",alignItems:"center",justifyContent:"center",'
        'boxShadow:"0 4px 20px rgba(26,86,219,0.45)"},'
        'children:e.jsx("span",{style:{color:"#fff",fontSize:28,lineHeight:1,'
        'fontWeight:300,marginTop:-2},children:"+"})})})')
if OLD2 in content:
    content = content.replace(OLD2, '', 1)
    print('P2 FAB button removed: OK')
else:
    errors.append('P2'); print('P2 FAB button: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
print()
if errors:
    print('FAILED:', errors)
else:
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    with open('/tmp/chk.js', 'w') as f:
        f.write(scripts[0])
    r = subprocess.run(
        ['node', '-e',
         'try{new Function(require("fs").readFileSync("/tmp/chk.js","utf8"));'
         'process.stdout.write("OK");}catch(e){process.stdout.write("ERR:"+e.message);}'],
        capture_output=True, text=True
    )
    print('Node check:', r.stdout)

    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    sq = content.count('[') - content.count(']')
    print('{ delta:', ob, ' ( delta:', op, ' [ delta:', sq)

    if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
