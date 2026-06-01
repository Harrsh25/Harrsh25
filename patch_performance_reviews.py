#!/usr/bin/env python3
"""Replace Performance Reviews tab with pixel-perfect UI."""
import subprocess, re, tempfile, os

with open('/home/user/Harrsh25/hrmobileapp.html', 'r', encoding='utf-8') as f:
    content = f.read()

def delta(s):
    return s.count('{')-s.count('}'), s.count('(')-s.count(')'), s.count('[')-s.count(']')

START_STR = '_tab==="reviews"&&e.jsxs("div",{className:"space-y-3"'
assert content.count(START_STR) == 1, 'START_STR not unique'
START = content.find(START_STR)

# Bracket-scan to find exact end of reviews tab JSX
seg = content[START:]
db = dp = ds = 0
ever = False
end_rel = None
for i, ch in enumerate(seg):
    if ch == '{': db += 1; ever = True
    elif ch == '}': db -= 1
    elif ch == '(': dp += 1; ever = True
    elif ch == ')': dp -= 1
    elif ch == '[': ds += 1; ever = True
    elif ch == ']': ds -= 1
    if ever and db == 0 and dp == 0 and ds == 0:
        end_rel = i + 1; break

assert end_rel, 'Could not find end'
END = START + end_rel
OLD = content[START:END]
ob_o, op_o, sq_o = delta(OLD)
print('OLD: len=%d delta: ob=%d op=%d sq=%d' % (len(OLD), ob_o, op_o, sq_o))

# ── STAR HELPER ───────────────────────────────────────────────────────────────
STAR_PTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

def star_svg(filled):
    if filled:
        return ('e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",'
                'fill:"#f59e0b",stroke:"#f59e0b",strokeWidth:1,'
                'children:e.jsx("polygon",{points:"'+STAR_PTS+'"})})')
    return ('e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",'
            'fill:"none",stroke:"#d1d5db",strokeWidth:1.5,'
            'children:e.jsx("svg",{children:e.jsx("polygon",{points:"'+STAR_PTS+'"})})})')

def stars_row(n, total=5):
    parts = []
    for i in range(total):
        if i < n:
            parts.append('e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",'
                'fill:"#f59e0b",stroke:"#f59e0b",strokeWidth:1,'
                'children:e.jsx("polygon",{points:"'+STAR_PTS+'"})})')
        else:
            parts.append('e.jsx("svg",{width:14,height:14,viewBox:"0 0 24 24",'
                'fill:"none",stroke:"#d1d5db",strokeWidth:1.5,'
                'children:e.jsx("polygon",{points:"'+STAR_PTS+'"})})')
    return ','.join(parts)

# ── CALENDAR SVG ──────────────────────────────────────────────────────────────
CAL_SVG = (
    'e.jsx("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",'
        'stroke:"#9ca3af",strokeWidth:2,'
        'children:e.jsxs("g",{children:['
            'e.jsx("rect",{x:3,y:4,width:18,height:18,rx:2,ry:2}),'
            'e.jsx("line",{x1:16,y1:2,x2:16,y2:6}),'
            'e.jsx("line",{x1:8,y1:2,x2:8,y2:6}),'
            'e.jsx("line",{x1:3,y1:10,x2:21,y2:10})'
        ']})})'
)

# ── SECTION HEADER ────────────────────────────────────────────────────────────
def section_header(icon_svg, title, view_all=True):
    right = ('e.jsx("button",{style:{fontSize:12,fontWeight:600,color:"#1a56db",'
        'background:"none",border:"none",cursor:"pointer"},children:"View All"})' if view_all else '')
    return (
        'e.jsxs("div",{style:{display:"flex",alignItems:"center",'
            'justifyContent:"space-between"},children:['
            'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:['
                + icon_svg + ','
                'e.jsx("span",{style:{fontSize:15,fontWeight:700,color:"#111827"},'
                    'children:"'+title+'"})'
            ']})' + (',' + right if view_all else '') +
        ']})'
    )

