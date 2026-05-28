#!/usr/bin/env python3
"""
Timesheet header: Row1 = back+title + project filter + Create
                  Row2 = search bar + Filters button (like original)
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ── locate current header boundaries ────────────────────────────────────────
OLD_H_START = 'children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:10}'
si = content.find(OLD_H_START, 715800, 716000)
ei = content.find(']}),e.jsx("div",{style:{flex:1,overflowY', 721000, 723000)

if si == -1 or ei == -1:
    errors.append('find'); print('FAIL find si=%d ei=%d' % (si, ei))
else:
    OLD_H = content[si:ei+1]   # ei+1 gives ob=0 op=0 sq=0
    print('OLD_H: ob=%d op=%d sq=%d len=%d' % (
        OLD_H.count('{') - OLD_H.count('}'),
        OLD_H.count('(') - OLD_H.count(')'),
        OLD_H.count('[') - OLD_H.count(']'),
        len(OLD_H)))

    # ── extract pieces ───────────────────────────────────────────────────────
    ROW1_TAG   = 'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:10},children:['
    SEARCH_TAG = 'e.jsxs("div",{style:{position:"relative",flex:1,minWidth:0}'
    PROJDD_TAG = 'e.jsxs("div",{style:{position:"relative",flexShrink:0}'
    CREATE_TAG = 'e.jsxs("button",{onClick:function(){le("timesheet-create")}'
    ROW2_TAG   = ']}),e.jsx("div",{style:{display:"flex",justifyContent:"flex-end"}'
    FILTER_TAG = 'e.jsxs("button",{onClick:function(){_setShowFilter(true)}'

    row1_si   = content.find(ROW1_TAG,   si, ei)
    s_search  = content.find(SEARCH_TAG, si, ei)
    s_projdd  = content.find(PROJDD_TAG, si, ei)
    s_create  = content.find(CREATE_TAG, si, ei)
    row2_si   = content.find(ROW2_TAG,   si, ei)
    s_filter  = content.find(FILTER_TAG, si, ei)

    row1_children = row1_si + len(ROW1_TAG)

    BACK_TITLE = content[row1_children : s_search - 1]          # strip comma
    SEARCH_DIV = content[s_search      : s_projdd  - 1]         # strip comma
    PROJ_DD    = content[s_projdd      : s_create  - 1]         # strip comma
    CREATE_BTN = content[s_create      : row2_si]               # up to ']}),' of row1
    FILTER_BTN = content[s_filter      : ei - 2]                # strip '})' (row2 div close) + outer ]

    for name, piece in [('BACK_TITLE', BACK_TITLE), ('SEARCH_DIV', SEARCH_DIV),
                        ('PROJ_DD', PROJ_DD), ('CREATE_BTN', CREATE_BTN), ('FILTER_BTN', FILTER_BTN)]:
        print('%s: ob=%d op=%d sq=%d len=%d' % (
            name,
            piece.count('{') - piece.count('}'),
            piece.count('(') - piece.count(')'),
            piece.count('[') - piece.count(']'),
            len(piece)))

    # ── build new header ─────────────────────────────────────────────────────
    # Row1: back+title (left)  |  project_dd + Create (right)
    # Row2: search (flex:1)  +  Filters button
    RIGHT_ROW1 = (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
        + PROJ_DD + ','
        + CREATE_BTN
        + ']})'
    )
    ROW1 = (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
        'justifyContent:"space-between",marginBottom:12},children:['
        + BACK_TITLE + ','
        + RIGHT_ROW1
        + ']})'
    )
    ROW2 = (
        'e.jsxs("div",{style:{display:"flex",gap:10,alignItems:"center"},children:['
        + SEARCH_DIV + ','
        + FILTER_BTN
        + ']})'
    )
    NEW_H = 'children:[' + ROW1 + ',' + ROW2 + ']'

    ob_n = NEW_H.count('{') - NEW_H.count('}')
    op_n = NEW_H.count('(') - NEW_H.count(')')
    sq_n = NEW_H.count('[') - NEW_H.count(']')
    ob_o = OLD_H.count('{') - OLD_H.count('}')
    op_o = OLD_H.count('(') - OLD_H.count(')')
    sq_o = OLD_H.count('[') - OLD_H.count(']')
    print('OLD_H: ob=%d op=%d sq=%d' % (ob_o, op_o, sq_o))
    print('NEW_H: ob=%d op=%d sq=%d len=%d' % (ob_n, op_n, sq_n, len(NEW_H)))

    if ob_n == ob_o and op_n == op_o and sq_n == sq_o:
        if OLD_H in content:
            content = content.replace(OLD_H, NEW_H, 1)
            print('H1 header layout: OK')
        else:
            errors.append('H1'); print('H1: FAIL not found')
    else:
        errors.append('H1-bal'); print('H1-bal: mismatch')

# ── validate and write ───────────────────────────────────────────────────────
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
        capture_output=True, text=True)
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
