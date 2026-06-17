import re
import os
from graphviz import Digraph

SRC = '/home/user/Harrsh25/create_distribution_doc.py'
OUTDIR = '/home/user/Harrsh25/flowcharts'
os.makedirs(OUTDIR, exist_ok=True)

C_START = '#0F3460'
C_END = '#0F3460'
C_SEQ = '#0f3460'
C_PAR = '#533483'
C_TEXT_LIGHT = '#FFFFFF'

text = open(SRC).read()
parts = re.split(r'# WORKFLOW (\d+)\n', text)
# parts: [pre, '1', block1, '2', block2, ...]
workflows = []
for i in range(1, len(parts), 2):
    num = parts[i]
    block = parts[i + 1]
    title_m = re.search(r"'title':\s*'([^']*)'", block)
    if not title_m:
        continue
    title = title_m.group(1)
    subs = re.findall(r"\(\s*'([\d]+\.[\d]+[^']*)',", block)
    workflows.append((int(num), title, subs))

print(f'Parsed {len(workflows)} workflows')

for num, title, subs in workflows:
    short_title = title.split(':', 1)[-1].strip()
    g = Digraph('G', format='png')
    g.attr(rankdir='TB', splines='ortho', bgcolor='white')
    g.attr('node', fontname='Helvetica', fontsize='10')
    g.attr('edge', color='#888888')
    g.attr(label=f'WORKFLOW {num}: {short_title}', labelloc='t', fontsize='16', fontname='Helvetica-Bold', fontcolor=C_START)

    g.node('start', 'START', shape='oval', style='filled', fillcolor=C_START, fontcolor=C_TEXT_LIGHT)
    prev = 'start'
    for idx, sub in enumerate(subs):
        node_id = f'n{idx}'
        label = sub.split('–')[0].strip()
        label = '\\n'.join(re.findall(r'.{1,32}(?:\s|$)', label))
        is_parallel = 'parallel' in sub.lower()
        color = C_PAR if is_parallel else C_SEQ
        shape = 'box'
        g.node(node_id, label, shape=shape, style='filled,rounded', fillcolor=color, fontcolor=C_TEXT_LIGHT)
        g.edge(prev, node_id)
        prev = node_id
    g.node('end', 'END', shape='oval', style='filled', fillcolor=C_END, fontcolor=C_TEXT_LIGHT)
    g.edge(prev, 'end')

    outpath = os.path.join(OUTDIR, f'section_{num:02d}')
    g.render(outpath, cleanup=True)
    print(f'Generated {outpath}.png ({len(subs)} steps)')

print('Done.')
