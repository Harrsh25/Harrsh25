#!/usr/bin/env python3
"""
Team tab: remove stat cards from main tab, add them to proj-team view
+ Add Member button in proj-team view + cleaner back button
"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

def chk(name, s):
    ob = s.count('{') - s.count('}')
    op = s.count('(') - s.count(')')
    sq = s.count('[') - s.count(']')
    print('  %s: ob=%d op=%d sq=%d len=%d' % (name, ob, op, sq, len(s)))
    return (ob, op, sq)

def chk_pair(old_name, old_s, new_name, new_s):
    ob1, op1, sq1 = chk(old_name, old_s)
    ob2, op2, sq2 = chk(new_name, new_s)
    if (ob1, op1, sq1) != (ob2, op2, sq2):
        print('PAIR MISMATCH %s vs %s' % (old_name, new_name))
        errors.append(old_name)

# ── A: Remove stat cards from Team tab (keep only project list) ────────────
OLD_TEAM_STATS = (
    'i==="team"&&e.jsxs(e.Fragment,{children:['
    'e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:['
    'e.jsxs("div",{className:"card p-3 text-center",children:['
    'e.jsx("p",{className:"text-xl font-bold text-blue-600",children:j.length}),'
    'e.jsx("p",{className:"text-[9px] text-neutral-500",children:"Team Size"})]})'
    ',e.jsxs("div",{className:"card p-3 text-center",children:['
    'e.jsx("p",{className:"text-xl font-bold text-emerald-600",'
    'children:j.filter(function(h){return h.status==="present";}).length}),'
    'e.jsx("p",{className:"text-[9px] text-neutral-500",children:"Present Today"})]})'
    ',e.jsxs("div",{className:"card p-3 text-center",children:['
    'e.jsx("p",{className:"text-xl font-bold text-amber-600",'
    'children:m.filter(function(h){return h.status==="pending";}).length}),'
    'e.jsx("p",{className:"text-[9px] text-neutral-500",children:"Pending"})]})'
    ']})'
    ',e.jsx("h3",{className:"text-xs font-semibold text-neutral-700 mt-2",children:"Team by Project"})'
    ',il.map('
)

NEW_TEAM_STATS = (
    'i==="team"&&e.jsxs(e.Fragment,{children:['
    'e.jsx("h3",{className:"text-xs font-semibold text-neutral-700 mt-2",children:"Team by Project"})'
    ',il.map('
)

chk_pair('OLD_TEAM_STATS', OLD_TEAM_STATS, 'NEW_TEAM_STATS', NEW_TEAM_STATS)
if OLD_TEAM_STATS in content:
    content = content.replace(OLD_TEAM_STATS, NEW_TEAM_STATS, 1)
    print('A team stat cards removed: OK')
else:
    errors.append('A'); print('A: FAIL not found')

# ── B: Replace proj-team view with stats cards + add member + member list ──
OLD_PROJ = (
    '_mhView==="proj-team"&&_mhSelProj?e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"16px 16px 80px"},children:'
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10},children:['
    'e.jsxs("div",{style:{background:"#EFF4FF",borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:['
    'e.jsxs("span",{style:{fontSize:11,color:"#1a56db",fontWeight:600},children:['
    'j.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0;}).length,'
    '" member",j.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0;}).length===1?"":"s"," assigned"]})'
    ',e.jsx("span",{style:{fontSize:10,background:"#1a56db",color:"#fff",padding:"2px 8px",borderRadius:6},children:_mhSelProj.status})]}),'
)

NEW_PROJ = (
    '_mhView==="proj-team"&&_mhSelProj?e.jsx("div",{style:{flex:1,overflowY:"auto",padding:"16px 16px 80px"},children:'
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10},children:['
    # --- 3 stat cards row ---
    'e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:2},children:['
    'e.jsxs("div",{style:{background:"#EFF4FF",borderRadius:12,padding:"10px 8px",textAlign:"center"},children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#1a56db"},'
    'children:j.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0;}).length}),'
    'e.jsx("p",{style:{fontSize:9,color:"#1a56db",fontWeight:500,marginTop:2},children:"Working"})]}),'
    'e.jsxs("div",{style:{background:"#f0fdf4",borderRadius:12,padding:"10px 8px",textAlign:"center"},children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#16a34a"},'
    'children:j.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0&&h.status==="present";}).length}),'
    'e.jsx("p",{style:{fontSize:9,color:"#16a34a",fontWeight:500,marginTop:2},children:"Present"})]}),'
    'e.jsxs("div",{style:{background:"#fefce8",borderRadius:12,padding:"10px 8px",textAlign:"center"},children:['
    'e.jsx("p",{style:{fontSize:18,fontWeight:800,color:"#d97706"},'
    'children:j.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0;}).reduce(function(s,h){return s+(h.tasks-h.completedTasks);},0)}),'
    'e.jsx("p",{style:{fontSize:9,color:"#d97706",fontWeight:500,marginTop:2},children:"Pending Tasks"})]}),'
    ']}),'
    # --- Add Member button ---
    'e.jsxs("button",{style:{display:"flex",alignItems:"center",justifyContent:"center",gap:6,'
    'background:"#1a56db",color:"#fff",border:"none",borderRadius:10,padding:"10px 0",'
    'fontSize:12,fontWeight:600,cursor:"pointer",width:"100%"},children:['
    'e.jsx("span",{style:{fontSize:16,lineHeight:1},children:"+"}),'
    'e.jsx("span",{children:"Add Member"})]}),'
    # --- Members heading ---
    'e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:['
    'e.jsx("p",{style:{fontSize:11,fontWeight:700,color:"#374151"},children:"Members"}),'
    'e.jsxs("span",{style:{fontSize:10,background:"#EFF4FF",color:"#1a56db",padding:"2px 8px",borderRadius:6,fontWeight:600},'
    'children:[j.filter(function(h){return h.projects&&h.projects.indexOf(_mhSelProj.name)>=0;}).length," total"]})]}),'
)

chk_pair('OLD_PROJ', OLD_PROJ, 'NEW_PROJ', NEW_PROJ)
if OLD_PROJ in content:
    content = content.replace(OLD_PROJ, NEW_PROJ, 1)
    print('B proj-team stats + add member: OK')
else:
    errors.append('B'); print('B: FAIL not found')

# ── C: Cleaner back button (simple arrow, no circle) ──────────────────────
OLD_BTN = (
    'e.jsx("button",{onClick:()=>_mhSetView("main"),style:{width:32,height:32,'
    'borderRadius:"50%",border:"1px solid #e5e7eb",background:"#fff",'
    'display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},'
    'children:e.jsx(Ui,{size:16,style:{color:"#374151"}})})'
)
NEW_BTN = (
    'e.jsx("button",{onClick:()=>_mhSetView("main"),style:{background:"none",'
    'border:"none",padding:"0 8px 0 0",cursor:"pointer",display:"flex",'
    'alignItems:"center",color:"#374151"},'
    'children:e.jsx(Ui,{size:22,style:{color:"#111827"}})})'
)

chk_pair('OLD_BTN', OLD_BTN, 'NEW_BTN', NEW_BTN)
if OLD_BTN in content:
    content = content.replace(OLD_BTN, NEW_BTN, 1)
    print('C back button: OK')
else:
    errors.append('C'); print('C: FAIL not found')

# ── Validate ──────────────────────────────────────────────────────────────
print()
if errors:
    print('FAILED:', errors)
else:
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    with open('/tmp/chk_team_proj.js', 'w') as f:
        f.write(scripts[0])
    r = subprocess.run(
        ['node', '-e',
         'try{new Function(require("fs").readFileSync("/tmp/chk_team_proj.js","utf8"));'
         'process.stdout.write("OK");}catch(e){process.stdout.write("ERR:"+e.message);}'],
        capture_output=True, text=True)
    print('Node check:', r.stdout)
    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    sq = content.count('[') - content.count(']')
    print('File delta: ob=%d op=%d sq=%d' % (ob, op, sq))
    if ob == 0 and op == 0 and sq == 0 and r.stdout == 'OK':
        with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Done.')
    else:
        print('NOT written.')
        if r.stdout != 'OK':
            print('Node error:', r.stdout[:400])
