#!/usr/bin/env python3
"""
WBS list view – Customize Columns panel
Adds a right-side drawer that opens when the + button is clicked,
lets the user toggle optional columns on/off, and saves the selection.
"""

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()
original = content

patches = []

HDR_STYLE = (
    'fontSize:9,fontWeight:700,color:"#9ca3af",letterSpacing:"0.5px",'
    'textTransform:"uppercase",fontFamily:"Inter,sans-serif"'
)

# ── Column definitions ─────────────────────────────────────────────────────
# key, label, desc, width
COL_DEFS = [
    ('duration',       'DURATION',        'Time span in days or hours',       90),
    ('timeLogged',     'TIME LOGGED',      'Tracked time spent on work',       100),
    ('recurrence',     'RECURRENCE',       'Repeat schedule pattern',          110),
    ('inventory',      'INVENTORY',        'Associated inventory tags',        100),
    ('completionDate', 'COMPLETION DATE',  'Actual completion date',           120),
    ('location',       'LOCATION',         'Work site or remote',              100),
    ('scope',          'SCOPE',            'Quantity and unit of work',         90),
    ('shift',          'SHIFT',            'Assigned work shift',               80),
    ('skill',          'SKILL',            'Required competencies',             80),
    ('priority',       'PRIORITY',         'Urgency level',                     80),
]

# ── 1. Add _colVis + _colDraft + _colPanel state ──────────────────────────
patches.append(('Add col state',
    '[_depBdOpen,_setDepBdOpen]=b.useState(!1),',
    '[_depBdOpen,_setDepBdOpen]=b.useState(!1),'
    '[_colPanel,_setColPanel]=b.useState(!1),'
    '[_colVis,_setColVis]=b.useState({}),'
    '[_colDraft,_setColDraft]=b.useState({}),'
))

# ── 2. Add onClick to the + button ────────────────────────────────────────
patches.append(('Add + onClick',
    'title:"Add custom column",children:"+"',
    'title:"Add custom column",'
    'onClick:()=>{_setColDraft(Object.assign({},_colVis));_setColPanel(!0);},'
    'children:"+"',
))

# ── 3. Add optional column headers after the PLUS header ──────────────────
EXTRA_HDRS = ''.join(
    'e.jsx("div",{style:{width:%d,flexShrink:0,%s},'
    'children:_colVis["%s"]?"%s":null}),' % (w, HDR_STYLE, k, lbl)
    for k, lbl, _desc, w in COL_DEFS
)
# current end: ...children:"+"})})    ]})    ,
# target:      ...children:"+"})}),  EXTRA_HDRS  ]})  ,
patches.append(('Add extra col headers',
    'title:"Add custom column",'
    'onClick:()=>{_setColDraft(Object.assign({},_colVis));_setColPanel(!0);},'
    'children:"+"})})]})',
    'title:"Add custom column",'
    'onClick:()=>{_setColDraft(Object.assign({},_colVis));_setColPanel(!0);},'
    'children:"+"})})'
    ',' + EXTRA_HDRS.rstrip(',') + ']})',
))

# ── 4. Add optional column cells after the PLUS cell ──────────────────────
EXTRA_CELLS = ''.join(
    '_colVis["%s"]&&e.jsx("div",{style:{width:%d,flexShrink:0,'
    'fontSize:11,color:"#374151",fontFamily:"Inter,sans-serif",'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'padding:"0 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:W["%s"]||"—"}),' % (k, w, k)
    for k, _lbl, _desc, w in COL_DEFS
)
patches.append(('Add extra col cells',
    'e.jsx("div",{style:{width:36,flexShrink:0}})]}),_e&&je.map',
    'e.jsx("div",{style:{width:36,flexShrink:0}}),'
    + EXTRA_CELLS.rstrip(',')
    + ']}),_e&&je.map',
))

# ── 5. Dynamic minWidth ────────────────────────────────────────────────────
patches.append(('Dynamic minWidth',
    'children:e.jsxs("div",{style:{minWidth:760},',
    'children:e.jsxs("div",{style:{minWidth:760+'
    'Object.keys(_colVis).filter(function(k){return _colVis[k];}).length*95},',
))

# ── 6. Inject the Customize Columns panel ────────────────────────────────
# Toggle switch helper (inline in JSX, no separate component)
# Toggle: outer pill div + inner circle
def toggle_switch(key):
    k = key
    return (
        'e.jsx("div",{onClick:()=>_setColDraft(Object.assign({},_colDraft,{["' + k + '"]:!_colDraft["' + k + '"]})),'
        'style:{width:44,height:24,borderRadius:12,background:_colDraft["' + k + '"]?"#1a56db":"#e5e7eb",'
        'position:"relative",cursor:"pointer",flexShrink:0},'
        'children:e.jsx("div",{style:{position:"absolute",top:2,'
        'left:_colDraft["' + k + '"]?20:2,width:20,height:20,borderRadius:"50%",'
        'background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}})})'
    )

