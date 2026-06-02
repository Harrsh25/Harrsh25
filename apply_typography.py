#!/usr/bin/env python3
"""
Enterprise SaaS Typography System Migration
Applies all 7 phases to hrmobileapp.html
"""

import re

FILE_PATH = '/home/user/Harrsh25/hrmobileapp.html'

print("Reading file...")
with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File size: {len(content):,} bytes")

counts = {}

# ─────────────────────────────────────────────
# PHASE 1 — FONT SIZE: Make 13px the dominant body text
# ─────────────────────────────────────────────
print("\n=== PHASE 1: Font Size ===")

# We need to find fontSize:12 followed by comma or } BUT NOT
# when it's immediately followed by (within the same style object) fontWeight:400 AND color:"#9ca3af"
# Strategy: do a regex replacement that checks lookahead context

def replace_fontsize_12(content):
    """
    Replace fontSize:12, and fontSize:12} with fontSize:13, and fontSize:13}
    EXCEPT when fontSize:12 is followed within ~100 chars by both fontWeight:400 and color:"#9ca3af"
    """
    count = 0

    # Pattern to find fontSize:12 followed by comma or closing brace
    pattern = re.compile(r'fontSize:12([,}])')

    result = []
    last_end = 0

    for m in pattern.finditer(content):
        start = m.start()
        end = m.end()

        # Check the surrounding context (100 chars after) for the exception pattern
        context_after = content[end:end+150]

        # Exception: if within 150 chars we see both fontWeight:400 AND color:"#9ca3af"
        has_weight_400 = 'fontWeight:400' in context_after
        has_gray_color = 'color:"#9ca3af"' in context_after or "color:'#9ca3af'" in context_after

        if has_weight_400 and has_gray_color:
            # Keep as-is
            result.append(content[last_end:end])
        else:
            # Replace
            result.append(content[last_end:start])
            result.append(f'fontSize:13{m.group(1)}')
            count += 1

        last_end = end

    result.append(content[last_end:])
    return ''.join(result), count

content, c1a = replace_fontsize_12(content)
counts['P1a fontSize:12→13 (inline comma/brace)'] = c1a

# Tailwind custom text-[12px] → text-[13px]
c1b = content.count('text-[12px]')
content = content.replace('text-[12px]', 'text-[13px]')
counts['P1b text-[12px]→text-[13px]'] = c1b

print(f"  P1a fontSize:12→13: {c1a}")
print(f"  P1b text-[12px]→text-[13px]: {c1b}")

# ─────────────────────────────────────────────
# PHASE 2 — FONT WEIGHT: Remove aggressive weights
# ─────────────────────────────────────────────
print("\n=== PHASE 2: Font Weight ===")

# fontWeight:800 → fontWeight:700 (comma and brace endings)
c2a_comma = content.count('fontWeight:800,')
c2a_brace = content.count('fontWeight:800}')
content = content.replace('fontWeight:800,', 'fontWeight:700,')
content = content.replace('fontWeight:800}', 'fontWeight:700}')
c2a = c2a_comma + c2a_brace
counts['P2a fontWeight:800→700'] = c2a

# fontWeight:900 → fontWeight:700 (comma and brace endings)
c2b_comma = content.count('fontWeight:900,')
c2b_brace = content.count('fontWeight:900}')
content = content.replace('fontWeight:900,', 'fontWeight:700,')
content = content.replace('fontWeight:900}', 'fontWeight:700}')
c2b = c2b_comma + c2b_brace
counts['P2b fontWeight:900→700'] = c2b

print(f"  P2a fontWeight:800→700: {c2a}")
print(f"  P2b fontWeight:900→700: {c2b}")

# ─────────────────────────────────────────────
# PHASE 3 — LINE HEIGHT: Fix broken line heights
# ─────────────────────────────────────────────
print("\n=== PHASE 3: Line Height ===")

