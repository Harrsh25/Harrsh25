#!/usr/bin/env python3
"""Enterprise SaaS Typography Migration Script
Applies all 7 phases to hrmobileapp.html
"""

import re

FILE_PATH = '/home/user/Harrsh25/hrmobileapp.html'

def count_replace(content, old, new):
    """Replace all occurrences of old with new, return (new_content, count)."""
    count = content.count(old)
    return content.replace(old, new), count

def main():
    print("Reading file...")
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        html = f.read()

    original_len = len(html)
    print(f"File size: {original_len:,} bytes")

    report = {}

    # =========================================================================
    # PHASE 1 — FONT SIZE: Make 13px the dominant body text size
    # =========================================================================
    print("\n--- PHASE 1: Font Size ---")

    # We need to detect the exception: fontSize:12 that immediately precedes fontWeight:400 AND color:"#9ca3af"
    # Strategy: temporarily protect those patterns, do the replacements, then restore.

    # Find all positions of fontSize:12 followed within ~80 chars by fontWeight:400 AND color:"#9ca3af"
    # We'll use a placeholder approach.

    PLACEHOLDER_12 = '__PROTECTED_FONTSIZE_12_COMMA__'
    PLACEHOLDER_12b = '__PROTECTED_FONTSIZE_12_BRACE__'

    # Pattern: fontSize:12, ...within 80 chars... fontWeight:400 ...within 80 chars... color:"#9ca3af"
    # or fontSize:12, ...within 80 chars... color:"#9ca3af" ...within 80 chars... fontWeight:400
    # The instruction says: fontSize:12 that immediately precedes fontWeight:400 AND color:"#9ca3af"
    # "immediately precedes" likely means within the same style object
    # Let's protect fontSize:12, (comma variant) and fontSize:12} (brace variant) where within 120 chars
    # we see both fontWeight:400 and color:"#9ca3af"

    def protect_phase1_exceptions(content):
        """Protect fontSize:12 occurrences that are near fontWeight:400 AND color:#9ca3af"""
        protected_comma = 0
        protected_brace = 0

        result = []
        i = 0
        while i < len(content):
            # Check for fontSize:12, or fontSize:12}
            if content[i:i+11] == 'fontSize:12':
                suffix_pos = i + 11
                if suffix_pos < len(content):
                    suffix = content[suffix_pos]
                    if suffix in ',}':
                        # Look ahead 120 chars for fontWeight:400 and color:"#9ca3af"
                        lookahead = content[i:i+120]
                        has_fw400 = 'fontWeight:400' in lookahead
                        has_gray = 'color:"#9ca3af"' in lookahead
                        if has_fw400 and has_gray:
                            if suffix == ',':
                                result.append(PLACEHOLDER_12)
                                protected_comma += 1
                            else:
                                result.append(PLACEHOLDER_12b)
                                protected_brace += 1
                            i = suffix_pos + 1
                            continue
            result.append(content[i])
            i += 1
        return ''.join(result), protected_comma, protected_brace

    html, p_comma, p_brace = protect_phase1_exceptions(html)
    print(f"  Protected exceptions (fontSize:12,): {p_comma}")
    print(f"  Protected exceptions (fontSize:12}}): {p_brace}")

    # Now do the replacements
    html, c1a = count_replace(html, 'fontSize:12,', 'fontSize:13,')
    html, c1b = count_replace(html, 'fontSize:12}', 'fontSize:13}')
    html, c1c = count_replace(html, 'text-[12px]', 'text-[13px]')

    # Restore protected patterns
    html = html.replace(PLACEHOLDER_12, 'fontSize:12,')
    html = html.replace(PLACEHOLDER_12b, 'fontSize:12}')

    report['phase1_fontSize12_comma'] = c1a
    report['phase1_fontSize12_brace'] = c1b
    report['phase1_text_12px'] = c1c
    print(f"  fontSize:12, → fontSize:13,  : {c1a}")
    print(f"  fontSize:12}} → fontSize:13}}  : {c1b}")
    print(f"  text-[12px] → text-[13px]   : {c1c}")

    # =========================================================================
    # PHASE 2 — FONT WEIGHT: Remove aggressive weights
    # =========================================================================
    print("\n--- PHASE 2: Font Weight ---")

    html, c2a = count_replace(html, 'fontWeight:800,', 'fontWeight:700,')
    html, c2b = count_replace(html, 'fontWeight:800}', 'fontWeight:700}')
    html, c2c = count_replace(html, 'fontWeight:900,', 'fontWeight:700,')
    html, c2d = count_replace(html, 'fontWeight:900}', 'fontWeight:700}')

    report['phase2_fw800_comma'] = c2a
    report['phase2_fw800_brace'] = c2b
    report['phase2_fw900_comma'] = c2c
    report['phase2_fw900_brace'] = c2d
    print(f"  fontWeight:800, → fontWeight:700,  : {c2a}")
    print(f"  fontWeight:800}} → fontWeight:700}}  : {c2b}")
    print(f"  fontWeight:900, → fontWeight:700,  : {c2c}")
    print(f"  fontWeight:900}} → fontWeight:700}}  : {c2d}")

    # =========================================================================
    # PHASE 3 — LINE HEIGHT: Fix broken line heights
    # =========================================================================
    print("\n--- PHASE 3: Line Height ---")

    # lineHeight:1, and lineHeight:1} with EXCEPTION when within 30 chars of fontWeight:900 or fontWeight:300
    # Strategy: protect exceptions, replace, restore

    PLACEHOLDER_LH1_COMMA = '__PROTECTED_LH1_COMMA__'
    PLACEHOLDER_LH1_BRACE = '__PROTECTED_LH1_BRACE__'

    def protect_lh1_exceptions(content):
        """Protect lineHeight:1, and lineHeight:1} near fontWeight:900 or fontWeight:300"""
        protected_c = 0
        protected_b = 0

        result = []
        i = 0
        while i < len(content):
            if content[i:i+12] == 'lineHeight:1':
                suffix_pos = i + 12
                if suffix_pos < len(content) and content[suffix_pos] in ',}':
                    # Check within 30 chars before and after
                    start = max(0, i - 30)
                    end = min(len(content), i + 42)
                    context = content[start:end]
                    if 'fontWeight:900' in context or 'fontWeight:300' in context:
                        if content[suffix_pos] == ',':
                            result.append(PLACEHOLDER_LH1_COMMA)
                            protected_c += 1
                        else:
                            result.append(PLACEHOLDER_LH1_BRACE)
                            protected_b += 1
                        i = suffix_pos + 1
                        continue
            result.append(content[i])
            i += 1
        return ''.join(result), protected_c, protected_b

    html, lh1_pc, lh1_pb = protect_lh1_exceptions(html)
    print(f"  Protected lineHeight:1 exceptions: {lh1_pc + lh1_pb}")

    html, c3a = count_replace(html, 'lineHeight:1,', 'lineHeight:1.5,')
    html, c3b = count_replace(html, 'lineHeight:1}', 'lineHeight:1.5}')

    # Restore protected
    html = html.replace(PLACEHOLDER_LH1_COMMA, 'lineHeight:1,')
    html = html.replace(PLACEHOLDER_LH1_BRACE, 'lineHeight:1}')

    html, c3c = count_replace(html, 'lineHeight:1.1,', 'lineHeight:1.4,')
    html, c3d = count_replace(html, 'lineHeight:1.1}', 'lineHeight:1.4}')
    html, c3e = count_replace(html, 'lineHeight:16,', 'lineHeight:1.4,')
    html, c3f = count_replace(html, 'lineHeight:16}', 'lineHeight:1.4}')
    html, c3g = count_replace(html, 'lineHeight:17,', 'lineHeight:1.4,')
    html, c3h = count_replace(html, 'lineHeight:17}', 'lineHeight:1.4}')
    html, c3i = count_replace(html, 'lineHeight:18,', 'lineHeight:1.5,')
    html, c3j = count_replace(html, 'lineHeight:18}', 'lineHeight:1.5}')

    report['phase3_lh1_comma'] = c3a
    report['phase3_lh1_brace'] = c3b
    report['phase3_lh11_comma'] = c3c
    report['phase3_lh11_brace'] = c3d
    report['phase3_lh16_comma'] = c3e
    report['phase3_lh16_brace'] = c3f
    report['phase3_lh17_comma'] = c3g
    report['phase3_lh17_brace'] = c3h
    report['phase3_lh18_comma'] = c3i
    report['phase3_lh18_brace'] = c3j

    print(f"  lineHeight:1, → lineHeight:1.5,   : {c3a}")
    print(f"  lineHeight:1}} → lineHeight:1.5}}   : {c3b}")
    print(f"  lineHeight:1.1, → lineHeight:1.4,  : {c3c}")
    print(f"  lineHeight:1.1}} → lineHeight:1.4}}  : {c3d}")
    print(f"  lineHeight:16, → lineHeight:1.4,   : {c3e}")
    print(f"  lineHeight:16}} → lineHeight:1.4}}   : {c3f}")
    print(f"  lineHeight:17, → lineHeight:1.4,   : {c3g}")
    print(f"  lineHeight:17}} → lineHeight:1.4}}   : {c3h}")
    print(f"  lineHeight:18, → lineHeight:1.5,   : {c3i}")
    print(f"  lineHeight:18}} → lineHeight:1.5}}   : {c3j}")

    # =========================================================================
    # PHASE 4 — LETTER SPACING
    # =========================================================================
    print("\n--- PHASE 4: Letter Spacing ---")

    html, c4a = count_replace(html, 'letterSpacing:"-0.5px"', 'letterSpacing:"-0.02em"')
    html, c4b = count_replace(html, 'letterSpacing:"-0.3px"', 'letterSpacing:"-0.01em"')
    html, c4c = count_replace(html, 'letterSpacing:"0.4px"', 'letterSpacing:"0.02em"')
    html, c4d = count_replace(html, 'letterSpacing:"0.6px"', 'letterSpacing:"0.03em"')
    html, c4e = count_replace(html, 'letterSpacing:"0.8px"', 'letterSpacing:"0.04em"')
    html, c4f = count_replace(html, 'letterSpacing:"0.12em"', 'letterSpacing:"0.04em"')

    report['phase4_ls_neg05px'] = c4a
    report['phase4_ls_neg03px'] = c4b
    report['phase4_ls_04px'] = c4c
    report['phase4_ls_06px'] = c4d
    report['phase4_ls_08px'] = c4e
    report['phase4_ls_012em'] = c4f

    print(f"  letterSpacing:\"-0.5px\" → \"-0.02em\"  : {c4a}")
    print(f"  letterSpacing:\"-0.3px\" → \"-0.01em\"  : {c4b}")
    print(f"  letterSpacing:\"0.4px\" → \"0.02em\"    : {c4c}")
    print(f"  letterSpacing:\"0.6px\" → \"0.03em\"    : {c4d}")
    print(f"  letterSpacing:\"0.8px\" → \"0.04em\"    : {c4e}")
    print(f"  letterSpacing:\"0.12em\" → \"0.04em\"   : {c4f}")

    # =========================================================================
    # PHASE 5 — TEXT COLORS
    # =========================================================================
    print("\n--- PHASE 5: Text Colors ---")

    html, c5a = count_replace(html, 'color:"#374151"', 'color:"#111827"')

    report['phase5_color_374151'] = c5a
    print(f"  color:\"#374151\" → color:\"#111827\"  : {c5a}")

    # =========================================================================
    # PHASE 6 — SCREEN HEADERS
    # =========================================================================
    print("\n--- PHASE 6: Screen Headers ---")

    # 6a. CSS rules for .screen-header h1: font-size → 20px, font-weight → 600
    # These are in the <style> block as CSS text
    # Pattern: .screen-header h1{...font-size:NNpx;...font-weight:NNN...}
    # Use regex to find and update font-size and font-weight within .screen-header h1 rules

    def update_screen_header_css(content):
        """Update .screen-header h1 CSS rules to font-size:20px and font-weight:600"""
        count = 0

        # Find .screen-header h1 rules (CSS may be minified)
        # Pattern: .screen-header h1{ ... }
        pattern = r'(\.screen-header\s+h1\s*\{[^}]*\})'

        def replace_rule(m):
            nonlocal count
            rule = m.group(1)
            original = rule
            # Replace font-size value
            rule = re.sub(r'font-size\s*:\s*[\d.]+(?:px|rem|em)', 'font-size:20px', rule)
            # Replace font-weight value
            rule = re.sub(r'font-weight\s*:\s*[\d]+', 'font-weight:600', rule)
            if rule != original:
                count += 1
            return rule

        new_content = re.sub(pattern, replace_rule, content)
        return new_content, count

    html, c6a = update_screen_header_css(html)

    # 6b. Inline fontSize:15,fontWeight:700 on h1 elements → fontSize:20,fontWeight:600
    # Look for h1 elements with these inline styles
    # Pattern: e.jsx("h1",{[^}]*fontSize:15,fontWeight:700 or similar
    # More conservative: just replace fontSize:15,fontWeight:700 globally where it appears near h1

    def replace_h1_inline_styles(content):
        """Replace fontSize:15,fontWeight:700 in h1 jsx calls"""
        count = 0
        # Pattern: looking for h1 jsx with fontSize:15 fontWeight:700 within style object
        # The style object may have other properties, so look for the pattern in context of "h1"
        # within 200 chars before fontSize:15,fontWeight:700

        # Simple approach: find fontSize:15,fontWeight:700 and check if "h1" appears within 300 chars before
        result = []
        i = 0
        target = 'fontSize:15,fontWeight:700'
        tlen = len(target)

        while i < len(content):
            if content[i:i+tlen] == target:
                # Check if h1 appears within 300 chars before
                start = max(0, i - 300)
                context = content[start:i]
                if '"h1"' in context or "'h1'" in context:
                    result.append('fontSize:20,fontWeight:600')
                    count += 1
                    i += tlen
                    continue
            result.append(content[i])
            i += 1
        return ''.join(result), count

    html, c6b = replace_h1_inline_styles(html)

    # 6c. Tailwind h1 classes: text-lg font-bold / text-lg font-semibold → text-xl font-semibold
    # These appear in className strings near h1 elements
    # Pattern: className="...text-lg font-bold..." or className="...text-lg font-semibold..."
    # near h1 jsx calls

    def replace_h1_tailwind(content):
        """Replace text-lg font-bold/semibold with text-xl font-semibold near h1 elements"""
        count_bold = 0
        count_semi = 0

        # Look for h1 jsx elements with tailwind classes
        # Pattern: e.jsx("h1",{className:"...text-lg font-bold..." or similar
        # Search for "h1" followed within 200 chars by className containing text-lg font-bold

        # Replace text-lg font-bold → text-xl font-semibold
        def replace_near_h1(m):
            nonlocal count_bold, count_semi
            full = m.group(0)
            h1_part = m.group(1)
            class_part = m.group(2)

            new_class = class_part
            if 'text-lg font-bold' in new_class:
                new_class = new_class.replace('text-lg font-bold', 'text-xl font-semibold')
                count_bold += new_class.count('text-xl font-semibold') - class_part.count('text-xl font-semibold')
                # recount
            if 'text-lg font-semibold' in new_class:
                new_class = new_class.replace('text-lg font-semibold', 'text-xl font-semibold')

            return h1_part + new_class

        # More targeted: find h1 jsx patterns
        # e.jsx("h1",{className:"..."}  or similar
        pattern = r'(e\.jsx\("h1",\{[^}]{0,300}className:")([^"]*)"'

        def repl_bold(m):
            nonlocal count_bold
            prefix = m.group(1)
            classes = m.group(2)
            if 'text-lg font-bold' in classes:
                new_classes = classes.replace('text-lg font-bold', 'text-xl font-semibold')
                count_bold += 1
                return prefix + new_classes + '"'
            return m.group(0)

        def repl_semi(m):
            nonlocal count_semi
            prefix = m.group(1)
            classes = m.group(2)
            if 'text-lg font-semibold' in classes:
                new_classes = classes.replace('text-lg font-semibold', 'text-xl font-semibold')
                count_semi += 1
                return prefix + new_classes + '"'
            return m.group(0)

        content = re.sub(pattern, repl_bold, content)
        content = re.sub(pattern, repl_semi, content)

        return content, count_bold, count_semi

    html, c6c_bold, c6c_semi = replace_h1_tailwind(html)

    report['phase6_css_screen_header'] = c6a
    report['phase6_inline_h1_styles'] = c6b
    report['phase6_tailwind_bold'] = c6c_bold
    report['phase6_tailwind_semi'] = c6c_semi

    print(f"  .screen-header h1 CSS rules updated : {c6a}")
    print(f"  Inline fontSize:15,fontWeight:700 h1: {c6b}")
    print(f"  Tailwind text-lg font-bold → xl semi: {c6c_bold}")
    print(f"  Tailwind text-lg font-semibold → xl : {c6c_semi}")

    # =========================================================================
    # PHASE 7 — COMPONENT REFINEMENTS
    # =========================================================================
    print("\n--- PHASE 7: Component Refinements ---")

    # 7a. fontWeight:800 already handled in Phase 2
    print("  7a: fontWeight:800→700 handled in Phase 2")

    # 7b. Body Large: fontSize:13,fontWeight:400 on input/textarea → fontSize:14,fontWeight:400
    # Pattern: e.jsx("input",{.*fontSize:13 or e.jsx("textarea",{.*fontSize:13

    def replace_input_fontsize(content):
        """Replace fontSize:13 with fontSize:14 in input/textarea jsx elements"""
        count = 0

        # Find input/textarea jsx calls and replace fontSize:13 within them
        # Pattern: e.jsx("input",{ ... fontSize:13, ... or e.jsx("textarea",{...fontSize:13,...
        # The style object could be nested, use a simpler approach:
        # Find "input" or "textarea" then within next 500 chars find fontSize:13, and replace with fontSize:14,

        target_tags = ['"input"', '"textarea"']

        result = list(content)
        i = 0
        content_str = content

        # Use regex for this one
        # Pattern: (e\.jsx\((?:"input"|"textarea"),\{(?:[^{}]|\{[^{}]*\}){0,10}?)fontSize:13,
        # This is complex due to nested braces, use simpler lookahead

        # Find all positions of fontSize:13, and check if input/textarea appears within 500 chars before
        positions = []
        search_from = 0
        target = 'fontSize:13,'
        tlen = len(target)
        while True:
            pos = content_str.find(target, search_from)
            if pos == -1:
                break
            # Check context: input or textarea within 500 chars before
            start = max(0, pos - 500)
            context_before = content_str[start:pos]
            # Check that this is within an input/textarea element (not already replaced)
            # Look for the nearest jsx call before this position
            last_input = max(context_before.rfind('"input"'), context_before.rfind('"textarea"'))
            if last_input != -1:
                # Make sure there's no closing of the jsx call between the tag and fontSize
                # A simple heuristic: check that we're still in the same JSX element
                # by checking for balanced closing
                segment = context_before[last_input:]
                # Count open braces minus close braces - if positive, we're still inside
                open_count = segment.count('{') - segment.count('}')
                if open_count > 0:
                    positions.append(pos)
            search_from = pos + 1

        # Also check fontSize:13} variants
        target2 = 'fontSize:13}'
        tlen2 = len(target2)
        search_from = 0
        positions2 = []
        while True:
            pos = content_str.find(target2, search_from)
            if pos == -1:
                break
            start = max(0, pos - 500)
            context_before = content_str[start:pos]
            last_input = max(context_before.rfind('"input"'), context_before.rfind('"textarea"'))
            if last_input != -1:
                segment = context_before[last_input:]
                open_count = segment.count('{') - segment.count('}')
                if open_count > 0:
                    positions2.append(pos)
            search_from = pos + 1

        # Apply replacements in reverse order to preserve positions
        all_replacements = [(pos, 'fontSize:13,', 'fontSize:14,') for pos in positions] + \
                          [(pos, 'fontSize:13}', 'fontSize:14}') for pos in positions2]
        all_replacements.sort(key=lambda x: x[0], reverse=True)

        content_list = list(content_str)
        for pos, old, new in all_replacements:
            if content_str[pos:pos+len(old)] == old:
                content_list[pos:pos+len(old)] = list(new)
                count += 1

        return ''.join(content_list), count

    html, c7b = replace_input_fontsize(html)
    report['phase7b_input_fontsize'] = c7b
    print(f"  7b: fontSize:13→14 in input/textarea: {c7b}")

    # 7c. CSS Updates in style block
    # Find .screen-header h1 rules and ensure 20px/600 (already done in 6a)
    # Add .screen-header .text-xl rule
    # Change .text-lg CSS definition

    def update_css_block(content):
        """Update CSS in the style block"""
        counts = {}

        # Add .screen-header .text-xl rule after .screen-header h1 rules
        # Find the last occurrence of .screen-header h1{...} and add after it
        pattern = r'(\.screen-header\s+h1\s*\{[^}]*\})'
        matches = list(re.finditer(pattern, content))

        added_rule = 0
        new_rule = '.screen-header .text-xl{font-size:20px!important;font-weight:600!important}'

        if matches:
            # Add after the last match
            last_match = matches[-1]
            end_pos = last_match.end()
            # Check if rule already exists
            if new_rule not in content:
                content = content[:end_pos] + new_rule + content[end_pos:]
                added_rule = 1

        counts['added_screen_header_text_xl'] = added_rule

        # Change .text-lg CSS definition: font-size:1.125rem → font-size:1.25rem
        old_text_lg = '.text-lg{font-size:1.125rem'
        new_text_lg = '.text-lg{font-size:1.25rem'
        c = content.count(old_text_lg)
        content = content.replace(old_text_lg, new_text_lg)
        counts['text_lg_font_size'] = c

        return content, counts

    html, c7c_counts = update_css_block(html)
    report['phase7c_added_text_xl_rule'] = c7c_counts.get('added_screen_header_text_xl', 0)
    report['phase7c_text_lg_size'] = c7c_counts.get('text_lg_font_size', 0)
    print(f"  7c: Added .screen-header .text-xl rule: {c7c_counts.get('added_screen_header_text_xl', 0)}")
    print(f"  7c: .text-lg font-size 1.125rem→1.25rem: {c7c_counts.get('text_lg_font_size', 0)}")

    # =========================================================================
    # WRITE FILE
    # =========================================================================
    print(f"\nWriting file ({len(html):,} bytes)...")
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(html)
    print("File written successfully.")

    # =========================================================================
    # SUMMARY REPORT
    # =========================================================================
    print("\n" + "="*60)
    print("MIGRATION SUMMARY REPORT")
    print("="*60)

    total = 0
    for key, val in report.items():
        print(f"  {key:<40}: {val}")
        total += val

    print(f"\n  {'TOTAL CHANGES':<40}: {total}")
    print("="*60)

    return report

if __name__ == '__main__':
    main()