# ── FEEDBACK CARD ─────────────────────────────────────────────────────────────
def feedback_card(name, role, av_color, initials, badge, n_stars, comment, date):
    bc = '#1a56db' if badge == 'Manager' else '#16a34a'
    bb = '#eff4ff' if badge == 'Manager' else '#f0fdf4'
    return (
        'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
            'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
            # top row: avatar + info
            'e.jsxs("div",{style:{display:"flex",gap:12,marginBottom:12},children:['
                # avatar
                'e.jsx("div",{style:{width:54,height:54,borderRadius:"50%",background:"'+av_color+'",'
                    'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
                    'children:e.jsx("span",{style:{fontSize:17,fontWeight:700,color:"#fff"},'
                        'children:"'+initials+'"})}),'
                # name / role / badge
                'e.jsxs("div",{style:{flex:1},children:['
                    'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",'
                        'justifyContent:"space-between",marginBottom:2},children:['
                        'e.jsxs("div",{children:['
                            'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",margin:"0 0 1px"},'
                                'children:"'+name+'"}),'
                            'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:0},'
                                'children:"'+role+'"})'
                        ']}),'
                        'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
                            'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"'+bc+'",'
                                'background:"'+bb+'",borderRadius:20,padding:"3px 10px",'
                                'border:"1px solid '+bc+'"},children:"'+badge+'"}),'
                            'e.jsx("span",{style:{fontSize:18,color:"#9ca3af",lineHeight:1,'
                                'cursor:"pointer"},children:"\\u22EE"})'
                        ']})'
                    ']})'
                ']})'
            ']}),'
            # stars
            'e.jsxs("div",{style:{display:"flex",gap:2,marginBottom:10},children:['
            + stars_row(n_stars) +
            ']}),'
            # comment + big quote mark
            'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",marginBottom:10},children:['
                'e.jsx("p",{style:{flex:1,fontSize:13,color:"#374151",lineHeight:1.55,margin:0},'
                    'children:"'+comment+'"}),'
                'e.jsx("span",{style:{fontSize:36,fontWeight:900,color:"#7c3aed",'
                    'lineHeight:0.7,opacity:0.22,flexShrink:0,marginLeft:8},'
                    'children:"\\u201C"})'
            ']}),'
            # date
            'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:['
                + CAL_SVG + ','
                'e.jsx("span",{style:{fontSize:11,color:"#9ca3af"},children:"'+date+'"})'
            ']})'
        ']})'
    )

# ── SPEECH BUBBLE ICON ────────────────────────────────────────────────────────
BUBBLE_ICON = (
    'e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",'
        'stroke:"#7c3aed",strokeWidth:2,'
        'children:e.jsx("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"})})'
)

# ── TARGET / BULLSEYE ICON ────────────────────────────────────────────────────
TARGET_ICON = (
    'e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",'
        'stroke:"#7c3aed",strokeWidth:2,'
        'children:e.jsxs("g",{children:['
            'e.jsx("circle",{cx:12,cy:12,r:10}),'
            'e.jsx("circle",{cx:12,cy:12,r:6}),'
            'e.jsx("circle",{cx:12,cy:12,r:2})'
        ']})})'
)

# ── PEOPLE ICON ───────────────────────────────────────────────────────────────
PEOPLE_ICON = (
    'e.jsx("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",'
        'stroke:"#1a56db",strokeWidth:2,'
        'children:e.jsxs("g",{children:['
            'e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),'
            'e.jsx("circle",{cx:9,cy:7,r:4}),'
            'e.jsx("path",{d:"M23 21v-2a4 4 0 0 0-3-3.87"}),'
            'e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})'
        ']})})'
)

# ── FEEDBACK SECTION ──────────────────────────────────────────────────────────
FEED_HDR = section_header(BUBBLE_ICON, 'Feedback')

CARD1 = feedback_card(
    'Marcus Rivera', 'Project Director', '#7c3aed', 'MR',
    'Manager', 4,
    'Excellent commitment to safety protocols. Documentation is consistently strong. Cross-team communication could be more proactive.',
    '2026-05-15'
)
CARD2 = feedback_card(
    'Priya Kapoor', 'HR Manager', '#f59e0b', 'PK',
    'Manager', 4,
    'Outstanding contribution to HR Orbit Development. Delivered high-quality work and supported team effectively.',
    '2026-04-28'
)
CARD3 = feedback_card(
    'Arjun Sharma', 'Senior Engineer', '#16a34a', 'AS',
    'Peer', 3,
    'Great collaboration on Office Relocation. Always available to help.',
    '2026-04-10'
)
print('FEED_HDR delta:', delta(FEED_HDR))
print('CARD1 delta:', delta(CARD1))
print('CARD2 delta:', delta(CARD2))
print('CARD3 delta:', delta(CARD3))