def col_row(key, label, desc):
    return (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
        'justifyContent:"space-between",padding:"14px 24px",'
        'borderBottom:"1px solid #f9fafb",background:_colDraft["' + key + '"]?"#f0f4ff":"#fff"},children:['
        'e.jsxs("div",{children:['
        'e.jsx("div",{style:{fontSize:13,fontWeight:600,color:"#111827",'
        'fontFamily:"Inter,sans-serif"},children:"' + label + '"}),'
        'e.jsx("div",{style:{fontSize:11,color:"#6b7280",'
        'fontFamily:"Inter,sans-serif",marginTop:2},children:"' + desc + '"})]})'
        + ',' + toggle_switch(key)
        + ']})'
    )

selected_count = (
    'Object.keys(_colDraft).filter(function(k){return _colDraft[k];}).length'
)

COL_PANEL = (
    '_colPanel&&e.jsxs("div",{style:{position:"fixed",inset:0,zIndex:300,'
    'display:"flex",justifyContent:"flex-end"},children:['
    # backdrop
    'e.jsx("div",{style:{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)"},'
    'onClick:()=>_setColPanel(!1)}),'
    # drawer
    'e.jsxs("div",{style:{position:"relative",background:"#fff",'
    'width:"min(90vw,400px)",height:"100%",display:"flex",'
    'flexDirection:"column",overflow:"hidden",'
    'boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"},children:['
    # header
    'e.jsxs("div",{style:{padding:"20px 24px 16px",'
    'borderBottom:"1px solid #f0f1f4"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",'
    'gap:14},children:['
    # icon box
    'e.jsx("div",{style:{width:40,height:40,borderRadius:10,'
    'background:"#1a56db",display:"flex",alignItems:"center",'
    'justifyContent:"center",flexShrink:0},'
    'children:e.jsx("span",{style:{fontSize:20,color:"#fff"},children:"⊞"})}),'
    # title + subtitle
    'e.jsxs("div",{style:{flex:1},children:['
    'e.jsx("h2",{style:{fontSize:16,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif",margin:0},children:"Customize Columns"}),'
    'e.jsx("p",{style:{fontSize:12,color:"#6b7280",'
    'fontFamily:"Inter,sans-serif",marginTop:3,marginBottom:0},'
    'children:"Choose visible columns for this view"})]}),'
    # close X
    'e.jsx("button",{onClick:()=>_setColPanel(!1),'
    'style:{background:"none",border:"none",cursor:"pointer",'
    'padding:4,flexShrink:0,fontSize:18,color:"#9ca3af",lineHeight:1},'
    'children:"×"})'
    ']})]}),'
    # body – scrollable list of column rows
    'e.jsxs("div",{style:{flex:1,overflowY:"auto"},children:['
    + ','.join(col_row(k, lbl, desc) for k, lbl, desc, _w in COL_DEFS)
    + ']}),'
    # footer
    'e.jsxs("div",{style:{padding:"14px 24px",'
    'borderTop:"1px solid #f0f1f4",display:"flex",'
    'alignItems:"center",justifyContent:"space-between"},children:['
    'e.jsx("span",{style:{fontSize:12,color:"#6b7280",'
    'fontFamily:"Inter,sans-serif"},'
    'children:[' + selected_count + '," columns selected"]}),'
    'e.jsxs("div",{style:{display:"flex",gap:10},children:['
    'e.jsx("button",{onClick:()=>_setColPanel(!1),'
    'style:{padding:"8px 18px",borderRadius:8,'
    'border:"1px solid #e5e7eb",background:"#fff",'
    'fontSize:13,fontWeight:600,color:"#374151",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
    'children:"Cancel"}),'
    'e.jsx("button",{onClick:()=>{_setColVis(Object.assign({},_colDraft));_setColPanel(!1);},'
    'style:{padding:"8px 18px",borderRadius:8,'
    'border:"none",background:' + selected_count + '>0?"#1a56db":"#c7d2fe",'
    'fontSize:13,fontWeight:600,color:"#fff",'
    'fontFamily:"Inter,sans-serif",'
    'cursor:' + selected_count + '>0?"pointer":"default"},'
    'children:"Save Changes"})'
    ']})]})]})]}),'
)

COL_PANEL_ANCHOR = '_depItem&&e.jsxs("div",{style:{position:"fixed",inset:0,zIndex:200,'
patches.append(('Inject col panel', COL_PANEL_ANCHOR, COL_PANEL + COL_PANEL_ANCHOR))

# ── Validate ────────────────────────────────────────────────────────────────
errors = []
for name, old, new in patches:
    if old not in content:
        errors.append(f'NOT FOUND: {name}')
        print(f'  NOT FOUND ({name}): looking for {repr(old[:80])}')
    else:
        content = content.replace(old, new, 1)
        print(f'  OK: {name}')

if errors:
    print('\nFailed patches:', errors)
else:
    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    print(f'\n{{ delta: {ob},  ( delta: {op}')
    if ob == 0 and op == 0:
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done. All patches applied.')
    else:
        print('BALANCE ERROR – file not written.')
