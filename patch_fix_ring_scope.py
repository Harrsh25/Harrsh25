#!/usr/bin/env python3
"""
Fix: _mhRing was injected into wrong function scope.
1. Remove it from the wrong location
2. Re-inject it before the correct Bm() return statement
"""
import subprocess

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

RING_DEF = (
    'var _mhRing=function(pct,r,stroke,bg,sw){'
    'var c=2*Math.PI*r,off=c*(1-Math.min(pct,100)/100),sz=(r+sw)*2;'
    'return e.jsxs("svg",{width:sz,height:sz,viewBox:"0 0 "+sz+" "+sz,'
    'style:{transform:"rotate(-90deg)"},children:['
    'e.jsx("circle",{cx:sz/2,cy:sz/2,r:r,fill:"none",stroke:bg,strokeWidth:sw}),'
    'e.jsx("circle",{cx:sz/2,cy:sz/2,r:r,fill:"none",stroke:stroke,strokeWidth:sw,'
    'strokeDasharray:c,strokeDashoffset:off,strokeLinecap:"round"})'
    ']});'
    '};'
)

# ── Patch A: remove _mhRing from wrong location ─────────────────────────────
# It was injected before a non-Bm return statement
WRONG_OLD = RING_DEF + 'return e.jsxs("div",{className:"screen",style:{background:"#ffffff"'
WRONG_NEW = 'return e.jsxs("div",{className:"screen",style:{background:"#ffffff"'

if WRONG_OLD in content:
    content = content.replace(WRONG_OLD, WRONG_NEW, 1)
    print('A remove wrong _mhRing: OK')
else:
    errors.append('A'); print('A: FAIL - wrong ring not found')

# ── Patch B: inject _mhRing before correct Bm() return ──────────────────────
# Unique anchor: the x=ci... expression just before Bm's return
CORRECT_OLD = 'p=["All","HR Module","ERP System","Office Relocation"],x=ci==="all"?f:f.filter(h=>h.project===ci);return e.jsxs("div",{className:"screen",style:{background:"#ffffff"}'
CORRECT_NEW = 'p=["All","HR Module","ERP System","Office Relocation"],x=ci==="all"?f:f.filter(h=>h.project===ci);' + RING_DEF + 'return e.jsxs("div",{className:"screen",style:{background:"#ffffff"}'

if CORRECT_OLD in content:
    content = content.replace(CORRECT_OLD, CORRECT_NEW, 1)
    print('B inject _mhRing in Bm: OK')
else:
    errors.append('B'); print('B: FAIL - correct anchor not found')

if errors:
    print('ERRORS:', errors)
else:
    # Validate bracket balance
    ob = content.count('{') - content.count('}')
    op = content.count('(') - content.count(')')
    sq = content.count('[') - content.count(']')
    print('delta: ob=%d op=%d sq=%d' % (ob, op, sq))
    if ob != 0 or op != 0 or sq != 0:
        print('BRACKET IMBALANCE - aborting')
    else:
        # Write temp file and check with Node
        import re, tempfile, os
        m = re.search(r'<script[^>]*>([\s\S]*?)</script>', content)
        script = m.group(1) if m else content
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as tf:
            tf.write('try{new Function(' + repr(script) + ')}catch(e){process.stdout.write("ERR:"+e.message)}\nprocess.stdout.write("OK")')
            tname = tf.name
        r = subprocess.run(['node', tname], capture_output=True, text=True)
        os.unlink(tname)
        node_out = r.stdout + r.stderr
        print('Node:', node_out[:80])
        if 'OK' in node_out and 'ERR' not in node_out:
            with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
                f.write(content)
            print('Done.')
        else:
            print('Node check FAILED - not writing')
