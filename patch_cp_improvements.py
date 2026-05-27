#!/usr/bin/env python3
"""
Critical Path view improvements:
P1 – Add _cpExp state for expand/collapse
P2 – Refresh button: icon only (no text)
P3 – Timeline dropdown: move from header row to toolbar row (before Filters)
P4 – Replace entire cp_row+cp_tree: add expand/collapse, Fragment return
P5 – Filter items: show only scheduled (have endDate) by default;
     show all when _cpInclInd is checked
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ──────────────────────────────────────────────────────────────────────────────
# P1 – Add _cpExp state
# ──────────────────────────────────────────────────────────────────────────────
OLD1 = ('[_cpInclInd,_setCpInclInd]=b.useState(!1),'
        '[_cpDD,_setCpDD]=b.useState(!1)')
NEW1 = ('[_cpInclInd,_setCpInclInd]=b.useState(!1),'
        '[_cpDD,_setCpDD]=b.useState(!1),'
        '[_cpExp,_setCpExp]=b.useState({})')
if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('P1 _cpExp state: OK')
else:
    errors.append('P1'); print('P1 _cpExp state: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P2 – Refresh button icon only
# ──────────────────────────────────────────────────────────────────────────────
OLD2 = ('_cpAnalyzed&&e.jsxs("button",{'
        'onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:4,padding:"6px 10px",'
        'borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",'
        'fontSize:12,fontWeight:500,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:["↻"," Refresh"]})')
NEW2 = ('_cpAnalyzed&&e.jsx("button",{'
        'onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'title:"Refresh analysis",'
        'style:{display:"flex",alignItems:"center",justifyContent:"center",'
        'width:32,height:32,'
        'borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",'
        'fontSize:15,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:"↻"})')
if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print('P2 Refresh icon only: OK')
else:
    errors.append('P2'); print('P2 Refresh icon: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P3 – Move Timeline dropdown from header to toolbar (before Filters)
# ──────────────────────────────────────────────────────────────────────────────
# Remove from header
OLD3a = ('e.jsxs("div",{style:{position:"relative"},children:['
         'e.jsxs("button",{onClick:()=>_setCpDD(v=>!v),'
         'style:{display:"flex",alignItems:"center",gap:6,'
         'border:"1px solid #e5e7eb",borderRadius:8,'
         'padding:"5px 10px",background:"#fff",cursor:"pointer"},'
         'children:['
         'e.jsx("span",{style:{fontSize:11,fontWeight:500,color:"#374151",'
         'fontFamily:"Inter,sans-serif"},children:"Timeline"}),'
         'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#111827",'
         'fontFamily:"Inter,sans-serif"},'
         'children:_cpScale.charAt(0).toUpperCase()+_cpScale.slice(1)}),'
         'e.jsx(qe,{size:11,style:{color:"#6b7280",'
         'transform:_cpDD?"rotate(180deg)":"none",'
         'transition:"transform 0.15s"}})'
         ']}),'
         '_cpDD&&e.jsxs("div",{style:{position:"absolute",left:0,'
         'top:"calc(100% + 4px)",background:"#fff",'
         'border:"1px solid #e5e7eb",borderRadius:10,'
         'boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:20,'
         'overflow:"hidden",minWidth:130},'
         'children:["Weekly","Monthly","Quarterly","Yearly"].map((op,oi)=>'
         'e.jsx("button",{onClick:()=>{_setCpScale(op.toLowerCase());_setCpDD(!1);},'
         'style:{display:"block",width:"100%",padding:"9px 14px",'
         'border:"none",'
         'background:_cpScale===op.toLowerCase()?"#EFF4FF":"#fff",'
         'color:_cpScale===op.toLowerCase()?"#1a56db":"#374151",'
         'fontSize:12,'
         'fontWeight:_cpScale===op.toLowerCase()?700:400,'
         'fontFamily:"Inter,sans-serif",cursor:"pointer",'
         'textAlign:"left"},children:op},oi))})'
         ']}),')
NEW3a = ''
if OLD3a in content:
    content = content.replace(OLD3a, NEW3a, 1)
    print('P3a Timeline removed from header: OK')
else:
    errors.append('P3a'); print('P3a Timeline remove from header: FAIL')

# Add to toolbar before Filters
TIMELINE_DD = (
    'e.jsxs("div",{style:{position:"relative"},children:['
    'e.jsxs("button",{onClick:()=>_setCpDD(v=>!v),'
    'style:{display:"flex",alignItems:"center",gap:6,'
    'border:"1px solid #e5e7eb",borderRadius:8,'
    'padding:"5px 10px",background:"#fff",cursor:"pointer"},'
    'children:['
    'e.jsx("span",{style:{fontSize:11,fontWeight:500,color:"#374151",'
    'fontFamily:"Inter,sans-serif"},children:"Timeline"}),'
    'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#111827",'
    'fontFamily:"Inter,sans-serif"},'
    'children:_cpScale.charAt(0).toUpperCase()+_cpScale.slice(1)}),'
    'e.jsx(qe,{size:11,style:{color:"#6b7280",'
    'transform:_cpDD?"rotate(180deg)":"none",'
    'transition:"transform 0.15s"}})'
    ']}),'
    '_cpDD&&e.jsxs("div",{style:{position:"absolute",right:0,'
    'top:"calc(100% + 4px)",background:"#fff",'
    'border:"1px solid #e5e7eb",borderRadius:10,'
    'boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:20,'
    'overflow:"hidden",minWidth:130},'
    'children:["Weekly","Monthly","Quarterly","Yearly"].map((op,oi)=>'
    'e.jsx("button",{onClick:()=>{_setCpScale(op.toLowerCase());_setCpDD(!1);},'
    'style:{display:"block",width:"100%",padding:"9px 14px",'
    'border:"none",'
    'background:_cpScale===op.toLowerCase()?"#EFF4FF":"#fff",'
    'color:_cpScale===op.toLowerCase()?"#1a56db":"#374151",'
    'fontSize:12,'
    'fontWeight:_cpScale===op.toLowerCase()?700:400,'
    'fontFamily:"Inter,sans-serif",cursor:"pointer",'
    'textAlign:"left"},children:op},oi))})'
    ']})'
)
OLD3b = ('e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:4,'
         'padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",'
         'background:"#fff",fontSize:11,color:"#374151",'
         'fontFamily:"Inter,sans-serif",cursor:"pointer"},children:["⊟"," Filters"]})')
NEW3b = TIMELINE_DD + ',' + OLD3b
if OLD3b in content:
    content = content.replace(OLD3b, NEW3b, 1)
    print('P3b Timeline added to toolbar: OK')
else:
    errors.append('P3b'); print('P3b Timeline add to toolbar: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P4 – Replace ENTIRE cp_row + cp_tree with new version that has
#       expand/collapse and Fragment-based return
# ──────────────────────────────────────────────────────────────────────────────
OLD4 = ('const cp_row=(it,dpt)=>{'
        'const fl=cp_gfl(it),isCrit=fl<=0,bar=cp_bar(it),fln=cp_fl(it);'
        'const bdg=it.type==="Activity"?"ACT":it.type==="Sub-Task"?"SUB":"TASK";'
        'const bdgBg=it.type==="Activity"?"#f3e8ff":it.type==="Sub-Task"?"#fffbeb":"#EFF4FF";'
        'const bdgCl=it.type==="Activity"?"#7c3aed":it.type==="Sub-Task"?"#d97706":"#1a56db";'
        'return e.jsxs("div",{key:it.id||it.name,style:{display:"flex",alignItems:"stretch",'
        'borderBottom:"1px solid #f3f4f6",minHeight:36,'
        'background:isCrit?"rgba(220,38,38,0.03)":"#fff"},children:['
        'e.jsxs("div",{style:{width:310,flexShrink:0,display:"flex",'
        'alignItems:"center",borderRight:"1px solid #e5e7eb"},children:['
        'e.jsx("div",{style:{flex:1,padding:"4px 8px",paddingLeft:8+dpt*12,'
        'fontSize:12,fontWeight:dpt===0?700:500,color:"#111827",'
        'fontFamily:"Inter,sans-serif",overflow:"hidden",'
        'textOverflow:"ellipsis",whiteSpace:"nowrap"},children:it.name||"—"}),'
        'e.jsx("div",{style:{width:44,flexShrink:0,display:"flex",'
        'justifyContent:"center",alignItems:"center"},'
        'children:e.jsx("span",{style:{fontSize:8,fontWeight:700,color:bdgCl,'
        'background:bdgBg,padding:"2px 4px",borderRadius:3,'
        'fontFamily:"Inter,sans-serif"},children:bdg})}),'
        'e.jsx("div",{style:{width:52,flexShrink:0,textAlign:"center",'
        'fontSize:11,fontWeight:600,'
        'color:isCrit?"#dc2626":fl<30?"#d97706":"#6b7280",'
        'fontFamily:"Inter,sans-serif"},'
        'children:fl>=999?"—":fl<=0?"0d":fl+"d"}),'
        'e.jsx("div",{style:{width:60,flexShrink:0,display:"flex",'
        'justifyContent:"center",alignItems:"center"},'
        'children:isCrit?e.jsx("span",{style:{fontSize:8,fontWeight:700,'
        'color:"#dc2626",background:"#fee2e2",padding:"2px 5px",'
        'borderRadius:10,fontFamily:"Inter,sans-serif"},'
        'children:"⚠ Critical"}):'
        'e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"—"})})]})'
        ',e.jsx("div",{style:{flex:1,position:"relative",minHeight:36,minWidth:cp_cw},'
        'children:[bar&&e.jsx("div",{style:{position:"absolute",left:bar.left,'
        'width:bar.width,height:isCrit?16:14,top:"50%",'
        'transform:"translateY(-50%)",borderRadius:3,'
        'background:isCrit?"#7c3aed":"#93c5fd",zIndex:2}}),'
        'fln&&e.jsx("div",{style:{position:"absolute",left:fln.left,'
        'width:fln.width,height:2,top:"50%",transform:"translateY(-1px)",'
        'backgroundImage:"repeating-linear-gradient(90deg,#9ca3af 0,#9ca3af 4px,transparent 4px,transparent 8px)",'
        'zIndex:1}})]})]})'
        ';}; const cp_tree=(items,dpt)=>items.reduce('
        '(acc,it)=>[...acc,cp_row(it,dpt),...cp_tree(z(it.id),dpt+1)],[]);')

NEW4 = ('const cp_row=(it,dpt)=>{'
        'const fl=cp_gfl(it),isCrit=fl<=0,bar=cp_bar(it),fln=cp_fl(it);'
        'const bdg=it.type==="Activity"?"ACT":it.type==="Sub-Task"?"SUB":"TASK";'
        'const bdgBg=it.type==="Activity"?"#f3e8ff":it.type==="Sub-Task"?"#fffbeb":"#EFF4FF";'
        'const bdgCl=it.type==="Activity"?"#7c3aed":it.type==="Sub-Task"?"#d97706":"#1a56db";'
        'const cp_ch=z(it.id);const cp_open=_cpExp[it.id]!==false;'
        'return e.jsxs(qn.Fragment,{children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"stretch",'
        'borderBottom:"1px solid #f3f4f6",minHeight:36,'
        'background:isCrit?"rgba(220,38,38,0.03)":"#fff"},children:['
        'e.jsxs("div",{style:{width:310,flexShrink:0,display:"flex",'
        'alignItems:"center",borderRight:"1px solid #e5e7eb"},children:['
        'e.jsxs("div",{style:{flex:1,padding:"4px 8px",paddingLeft:8+dpt*12,'
        'display:"flex",alignItems:"center",gap:4,'
        'fontSize:12,fontWeight:dpt===0?700:500,color:"#111827",'
        'fontFamily:"Inter,sans-serif",overflow:"hidden"},children:['
        'cp_ch.length>0'
        '?e.jsx("button",{onClick:()=>_setCpExp(x=>({...x,[it.id]:!cp_open})),'
        'style:{background:"none",border:"none",cursor:"pointer",padding:0,'
        'flexShrink:0,display:"flex"},'
        'children:cp_open?e.jsx(qe,{size:10,style:{color:"#6b7280"}}):'
        'e.jsx(Oe,{size:10,style:{color:"#6b7280"}})})'
        ':e.jsx("span",{style:{width:10,flexShrink:0,display:"block"}}),'
        'e.jsx("span",{style:{overflow:"hidden",textOverflow:"ellipsis",'
        'whiteSpace:"nowrap",flex:1},children:it.name||"—"})'
        ']}),'
        'e.jsx("div",{style:{width:44,flexShrink:0,display:"flex",'
        'justifyContent:"center",alignItems:"center"},'
        'children:e.jsx("span",{style:{fontSize:8,fontWeight:700,color:bdgCl,'
        'background:bdgBg,padding:"2px 4px",borderRadius:3,'
        'fontFamily:"Inter,sans-serif"},children:bdg})}),'
        'e.jsx("div",{style:{width:52,flexShrink:0,textAlign:"center",'
        'fontSize:11,fontWeight:600,'
        'color:isCrit?"#dc2626":fl<30?"#d97706":"#6b7280",'
        'fontFamily:"Inter,sans-serif"},'
        'children:fl>=999?"—":fl<=0?"0d":fl+"d"}),'
        'e.jsx("div",{style:{width:60,flexShrink:0,display:"flex",'
        'justifyContent:"center",alignItems:"center"},'
        'children:isCrit?e.jsx("span",{style:{fontSize:8,fontWeight:700,'
        'color:"#dc2626",background:"#fee2e2",padding:"2px 5px",'
        'borderRadius:10,fontFamily:"Inter,sans-serif"},'
        'children:"⚠ Critical"}):'
        'e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},children:"—"})})]})'
        ',e.jsx("div",{style:{flex:1,position:"relative",minHeight:36,minWidth:cp_cw},'
        'children:[bar&&e.jsx("div",{style:{position:"absolute",left:bar.left,'
        'width:bar.width,height:isCrit?16:14,top:"50%",'
        'transform:"translateY(-50%)",borderRadius:3,'
        'background:isCrit?"#7c3aed":"#93c5fd",zIndex:2}}),'
        'fln&&e.jsx("div",{style:{position:"absolute",left:fln.left,'
        'width:fln.width,height:2,top:"50%",transform:"translateY(-1px)",'
        'backgroundImage:"repeating-linear-gradient(90deg,#9ca3af 0,#9ca3af 4px,transparent 4px,transparent 8px)",'
        'zIndex:1}})]})]}),'
        'cp_open&&cp_ch.length>0&&cp_ch.map(c2=>cp_row(c2,dpt+1))'
        ']},it.id||it.name)'
        ';}; '
        'const cp_tree=(items,dpt)=>items.flatMap(it=>cp_row(it,dpt));')

if OLD4 in content:
    ob_d = (NEW4.count('{')-NEW4.count('}')) - (OLD4.count('{')-OLD4.count('}'))
    op_d = (NEW4.count('(')-NEW4.count(')')) - (OLD4.count('(')-OLD4.count(')'))
    sq_d = (NEW4.count('[')-NEW4.count(']')) - (OLD4.count('[')-OLD4.count(']'))
    print(f'P4 delta: ob={ob_d} op={op_d} sq={sq_d}')
    content = content.replace(OLD4, NEW4, 1)
    print('P4 cp_row+cp_tree with expand/collapse: OK')
else:
    errors.append('P4'); print('P4 cp_row+cp_tree: FAIL')

# ──────────────────────────────────────────────────────────────────────────────
# P5 – Filter to show only scheduled items by default
# ──────────────────────────────────────────────────────────────────────────────
OLD5 = ('e.jsx("div",{style:{flex:1,overflowY:"auto",overflowX:"auto"},'
        'children:e.jsx("div",{style:{minWidth:310+cp_cw},'
        'children:cp_tree(ne,0)})})')
NEW5 = ('e.jsx("div",{style:{flex:1,overflowY:"auto",overflowX:"auto"},'
        'children:e.jsx("div",{style:{minWidth:310+cp_cw},'
        'children:(()=>{'
        'const cp_hasDate=it=>!!it.endDate||z(it.id).some(c2=>cp_hasDate(c2));'
        'const cp_rows=_cpInclInd?ne:ne.filter(it=>cp_hasDate(it));'
        'if(!cp_rows.length)return e.jsxs("div",{style:{display:"flex",'
        'flexDirection:"column",alignItems:"center",justifyContent:"center",'
        'padding:"32px 24px",textAlign:"center"},children:['
        'e.jsx("div",{style:{fontSize:28,marginBottom:10},children:"🔗"}),'
        'e.jsx("div",{style:{fontSize:13,fontWeight:700,color:"#111827",'
        'fontFamily:"Inter,sans-serif",marginBottom:6},'
        'children:"No scheduled items found"}),'
        'e.jsx("div",{style:{fontSize:11,color:"#6b7280",'
        'fontFamily:"Inter,sans-serif",lineHeight:"17px",maxWidth:260},'
        'children:"Add start/end dates to WBS items to see critical path. Check \'Include Independent Work\' to show unscheduled items."})'
        ']});'
        'return cp_tree(cp_rows,0);'
        '})()'
        '})})')
if OLD5 in content:
    ob_d = (NEW5.count('{')-NEW5.count('}')) - (OLD5.count('{')-OLD5.count('}'))
    op_d = (NEW5.count('(')-NEW5.count(')')) - (OLD5.count('(')-OLD5.count(')'))
    sq_d = (NEW5.count('[')-NEW5.count(']')) - (OLD5.count('[')-OLD5.count(']'))
    print(f'P5 delta: ob={ob_d} op={op_d} sq={sq_d}')
    content = content.replace(OLD5, NEW5, 1)
    print('P5 filter dependent items: OK')
else:
    errors.append('P5'); print('P5 filter items: FAIL')

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
