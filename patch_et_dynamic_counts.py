#!/usr/bin/env python3
"""
Make entity type counts dynamic and project-filtered:
 F1 – Replace static _crProjects with il; add _crActId and _crProjSubs computed vars
 F2 – Sub-project chips: use _crProjSubs (Tasks of selected Activity) instead of p.sub
 F3 – Entity type options: show count=0 when no project; live count per project via rl hierarchy
 F4 – WBS list: filter items by selected project's Activity
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ══ F1 – _crProjects → il, add _crActId and _crProjSubs ═════════════════════
OLD_F1 = (
    'const[_crPrjDd,_setCrPrjDd]=b.useState(!1);'
    'const _crProjects=['
    '{id:"p1",name:"HR Module",sub:["Leave Management","Payroll","Attendance"]},'
    '{id:"p2",name:"ERP System",sub:["ERP Finance","ERP Procurement","ERP Inventory"]},'
    '{id:"p3",name:"IT Implementation",sub:["Site Assessment","IT Infrastructure Setup","Furniture & Fitout"]},'
    '{id:"p4",name:"Office Relocation",sub:[]}];'
    'const _loggedHours=_selWbs.reduce(function(s,id){return s+(parseFloat(_wbsHours[id])||0);},0);'
)
NEW_F1 = (
    'const[_crPrjDd,_setCrPrjDd]=b.useState(!1);'
    'const _crProjects=il;'
    # Find the Activity in rl whose name matches the selected il project
    'const _crActId=(function(){'
    'if(!_project)return null;'
    'var _ilp=il.find(function(p){return p.id===_project;});'
    'if(!_ilp)return null;'
    'var _act=rl.find(function(r){return r.type==="Activity"&&r.name===_ilp.name;});'
    'return _act?_act.id:null;'
    '})();'
    # Derive sub-project list from Tasks under that Activity
    'const _crProjSubs=(function(){'
    'if(!_crActId)return[];'
    'return rl.filter(function(r){return r.type==="Task"&&r.parentId===_crActId;}).map(function(t){return t.name;});'
    '})();'
    'const _loggedHours=_selWbs.reduce(function(s,id){return s+(parseFloat(_wbsHours[id])||0);},0);'
)

ob_o = OLD_F1.count('{') - OLD_F1.count('}')
ob_n = NEW_F1.count('{') - NEW_F1.count('}')
op_o = OLD_F1.count('(') - OLD_F1.count(')')
op_n = NEW_F1.count('(') - NEW_F1.count(')')
sq_o = OLD_F1.count('[') - OLD_F1.count(']')
sq_n = NEW_F1.count('[') - NEW_F1.count(']')
print('F1 OLD: ob=%d op=%d sq=%d' % (ob_o, op_o, sq_o))
print('F1 NEW: ob=%d op=%d sq=%d' % (ob_n, op_n, sq_n))
if ob_o == ob_n and op_o == op_n and sq_o == sq_n:
    if OLD_F1 in content:
        content = content.replace(OLD_F1, NEW_F1, 1)
        print('F1: OK')
    else:
        errors.append('F1'); print('F1: FAIL not found')
else:
    errors.append('F1-bal'); print('F1-bal: mismatch')

# ══ F2 – Sub-project chips: _crProjSubs instead of _crProjects.filter.sub ══
OLD_F2 = (
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
    '})})]})'
)
NEW_F2 = (
    '_crProjSubs.length>0'
    '&&e.jsxs("div",{style:{marginTop:8},children:['
    'e.jsx("label",{style:{fontSize:12,fontWeight:500,color:"#6b7280",'
    'fontFamily:"Inter,sans-serif",display:"block",marginBottom:6},children:"Sub-project"}),'
    'e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:6},'
    'children:_crProjSubs.map(function(s,si){'
    'var _sSelected=_subPrj===s;'
    'return e.jsx("button",{type:"button",'
    'onClick:function(ev){ev.preventDefault();ev.stopPropagation();_setSubPrj(_sSelected?"":s);},'
    'style:{padding:"6px 12px",borderRadius:8,'
    'border:"1px solid "+(_sSelected?"#1a56db":"#e5e7eb"),'
    'background:_sSelected?"#EFF4FF":"#f9fafb",'
    'color:_sSelected?"#1a56db":"#374151",'
    'fontSize:11,fontFamily:"Inter,sans-serif",cursor:"pointer",'
    'fontWeight:_sSelected?600:400},children:s},si);'
    '})})]})'
)

ob_o = OLD_F2.count('{') - OLD_F2.count('}')
ob_n = NEW_F2.count('{') - NEW_F2.count('}')
op_o = OLD_F2.count('(') - OLD_F2.count(')')
op_n = NEW_F2.count('(') - NEW_F2.count(')')
sq_o = OLD_F2.count('[') - OLD_F2.count(']')
sq_n = NEW_F2.count('[') - NEW_F2.count(']')
print('F2 OLD: ob=%d op=%d sq=%d' % (ob_o, op_o, sq_o))
print('F2 NEW: ob=%d op=%d sq=%d' % (ob_n, op_n, sq_n))
if ob_o == ob_n and op_o == op_n and sq_o == sq_n:
    if OLD_F2 in content:
        content = content.replace(OLD_F2, NEW_F2, 1)
        print('F2: OK')
    else:
        errors.append('F2'); print('F2: FAIL not found')
else:
    errors.append('F2-bal'); print('F2-bal: mismatch')

# ══ F3 – Entity type options: dynamic count via rl + il hierarchy ════════════
OLD_F3 = (
    '["Activity","Task","Sub-Task"].map(function(typ,ti){'
    'var _cnt=rl.filter(function(r){return r.type===typ&&r.status==="done";}).length;'
    'return e.jsx("option",{value:typ,children:typ+" ("+_cnt+" done)"},ti);})'
)
NEW_F3 = (
    '["Activity","Task","Sub-Task"].map(function(typ,ti){'
    'var _label=(function(){'
    'if(!_project||!_crActId)return typ;'
    'var _cnt;'
    'if(typ==="Activity"){'
    '_cnt=rl.filter(function(r){return r.id===_crActId&&r.status==="done";}).length;'
    '}else if(typ==="Task"){'
    '_cnt=rl.filter(function(r){return r.type==="Task"&&r.parentId===_crActId&&r.status==="done";}).length;'
    '}else{'
    '_cnt=rl.filter(function(r){'
    'return r.type==="Sub-Task"&&r.status==="done"'
    '&&!!rl.find(function(t){return t.id===r.parentId&&t.parentId===_crActId;});'
    '}).length;'
    '}'
    'return typ+" ("+_cnt+" done)";'
    '})();'
    'return e.jsx("option",{value:typ,children:_label},ti);})'
)

ob_o = OLD_F3.count('{') - OLD_F3.count('}')
ob_n = NEW_F3.count('{') - NEW_F3.count('}')
op_o = OLD_F3.count('(') - OLD_F3.count(')')
op_n = NEW_F3.count('(') - NEW_F3.count(')')
sq_o = OLD_F3.count('[') - OLD_F3.count(']')
sq_n = NEW_F3.count('[') - NEW_F3.count(']')
print('F3 OLD: ob=%d op=%d sq=%d' % (ob_o, op_o, sq_o))
print('F3 NEW: ob=%d op=%d sq=%d' % (ob_n, op_n, sq_n))
if ob_o == ob_n and op_o == op_n and sq_o == sq_n:
    if OLD_F3 in content:
        content = content.replace(OLD_F3, NEW_F3, 1)
        print('F3: OK')
    else:
        errors.append('F3'); print('F3: FAIL not found')
else:
    errors.append('F3-bal'); print('F3-bal: mismatch')

# ══ F4 – WBS list: filter by _crActId ═══════════════════════════════════════
OLD_F4 = (
    'var _items=rl.filter(function(r){return r.type===_entityType&&r.status==="done";});'
)
NEW_F4 = (
    'var _items=rl.filter(function(r){'
    'if(r.type!==_entityType||r.status!=="done")return false;'
    'if(!_crActId)return true;'
    'if(r.type==="Activity")return r.id===_crActId;'
    'if(r.type==="Task")return r.parentId===_crActId;'
    'return !!rl.find(function(t){return t.id===r.parentId&&t.parentId===_crActId;});'
    '});'
)

ob_o = OLD_F4.count('{') - OLD_F4.count('}')
ob_n = NEW_F4.count('{') - NEW_F4.count('}')
op_o = OLD_F4.count('(') - OLD_F4.count(')')
op_n = NEW_F4.count('(') - NEW_F4.count(')')
sq_o = OLD_F4.count('[') - OLD_F4.count(']')
sq_n = NEW_F4.count('[') - NEW_F4.count(']')
print('F4 OLD: ob=%d op=%d sq=%d' % (ob_o, op_o, sq_o))
print('F4 NEW: ob=%d op=%d sq=%d' % (ob_n, op_n, sq_n))
if ob_o == ob_n and op_o == op_n and sq_o == sq_n:
    if OLD_F4 in content:
        content = content.replace(OLD_F4, NEW_F4, 1)
        print('F4: OK')
    else:
        errors.append('F4'); print('F4: FAIL not found')
else:
    errors.append('F4-bal'); print('F4-bal: mismatch')

# ══ validate and write ═══════════════════════════════════════════════════════
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
