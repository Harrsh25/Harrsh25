#!/usr/bin/env python3
"""
1. Timesheet: add search bar to filter row + wire it into _filtered
2. Home page: fix project filter button visibility (white-on-white → #f9fafb bg)
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# 1 – TIMESHEET: add _tsSearch state
# ══════════════════════════════════════════════════════════════════════════════
OLD_ST = 'const[_tsDd,_setTsDd]=b.useState(!1)'
NEW_ST = 'const[_tsDd,_setTsDd]=b.useState(!1);const[_tsSearch,_setTsSearch]=b.useState("")'
if OLD_ST in content:
    content = content.replace(OLD_ST, NEW_ST, 1)
    print('TS1 _tsSearch state: OK')
else:
    errors.append('TS1'); print('TS1: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# 2 – TIMESHEET: insert search input before the Filters button in the row
# ══════════════════════════════════════════════════════════════════════════════
SEARCH_INPUT = (
    'e.jsxs("div",{style:{position:"relative",flex:1,minWidth:0},children:['
    'e.jsx(Ha,{style:{width:13,height:13,position:"absolute",left:10,top:"50%",'
    'transform:"translateY(-50%)",color:"#9ca3af"}}),'
    'e.jsx("input",{value:_tsSearch,'
    'onChange:function(ev){_setTsSearch(ev.target.value);},'
    'placeholder:"Search timesheets…",'
    'style:{width:"100%",padding:"7px 10px 7px 30px",'
    'border:"1px solid #e5e7eb",borderRadius:10,'
    'fontSize:12,fontFamily:"Inter,sans-serif",'
    'outline:"none",color:"#111827",background:"#fff",'
    'boxSizing:"border-box"}})'
    ']}),'
)

OLD_BTN = ',e.jsxs("button",{onClick:function(){_setShowFilter(true)}'
NEW_BTN = ',' + SEARCH_INPUT + 'e.jsxs("button",{onClick:function(){_setShowFilter(true)}'

idx = content.find(OLD_BTN, 718000, 725000)
if idx != -1:
    content = content.replace(OLD_BTN, NEW_BTN, 1)
    print('TS2 search input inserted: OK')
else:
    errors.append('TS2'); print('TS2: FAIL idx=%d' % idx)

# ══════════════════════════════════════════════════════════════════════════════
# 3 – TIMESHEET: wire _tsSearch into _filtered
# ══════════════════════════════════════════════════════════════════════════════
OLD_FL = ('if(_filterStatus.length&&!_filterStatus.includes(d.approvalStatus))'
          'return false;return true;')
NEW_FL = ('if(_filterStatus.length&&!_filterStatus.includes(d.approvalStatus))'
          'return false;'
          'if(_tsSearch&&!d.name.toLowerCase().includes(_tsSearch.toLowerCase()))'
          'return false;return true;')
if OLD_FL in content:
    content = content.replace(OLD_FL, NEW_FL, 1)
    print('TS3 search filter: OK')
else:
    errors.append('TS3'); print('TS3: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# 4 – HOME PAGE: make project filter button visible (white → light gray bg)
# ══════════════════════════════════════════════════════════════════════════════
OLD_BG = ('background:_dsF!=="all"?"#EFF4FF":"#fff",'
          'color:_dsF!=="all"?"#1a56db":"#6b7280",'
          'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",'
          'cursor:"pointer",maxWidth:160,minWidth:50,whiteSpace:"nowrap"')
NEW_BG = ('background:_dsF!=="all"?"#EFF4FF":"#f3f4f6",'
          'color:_dsF!=="all"?"#1a56db":"#374151",'
          'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",'
          'cursor:"pointer",maxWidth:160,minWidth:50,whiteSpace:"nowrap"')
if OLD_BG in content:
    content = content.replace(OLD_BG, NEW_BG, 1)
    print('HP4 button visibility: OK')
else:
    errors.append('HP4'); print('HP4: FAIL')

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