def replace_lineheight_1(content):
    """
    Replace lineHeight:1, and lineHeight:1} with lineHeight:1.5, and lineHeight:1.5}
    EXCEPTION: keep lineHeight:1 when within 30 chars of fontWeight:900 or fontWeight:300
    """
    count_kept = 0
    count_replaced = 0

    # Match lineHeight:1 followed by comma or brace (but NOT lineHeight:1.something)
    pattern = re.compile(r'lineHeight:1([,}])')

    result = []
    last_end = 0

    for m in pattern.finditer(content):
        start = m.start()
        end = m.end()

        # Check ±30 chars around the match
        ctx_start = max(0, start - 30)
        ctx_end = min(len(content), end + 30)
        context = content[ctx_start:ctx_end]

        # Exception: near fontWeight:900 or fontWeight:300
        if 'fontWeight:900' in context or 'fontWeight:300' in context:
            # Keep as-is
            result.append(content[last_end:end])
            count_kept += 1
        else:
            result.append(content[last_end:start])
            result.append(f'lineHeight:1.5{m.group(1)}')
            count_replaced += 1

        last_end = end

    result.append(content[last_end:])
    return ''.join(result), count_replaced, count_kept

content, c3a, c3a_kept = replace_lineheight_1(content)
counts['P3a lineHeight:1→1.5 (replaced)'] = c3a
counts['P3a lineHeight:1 kept (exception)'] = c3a_kept

# lineHeight:1.1 → lineHeight:1.4
c3b_comma = content.count('lineHeight:1.1,')
c3b_brace = content.count('lineHeight:1.1}')
content = content.replace('lineHeight:1.1,', 'lineHeight:1.4,')
content = content.replace('lineHeight:1.1}', 'lineHeight:1.4}')
c3b = c3b_comma + c3b_brace
counts['P3b lineHeight:1.1→1.4'] = c3b

# lineHeight:16 → lineHeight:1.4
c3c_comma = content.count('lineHeight:16,')
c3c_brace = content.count('lineHeight:16}')
content = content.replace('lineHeight:16,', 'lineHeight:1.4,')
content = content.replace('lineHeight:16}', 'lineHeight:1.4}')
c3c = c3c_comma + c3c_brace
counts['P3c lineHeight:16→1.4'] = c3c

# lineHeight:17 → lineHeight:1.4
c3d_comma = content.count('lineHeight:17,')
c3d_brace = content.count('lineHeight:17}')
content = content.replace('lineHeight:17,', 'lineHeight:1.4,')
content = content.replace('lineHeight:17}', 'lineHeight:1.4}')
c3d = c3d_comma + c3d_brace
counts['P3d lineHeight:17→1.4'] = c3d

# lineHeight:18 → lineHeight:1.5
c3e_comma = content.count('lineHeight:18,')
c3e_brace = content.count('lineHeight:18}')
content = content.replace('lineHeight:18,', 'lineHeight:1.5,')
content = content.replace('lineHeight:18}', 'lineHeight:1.5}')
c3e = c3e_comma + c3e_brace
counts['P3e lineHeight:18→1.5'] = c3e

print(f"  P3a lineHeight:1→1.5: {c3a} replaced, {c3a_kept} kept (exception)")
print(f"  P3b lineHeight:1.1→1.4: {c3b}")
print(f"  P3c lineHeight:16→1.4: {c3c}")
print(f"  P3d lineHeight:17→1.4: {c3d}")
print(f"  P3e lineHeight:18→1.5: {c3e}")

# ─────────────────────────────────────────────
# PHASE 4 — LETTER SPACING: Convert px to em
# ─────────────────────────────────────────────
print("\n=== PHASE 4: Letter Spacing ===")

replacements_p4 = [
    ('letterSpacing:"-0.5px"', 'letterSpacing:"-0.02em"'),
    ('letterSpacing:"-0.3px"', 'letterSpacing:"-0.01em"'),
    ('letterSpacing:"0.4px"',  'letterSpacing:"0.02em"'),
    ('letterSpacing:"0.6px"',  'letterSpacing:"0.03em"'),
    ('letterSpacing:"0.8px"',  'letterSpacing:"0.04em"'),
    ('letterSpacing:"0.12em"', 'letterSpacing:"0.04em"'),
]

for old, new in replacements_p4:
    c = content.count(old)
    content = content.replace(old, new)
    counts[f'P4 {old}→{new}'] = c
    print(f"  {old} → {new}: {c}")

# ─────────────────────────────────────────────
# PHASE 5 — TEXT COLORS: Reduce to 3 neutral levels
# ─────────────────────────────────────────────
print("\n=== PHASE 5: Text Colors ===")

c5 = content.count('color:"#374151"')
content = content.replace('color:"#374151"', 'color:"#111827"')
counts['P5 color:#374151→#111827'] = c5
print(f"  color:#374151→#111827: {c5}")

