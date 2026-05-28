#!/usr/bin/env python3
"""Fix white screen: p.sub.map → (p.sub||[]).map so il items without .sub don't crash"""
import subprocess, re

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

OLD = 'rows=rows.concat(p.sub.map(function(s,si)'
NEW = 'rows=rows.concat((p.sub||[]).map(function(s,si)'

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    print('fix: OK')
else:
    print('FAIL: not found')
    exit(1)

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
