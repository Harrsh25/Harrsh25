#!/usr/bin/env python3
"""
Remove the "Tower Schedule Manager" (dp6) project card and all its related
data from every data structure in the app.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Short project list entry (used in project selector / overview list)
# ──────────────────────────────────────────────────────────────────────────────
OLD1 = ',{id:"dp6",name:"Tower Schedule Manager",code:"TSM-006",status:"in-progress",hasSubProjects:!0}'
if OLD1 in content:
    content = content.replace(OLD1, '', 1)
    print('P1 short list entry: OK')
else:
    errors.append('P1'); print('P1 short list entry: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Full project details entry (with sub-projects)
# ──────────────────────────────────────────────────────────────────────────────
OLD2 = (',{id:"dp6",name:"Tower Schedule Manager",code:"TSM-006",status:"in-progress",'
        'progress:48,budget:95e4,spent:456e3,startDate:"2026-01-01",endDate:"2026-08-31",'
        'ownerName:"Harsh",client:"Operations",team:[{name:"Harsh"},{name:"Prem Sir"},{name:"Vaibhav"}],'
        'subProjects:[{id:"dp6-s1",name:"Schedule Planning Module",status:"completed",progress:100,'
        'ownerName:"Prem Sir",startDate:"2026-01-01",endDate:"2026-03-31",budget:2e5,spent:195e3,'
        'code:"TSM-006-A",team:[],client:"",description:"Tower schedule planning and optimization"},'
        '{id:"dp6-s2",name:"Resource Allocation Engine",status:"completed",progress:100,'
        'ownerName:"Vaibhav",startDate:"2026-02-01",endDate:"2026-04-30",budget:25e4,spent:248e3,'
        'code:"TSM-006-B",team:[],client:"",description:"Resource planning and conflict resolution"},'
        '{id:"dp6-s3",name:"Progress Tracking Dashboard",status:"in-progress",progress:60,'
        'ownerName:"Harsh",startDate:"2026-03-01",endDate:"2026-06-30",budget:3e5,spent:18e4,'
        'code:"TSM-006-C",team:[],client:"",description:"Real-time progress monitoring dashboard"},'
        '{id:"dp6-s4",name:"Reports & Export Module",status:"planning",progress:0,'
        'ownerName:"Prem Sir",startDate:"2026-05-01",endDate:"2026-08-31",budget:2e5,spent:0,'
        'code:"TSM-006-D",team:[],client:"",description:"Automated report generation and data export"}]}]')
if OLD2 in content:
    content = content.replace(OLD2, ']', 1)
    print('P2 full details entry: OK')
else:
    errors.append('P2'); print('P2 full details entry: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P3 – Sub-projects map entry
# ──────────────────────────────────────────────────────────────────────────────
OLD3 = ',"dp6":[{id:"dp6-s1",name:"Tower Foundation"},{id:"dp6-s2",name:"Electrical Works"},{id:"dp6-s3",name:"Civil Works"}]'
if OLD3 in content:
    content = content.replace(OLD3, '', 1)
    print('P3 sub-projects map: OK')
else:
    errors.append('P3'); print('P3 sub-projects map: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P4 – Document features map entry (first occurrence)
# ──────────────────────────────────────────────────────────────────────────────
OLD4 = ',dp6:["Schedule Planning Module","Resource Allocation Engine","Progress Tracking Dashboard","Reports & Export Module"]}[U.id]'
if OLD4 in content:
    content = content.replace(OLD4, '}[U.id]', 1)
    print('P4 doc features map (first): OK')
else:
    errors.append('P4'); print('P4 doc features map (first): FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P5 – Document features map entry (second occurrence)
# ──────────────────────────────────────────────────────────────────────────────
OLD5 = ',dp6:["Schedule Planning Module","Resource Allocation Engine","Progress Tracking Dashboard","Reports & Export Module"]}[g.id]'
if OLD5 in content:
    content = content.replace(OLD5, '}[g.id]', 1)
    print('P5 doc features map (second): OK')
else:
    errors.append('P5'); print('P5 doc features map (second): FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P6 – Document d7 (Tower Foundation Permit, dp6)
# ──────────────────────────────────────────────────────────────────────────────
OLD6 = (',{id:"d7",projId:"dp6",subId:"dp6-s1",title:"Tower Foundation Permit",'
        'path:"Tower Foundation > Compliance",date:"2026-04-05",type:"Permit",'
        'status:"Active",docTab:"official",taskType:"Activity"}')
if OLD6 in content:
    content = content.replace(OLD6, '', 1)
    print('P6 doc d7: OK')
else:
    errors.append('P6'); print('P6 doc d7: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P7 – Document d8 (Electrical Safety Checklist, dp6)
# ──────────────────────────────────────────────────────────────────────────────
OLD7 = (',{id:"d8",projId:"dp6",subId:"dp6-s2",title:"Electrical Safety Checklist",'
        'path:"Electrical Works > Safety Audit",date:"2026-04-18",type:"Checklist",'
        'status:"Active",docTab:"official",taskType:"Sub-Task"}')
if OLD7 in content:
    content = content.replace(OLD7, '', 1)
    print('P7 doc d8: OK')
else:
    errors.append('P7'); print('P7 doc d8: FAIL')

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
