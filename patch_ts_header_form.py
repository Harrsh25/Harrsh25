#!/usr/bin/env python3
"""
Timesheet overhaul:
 Part 1 – Header: move search + project filter left of Create button; Filters stays in Row 2
 Part 2 – Create form: custom project dropdown + sub-project buttons,
           entity type cards with completion counts, WBS multi-select + per-item hours
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# Part 1 – HEADER LAYOUT
# ══════════════════════════════════════════════════════════════════════════════
OLD_H_START = 'children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}'
END_H_MARK  = ']})]}),e.jsx("div",{style:{flex:1,overflowY:"auto"'
si_h = content.find(OLD_H_START, 715800, 716000)
ei_h = content.find(END_H_MARK, 721000, 723000)

if si_h == -1 or ei_h == -1:
    errors.append('H0'); print('H0 find: FAIL si=%d ei=%d' % (si_h, ei_h))
else:
    OLD_H = content[si_h:ei_h + 4]  # include ']})' closing sticky header children
    print('OLD_H: ob=%d op=%d sq=%d len=%d' % (
        OLD_H.count('{') - OLD_H.count('}'),
        OLD_H.count('(') - OLD_H.count(')'),
        OLD_H.count('[') - OLD_H.count(']'),
        len(OLD_H)))

    # ── locate Row2 pieces ──────────────────────────────────────────────────
    ROW2_TAG = 'e.jsxs("div",{style:{display:"flex",gap:10,alignItems:"center"},children:['
    ROW2_START = content.find(ROW2_TAG, 716400, 717000)
    SEARCH_TAG = 'e.jsxs("div",{style:{position:"relative",flex:1,minWidth:0}'
    FILTER_TAG = 'e.jsxs("button",{onClick:function(){_setShowFilter(true)}'

    SEARCH_START = content.find(SEARCH_TAG, ROW2_START, ROW2_START + 5000)
    FILTER_START = content.find(FILTER_TAG, ROW2_START, ROW2_START + 6000)

    ROW2_CHILDREN_OFF = ROW2_START + len(ROW2_TAG)
    PROJ_DD  = content[ROW2_CHILDREN_OFF : SEARCH_START - 1]   # strip leading comma
    SEARCH_DIV = content[SEARCH_START : FILTER_START - 1]        # strip comma
    FILTER_BTN = content[FILTER_START : ei_h - 3]               # strip ']}' (Row2 close)

    for name, piece in [('PROJ_DD', PROJ_DD), ('SEARCH_DIV', SEARCH_DIV), ('FILTER_BTN', FILTER_BTN)]:
        print('%s: ob=%d op=%d sq=%d len=%d' % (
            name,
            piece.count('{') - piece.count('}'),
            piece.count('(') - piece.count(')'),
            piece.count('[') - piece.count(']'),
            len(piece)))

    BACK_TITLE = (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,flexShrink:0},children:['
        'e.jsx("button",{onClick:()=>le("dashboard"),className:"hdr-icon-btn flex-shrink-0",'
        'children:e.jsx(ke,{size:18})}),'
        'e.jsx("h1",{style:{fontSize:15,fontWeight:700,color:"#111827",'
        'fontFamily:"Inter,sans-serif",margin:0},children:"Timesheets"})'
        ']})'
    )
    CREATE_BTN = (
        'e.jsxs("button",{onClick:function(){le("timesheet-create")},'
        'style:{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",'
        'background:"#1a56db",border:"none",borderRadius:10,color:"#fff",'
        'fontSize:13,fontWeight:600,fontFamily:"Inter,sans-serif",cursor:"pointer",flexShrink:0},'
        'children:[e.jsx(Ve,{size:14})," Create"]})'
    )

    NEW_H = (
        'children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:10},children:['
        + BACK_TITLE + ','
        + SEARCH_DIV + ','
        + PROJ_DD + ','
        + CREATE_BTN
        + ']}),'
        'e.jsx("div",{style:{display:"flex",justifyContent:"flex-end"},children:'
        + FILTER_BTN
        + ']})'   # close filter_btn: ] children, } props, ) e.jsxs
        + '})'    # close Row2 div
        + ']'     # close OLD's children:[
    )

    ob_n = NEW_H.count('{') - NEW_H.count('}')
    op_n = NEW_H.count('(') - NEW_H.count(')')
    sq_n = NEW_H.count('[') - NEW_H.count(']')
    ob_o = OLD_H.count('{') - OLD_H.count('}')
    op_o = OLD_H.count('(') - OLD_H.count(')')
    sq_o = OLD_H.count('[') - OLD_H.count(']')
    print('NEW_H: ob=%d op=%d sq=%d len=%d' % (ob_n, op_n, sq_n, len(NEW_H)))

    if ob_n == ob_o and op_n == op_o and sq_n == sq_o:
        if OLD_H in content:
            content = content.replace(OLD_H, NEW_H, 1)
            print('H1 header layout: OK')
        else:
            errors.append('H1'); print('H1: FAIL not found')
    else:
        errors.append('H1-bal'); print('H1-bal: balance mismatch old=(%d,%d,%d) new=(%d,%d,%d)' % (ob_o,op_o,sq_o,ob_n,op_n,sq_n))

# ══════════════════════════════════════════════════════════════════════════════
# Part 2a – STATES + DATA in _ymCreate
# ══════════════════════════════════════════════════════════════════════════════
OLD_ST = (
    'const[_name,_setName]=b.useState("");const[_project,_setProject]=b.useState("");'
    'const[_entityType,_setEntityType]=b.useState("");const[_remark,_setRemark]=b.useState("");'
    'const[_remarks,_setRemarks]=b.useState([]);'
    'const _projects=["HR Module","ERP System","Office Relocation","IT Implementation","Payroll System"];'
    'const _entityTypes=["Activity","Task","Sub-Task","Milestone"];const _loggedHours=0;'
)
NEW_ST = (
    'const[_name,_setName]=b.useState("");'
    'const[_project,_setProject]=b.useState("");'
    'const[_subPrj,_setSubPrj]=b.useState("");'
    'const[_entityType,_setEntityType]=b.useState("");'
    'const[_selWbs,_setSelWbs]=b.useState([]);'
    'const[_wbsHours,_setWbsHours]=b.useState({});'
    'const[_remark,_setRemark]=b.useState("");'
    'const[_remarks,_setRemarks]=b.useState([]);'
    'const[_crPrjDd,_setCrPrjDd]=b.useState(!1);'
    'const _crProjects=['
    '{id:"p1",name:"HR Module",sub:["Leave Management","Payroll","Attendance"]},'
    '{id:"p2",name:"ERP System",sub:["ERP Finance","ERP Procurement","ERP Inventory"]},'
    '{id:"p3",name:"IT Implementation",sub:["Site Assessment","IT Infrastructure Setup","Furniture & Fitout"]},'
    '{id:"p4",name:"Office Relocation",sub:[]}];'
    'const _loggedHours=_selWbs.reduce(function(s,id){return s+(parseFloat(_wbsHours[id])||0);},0);'
)
if OLD_ST in content:
    content = content.replace(OLD_ST, NEW_ST, 1)
    print('F2a states: OK')
else:
    errors.append('F2a'); print('F2a: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# Part 2b – PROJECT SECTION
# ══════════════════════════════════════════════════════════════════════════════
OLD_PROJ = (
    'e.jsxs("div",{children:[e.jsxs("label",{style:{fontSize:13,fontWeight:600,color:"#374151",'
    'fontFamily:"Inter,sans-serif",display:"block",marginBottom:6},children:["Project ",'
    'e.jsx("span",{style:{color:"#dc2626"},children:"*"})]}),'
    'e.jsxs("select",{value:_project,onChange:ev=>_setProject(ev.target.value),'
    'style:{width:"100%",padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:10,'
    'fontSize:13,fontFamily:"Inter,sans-serif",outline:"none",color:_project?"#111827":"#9ca3af",'
    'background:"#fff",boxSizing:"border-box",appearance:"none"},'
    'children:[e.jsx("option",{value:"",disabled:true,children:"Select project"}),'
    '_projects.map(p=>e.jsx("option",{key:p,value:p,children:p}))]})]})'
)

FSVG = (
    'e.jsx("svg",{width:13,height:11,viewBox:"0 0 13 11",fill:"none",'
    'stroke:"currentColor",strokeWidth:"1.2",strokeLinecap:"round",strokeLinejoin:"round",'
    'style:{flexShrink:0},children:e.jsx("path",{'
    'd:"M0 3.5 L0 9.5 Q0 11 1.5 11 L11.5 11 Q13 11 13 9.5 L13 4.5 Q13 3 11.5 3'
    ' L6.5 3 L5.5 1.5 L1.5 1.5 Q0 1.5 0 3.5 Z"})})'
)

ALL_ROW_CR = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setProject("");_setSubPrj("");_setCrPrjDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:!_project?700:400,color:!_project?"#1a56db":"#374151",'
    'background:!_project?"#EFF4FF":"transparent",border:"none",cursor:"pointer",'
    'borderBottom:"1px solid #f3f4f6"},'
    'children:[' + FSVG + ','
    'e.jsx("span",{style:{flex:1},children:"All Projects"}),'
    '!_project&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},0)'
)
PRJ_ROW_CR = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setProject(p.id);_setSubPrj("");_setCrPrjDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_pSel&&!_subPrj?700:400,color:_pSel?"#1a56db":"#374151",'
    'background:_pSel&&!_subPrj?"#EFF4FF":"transparent",border:"none",cursor:"pointer",'
    'borderBottom:"1px solid #f3f4f6"},'
    'children:[' + FSVG + ','
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:p.name}),'
    '_pSel&&!_subPrj&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+1)'
)
SUB_ROW_CR = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setProject(p.id);_setSubPrj(s);_setCrPrjDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"7px 12px 7px 28px",fontSize:11,fontFamily:"Inter,sans-serif",'
    'fontWeight:_sA?700:400,color:_sA?"#1a56db":"#374151",'
    'background:_sA?"#EFF4FF":"#f8faff",border:"none",cursor:"pointer",'
    'borderBottom:"1px solid #f3f4f6",borderLeft:"3px solid #e5e7eb"},'
    'children:['
    'e.jsx(Lu,{size:11,style:{flexShrink:0,color:_sA?"#1a56db":"#9ca3af"}}),'
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:s}),'
    '_sA&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+"-"+si)'
)

CR_TRIGGER = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setCrPrjDd(function(v){return !v;});},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"10px 14px",'
    'border:"1px solid "+(_project?"#1a56db":"#e5e7eb"),borderRadius:10,'
    'background:_project?"#EFF4FF":"#fff",color:_project?"#1a56db":"#9ca3af",'
    'fontSize:13,fontFamily:"Inter,sans-serif",cursor:"pointer",textAlign:"left",boxSizing:"border-box"},'
    'children:[' + FSVG + ','
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:(function(){var _cp=_crProjects.filter(function(p){return p.id===_project;})[0];'
    'if(!_cp)return "Select project";return _subPrj?_cp.name+" / "+_subPrj:_cp.name;})()}),'
    'e.jsx("span",{style:{fontSize:9,flexShrink:0},children:_crPrjDd?"▲":"▼"})'
    ']})'
)

CR_DD_IIFE = (
    '_crPrjDd&&(function(){'
    'return e.jsx("div",{style:{position:"absolute",left:0,top:"calc(100% + 4px)",'
    'background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,'
    'boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:999,minWidth:"100%",maxHeight:280,overflowY:"auto"},'
    'children:e.jsx("div",{children:'
    '([' + ALL_ROW_CR + '].concat('
    '_crProjects.flatMap(function(p,qi){'
    'var _pSel=(p.id===_project);'
    'var rows=[' + PRJ_ROW_CR + '];'
    'rows=rows.concat(p.sub.map(function(s,si){'
    'var _sA=(_pSel&&_subPrj===s);'
    'return ' + SUB_ROW_CR + ';'
    '}));'       # close p.sub.map
    'return rows;'
    '})'          # close flatMap fn+call
    ')'           # close .concat
    ')'           # close children:(
    '})'          # close inner div
    '})'          # close outer panel div
    ';})()'       # close+call IIFE
)

CR_SUBPRJ = (
    '_project&&(_crProjects.filter(function(p){return p.id===_project;})[0]||{sub:[]}).sub.length>0'
    '&&e.jsxs("div",{style:{marginTop:8},children:['
    'e.jsx("label",{style:{fontSize:12,fontWeight:500,color:"#6b7280",'
    'fontFamily:"Inter,sans-serif",display:"block",marginBottom:6},children:"Sub-project"}),'
    'e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:6},'
    'children:(_crProjects.filter(function(p){return p.id===_project;})[0]||{sub:[]}).sub'
    '.map(function(s,si){'
    'var _sSelected=_subPrj===s;'
    'return e.jsx("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setSubPrj(_sSelected?"":s);},'
    'style:{padding:"6px 12px",borderRadius:8,'
    'border:"1px solid "+(_sSelected?"#1a56db":"#e5e7eb"),'
    'background:_sSelected?"#EFF4FF":"#f9fafb",'
    'color:_sSelected?"#1a56db":"#374151",'
    'fontSize:11,fontFamily:"Inter,sans-serif",cursor:"pointer",'
    'fontWeight:_sSelected?600:400},children:s},si);'
    '})'   # close .map fn+call
    '})'   # close e.jsx div
    ']})'  # close children[ array + e.jsxs marginTop div
)

CR_DD_WRAPPER = (
    'e.jsxs("div",{style:{position:"relative"},children:['
    + CR_TRIGGER + ','
    + CR_DD_IIFE
    + ']})'
)

NEW_PROJ = (
    'e.jsxs("div",{children:['
    'e.jsxs("label",{style:{fontSize:13,fontWeight:600,color:"#374151",'
    'fontFamily:"Inter,sans-serif",display:"block",marginBottom:6},'
    'children:["Project ",e.jsx("span",{style:{color:"#dc2626"},children:"*"})]}),'
    + CR_DD_WRAPPER + ','
    + CR_SUBPRJ
    + ']})'
)

ob_op = OLD_PROJ.count('{') - OLD_PROJ.count('}')
ob_np = NEW_PROJ.count('{') - NEW_PROJ.count('}')
op_op = OLD_PROJ.count('(') - OLD_PROJ.count(')')
op_np = NEW_PROJ.count('(') - NEW_PROJ.count(')')
sq_op = OLD_PROJ.count('[') - OLD_PROJ.count(']')
sq_np = NEW_PROJ.count('[') - NEW_PROJ.count(']')
print('OLD_PROJ: ob=%d op=%d sq=%d' % (ob_op, op_op, sq_op))
print('NEW_PROJ: ob=%d op=%d sq=%d' % (ob_np, op_np, sq_np))

if ob_op == ob_np and op_op == op_np and sq_op == sq_np:
    if OLD_PROJ in content:
        content = content.replace(OLD_PROJ, NEW_PROJ, 1)
        print('F2b project dropdown: OK')
    else:
        errors.append('F2b'); print('F2b: FAIL not found')
else:
    errors.append('F2b-bal'); print('F2b-bal: balance mismatch')

# ══════════════════════════════════════════════════════════════════════════════
# Part 2c – ENTITY TYPE SECTION + WBS LIST
# ══════════════════════════════════════════════════════════════════════════════
OLD_ET = (
    'e.jsxs("div",{children:[e.jsxs("label",{style:{fontSize:13,fontWeight:600,color:"#374151",'
    'fontFamily:"Inter,sans-serif",display:"block",marginBottom:6},'
    'children:["Entity Type ",e.jsx("span",{style:{color:"#dc2626"},children:"*"})]}),'
    'e.jsxs("select",{value:_entityType,onChange:ev=>_setEntityType(ev.target.value),'
    'style:{width:"100%",padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:10,'
    'fontSize:13,fontFamily:"Inter,sans-serif",outline:"none",'
    'color:_entityType?"#111827":"#9ca3af",background:"#fff",'
    'boxSizing:"border-box",appearance:"none"},'
    'children:[e.jsx("option",{value:"",disabled:true,children:"Select entity type"}),'
    '_entityTypes.map(t=>e.jsx("option",{key:t,value:t,children:t}))]})]})'
)

NEW_ET = (
    'e.jsxs("div",{children:['
    'e.jsxs("label",{style:{fontSize:13,fontWeight:600,color:"#374151",'
    'fontFamily:"Inter,sans-serif",display:"block",marginBottom:6},'
    'children:["Entity Type ",e.jsx("span",{style:{color:"#dc2626"},children:"*"})]}),'
    'e.jsx("div",{style:{display:"flex",gap:8},'
    'children:["Activity","Task","Sub-Task"].map(function(typ,ti){'
    'var _cnt=rl.filter(function(r){return r.type===typ&&r.status==="done";}).length;'
    'var _sel=_entityType===typ;'
    'return e.jsxs("button",{type:"button",'
    'onClick:function(){_setEntityType(typ);_setSelWbs([]);_setWbsHours({});},'
    'style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",'
    'padding:"10px 8px",border:"1px solid "+(_sel?"#1a56db":"#e5e7eb"),'
    'borderRadius:10,background:_sel?"#EFF4FF":"#fff",cursor:"pointer"},'
    'children:['
    'e.jsx("span",{style:{fontSize:12,fontWeight:600,color:_sel?"#1a56db":"#374151",'
    'fontFamily:"Inter,sans-serif"},children:typ}),'
    'e.jsxs("span",{style:{fontSize:11,color:_sel?"#1a56db":"#9ca3af",'
    'fontFamily:"Inter,sans-serif",marginTop:2},children:[_cnt," done"]})'
    ']},ti);'
    '})'   # close .map
    '})'   # close e.jsx div
    ']})'  # close outer div
)

WBS_SECTION = (
    '_entityType&&e.jsxs("div",{children:['
    'e.jsx("label",{style:{fontSize:13,fontWeight:600,color:"#374151",'
    'fontFamily:"Inter,sans-serif",display:"block",marginBottom:6},'
    'children:"WBS Items — select to log hours"}),'
    'e.jsx("div",{style:{border:"1px solid #e5e7eb",borderRadius:10,'
    'overflow:"hidden",maxHeight:220,overflowY:"auto"},'
    'children:(function(){'
    'var _items=rl.filter(function(r){return r.type===_entityType&&r.status==="done";});'
    'if(_items.length===0)return e.jsx("p",{style:{fontSize:12,color:"#9ca3af",'
    'fontFamily:"Inter,sans-serif",textAlign:"center",padding:"16px"},'
    'children:"No completed items found"});'
    'return e.jsx("div",{children:_items.map(function(item,ii){'
    'var _isSel=_selWbs.includes(item.id);'
    'return e.jsxs("div",{'
    'style:{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",'
    'background:_isSel?"#EFF4FF":"#fff",'
    'borderBottom:ii<_items.length-1?"1px solid #f3f4f6":"none",'
    'cursor:"pointer"},'
    'onClick:function(){'
    '_setSelWbs(function(prev){'
    'return prev.includes(item.id)'
    '?prev.filter(function(x){return x!==item.id;})'
    ':[].concat(prev,[item.id]);'
    '});'
    '},'
    'children:['
    'e.jsx("div",{style:{width:16,height:16,borderRadius:4,'
    'border:"1px solid "+(_isSel?"#1a56db":"#d1d5db"),'
    'background:_isSel?"#1a56db":"#fff",'
    'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
    'children:_isSel&&e.jsx("span",{style:{color:"#fff",fontSize:10,fontWeight:700},'
    'children:"✓"})}),'
    'e.jsx("span",{style:{flex:1,fontSize:12,fontFamily:"Inter,sans-serif",'
    'color:"#111827"},children:item.name}),'
    '_isSel&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},'
    'children:['
    'e.jsx("span",{style:{fontSize:11,color:"#6b7280",fontFamily:"Inter,sans-serif"},'
    'children:"hrs:"}),'
    'e.jsx("input",{type:"number",min:0,step:0.5,'
    'value:_wbsHours[item.id]||"",'
    'onChange:function(ev){'
    'ev.stopPropagation();'
    '_setWbsHours(function(prev){'
    'var n=Object.assign({},prev);n[item.id]=ev.target.value;return n;'
    '});'
    '},'
    'onClick:function(ev){ev.stopPropagation();},'
    'style:{width:52,padding:"3px 6px",border:"1px solid #1a56db",'
    'borderRadius:6,fontSize:11,fontFamily:"Inter,sans-serif",'
    'textAlign:"center",outline:"none"}})'
    ']})'   # close _isSel hours div
    ']},ii);'  # close row div + key
    '})});'    # close _items.map fn+call, close return e.jsx div
    '})()'     # close+call IIFE
    '})'       # close panel div
    ']})'      # close outer section div
)

NEW_ET_FULL = NEW_ET + ',' + WBS_SECTION

ob_oe = OLD_ET.count('{') - OLD_ET.count('}')
ob_ne = NEW_ET_FULL.count('{') - NEW_ET_FULL.count('}')
op_oe = OLD_ET.count('(') - OLD_ET.count(')')
op_ne = NEW_ET_FULL.count('(') - NEW_ET_FULL.count(')')
sq_oe = OLD_ET.count('[') - OLD_ET.count(']')
sq_ne = NEW_ET_FULL.count('[') - NEW_ET_FULL.count(']')
print('OLD_ET:      ob=%d op=%d sq=%d' % (ob_oe, op_oe, sq_oe))
print('NEW_ET_FULL: ob=%d op=%d sq=%d' % (ob_ne, op_ne, sq_ne))

if ob_oe == ob_ne and op_oe == op_ne and sq_oe == sq_ne:
    if OLD_ET in content:
        content = content.replace(OLD_ET, NEW_ET_FULL, 1)
        print('F2c entity+wbs: OK')
    else:
        errors.append('F2c'); print('F2c: FAIL not found')
else:
    errors.append('F2c-bal'); print('F2c-bal: balance mismatch')

# ══════════════════════════════════════════════════════════════════════════════
# Part 2d – LOGGED HOURS: update "auto-summed from 0 entities" → dynamic count
# ══════════════════════════════════════════════════════════════════════════════
OLD_LH_TEXT = 'children:"auto-summed from 0 entities"'
NEW_LH_TEXT = 'children:("auto-summed from "+_selWbs.length+" items")'
if OLD_LH_TEXT in content:
    content = content.replace(OLD_LH_TEXT, NEW_LH_TEXT, 1)
    print('F2d logged hours text: OK')
else:
    errors.append('F2d'); print('F2d: FAIL')

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
