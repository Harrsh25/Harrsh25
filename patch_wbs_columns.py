#!/usr/bin/env python3
"""
WBS list view – Customize Columns panel
Clicking + opens a right-side drawer; optional columns appear
BETWEEN the DEPENDENCY column and the + button.
"""

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

patches = []

HDR_STYLE = (
    'fontSize:9,fontWeight:700,color:"#9ca3af",letterSpacing:"0.5px",'
    'textTransform:"uppercase",fontFamily:"Inter,sans-serif"'
)

# (key, display-label, description, width-px)
COL_DEFS = [
    ('duration',       'DURATION',       'Time span in days or hours',    90),
    ('timeLogged',     'TIME LOGGED',     'Tracked time spent on work',   100),
    ('recurrence',     'RECURRENCE',      'Repeat schedule pattern',      110),
    ('inventory',      'INVENTORY',       'Associated inventory tags',    100),
    ('completionDate', 'COMPLETION DATE', 'Actual completion date',       120),
    ('location',       'LOCATION',        'Work site or remote',          100),
    ('scope',          'SCOPE',           'Quantity and unit of work',     90),
    ('shift',          'SHIFT',           'Assigned work shift',           80),
    ('skill',          'SKILL',           'Required competencies',         80),
    ('priority',       'PRIORITY',        'Urgency level',                 80),
]

# ── 1. Add state ──────────────────────────────────────────────────────────
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

# ── 3. Insert optional column HEADERS before the + div ───────────────────
#   Current: ...children:"DEPENDENCY"}),  e.jsx("div",{style:{width:36,...PLUS...
#   Target:  ...children:"DEPENDENCY"}),  EXTRA_HDRS,  e.jsx("div",{style:{width:36,...PLUS...
EXTRA_HDRS = ''.join(
    'e.jsx("div",{style:{width:' + str(w) + ',flexShrink:0,' + HDR_STYLE + '},'
    'children:_colVis["' + k + '"]?"' + lbl + '":null}),'
    for k, lbl, _d, w in COL_DEFS
)
patches.append(('Insert extra col headers',
    'children:"DEPENDENCY"}),e.jsx("div",{style:{width:36,flexShrink:0,display:"flex"',
    'children:"DEPENDENCY"}),' + EXTRA_HDRS
    + 'e.jsx("div",{style:{width:36,flexShrink:0,display:"flex"',
))

# ── 4. Insert optional column CELLS before the + cell ────────────────────
#   Current: ...children:"—"})}),  e.jsx("div",{style:{width:36,flexShrink:0}})  ]})
#   Target:  ...children:"—"})}),  EXTRA_CELLS,  e.jsx("div",{style:{width:36,flexShrink:0}})  ]})
EXTRA_CELLS = ''.join(
    '_colVis["' + k + '"]&&e.jsx("div",{style:{width:' + str(w) + ',flexShrink:0,'
    'fontSize:11,color:"#374151",fontFamily:"Inter,sans-serif",'
    'display:"flex",alignItems:"center",justifyContent:"center",'
    'padding:"0 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:W["' + k + '"]||"—"}),'
    for k, _l, _d, w in COL_DEFS
)
patches.append(('Insert extra col cells',
    'children:"—"})}),e.jsx("div",{style:{width:36,flexShrink:0}})]}),_e&&je.map',
    'children:"—"})}),' + EXTRA_CELLS
    + 'e.jsx("div",{style:{width:36,flexShrink:0}})]}),_e&&je.map',
))

# ── 5. Dynamic minWidth ───────────────────────────────────────────────────
patches.append(('Dynamic minWidth',
    'children:e.jsxs("div",{style:{minWidth:760},',
    'children:e.jsxs("div",{style:{minWidth:760+'
    'Object.keys(_colVis).filter(function(k){return _colVis[k];}).length*95},',
))

# ── 6. Inject the Customize Columns panel ────────────────────────────────
def toggle_switch(k):
    return (
        'e.jsx("div",{'
        'onClick:()=>_setColDraft(Object.assign({},_colDraft,{["' + k + '"]:!_colDraft["' + k + '"]})),'
        'style:{width:44,height:24,borderRadius:12,'
        'background:_colDraft["' + k + '"]?"#1a56db":"#e5e7eb",'
        'position:"relative",cursor:"pointer",flexShrink:0},'
        'children:e.jsx("div",{style:{position:"absolute",top:2,'
        'left:_colDraft["' + k + '"]?20:2,'
        'width:20,height:20,borderRadius:"50%",'
        'background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}})})'
    )