# ── MANAGER REVIEW SECTION ────────────────────────────────────────────────────
MGR_HDR = section_header(TARGET_ICON, 'Manager Review')

SKILL_TAGS = ['Technical','Communication','Teamwork','Delivery','Initiative']
SKILL_CHIPS = ','.join([
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#7c3aed",'
        'background:"#faf5ff",borderRadius:20,padding:"4px 10px",'
        'border:"1px solid #ddd6fe"},children:"'+s+'"})' for s in SKILL_TAGS
])

MGR_CARD = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
        'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
        'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14},children:['
            # clipboard icon box
            'e.jsx("div",{style:{width:52,height:52,borderRadius:14,background:"#ede9fe",'
                'display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},'
                'children:e.jsx("svg",{width:24,height:24,viewBox:"0 0 24 24",fill:"none",'
                    'stroke:"#7c3aed",strokeWidth:2,'
                    'children:e.jsxs("g",{children:['
                        'e.jsx("rect",{x:9,y:2,width:6,height:4,rx:1}),'
                        'e.jsx("path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}),'
                        'e.jsx("line",{x1:9,y1:12,x2:15,y2:12}),'
                        'e.jsx("line",{x1:9,y1:16,x2:13,y2:16})'
                    ']})})})'
            ','
            # title + byline
            'e.jsxs("div",{style:{flex:1},children:['
                'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",margin:"0 0 3px"},'
                    'children:"Q1 2026 Annual Review"}),'
                'e.jsx("p",{style:{fontSize:12,color:"#6b7280",margin:0},'
                    'children:"by Marcus Rivera"})'
            ']}),'
            # rating
            'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:['
                'e.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"#f59e0b",'
                    'stroke:"#f59e0b",strokeWidth:1,'
                    'children:e.jsx("polygon",{points:"'+STAR_PTS+'"})}),'
                'e.jsxs("span",{style:{fontSize:14,fontWeight:700,color:"#111827"},children:['
                    '"4.0",'
                    'e.jsx("span",{style:{fontSize:12,fontWeight:400,color:"#6b7280"},children:" / 5"})'
                ']})'
            ']})'
        ']}),'
        # skill tags
        'e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:6},children:['
        + SKILL_CHIPS +
        ']})'
    ']})'
)
print('MGR_HDR delta:', delta(MGR_HDR))
print('MGR_CARD delta:', delta(MGR_CARD))

# ── 360° REVIEWS SECTION ──────────────────────────────────────────────────────
R360_HDR = section_header(PEOPLE_ICON, '360° Reviews')

TAGS_360 = ['Leadership','Collaboration','Problem Solving','Communication']
CHIPS_360 = ','.join([
    'e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"#1a56db",'
        'background:"#eff4ff",borderRadius:20,padding:"4px 10px",'
        'border:"1px solid #bfdbfe"},children:"'+s+'"})' for s in TAGS_360
])

STAT_ITEMS = [
    # icon_svg, number, label, extra_style
    # People icon
    ('e.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"#7c3aed",strokeWidth:2,'
     'children:e.jsxs("g",{children:['
     'e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),'
     'e.jsx("circle",{cx:9,cy:7,r:4})]})})',
     '12', 'Reviewers', '#7c3aed'),
    # Checkmark circle
    ('e.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"#16a34a",strokeWidth:2,'
     'children:e.jsxs("g",{children:['
     'e.jsx("circle",{cx:12,cy:12,r:10}),'
     'e.jsx("polyline",{points:"9 12 11 14 15 10"})]})})' ,
     '10', 'Completed', '#16a34a'),
    # Clock
    ('e.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"#f59e0b",strokeWidth:2,'
     'children:e.jsxs("g",{children:['
     'e.jsx("circle",{cx:12,cy:12,r:10}),'
     'e.jsx("polyline",{points:"12 6 12 12 16 14"})]})})' ,
     '2', 'Pending', '#f59e0b'),
]

STAT_COLS = ','.join([
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:3},children:['
        + icon + ','
        'e.jsx("span",{style:{fontSize:15,fontWeight:800,color:"'+col+'"},children:"'+num+'"}),'
        'e.jsx("span",{style:{fontSize:10,color:"#6b7280",fontWeight:500},children:"'+lbl+'"})'
    ']})' for icon, num, lbl, col in STAT_ITEMS
])