# ─────────────────────────────────────────────
# PHASE 6 — SCREEN HEADERS: Page Title = 20px/600
# ─────────────────────────────────────────────
print("\n=== PHASE 6: Screen Headers ===")

# 6a. CSS rules for .screen-header h1
# Find font-size:Xpx in .screen-header h1 CSS context and replace
# Also find font-weight:X in .screen-header h1 CSS context

# Look for .screen-header h1 CSS block patterns
# Typical: .screen-header h1{...font-size:...px...font-weight:...}
# We'll use regex to find and patch the CSS rules

def patch_screen_header_css(content):
    """Patch .screen-header h1 CSS rules to use font-size:20px; font-weight:600"""
    count = 0

    # Pattern: .screen-header h1{...} — may contain font-size and font-weight
    pattern = re.compile(r'(\.screen-header\s+h1\s*\{[^}]*?\})', re.DOTALL)

    def replace_rule(m):
        nonlocal count
        rule = m.group(1)
        original = rule

        # Replace font-size: anything → font-size:20px
        rule = re.sub(r'font-size\s*:\s*[^;}\s]+', 'font-size:20px', rule)
        # Replace font-weight: anything → font-weight:600
        rule = re.sub(r'font-weight\s*:\s*[^;}\s]+', 'font-weight:600', rule)

        if rule != original:
            count += 1
        return rule

    content = pattern.sub(replace_rule, content)
    return content, count

content, c6a = patch_screen_header_css(content)
counts['P6a .screen-header h1 CSS rules patched'] = c6a
print(f"  P6a .screen-header h1 CSS rules: {c6a}")

# 6b. Inline fontSize:15,fontWeight:700 on h1 elements → fontSize:20,fontWeight:600
# Look for h1 JSX elements with these inline styles
# Pattern: e.jsx("h1",{...fontSize:15,fontWeight:700...})
# or variations

def patch_h1_inline_styles(content):
    """Replace fontSize:15,fontWeight:700 → fontSize:20,fontWeight:600 in h1 contexts"""
    count = 0

    # Pattern: fontSize:15,fontWeight:700 near "h1"
    # We look for the pattern within reasonable distance of h1 tags
    pattern = re.compile(r'((?:"h1"|\'h1\')[^{]{0,200}?)fontSize:15,fontWeight:700')

    def replace_match(m):
        nonlocal count
        count += 1
        return m.group(1) + 'fontSize:20,fontWeight:600'

    new_content = pattern.sub(replace_match, content)

    # Also check the reverse: fontWeight:700 might come before fontSize:15
    # Pattern: fontSize:15 ... fontWeight:700 near h1 (simpler approach - check for h1 and then font specs)
    # Try direct replacement if fontSize:15 and fontWeight:700 are adjacent
    pattern2 = re.compile(r'((?:"h1"|\'h1\')[^{]{0,200}?)fontSize:15([,}][^f]{0,50}fontWeight:)700')

    def replace_match2(m):
        nonlocal count
        count += 1
        return m.group(1) + 'fontSize:20' + m.group(2) + '600'

    new_content = pattern2.sub(replace_match2, new_content)

    return new_content, count

content, c6b = patch_h1_inline_styles(content)
counts['P6b h1 inline fontSize:15,fontWeight:700→20,600'] = c6b
print(f"  P6b h1 inline style patches: {c6b}")

# 6c. Tailwind h1: text-lg font-bold / text-lg font-semibold → text-xl font-semibold
# These would appear in className props near h1 elements
# Pattern: "h1" nearby has className="...text-lg font-bold..." or "...text-lg font-semibold..."

def patch_h1_tailwind(content):
    """Replace text-lg font-bold/semibold → text-xl font-semibold in h1 Tailwind class strings"""
    count = 0

    # Look for h1 tag with className containing text-lg and font-bold or font-semibold
    # Pattern in JSX minified: "h1",{className:"...text-lg font-bold..."

    # text-lg font-bold → text-xl font-semibold
    pattern1 = re.compile(r'((?:"h1"|\'h1\')[^"\']{0,300}?className[=:]["\'`][^"\'`]*?)text-lg font-bold')
    def rep1(m):
        nonlocal count
        count += 1
        return m.group(1) + 'text-xl font-semibold'
    content2 = pattern1.sub(rep1, content)

    # text-lg font-semibold → text-xl font-semibold
    pattern2 = re.compile(r'((?:"h1"|\'h1\')[^"\']{0,300}?className[=:]["\'`][^"\'`]*?)text-lg font-semibold')
    def rep2(m):
        nonlocal count
        count += 1
        return m.group(1) + 'text-xl font-semibold'
    content3 = pattern2.sub(rep2, content2)

    return content3, count

