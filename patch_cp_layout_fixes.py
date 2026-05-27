#!/usr/bin/env python3
"""
P1 – Toolbar: swap controls (Timeline/Filters/Export) to LEFT,
     "Last analyzed" to RIGHT so controls stay fixed position.
P2 – Sticky header: put col-header + data rows in ONE overflowX container
     so header scrolls with the list horizontally, sticks vertically.
P3 – Refresh button: always visible (not gated on _cpAnalyzed) + spin state.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Swap toolbar groups: controls on LEFT, Last analyzed on RIGHT
# ──────────────────────────────────────────────────────────────────────────────
# The LEFT div (Last analyzed) is short and exact:
LAST_ANALYZED_DIV = ('e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8},'
                     'children:[_cpAnalyzed&&e.jsx("span",{style:{fontSize:11,'
                     'color:"#9ca3af",fontFamily:"Inter,sans-serif"},'
                     'children:"Last analyzed: just now"})]}'+')')

CONTROLS_START = ('e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},'
                  'children:[e.jsxs("div",{style:{position:"relative"},children:[')

# Full toolbar: justifyContent:space-between + [LEFT_ANALYZED, RIGHT_CONTROLS]
# We swap by finding the LEFT div and comma before controls
OLD1a = LAST_ANALYZED_DIV + ',' + CONTROLS_START
NEW1a = CONTROLS_START

# Also need to add Last analyzed AFTER the controls → find end of toolbar
# End of controls: Export button's close then ]})] closes RIGHT div
# Then ]} closes toolbar children, }) closes toolbar
EXPORT_END = 'children:["↓"," Export"]})]}'+')'
OLD1b = EXPORT_END + ']})'
NEW1b = (EXPORT_END
         + ',e.jsx("div",{style:{display:"flex",alignItems:"center",gap:8},'
         'children:[_cpAnalyzed&&e.jsx("span",{style:{fontSize:11,'
         'color:"#9ca3af",fontFamily:"Inter,sans-serif"},'
         'children:"Last analyzed: just now"})]})'
         + ']})')

# Apply in order: first remove LEFT from its original position, then add it to right
# But be careful: these two replacements must both work.
# P1a: remove LAST_ANALYZED_DIV from beginning of toolbar children
if OLD1a in content:
    content = content.replace(OLD1a, NEW1a, 1)
    print('P1a Last analyzed removed from left: OK')
else:
    errors.append('P1a'); print('P1a: FAIL')

if OLD1b in content:
    content = content.replace(OLD1b, NEW1b, 1)
    print('P1b Last analyzed added to right: OK')
else:
    errors.append('P1b'); print('P1b: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Sticky header: merge col-header + data into one scroll container
# ──────────────────────────────────────────────────────────────────────────────
# Extract the header row and IIFE at runtime using positions
OUTER_WRAP_START = ('e.jsxs("div",{style:{flex:1,display:"flex",'
                    'flexDirection:"column",overflow:"hidden"},children:[')

outer_pos = content.find(OUTER_WRAP_START, 600000)
if outer_pos == -1:
    errors.append('P2-find'); print('P2: outer wrapper not found')
else:
    inner_start = outer_pos + len(OUTER_WRAP_START)
    # Header row ends just before ,e.jsx("div",{style:{flex:1,overflowY
    data_area_comma = content.find(',e.jsx("div",{style:{flex:1,overflowY:"auto",overflowX:"auto"}', inner_start)
    if data_area_comma == -1:
        errors.append('P2-data'); print('P2: data area not found')
    else:
        HEADER_ROW = content[inner_start:data_area_comma]
        # Modify header row style: remove flexShrink:0, add sticky
        HEADER_ROW_NEW = HEADER_ROW.replace(
            'style:{display:"flex",background:"#f9fafb",borderBottom:"1px solid #e5e7eb",flexShrink:0}',
            'style:{display:"flex",background:"#f9fafb",borderBottom:"1px solid #e5e7eb",position:"sticky",top:0,zIndex:5}',
            1
        )
        # Remove overflow:"hidden" from timeline months container
        HEADER_ROW_NEW = HEADER_ROW_NEW.replace(
            'style:{flex:1,position:"relative",minHeight:34,overflow:"hidden"}',
            'style:{flex:1,position:"relative",minHeight:34}',
            1
        )
        # Find end of data area (the IIFE ends with })() then }) closes minWidth, }) closes overflowY)
        iife_end = content.find('})()})', data_area_comma)
        data_end = iife_end + 8  # })() + }) (minWidth) + }) (overflowY)
        DATA_AREA = content[data_area_comma:data_end]
        # Extract just the IIFE (without the outer overflow+minWidth wrappers)
        iife_prefix = ',e.jsx("div",{style:{flex:1,overflowY:"auto",overflowX:"auto"},children:e.jsx("div",{style:{minWidth:310+cp_cw},children:'
        IIFE_ONLY = DATA_AREA[len(iife_prefix):-4]  # strip "})})" at end

        # Verify extractions are valid
        ob_h = HEADER_ROW_NEW.count('{')-HEADER_ROW_NEW.count('}')
        op_h = HEADER_ROW_NEW.count('(')-HEADER_ROW_NEW.count(')')
        sq_h = HEADER_ROW_NEW.count('[')-HEADER_ROW_NEW.count(']')

        ob_i = IIFE_ONLY.count('{')-IIFE_ONLY.count('}')
        op_i = IIFE_ONLY.count('(')-IIFE_ONLY.count(')')
        sq_i = IIFE_ONLY.count('[')-IIFE_ONLY.count(']')
        print(f'P2 HEADER balance: ob={ob_h} op={op_h} sq={sq_h}')
        print(f'P2 IIFE balance: ob={ob_i} op={op_i} sq={sq_i}')

        OLD2 = HEADER_ROW + DATA_AREA
        NEW2 = ('e.jsx("div",{style:{flex:1,overflowY:"auto",overflowX:"auto"},'
                'children:e.jsxs("div",{style:{minWidth:310+cp_cw},'
                'children:[' + HEADER_ROW_NEW + ',' + IIFE_ONLY + ']})})')

        ob_d = (NEW2.count('{')-NEW2.count('}')) - (OLD2.count('{')-OLD2.count('}'))
        op_d = (NEW2.count('(')-NEW2.count(')')) - (OLD2.count('(')-OLD2.count(')'))
        sq_d = (NEW2.count('[')-NEW2.count(']')) - (OLD2.count('[')-OLD2.count(']'))
        print(f'P2 delta: ob={ob_d} op={op_d} sq={sq_d}')

        if OLD2 in content:
            content = content.replace(OLD2, NEW2, 1)
            print('P2 sticky header merged: OK')
        else:
            errors.append('P2'); print('P2 sticky header: FAIL (OLD not found)')

# ──────────────────────────────────────────────────────────────────────────────
# P3 – Refresh button: always visible; add _cpSpin state for rotation
# ──────────────────────────────────────────────────────────────────────────────
# Add _cpSpin state
OLD3s = '[_cpFPnl,_setCpFPnl]=b.useState(!1),[_cpFlt,_setCpFlt]=b.useState([])'
NEW3s = ('[_cpFPnl,_setCpFPnl]=b.useState(!1),[_cpFlt,_setCpFlt]=b.useState([]),'
         '[_cpSpin,_setCpSpin]=b.useState(!1)')
if OLD3s in content:
    content = content.replace(OLD3s, NEW3s, 1)
    print('P3 _cpSpin state: OK')
else:
    errors.append('P3s'); print('P3 _cpSpin state: FAIL')

# Update Refresh button: remove _cpAnalyzed gate, add spin style
OLD3 = ('_cpAnalyzed&&e.jsx("button",{'
        'onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'title:"Refresh analysis",'
        'style:{display:"flex",alignItems:"center",justifyContent:"center",'
        'width:32,height:32,'
        'borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",'
        'fontSize:15,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:"↻"})')
NEW3 = ('e.jsx("button",{'
        'onClick:()=>{_setCpAnalyzed(new Date().toISOString());'
        '_setCpSpin(!0);setTimeout(()=>_setCpSpin(!1),600);},'
        'title:"Refresh analysis",'
        'style:{display:"flex",alignItems:"center",justifyContent:"center",'
        'width:32,height:32,'
        'borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",'
        'fontSize:15,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer",'
        'transform:_cpSpin?"rotate(360deg)":"rotate(0deg)",'
        'transition:"transform 0.5s ease"},'
        'children:"↻"})')
if OLD3 in content:
    content = content.replace(OLD3, NEW3, 1)
    print('P3 Refresh always visible + spin: OK')
else:
    errors.append('P3'); print('P3 Refresh: FAIL')

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