DATE_COL = (
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:2},children:['
        + CAL_SVG + ','
        'e.jsx("span",{style:{fontSize:10,color:"#6b7280",fontWeight:500},children:"Completed on"}),'
        'e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#111827"},children:"May 10, 2026"})'
    ']})'
)

CARD_360 = (
    'e.jsxs("div",{style:{background:"#fff",borderRadius:16,padding:"16px",'
        'border:"1px solid #f0f1f4",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},children:['
        # top: 360 circle + title/stars/tags
        'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14},children:['
            # 360 circle badge
            'e.jsx("div",{style:{width:52,height:52,borderRadius:"50%",background:"#eff4ff",'
                'border:"2px solid #1a56db",display:"flex",alignItems:"center",'
                'justifyContent:"center",flexShrink:0},'
                'children:e.jsx("span",{style:{fontSize:14,fontWeight:900,color:"#1a56db"},'
                    'children:"360"})}),'
            # title + stars + tags
            'e.jsxs("div",{style:{flex:1},children:['
                'e.jsx("p",{style:{fontSize:14,fontWeight:700,color:"#111827",margin:"0 0 6px"},'
                    'children:"Q1 2026 • 360° Feedback"}),'
                'e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:8},children:['
                    'e.jsxs("div",{style:{display:"flex",gap:2},children:['
                    + stars_row(4) +
                    ']}),'
                    'e.jsxs("span",{style:{fontSize:12,fontWeight:700,color:"#111827"},children:['
                        '"4.1",'
                        'e.jsx("span",{style:{fontSize:11,fontWeight:400,color:"#6b7280"},children:" / 5"})'
                    ']})'
                ']}),'
                'e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:6},children:['
                + CHIPS_360 +
                ']})'
            ']})'
        ']}),'
        # divider
        'e.jsx("div",{style:{height:1,background:"#f0f1f4",margin:"0 0 12px"}}),'
        # stats row
        'e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between"},children:['
        + STAT_COLS + ',' + DATE_COL +
        ']})'
    ']})'
)
print('R360_HDR delta:', delta(R360_HDR))
print('CARD_360 delta:', delta(CARD_360))

# ── ASSEMBLE ──────────────────────────────────────────────────────────────────
NEW_VIEW = (
    'e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,padding:"4px 0 0"},children:['
    + FEED_HDR + ','
    + CARD1 + ','
    + CARD2 + ','
    + CARD3 + ','
    + MGR_HDR + ','
    + MGR_CARD + ','
    + R360_HDR + ','
    + CARD_360
    + ']})'
)
ob_v, op_v, sq_v = delta(NEW_VIEW)
print('NEW_VIEW delta:', ob_v, op_v, sq_v)
if ob_v != 0 or op_v != 0 or sq_v != 0:
    print('IMBALANCED'); exit(1)

NEW = '_tab==="reviews"&&' + NEW_VIEW
ob_n, op_n, sq_n = delta(NEW)
if (ob_n, op_n, sq_n) != (ob_o, op_o, sq_o):
    print('DELTA MISMATCH:', ob_n, op_n, sq_n, 'vs', ob_o, op_o, sq_o); exit(1)

content2 = content[:START] + NEW + content[END:]
ob_g, op_g, sq_g = delta(content2)
print('global:', ob_g, op_g, sq_g)
if ob_g != 0 or op_g != 0 or sq_g != 0:
    print('GLOBAL IMBALANCE'); exit(1)

m_re = re.search(r'<script[^>]*>([\s\S]*?)</script>', content2)
script = m_re.group(1) if m_re else content2
with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as tf:
    tf.write('try{new Function('+repr(script)+')}catch(e){process.stdout.write("ERR:"+e.message)}\nprocess.stdout.write("OK")')
    tname = tf.name
r = subprocess.run(['node', tname], capture_output=True, text=True)
os.unlink(tname)
node_out = r.stdout + r.stderr
print('Node:', node_out[:140])
if 'OK' in node_out and 'ERR' not in node_out:
    with open('/home/user/Harrsh25/hrmobileapp.html', 'w', encoding='utf-8') as f:
        f.write(content2)
    print('Done.')
else:
    print('Node FAILED')
