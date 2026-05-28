#!/usr/bin/env python3
"""
Entity type: replace card buttons with a select dropdown where each
option shows the count of completed items, e.g. "Activity (3 done)".
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

OLD_ET = (
    'e.jsxs("div",{children:[e.jsxs("label",{style:{fontSize:13,fontWeight:600,color:"#374151",'
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

NEW_ET = (
    'e.jsxs("div",{children:[e.jsxs("label",{style:{fontSize:13,fontWeight:600,color:"#374151",'
    'fontFamily:"Inter,sans-serif",display:"block",marginBottom:6},'
    'children:["Entity Type ",e.jsx("span",{style:{color:"#dc2626"},children:"*"})]}),'
    'e.jsxs("select",{value:_entityType,'
    'onChange:function(ev){_setEntityType(ev.target.value);_setSelWbs([]);_setWbsHours({});},'
    'style:{width:"100%",padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:10,'
    'fontSize:13,fontFamily:"Inter,sans-serif",outline:"none",'
    'color:_entityType?"#111827":"#9ca3af",background:"#fff",'
    'boxSizing:"border-box",appearance:"none"},'
    'children:['
    'e.jsx("option",{value:"",disabled:true,children:"Select entity type"}),'
    '["Activity","Task","Sub-Task"].map(function(typ,ti){'
    'var _cnt=rl.filter(function(r){return r.type===typ&&r.status==="done";}).length;'
    'return e.jsx("option",{value:typ,children:typ+" ("+_cnt+" done)"},ti);'
    '})'   # close .map
    ']}'   # close children array + select props
    ')'    # close e.jsxs select
    ']})'  # close outer div
)

ob_o = OLD_ET.count('{') - OLD_ET.count('}')
ob_n = NEW_ET.count('{') - NEW_ET.count('}')
op_o = OLD_ET.count('(') - OLD_ET.count(')')
op_n = NEW_ET.count('(') - NEW_ET.count(')')
sq_o = OLD_ET.count('[') - OLD_ET.count(']')
sq_n = NEW_ET.count('[') - NEW_ET.count(']')
print('OLD_ET: ob=%d op=%d sq=%d' % (ob_o, op_o, sq_o))
print('NEW_ET: ob=%d op=%d sq=%d' % (ob_n, op_n, sq_n))

if ob_o == ob_n and op_o == op_n and sq_o == sq_n:
    if OLD_ET in content:
        content = content.replace(OLD_ET, NEW_ET, 1)
        print('ET dropdown: OK')
    else:
        errors.append('ET'); print('ET: FAIL not found')
else:
    errors.append('ET-bal'); print('ET-bal: mismatch')

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
