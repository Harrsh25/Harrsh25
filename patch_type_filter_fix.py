#!/usr/bin/env python3
"""
Move Type section INSIDE the scrollable div of the filter panel so it's visible.

Current (broken) structure:
  e.jsx("div",{style:{flex:1,overflowY:"auto"},
    children: e.jsxs("div",{...Assignee...})   <- single child, scrollable ends here
  }),
  e.jsxs("div",{...Type...}),                  <- OUTSIDE scrollable = invisible

Fixed structure:
  e.jsx("div",{style:{flex:1,overflowY:"auto"},
    children: [
      e.jsxs("div",{...Assignee...}),
      e.jsxs("div",{...Type...})               <- inside scrollable = visible
    ]
  }),
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

OLD = content[634722:636488]

NEW = OLD
# Change 1: wrap children in array by adding '[' before Assignee div
NEW = NEW.replace(
    'children:e.jsxs("div",{style:{borderBottom:"1px solid #f0f1f4"},children:[e.jsx("span",{style:{display:"block",padding:"13px 16px",fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Assignee"',
    'children:[e.jsxs("div",{style:{borderBottom:"1px solid #f0f1f4"},children:[e.jsx("span",{style:{display:"block",padding:"13px 16px",fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Assignee"',
    1
)
# Change 2: remove the premature scrollable-div close '})' (keep AssigneeDiv close ]}) intact)
#   OLD boundary: '})}),e.jsxs(..."Type"'  => removes '})' that closed scrollable div early
#   NEW boundary: ']})  ,e.jsxs(..."Type"' => keeps AssigneeDiv close only
NEW = NEW.replace(
    ']})}),e.jsxs("div",{style:{borderBottom:"1px solid #f0f1f4"},children:[e.jsx("span",{style:{display:"block",padding:"13px 16px",fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Type"',
    ']})  ,e.jsxs("div",{style:{borderBottom:"1px solid #f0f1f4"},children:[e.jsx("span",{style:{display:"block",padding:"13px 16px",fontSize:13,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"},children:"Type"',
    1
)
# Change 3: close children array + scrollable div after TypeDiv
NEW = NEW + ']})'

if NEW != OLD and OLD in content:
    content = content.replace(OLD, NEW, 1)
    print('P1 Type section moved inside scrollable: OK')
else:
    errors.append('P1')
    print('P1 Type section fix: FAIL')

# Verify & write
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
