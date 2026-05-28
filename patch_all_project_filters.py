#!/usr/bin/env python3
"""
Replace native <select> project filters on Approval, Timesheet, and Home page
with the same unified hierarchical custom dropdown used on the Assignments page.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ── Shared components ──────────────────────────────────────────────────────────
FOLDER = (
    'e.jsx("svg",{width:13,height:11,viewBox:"0 0 13 11",fill:"none",'
    'stroke:"currentColor",strokeWidth:"1.2",strokeLinecap:"round",'
    'strokeLinejoin:"round",style:{flexShrink:0},'
    'children:e.jsx("path",{d:"M0 3.5 L0 9.5 Q0 11 1.5 11 L11.5 11'
    ' Q13 11 13 9.5 L13 4.5 Q13 3 11.5 3 L6.5 3 L5.5 1.5 L1.5 1.5'
    ' Q0 1.5 0 3.5 Z"})})'
)

def trigger_btn(active_cond, label_expr, toggle_expr):
    return (
        'e.jsxs("button",{type:"button",'
        'onClick:function(ev){ev.preventDefault();ev.stopPropagation();' + toggle_expr + ';},'
        'style:{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",'
        'border:"1px solid "+(' + active_cond + '?"#1a56db":"#e5e7eb"),'
        'borderRadius:10,'
        'background:' + active_cond + '?"#EFF4FF":"#fff",'
        'color:' + active_cond + '?"#1a56db":"#6b7280",'
        'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",'
        'cursor:"pointer",maxWidth:200,minWidth:60},'
        'children:['
        + FOLDER + ','
        'e.jsx("span",{style:{flex:1,textAlign:"left",overflow:"hidden",'
        'textOverflow:"ellipsis",whiteSpace:"nowrap"},'
        'children:' + label_expr + '}),'
        'e.jsx("span",{style:{fontSize:9,flexShrink:0},'
        'children:OPEN_STATE?"▲":"▼"})' # placeholder replaced below
        ']})'
    )

def dropdown_panel(open_state, inner_children_expr):
    return (
        open_state + '&&(function(){'
        'return e.jsx("div",{style:{position:"absolute",right:0,'
        'top:"calc(100% + 4px)",background:"#fff",'
        'border:"1px solid #e5e7eb",borderRadius:10,'
        'boxShadow:"0 8px 24px rgba(0,0,0,0.12)",'
        'zIndex:999,minWidth:230,maxHeight:340,overflowY:"auto"},'
        'children:e.jsx("div",{children:(' + inner_children_expr + ')})});'
        '})()'
    )


# ══════════════════════════════════════════════════════════════════════════════
# A – APPROVAL PAGE
# ══════════════════════════════════════════════════════════════════════════════

# A1 – Add _apDD state (replace the discarded useState(!1))
OLD_AS = 'b.useState(!1);const[v,k]=b.useState(!1)'
NEW_AS = 'const[_apDD,_setApDD]=b.useState(!1);const[v,k]=b.useState(!1)'
if OLD_AS in content:
    content = content.replace(OLD_AS, NEW_AS, 1)
    print('A1 _apDD state: OK')
else:
    errors.append('A1'); print('A1: FAIL')

# A2 – Replace two <select> boxes with unified hierarchical dropdown
SM_AP = (
    '{dp1:["Site Assessment","IT Infrastructure Setup","Furniture & Fitout"],'
    'dp2:["Leave & Attendance Module"],'
    'dp3:["Project Management Module","Approval Workflow Engine",'
    '"Document Repository","Analytics Dashboard","Mobile Application"]}'
)

AP_ALL_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();p("all");A("all");_setApDD(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:m==="all"?700:400,'
    'color:m==="all"?"#1a56db":"#374151",'
    'background:m==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:[' + FOLDER + ','
    'e.jsx("span",{style:{flex:1},children:"All Projects"}),'
    'm==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},0)'
)

AP_PRJ_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();p(proj.id);A("all");_setApDD(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_pSel&&T==="all"?700:400,'
    'color:_pSel?"#1a56db":"#374151",'
    'background:_pSel&&T==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:[' + FOLDER + ','
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:proj.name}),'
    '_pSel&&T==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+1)'
)

AP_SUB_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();p(proj.id);A(sName);_setApDD(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"7px 12px 7px 28px",fontSize:11,fontFamily:"Inter,sans-serif",'
    'fontWeight:_sA?700:400,'
    'color:_sA?"#1a56db":"#374151",'
    'background:_sA?"#EFF4FF":"#f8faff",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6",'
    'borderLeft:"3px solid #e5e7eb"},'
    'children:['
    'e.jsx(Lu,{size:11,style:{flexShrink:0,color:_sA?"#1a56db":"#9ca3af"}}),'
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:sName}),'
    '_sA&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+"-"+si)'
)

AP_BTN_LABEL = 'm==="all"?"All Projects":(T==="all"?(g?g.name:""):(g?g.name+" / "+T:""))'

AP_NEW = (
    'e.jsxs("div",{style:{position:"relative",flexShrink:0},children:['
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setApDD(function(q){return !q;});},'
    'style:{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",'
    'border:"1px solid "+(m!=="all"?"#1a56db":"#e5e7eb"),'
    'borderRadius:10,'
    'background:m!=="all"?"#EFF4FF":"#fff",'
    'color:m!=="all"?"#1a56db":"#6b7280",'
    'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",'
    'cursor:"pointer",maxWidth:200,minWidth:60},'
    'children:['
    + FOLDER + ','
    'e.jsx("span",{style:{flex:1,textAlign:"left",overflow:"hidden",'
    'textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:' + AP_BTN_LABEL + '}),'
    'e.jsx("span",{style:{fontSize:9,flexShrink:0},children:_apDD?"▲":"▼"})'
    ']}),'
    '_apDD&&(function(){'
    'var _sm=' + SM_AP + ';'
    'return e.jsx("div",{style:{position:"absolute",right:0,'
    'top:"calc(100% + 4px)",background:"#fff",'
    'border:"1px solid #e5e7eb",borderRadius:10,'
    'boxShadow:"0 8px 24px rgba(0,0,0,0.12)",'
    'zIndex:999,minWidth:230,maxHeight:340,overflowY:"auto"},'
    'children:e.jsx("div",{children:('
    '[' + AP_ALL_ROW + '].concat('
    'il.flatMap(function(proj,qi){'
    'var _pSubs=(_sm[proj.id]||[]);'
    'var _pSel=(m===proj.id);'
    'var rows=[' + AP_PRJ_ROW + '];'
    'rows=rows.concat(_pSubs.map(function(sName,si){'
    'var _sA=(_pSel&&T===sName);'
    'return ' + AP_SUB_ROW + ';'
    '}));'
    'return rows;'
    '})'   # close flatMap
    ')'    # close .concat
    ')'    # close children:(
    '})'   # close inner e.jsx("div")
    '})'   # close outer e.jsx("div")
    '})()'  # close+call IIFE
    ']}'   # close unified div children[] and props{}
    ')'    # close e.jsxs("div" for wrapper
)

# Verify AP_NEW balance before adding parent close
_ob = AP_NEW.count('{')-AP_NEW.count('}')
_op = AP_NEW.count('(')-AP_NEW.count(')')
_sq = AP_NEW.count('[')-AP_NEW.count(']')
print('AP_NEW inner: ob=%d op=%d sq=%d' % (_ob, _op, _sq))
AP_FULL = AP_NEW + ']})' # add parent close -> must be ob=-1 op=-1 sq=-1

if not errors:
    START_AP = ('e.jsxs("div",{style:{position:"relative",flexShrink:0},children:'
                '[e.jsxs("select",{value:m,onChange:z=>p(z.target.value)')
    END_AP   = 'pointerEvents:"none"}})]})]})'
    si = content.find(START_AP, 652000, 657000)
    ei = content.find(END_AP, si+100) if si!=-1 else -1
    if si==-1 or ei==-1:
        errors.append('A2-find'); print('A2 find: FAIL si=%d ei=%d' % (si, ei))
    else:
        OLD_AP = content[si:ei+len(END_AP)]
        print('A2 OLD: ob=%d op=%d sq=%d' % (
            OLD_AP.count('{')-OLD_AP.count('}'),
            OLD_AP.count('(')-OLD_AP.count(')'),
            OLD_AP.count('[')-OLD_AP.count(']'),
        ))
        if OLD_AP in content:
            content = content.replace(OLD_AP, AP_FULL, 1)
            print('A2 Approval dropdown: OK')
        else:
            errors.append('A2'); print('A2: FAIL')


# ══════════════════════════════════════════════════════════════════════════════
# B – TIMESHEET PAGE
# ══════════════════════════════════════════════════════════════════════════════

# B1 – Add _tsDd state
OLD_TS_S = 'const[_subProj,_setSubProj]=b.useState("")'
NEW_TS_S = 'const[_subProj,_setSubProj]=b.useState("");const[_tsDd,_setTsDd]=b.useState(!1)'
if OLD_TS_S in content:
    content = content.replace(OLD_TS_S, NEW_TS_S, 1)
    print('B1 _tsDd state: OK')
else:
    errors.append('B1'); print('B1: FAIL')

# B2 – Replace two <select> boxes with unified hierarchical dropdown
TS_ALL_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setProj("");_setSubProj("");_setTsDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:!_proj?700:400,'
    'color:!_proj?"#1a56db":"#374151",'
    'background:!_proj?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:[' + FOLDER + ','
    'e.jsx("span",{style:{flex:1},children:"All Projects"}),'
    '!_proj&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},0)'
)

TS_PRJ_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setProj(p.id);_setSubProj("");_setTsDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_pSel&&!_subProj?700:400,'
    'color:_pSel?"#1a56db":"#374151",'
    'background:_pSel&&!_subProj?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:[' + FOLDER + ','
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:p.name}),'
    '_pSel&&!_subProj&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+1)'
)

TS_SUB_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setProj(p.id);_setSubProj(s);_setTsDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"7px 12px 7px 28px",fontSize:11,fontFamily:"Inter,sans-serif",'
    'fontWeight:_sA?700:400,'
    'color:_sA?"#1a56db":"#374151",'
    'background:_sA?"#EFF4FF":"#f8faff",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6",'
    'borderLeft:"3px solid #e5e7eb"},'
    'children:['
    'e.jsx(Lu,{size:11,style:{flexShrink:0,color:_sA?"#1a56db":"#9ca3af"}}),'
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:s}),'
    '_sA&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+"-"+si)'
)

TS_BTN_LABEL = (
    '!_proj?"All Projects":'
    '(_subProj?(_selectedProject?_selectedProject.name:"")+" / "+_subProj:'
    '(_selectedProject?_selectedProject.name:""))'
)

TS_NEW = (
    'e.jsxs("div",{style:{position:"relative",flexShrink:0},children:['
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setTsDd(function(q){return !q;});},'
    'style:{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",'
    'border:"1px solid "+(_proj?"#1a56db":"#e5e7eb"),'
    'borderRadius:10,'
    'background:_proj?"#EFF4FF":"#fff",'
    'color:_proj?"#1a56db":"#6b7280",'
    'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",'
    'cursor:"pointer",maxWidth:200,minWidth:60},'
    'children:['
    + FOLDER + ','
    'e.jsx("span",{style:{flex:1,textAlign:"left",overflow:"hidden",'
    'textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:' + TS_BTN_LABEL + '}),'
    'e.jsx("span",{style:{fontSize:9,flexShrink:0},children:_tsDd?"▲":"▼"})'
    ']}),'
    '_tsDd&&(function(){'
    'return e.jsx("div",{style:{position:"absolute",left:0,'
    'top:"calc(100% + 4px)",background:"#fff",'
    'border:"1px solid #e5e7eb",borderRadius:10,'
    'boxShadow:"0 8px 24px rgba(0,0,0,0.12)",'
    'zIndex:999,minWidth:230,maxHeight:340,overflowY:"auto"},'
    'children:e.jsx("div",{children:('
    '[' + TS_ALL_ROW + '].concat('
    '_projects.flatMap(function(p,qi){'
    'var _pSel=(_proj===p.id);'
    'var rows=[' + TS_PRJ_ROW + '];'
    'rows=rows.concat((p.sub||[]).map(function(s,si){'
    'var _sA=(_pSel&&_subProj===s);'
    'return ' + TS_SUB_ROW + ';'
    '}));'
    'return rows;'
    '})'    # close flatMap
    ')'     # close .concat
    ')'     # close children:(
    '})'    # close inner e.jsx("div")
    '})'    # close outer e.jsx("div")
    '})()'  # close+call IIFE
    ']}'    # close wrapper div children[] and props{}
    ')'     # close e.jsxs("div" wrapper
)

_ob = TS_NEW.count('{')-TS_NEW.count('}')
_op = TS_NEW.count('(')-TS_NEW.count(')')
_sq = TS_NEW.count('[')-TS_NEW.count(']')
print('TS_NEW: ob=%d op=%d sq=%d (need 0,0,0)' % (_ob, _op, _sq))

if not errors:
    START_TS = 'e.jsxs("div",{style:{flex:1,position:"relative"},children:[e.jsxs("select",{value:_proj'
    END_TS_MARKER = ',e.jsxs("button",{onClick:function(){_setShowFilter(true)}'
    si = content.find(START_TS, 710000, 716000)
    ei = content.find(END_TS_MARKER, si+100) if si!=-1 else -1
    if si==-1 or ei==-1:
        errors.append('B2-find'); print('B2 find: FAIL si=%d ei=%d' % (si, ei))
    else:
        OLD_TS = content[si:ei]
        print('B2 OLD: ob=%d op=%d sq=%d len=%d' % (
            OLD_TS.count('{')-OLD_TS.count('}'),
            OLD_TS.count('(')-OLD_TS.count(')'),
            OLD_TS.count('[')-OLD_TS.count(']'),
            len(OLD_TS),
        ))
        if OLD_TS in content:
            content = content.replace(OLD_TS, TS_NEW, 1)
            print('B2 Timesheet dropdown: OK')
        else:
            errors.append('B2'); print('B2: FAIL')


# ══════════════════════════════════════════════════════════════════════════════
# C – HOME PAGE (_DsbProjCard component)
# ══════════════════════════════════════════════════════════════════════════════

HOME_ALL_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setDsF("all");_setDsSF("all");_setDsDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_dsF==="all"?700:400,'
    'color:_dsF==="all"?"#1a56db":"#374151",'
    'background:_dsF==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:[' + FOLDER + ','
    'e.jsx("span",{style:{flex:1},children:"All"}),'
    '_dsF==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},0)'
)

HOME_ACT_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setDsF(act.id);_setDsSF("all");_setDsDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"8px 12px",fontSize:12,fontFamily:"Inter,sans-serif",'
    'fontWeight:_aSel&&_dsSF==="all"?700:400,'
    'color:_aSel?"#1a56db":"#374151",'
    'background:_aSel&&_dsSF==="all"?"#EFF4FF":"transparent",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6"},'
    'children:[' + FOLDER + ','
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:act.name}),'
    '_aSel&&_dsSF==="all"&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+1)'
)

HOME_TASK_ROW = (
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setDsF(act.id);_setDsSF(t.id);_setDsDd(!1);},'
    'style:{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",'
    'padding:"7px 12px 7px 28px",fontSize:11,fontFamily:"Inter,sans-serif",'
    'fontWeight:_tA?700:400,'
    'color:_tA?"#1a56db":"#374151",'
    'background:_tA?"#EFF4FF":"#f8faff",'
    'border:"none",cursor:"pointer",borderBottom:"1px solid #f3f4f6",'
    'borderLeft:"3px solid #e5e7eb"},'
    'children:['
    'e.jsx(Lu,{size:11,style:{flexShrink:0,color:_tA?"#1a56db":"#9ca3af"}}),'
    'e.jsx("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:t.name}),'
    '_tA&&e.jsx("span",{style:{color:"#1a56db",flexShrink:0,fontSize:11,fontWeight:700},children:"✓"})'
    ']},qi+"-"+si)'
)

HOME_BTN_LABEL = (
    '(function(){'
    'var _la=rl.find(function(c){return c.id===_dsF;});'
    'var _ls=rl.find(function(c){return c.id===_dsSF;});'
    'return _dsF==="all"?"All":(_dsSF==="all"?(_la?_la.name:""):(_la?_la.name:"")+" / "+(_ls?_ls.name:""));'
    '})()'
)

HOME_NEW = (
    'e.jsxs("div",{style:{position:"relative"},children:['
    'e.jsxs("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setDsDd(function(q){return !q;});},'
    'style:{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",'
    'border:"1px solid "+(_dsF!=="all"?"#1a56db":"#e5e7eb"),'
    'borderRadius:10,'
    'background:_dsF!=="all"?"#EFF4FF":"#fff",'
    'color:_dsF!=="all"?"#1a56db":"#6b7280",'
    'fontSize:11,fontWeight:600,fontFamily:"Inter,sans-serif",'
    'cursor:"pointer",maxWidth:160,minWidth:50,whiteSpace:"nowrap"},'
    'children:['
    + FOLDER + ','
    'e.jsx("span",{style:{flex:1,textAlign:"left",overflow:"hidden",'
    'textOverflow:"ellipsis",whiteSpace:"nowrap"},'
    'children:' + HOME_BTN_LABEL + '}),'
    'e.jsx("span",{style:{fontSize:9,flexShrink:0},children:_dsDd?"▲":"▼"})'
    ']}),'
    '_dsDd&&(function(){'
    'var _acts=rl.filter(function(c){return c.type==="Activity";});'
    'return e.jsx("div",{style:{position:"absolute",right:0,'
    'top:"calc(100% + 4px)",background:"#fff",'
    'border:"1px solid #e5e7eb",borderRadius:10,'
    'boxShadow:"0 8px 24px rgba(0,0,0,0.12)",'
    'zIndex:999,minWidth:200,maxHeight:300,overflowY:"auto"},'
    'children:e.jsx("div",{children:('
    '[' + HOME_ALL_ROW + '].concat('
    '_acts.flatMap(function(act,qi){'
    'var _aSubs=rl.filter(function(t){return t.type==="Task"&&t.parentId===act.id;});'
    'var _aSel=(_dsF===act.id);'
    'var rows=[' + HOME_ACT_ROW + '];'
    'rows=rows.concat(_aSubs.map(function(t,si){'
    'var _tA=(_dsSF===t.id);'
    'return ' + HOME_TASK_ROW + ';'
    '}));'
    'return rows;'
    '})'    # close flatMap
    ')'     # close .concat
    ')'     # close children:(
    '})'    # close inner e.jsx("div")
    '})'    # close outer e.jsx("div")
    '})()'  # close+call IIFE
    ']}'    # close unified div children[] and props{}
    ')'     # close e.jsxs("div" for unified wrapper
)

_ob = HOME_NEW.count('{')-HOME_NEW.count('}')
_op = HOME_NEW.count('(')-HOME_NEW.count(')')
_sq = HOME_NEW.count('[')-HOME_NEW.count(']')
print('HOME_NEW inner: ob=%d op=%d sq=%d (need 0,0,0)' % (_ob, _op, _sq))

# OLD home has ob=-2, so NEW needs to end with two ]}) pairs
HOME_FULL = HOME_NEW + ']})'  + ']})' # + two parent closes = ob=-2 op=-2 sq=-2

if not errors:
    START_H = ('e.jsxs("div",{style:{position:"relative"},children:[e.jsxs("button",{type:"button",'
               'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setDsDd')
    END_H_MARKER = ',["Activity","Task","Sub-Task"].map'
    si = content.find(START_H, 318000, 326000)
    ei = content.find(END_H_MARKER, si+100, 326000) if si!=-1 else -1
    if si==-1 or ei==-1:
        errors.append('C-find'); print('C find: FAIL si=%d ei=%d' % (si, ei))
    else:
        OLD_H = content[si:ei]  # everything up to but not including the Activity map
        print('C OLD: ob=%d op=%d sq=%d len=%d' % (
            OLD_H.count('{')-OLD_H.count('}'),
            OLD_H.count('(')-OLD_H.count(')'),
            OLD_H.count('[')-OLD_H.count(']'),
            len(OLD_H),
        ))
        if OLD_H in content:
            content = content.replace(OLD_H, HOME_FULL, 1)
            print('C Home dropdown: OK')
        else:
            errors.append('C'); print('C: FAIL')

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
