"""Tiny helper: exact-once replacement with a clear failure message."""
import sys
P = '/home/user/Harrsh25/wfm-prototype/src/app.js'
def load(): return open(P).read()
def save(s): open(P, 'w').write(s)
def rep(s, old, new, count=1, label=''):
    n = s.count(old)
    if n != count:
        raise SystemExit(f'PATCH FAIL [{label}]: expected {count} occurrence(s), found {n}\n---\n{old[:300]}')
    return s.replace(old, new)