def col_row(k, lbl, desc):
    return (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
        'justifyContent:"space-between",padding:"14px 20px",'
        'borderBottom:"1px solid #f0f1f4",'
        'background:_colDraft["' + k + '"]?"#f5f7ff":"#fff"},children:['
        'e.jsxs("div",{style:{flex:1,marginRight:16},children:['
        'e.jsx("div",{style:{fontSize:13,fontWeight:600,color:"#111827",'
        'fontFamily:"Inter,sans-serif"},children:"' + lbl + '"}),'
        'e.jsx("div",{style:{fontSize:11,color:"#6b7280",'
        'fontFamily:"Inter,sans-serif",marginTop:2},children:"' + desc + '"})]})'
        ',' + toggle_switch(k) + ']})'
    )

SEL = 'Object.keys(_colDraft).filter(function(k){return _colDraft[k];}).length'

COL_PANEL = (
    '_colPanel&&e.jsxs("div",{style:{position:"fixed",inset:0,zIndex:300},children:['
    # semi-transparent backdrop (closes on click)
    'e.jsx("div",{style:{position:"absolute",inset:0,background:"rgba(0,0,0,0.35)"},'
    'onClick:()=>_setColPanel(!1)}),'
    # drawer panel – absolutely positioned at right edge of the fixed overlay
    'e.jsxs("div",{style:{position:"absolute",right:0,top:0,bottom:0,'
    'width:"min(88vw,380px)",background:"#fff",'
    'display:"flex",flexDirection:"column",'
    'boxShadow:"-6px 0 32px rgba(0,0,0,0.18)"},children:['
    # ── header ──
    'e.jsxs("div",{style:{padding:"18px 20px 14px",'
    'borderBottom:"1px solid #f0f1f4"},children:['
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:['
    # icon
    'e.jsx("div",{style:{width:38,height:38,borderRadius:10,'
    'background:"#1a56db",display:"flex",alignItems:"center",'
    'justifyContent:"center",flexShrink:0},'
    'children:e.jsx("span",{style:{fontSize:18,color:"#fff"},children:"⊞"})}),'
    # title block
    'e.jsxs("div",{style:{flex:1,minWidth:0},children:['
    'e.jsx("div",{style:{fontSize:15,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},children:"Customize Columns"}),'
    'e.jsx("div",{style:{fontSize:11,color:"#6b7280",'
    'fontFamily:"Inter,sans-serif",marginTop:2},'
    'children:"Choose visible columns for this view"})]})'
    ',e.jsx("button",{onClick:()=>_setColPanel(!1),'
    'style:{background:"none",border:"none",cursor:"pointer",'
    'padding:"4px 6px",flexShrink:0,'
    'fontSize:20,color:"#9ca3af",lineHeight:1,borderRadius:6},'
    'children:"×"})'
    ']})]}),'
    # ── scrollable body ──
    'e.jsxs("div",{style:{flex:1,overflowY:"auto"},children:['
    + ','.join(col_row(k, lbl, desc) for k, lbl, desc, _w in COL_DEFS)
    + ']}),'
    # ── footer ──
    'e.jsxs("div",{style:{padding:"14px 20px",'
    'borderTop:"1px solid #f0f1f4",'
    'display:"flex",alignItems:"center",'
    'justifyContent:"space-between"},children:['
    'e.jsxs("span",{style:{fontSize:12,color:"#6b7280",'
    'fontFamily:"Inter,sans-serif"},children:[' + SEL + '," columns selected"]}),'
    'e.jsxs("div",{style:{display:"flex",gap:10},children:['
    'e.jsx("button",{onClick:()=>_setColPanel(!1),'
    'style:{padding:"8px 18px",borderRadius:8,'
    'border:"1px solid #e5e7eb",background:"#fff",'
    'fontSize:13,fontWeight:600,color:"#374151",'
    'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
    'children:"Cancel"}),'
    'e.jsx("button",'
    '{onClick:()=>{_setColVis(Object.assign({},_colDraft));_setColPanel(!1);},'
    'style:{padding:"8px 18px",borderRadius:8,'
    'border:"none",'
    'background:' + SEL + '>0?"#1a56db":"#c7d2fe",'
    'fontSize:13,fontWeight:600,color:"#fff",'
    'fontFamily:"Inter,sans-serif",'
    'cursor:' + SEL + '>0?"pointer":"default"},'
    'children:"Save Changes"})'
    ']})]})]})]}),'
)

ANCHOR = '_depItem&&e.jsxs("div",{style:{position:"fixed",inset:0,zIndex:200,'
patches.append(('Inject col panel', ANCHOR, COL_PANEL + ANCHOR))

# ── Run ──────────────────────────────────────────────────────────────────
errors = []
for name, old, new in patches:
    if old not in content:
        errors.append(name)
        print(f'  NOT FOUND: {name}')
        print(f'    looking for: {repr(old[:80])}')
    else:
        content = content.replace(old, new, 1)
        print(f'  OK: {name}')

if errors:
    print('\nFailed:', errors)
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
