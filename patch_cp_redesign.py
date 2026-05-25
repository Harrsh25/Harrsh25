#!/usr/bin/env python3
"""
Redesign Critical Path tab matching reference screenshots.
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# P0 – Add component-level state vars
# ══════════════════════════════════════════════════════════════════════════════
OLD0 = '[_colPanel,_setColPanel]=b.useState(!1),'
NEW0 = ('[_colPanel,_setColPanel]=b.useState(!1),'
        '[_cpAnalyzed,_setCpAnalyzed]=b.useState(null),'
        '[_cpScale,_setCpScale]=b.useState("monthly"),'
        '[_cpInclInd,_setCpInclInd]=b.useState(!1),')
if OLD0 in content:
    content = content.replace(OLD0, NEW0, 1); print('P0 state: OK')
else:
    errors.append('P0'); print('P0 state: FAIL')

# ══════════════════════════════════════════════════════════════════════════════
# P5 – Replace entire CP IIFE
# ══════════════════════════════════════════════════════════════════════════════
CP_START = 'I==="cp"&&(()=>{'
CP_END   = 'I==="overview"&&(()=>{'
start_idx = content.find(CP_START)
end_idx   = content.find(CP_END, start_idx)
if start_idx == -1 or end_idx == -1:
    errors.append('P5'); print('P5: cannot locate CP block')
else:
    # ── helpers ──────────────────────────────────────────────────────────────
    def chk(s, lbl):
        ob = s.count('{') - s.count('}')
        op = s.count('(') - s.count(')')
        ok = ob == 0 and op == 0
        print(f'  {"OK" if ok else "BAD ob="+str(ob)+" op="+str(op)}: {lbl}')
        return ok

    # ── ROW renderer (balanced function body ending with ;) ──────────────────
    ROW = (
        'const cp_row=(it,dpt)=>{'
        'const fl=cp_gfl(it),isCrit=fl<=0,bar=cp_bar(it),fln=cp_fl(it);'
        'const bdg=it.type==="Activity"?"ACT":it.type==="Sub-Task"?"SUB":"TASK";'
        'const bdgBg=it.type==="Activity"?"#f3e8ff":it.type==="Sub-Task"?"#fffbeb":"#EFF4FF";'
        'const bdgCl=it.type==="Activity"?"#7c3aed":it.type==="Sub-Task"?"#d97706":"#1a56db";'
        'return e.jsxs("div",{key:it.id||it.name,'
        'style:{display:"flex",alignItems:"stretch",'
        'borderBottom:"1px solid #f3f4f6",'
        'minHeight:36,background:isCrit?"rgba(220,38,38,0.03)":"#fff"},'
        'children:['
        'e.jsxs("div",{style:{width:310,flexShrink:0,display:"flex",'
        'alignItems:"center",borderRight:"1px solid #e5e7eb"},'
        'children:['
        'e.jsx("div",{style:{flex:1,padding:"4px 8px",'
        'paddingLeft:8+dpt*12,fontSize:12,'
        'fontWeight:dpt===0?700:500,color:"#111827",'
        'fontFamily:"Inter,sans-serif",overflow:"hidden",'
        'textOverflow:"ellipsis",whiteSpace:"nowrap"},'
        'children:it.name||"—"}),'
        'e.jsx("div",{style:{width:44,flexShrink:0,display:"flex",'
        'justifyContent:"center",alignItems:"center"},'
        'children:e.jsx("span",{style:{fontSize:8,fontWeight:700,'
        'color:bdgCl,background:bdgBg,padding:"2px 4px",'
        'borderRadius:3,fontFamily:"Inter,sans-serif"},'
        'children:bdg})}),'
        'e.jsx("div",{style:{width:52,flexShrink:0,textAlign:"center",'
        'fontSize:11,fontWeight:600,'
        'color:isCrit?"#dc2626":fl<30?"#d97706":"#6b7280",'
        'fontFamily:"Inter,sans-serif"},'
        'children:fl>=999?"—":fl<=0?"0d":fl+"d"}),'
        'e.jsx("div",{style:{width:60,flexShrink:0,display:"flex",'
        'justifyContent:"center",alignItems:"center"},'
        'children:isCrit'
        '?e.jsx("span",{style:{fontSize:8,fontWeight:700,'
        'color:"#dc2626",background:"#fee2e2",'
        'padding:"2px 5px",borderRadius:10,'
        'fontFamily:"Inter,sans-serif"},'
        'children:"⚠ Critical"})'
        ':e.jsx("span",{style:{fontSize:13,color:"#9ca3af"},'
        'children:"—"})})'
        ']}),'  # close left panel
        'e.jsx("div",{style:{flex:1,position:"relative",'
        'minHeight:36,minWidth:cp_cw},'
        'children:['
        'bar&&e.jsx("div",{style:{position:"absolute",'
        'left:bar.left,width:bar.width,'
        'height:isCrit?16:14,top:"50%",'
        'transform:"translateY(-50%)",'
        'borderRadius:3,'
        'background:isCrit?"#7c3aed":"#93c5fd",'
        'zIndex:2}}),'
        'fln&&e.jsx("div",{style:{position:"absolute",'
        'left:fln.left,width:fln.width,'
        'height:2,top:"50%",transform:"translateY(-1px)",'
        'backgroundImage:"repeating-linear-gradient'
        '(90deg,#9ca3af 0,#9ca3af 4px,transparent 4px,transparent 8px)",'
        'zIndex:1}})'
        ']})'    # close chart div
        ']});}; '  # close row ]}) + semicolon + function body } + const decl ;
    )
    chk(ROW, 'ROW')

    # ── TOOLBAR (balanced) ────────────────────────────────────────────────────
    TOOLBAR = (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
        'justifyContent:"space-between",padding:"10px 16px",'
        'borderBottom:"1px solid #e5e7eb",background:"#fff",'
        'flexWrap:"wrap",gap:8},'
        'children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
        'gap:8,flexWrap:"wrap"},'
        'children:['
        'e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:6,'
        'padding:"7px 14px",borderRadius:8,border:"none",'
        'background:"#1a56db",fontSize:12,fontWeight:600,'
        'color:"#fff",fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:[e.jsx("span",{children:"▶"}),'
        '" Run Critical Path Analysis"]}),'
        '_cpAnalyzed&&e.jsxs("button",{'
        'onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:4,'
        'padding:"5px 10px",borderRadius:8,'
        'border:"1px solid #e5e7eb",background:"#fff",'
        'fontSize:11,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:["↻"," Refresh"]}),'
        '_cpAnalyzed&&e.jsx("span",{style:{fontSize:11,'
        'color:"#9ca3af",fontFamily:"Inter,sans-serif"},'
        'children:"Last analyzed: just now"}),'
        '_cpAnalyzed&&e.jsxs("span",{style:{display:"flex",'
        'alignItems:"center",gap:4,fontSize:11,fontWeight:600,'
        'color:"#16a34a",background:"#f0fdf4",'
        'padding:"3px 8px",borderRadius:6,'
        'fontFamily:"Inter,sans-serif"},'
        'children:["✓"," Dependencies Valid"]})'
        ']}),'  # close toolbar-left
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},'
        'children:['
        'e.jsxs("label",{style:{display:"flex",alignItems:"center",'
        'gap:4,fontSize:11,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:['
        'e.jsx("input",{type:"checkbox",checked:_cpInclInd,'
        'onChange:()=>_setCpInclInd(!_cpInclInd),'
        'style:{width:13,height:13}}),'
        '" Include Independent Work"'
        ']}),'  # close label
        'e.jsxs("button",{style:{display:"flex",alignItems:"center",'
        'gap:4,padding:"5px 10px",borderRadius:8,'
        'border:"1px solid #e5e7eb",background:"#fff",'
        'fontSize:11,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:["⊟"," Filters"]}),'
        'e.jsxs("div",{style:{display:"flex",borderRadius:8,'
        'overflow:"hidden",border:"1px solid #e5e7eb"},'
        'children:["Weekly","Monthly","Quarterly","Yearly"]'
        '.map(s=>e.jsx("button",{key:s,'
        'onClick:()=>_setCpScale(s.toLowerCase()),'
        'style:{padding:"5px 10px",border:"none",'
        'background:_cpScale===s.toLowerCase()?"#1a56db":"#fff",'
        'color:_cpScale===s.toLowerCase()?"#fff":"#374151",'
        'fontSize:11,'
        'fontWeight:_cpScale===s.toLowerCase()?600:400,'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:s})'  # close map item e.jsx
        ')})'   # ) closes .map, } closes scale div props, ) closes e.jsxs
        ','
        'e.jsxs("button",{style:{display:"flex",alignItems:"center",'
        'gap:4,padding:"5px 10px",borderRadius:8,'
        'border:"1px solid #e5e7eb",background:"#fff",'
        'fontSize:11,color:"#374151",'
        'fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:["↓"," Export"]})'
        ']})'   # close right div
        ']})'   # close toolbar div
    )
    chk(TOOLBAR, 'TOOLBAR')

    # ── EMPTY STATE (balanced) ────────────────────────────────────────────────
    EMPTY = (
        'e.jsxs("div",{style:{display:"flex",flexDirection:"column",'
        'alignItems:"center",justifyContent:"center",'
        'flex:1,padding:"40px 24px",textAlign:"center"},'
        'children:['
        'e.jsxs("svg",{width:64,height:64,viewBox:"0 0 64 64",'
        'fill:"none",style:{marginBottom:16},'
        'children:['
        'e.jsx("rect",{x:24,y:4,width:16,height:12,rx:3,'
        'stroke:"#d1d5db",strokeWidth:2}),'
        'e.jsx("rect",{x:4,y:44,width:16,height:12,rx:3,'
        'stroke:"#d1d5db",strokeWidth:2}),'
        'e.jsx("rect",{x:44,y:44,width:16,height:12,rx:3,'
        'stroke:"#d1d5db",strokeWidth:2}),'
        'e.jsx("line",{x1:32,y1:16,x2:32,y2:32,'
        'stroke:"#d1d5db",strokeWidth:2}),'
        'e.jsx("line",{x1:32,y1:32,x2:12,y2:44,'
        'stroke:"#d1d5db",strokeWidth:2}),'
        'e.jsx("line",{x1:32,y1:32,x2:52,y2:44,'
        'stroke:"#d1d5db",strokeWidth:2})'
        ']}),'  # close svg
        'e.jsx("div",{style:{fontSize:16,fontWeight:700,'
        'color:"#111827",fontFamily:"Inter,sans-serif",'
        'marginBottom:8},children:"No analysis available yet"}),'
        'e.jsx("div",{style:{fontSize:12,color:"#6b7280",'
        'fontFamily:"Inter,sans-serif",lineHeight:"18px",'
        'marginBottom:20},'
        'children:"Run Critical Path Analysis to generate scheduling '
        'insights, identify critical chains and visualize float across the project."}),'
        'e.jsxs("button",{onClick:()=>_setCpAnalyzed(new Date().toISOString()),'
        'style:{display:"flex",alignItems:"center",gap:6,'
        'padding:"10px 24px",borderRadius:10,border:"none",'
        'background:"#1a56db",fontSize:13,fontWeight:600,'
        'color:"#fff",fontFamily:"Inter,sans-serif",cursor:"pointer"},'
        'children:[e.jsx("span",{children:"▶"})," Run Analysis"]})'
        ']})'   # close empty state
    )
    chk(EMPTY, 'EMPTY')

    # ── STATS BAR (balanced) ─────────────────────────────────────────────────
    STATS = (
        'e.jsxs("div",{style:{display:"flex",gap:0,'
        'borderTop:"1px solid #e5e7eb",background:"#f9fafb",'
        'overflowX:"auto",flexShrink:0},'
        'children:['
        '{lbl:"CRITICAL ENTITIES",val:cp_crit.length,sub:cp_crit.length+" zero-float",cl:"#dc2626",bg:"#fff0f0"},'
        '{lbl:"ZERO FLOAT",val:cp_crit.length,sub:"entities",cl:"#dc2626",bg:"#fff"},'
        '{lbl:"AVG FLOAT",'
        'val:(cp_all.filter(it=>cp_gfl(it)<999).length>0'
        '?Math.round(cp_totfl/cp_all.filter(it=>cp_gfl(it)<999).length):0)+"d",'
        'sub:"avg non-critical",cl:"#374151",bg:"#fff"},'
        '{lbl:"TOTAL FLOAT",val:cp_totfl+"d",sub:"across non-critical",cl:"#374151",bg:"#fff"},'
        '{lbl:"LONGEST CHAIN",val:cp_crit.length,sub:"entities",cl:"#374151",bg:"#fff"},'
        '{lbl:"PROJECT DURATION",val:cp_dur+"d",sub:"via CPM",cl:"#374151",bg:"#fff"},'
        '{lbl:"DELAYED CRITICAL",val:cp_overdue,'
        'sub:cp_overdue+" overdue",'
        'cl:cp_overdue>0?"#dc2626":"#16a34a",'
        'bg:cp_overdue>0?"#fff0f0":"#fff"}]'
        '.map((s,si)=>e.jsxs("div",{key:si,'
        'style:{flexShrink:0,padding:"8px 12px",'
        'borderRight:"1px solid #e5e7eb",'
        'background:s.bg,minWidth:90},'
        'children:['
        'e.jsx("div",{style:{fontSize:8,fontWeight:700,'
        'color:"#9ca3af",textTransform:"uppercase",'
        'letterSpacing:"0.4px",'
        'fontFamily:"Inter,sans-serif",marginBottom:2},'
        'children:s.lbl}),'
        'e.jsx("div",{style:{fontSize:16,fontWeight:700,'
        'color:s.cl,fontFamily:"Inter,sans-serif"},'
        'children:s.val}),'
        'e.jsx("div",{style:{fontSize:9,color:"#9ca3af",'
        'fontFamily:"Inter,sans-serif"},children:s.sub})'
        ']})' # close map item
        ')}'  # ) closes .map, } closes stats div props ... wait need ]}) not )}
        ')'   # close e.jsxs
    )
    # Let's check and fix STATS
    ob_s = STATS.count('{') - STATS.count('}')
    op_s = STATS.count('(') - STATS.count(')')
    # need to figure out correct close
    # STATS_BASE (everything except closing): let's compute
    STATS_BASE = (
        'e.jsxs("div",{style:{display:"flex",gap:0,'
        'borderTop:"1px solid #e5e7eb",background:"#f9fafb",'
        'overflowX:"auto",flexShrink:0},'
        'children:['
        '{lbl:"CRITICAL ENTITIES",val:cp_crit.length,sub:cp_crit.length+" zero-float",cl:"#dc2626",bg:"#fff0f0"},'
        '{lbl:"ZERO FLOAT",val:cp_crit.length,sub:"entities",cl:"#dc2626",bg:"#fff"},'
        '{lbl:"AVG FLOAT",'
        'val:(cp_all.filter(it=>cp_gfl(it)<999).length>0'
        '?Math.round(cp_totfl/cp_all.filter(it=>cp_gfl(it)<999).length):0)+"d",'
        'sub:"avg non-critical",cl:"#374151",bg:"#fff"},'
        '{lbl:"TOTAL FLOAT",val:cp_totfl+"d",sub:"across non-critical",cl:"#374151",bg:"#fff"},'
        '{lbl:"LONGEST CHAIN",val:cp_crit.length,sub:"entities",cl:"#374151",bg:"#fff"},'
        '{lbl:"PROJECT DURATION",val:cp_dur+"d",sub:"via CPM",cl:"#374151",bg:"#fff"},'
        '{lbl:"DELAYED CRITICAL",val:cp_overdue,'
        'sub:cp_overdue+" overdue",'
        'cl:cp_overdue>0?"#dc2626":"#16a34a",'
        'bg:cp_overdue>0?"#fff0f0":"#fff"}]'
        '.map((s,si)=>e.jsxs("div",{key:si,'
        'style:{flexShrink:0,padding:"8px 12px",'
        'borderRight:"1px solid #e5e7eb",'
        'background:s.bg,minWidth:90},'
        'children:['
        'e.jsx("div",{style:{fontSize:8,fontWeight:700,'
        'color:"#9ca3af",textTransform:"uppercase",'
        'letterSpacing:"0.4px",'
        'fontFamily:"Inter,sans-serif",marginBottom:2},'
        'children:s.lbl}),'
        'e.jsx("div",{style:{fontSize:16,fontWeight:700,'
        'color:s.cl,fontFamily:"Inter,sans-serif"},'
        'children:s.val}),'
        'e.jsx("div",{style:{fontSize:9,color:"#9ca3af",'
        'fontFamily:"Inter,sans-serif"},children:s.sub})'
        ']})' # close map item
    )
    ob_base = STATS_BASE.count('{') - STATS_BASE.count('}')
    op_base = STATS_BASE.count('(') - STATS_BASE.count(')')
    # Correct STATS: STATS_BASE + closing to balance
    # Need: ob=-ob_base, op=-op_base
    # closing: ) closes .map, } closes stats div children[, ) closes e.jsxs
    # Actually: after map item ]})  we need: ) close .map  then ] close children array...
    # wait children is an array literal [...].map() so no ] needed
    # children:[{...},...].map(...) - the [...].map() IS the children value
    # after map result: ] closes children prop array, } closes div props, ) closes e.jsxs
    # But [...] array literal is already closed by ] before .map
    # So: children: ARRAY.map(...)  => need } to close div props, ) to close e.jsxs
    # children:[{...},...].map() - the [...] array is closed before .map, so
    # after .map() we only need } (div props) and ) (e.jsxs) = })
    STATS = STATS_BASE + ')' + '})'
    chk(STATS, 'STATS')

    # ── ANALYSIS VIEW (balanced) ──────────────────────────────────────────────
    TIMELINE = (
        'e.jsx("div",{style:{flex:1,position:"relative",'
        'minHeight:34,overflow:"hidden"},'
        'children:e.jsx("div",{style:{position:"relative",'
        'height:"100%",minWidth:cp_cw},'
        'children:cp_mths.map((m,mi)=>e.jsx("div",{key:mi,'
        'style:{position:"absolute",left:m.left,'
        'width:m.width,height:"100%",'
        'display:"flex",alignItems:"center",'
        'borderRight:"1px solid #e5e7eb",'
        'fontSize:10,fontWeight:600,color:"#374151",'
        'fontFamily:"Inter,sans-serif",'
        'padding:"0 8px",overflow:"hidden",'
        'whiteSpace:"nowrap"},children:m.lbl})'
        ')'     # ) closes .map
        '})'    # } closes inner div props, ) closes inner e.jsx
        '})'    # } closes outer div props, ) closes outer e.jsx
    )
    chk(TIMELINE, 'TIMELINE')

    ANALYSIS = (
        'e.jsxs("div",{style:{flex:1,display:"flex",'
        'flexDirection:"column",overflow:"hidden"},'
        'children:['
        # col headers
        'e.jsxs("div",{style:{display:"flex",background:"#f9fafb",'
        'borderBottom:"1px solid #e5e7eb",flexShrink:0},'
        'children:['
        'e.jsxs("div",{style:{width:310,flexShrink:0,display:"flex",'
        'borderRight:"1px solid #e5e7eb"},'
        'children:['
        'e.jsx("div",{style:{flex:1,padding:"8px",'
        'fontSize:9,fontWeight:700,color:"#6b7280",'
        'textTransform:"uppercase",letterSpacing:"0.5px",'
        'fontFamily:"Inter,sans-serif"},children:"Structure"}),'
        'e.jsx("div",{style:{width:44,flexShrink:0,'
        'textAlign:"center",fontSize:9,fontWeight:700,'
        'color:"#6b7280",textTransform:"uppercase",'
        'letterSpacing:"0.5px",fontFamily:"Inter,sans-serif",'
        'padding:"8px 0"},children:"Type"}),'
        'e.jsx("div",{style:{width:52,flexShrink:0,'
        'textAlign:"center",fontSize:9,fontWeight:700,'
        'color:"#6b7280",textTransform:"uppercase",'
        'letterSpacing:"0.5px",fontFamily:"Inter,sans-serif",'
        'padding:"8px 0"},children:"Float ↑"}),'
        'e.jsx("div",{style:{width:60,flexShrink:0,'
        'textAlign:"center",fontSize:9,fontWeight:700,'
        'color:"#6b7280",textTransform:"uppercase",'
        'letterSpacing:"0.5px",fontFamily:"Inter,sans-serif",'
        'padding:"8px 0"},children:"Status"})'
        ']}),'   # close left header
        + TIMELINE +
        ']})'   # close col headers row
        ','
        # scroll body
        'e.jsx("div",{style:{flex:1,overflowY:"auto",overflowX:"auto"},'
        'children:e.jsx("div",{style:{minWidth:310+cp_cw},'
        'children:cp_tree(ne,0)})}'
        ')'     # close scroll body outer e.jsx
        ','
        + STATS +
        ']})'   # close analysis view children + e.jsxs
    )
    chk(ANALYSIS, 'ANALYSIS')

    # ── assemble full CP IIFE ─────────────────────────────────────────────────
    DATA = (
        'const cp_all=Z||[];'
        'const cp_ed=cp_all.reduce((mx,it)=>{'
        'if(!it.endDate)return mx;'
        'const d=new Date(it.endDate);return d>mx?d:mx;'
        '},new Date(0));'
        'const cp_sd=cp_all.reduce((mn,it)=>{'
        'if(!it.startDate)return mn;'
        'const d=new Date(it.startDate);return d<mn?d:mn;'
        '},new Date(cp_ed));'
        'const cp_ms=864e5;'
        'const cp_days=cp_ed>cp_sd?Math.ceil((cp_ed-cp_sd)/cp_ms):180;'
        'const cp_ppd=_cpScale==="weekly"?6:_cpScale==="quarterly"?2:_cpScale==="yearly"?0.8:4;'
        'const cp_cw=Math.max(480,cp_days*cp_ppd);'
        'const cp_gfl=it=>it.endDate?'
        'Math.round((cp_ed.getTime()-new Date(it.endDate).getTime())/cp_ms):999;'
        'const cp_bar=it=>{'
        'if(!it.startDate||!it.endDate)return null;'
        'const s=new Date(it.startDate),e2=new Date(it.endDate);'
        'const L=Math.max(0,(s.getTime()-cp_sd.getTime())/cp_ms*cp_ppd);'
        'const W2=Math.max(4,(e2.getTime()-s.getTime())/cp_ms*cp_ppd);'
        'return{left:L,width:W2};};'
        'const cp_fl=it=>{'
        'const fl2=cp_gfl(it);if(fl2<=0||fl2>=999)return null;'
        'const b2=cp_bar(it);if(!b2)return null;'
        'const fw=Math.min(fl2*cp_ppd,cp_cw-b2.left-b2.width);'
        'return fw>0?{left:b2.left+b2.width,width:fw}:null;};'
        'const cp_mths=[];'
        '{const mc=new Date(cp_sd);mc.setDate(1);'
        'while(mc<=cp_ed){'
        'const md=new Date(mc);'
        'const mn2=new Date(mc);mn2.setMonth(mn2.getMonth()+1);'
        'const mL=Math.max(0,(md.getTime()-cp_sd.getTime())/cp_ms*cp_ppd);'
        'const mW=(mn2.getTime()-cp_sd.getTime())/cp_ms*cp_ppd-mL;'
        'if(mW>0)cp_mths.push({lbl:md.toLocaleString("default",{month:"short",year:"numeric"}),left:mL,width:mW});'
        'mc.setMonth(mc.getMonth()+1);}}'
        'const cp_crit=cp_all.filter(it=>cp_gfl(it)<=0&&it.endDate);'
        'const cp_totfl=cp_all.reduce((s2,it)=>{const f=cp_gfl(it);return f<999?s2+f:s2;},0);'
        'const cp_dur=cp_days;'
        'const cp_overdue=cp_crit.filter(it=>it.endDate&&new Date(it.endDate)<new Date()).length;'
    )
    chk(DATA, 'DATA')

    TREE = (
        'const cp_tree=(items,dpt)=>'
        'items.reduce((acc,it)=>[...acc,cp_row(it,dpt),...cp_tree(z(it.id),dpt+1)],[]);'
    )

    CP_NEW = (
        CP_START
        + DATA
        + ROW
        + TREE
        + 'return e.jsxs("div",{style:{background:"#fff",minHeight:"100%",'
        'display:"flex",flexDirection:"column"},'
        'children:['
        + TOOLBAR + ','
        '!_cpAnalyzed?'
        + EMPTY + ':'
        + ANALYSIS
        + ']})'   # close outer return div
        '})()'    # call IIFE
        ','
    )

    ob_total = CP_NEW.count('{') - CP_NEW.count('}')
    op_total = CP_NEW.count('(') - CP_NEW.count(')')
    print(f'CP_NEW total: ob={ob_total}, op={op_total}')

    if ob_total != 0 or op_total != 0:
        errors.append('P5-balance'); print('P5: balance error')
    else:
        content = content[:start_idx] + CP_NEW + content[end_idx:]
        print('P5 CP redesign: replaced')

# ══════════════════════════════════════════════════════════════════════════════
# Verify & write
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
    print(f'{{ delta: {ob},  ( delta: {op}')
    if ob == 0 and op == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