content, c6c = patch_h1_tailwind(content)
counts['P6c h1 Tailwind text-lg→text-xl patches'] = c6c
print(f"  P6c h1 Tailwind patches: {c6c}")

# ─────────────────────────────────────────────
# PHASE 7 — COMPONENT REFINEMENTS
# ─────────────────────────────────────────────
print("\n=== PHASE 7: Component Refinements ===")

# 7a. KPI/metric values — fontWeight:800→700 already done in Phase 2

# 7b. Body Large contexts: fontSize:13,fontWeight:400 on <input> or <textarea>
# Look for e.jsx("input",...) or e.jsx("textarea",...) with fontSize:13
# Pattern: e.jsx("input",{.*?fontSize:13 → change fontSize to 14

def patch_input_textarea_fontsize(content):
    """Change fontSize:13 → fontSize:14 in input and textarea elements"""
    count = 0

    # Pattern: "input" or "textarea" followed by style object with fontSize:13
    # In minified JSX: e.jsx("input",{...style:{...fontSize:13,...}
    # or className + style mixed

    pattern = re.compile(
        r'((?:e\.jsx|e\.createElement)\s*\(\s*"(?:input|textarea)"\s*,\s*\{[^}]{0,500}?fontSize\s*:)\s*13\s*([,}])'
    )

    def replace_match(m):
        nonlocal count
        count += 1
        return m.group(1) + '14' + m.group(2)

    new_content = pattern.sub(replace_match, content)
    return new_content, count

content, c7b = patch_input_textarea_fontsize(content)
counts['P7b input/textarea fontSize:13→14'] = c7b
print(f"  P7b input/textarea fontSize:13→14: {c7b}")

# 7c. CSS Updates in the style block

# 7c-i. Ensure .screen-header h1 rules say font-size:20px; font-weight:600
# (Already done in Phase 6a, but let's also handle CSS text format with semicolons)

# 7c-ii. Add .screen-header .text-xl rule after existing .screen-header h1 rules
def add_screen_header_textxl_rule(content):
    """Add .screen-header .text-xl rule after .screen-header h1"""
    new_rule = '.screen-header .text-xl{font-size:20px!important;font-weight:600!important}'

    if new_rule in content:
        return content, 0

    # Find the last occurrence of .screen-header h1{...} and append after it
    pattern = re.compile(r'(\.screen-header\s+h1\s*\{[^}]*?\})')
    matches = list(pattern.finditer(content))

    if not matches:
        return content, 0

    # Insert after the last match
    last_match = matches[-1]
    insert_pos = last_match.end()
    content = content[:insert_pos] + new_rule + content[insert_pos:]
    return content, 1

content, c7c2 = add_screen_header_textxl_rule(content)
counts['P7c-ii .screen-header .text-xl rule added'] = c7c2
print(f"  P7c-ii .screen-header .text-xl rule added: {c7c2}")

# 7c-iii. Change Tailwind text-lg CSS definition
# .text-lg{font-size:1.125rem → .text-lg{font-size:1.25rem
c7c3 = content.count('.text-lg{font-size:1.125rem')
content = content.replace('.text-lg{font-size:1.125rem', '.text-lg{font-size:1.25rem')
counts['P7c-iii .text-lg font-size 1.125rem→1.25rem'] = c7c3
print(f"  P7c-iii .text-lg font-size 1.125rem→1.25rem: {c7c3}")

# ─────────────────────────────────────────────
# WRITE FILE
# ─────────────────────────────────────────────
print("\nWriting file...")
with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"File written: {len(content):,} bytes")

# ─────────────────────────────────────────────
# FINAL REPORT
# ─────────────────────────────────────────────
print("\n" + "="*60)
print("FULL MIGRATION REPORT")
print("="*60)
total = 0
for key, val in counts.items():
    if 'kept' not in key.lower():
        total += val
    print(f"  {key}: {val}")
print(f"\nTotal replacements made: {total}")
print("="*60)
