import re

with open('hrmobileapp.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Safe non-cascading approach: use a single regex pass
# Map each source size to its target in one substitution
inline_map = {
    32: 24,
    28: 20,
    24: 18,
    20: 15,
    16: 14,
    15: 13,
}

def replace_inline_size(m):
    n = int(m.group(1))
    return f'fontSize:{inline_map.get(n, n)}'

html = re.sub(r'fontSize:(\d+)', replace_inline_size, html)

# CSS rules (separate, no cascade risk since they use different syntax)
# .screen-header h1: font-size:20px -> 15px
html = html.replace('font-size:20px', 'font-size:15px')
# Tailwind text-lg: 1.25rem (20px) -> 0.9375rem (15px)
html = html.replace('font-size:1.25rem', 'font-size:0.9375rem')
# CSS with space: font-size: 16px -> 14px
html = html.replace('font-size: 16px', 'font-size: 14px')

with open('hrmobileapp.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Done. New distribution:")
import subprocess
result = subprocess.run(['grep', '-o', r'fontSize:[0-9]*', 'hrmobileapp.html'], capture_output=True, text=True)
from collections import Counter
counts = Counter(result.stdout.strip().split('\n'))
for k, v in sorted(counts.items(), key=lambda x: -x[1]):
    print(f"  {k}: {v}")
