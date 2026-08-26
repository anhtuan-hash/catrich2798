#!/usr/bin/env python3
"""Final one-time presentation-motion source cleanup for Brian."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'src'
STATIC_CONTRACT = (SRC / 'styles' / 'v1159.css').resolve()
AUDIT_PATH = ROOT / 'motion-cleanup-audit.txt'
CODE_SUFFIXES = {'.js', '.jsx', '.ts', '.tsx'}

MOTION_SELECTOR_MARKERS = (
    '.tile-launch-layer', '.tile-launch-card', '.tile-launch-label', '.tile-launch-backdrop',
    '.route-transition', '.brian-route-motion', '.brian-route-page', '.is-launching',
    '[data-motion', '[data-a11y-motion',
)
INTERACTION_MARKERS = (
    ':hover', ':active', ':focus', ':focus-visible', ':focus-within',
    '.active', '.state-running', '.recording', '.launching',
)


def matching_brace(text: str, open_index: int) -> int:
    depth = 0
    quote = None
    comment = False
    i = open_index
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if comment:
            if ch == '*' and nxt == '/':
                comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if ch == '\\':
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch == '/' and nxt == '*':
            comment = True
            i += 2
            continue
        if ch in ('\'', '"'):
            quote = ch
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def remove_balanced(text: str, start_re: re.Pattern[str]) -> tuple[str, int]:
    count = 0
    pos = 0
    while True:
        match = start_re.search(text, pos)
        if not match:
            return text, count
        brace = text.find('{', match.start())
        if brace < 0:
            return text, count
        end = matching_brace(text, brace)
        if end < 0:
            return text, count
        text = text[:match.start()] + '\n' + text[end + 1:]
        count += 1
        pos = max(0, match.start() - 1)


def strip_decl(text: str, prop_re: str) -> tuple[str, int]:
    pattern = re.compile(rf'(?is)(?<![-\w])(?:{prop_re})\s*:\s*[^;{{}}]+;?')
    text, count = pattern.subn('', text)
    return text, count


def clean_simple_rules(text: str) -> tuple[str, int, int]:
    pattern = re.compile(r'([^{}]+)\{([^{}]*)\}')
    removed_rules = 0
    removed_geometry = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal removed_rules, removed_geometry
        selector = match.group(1)
        body = match.group(2)
        low = selector.lower()
        if any(marker in low for marker in MOTION_SELECTOR_MARKERS):
            removed_rules += 1
            return ''
        if any(marker in low for marker in INTERACTION_MARKERS):
            for prop in ('transform', 'translate', 'scale', 'rotate'):
                body, n = strip_decl(body, re.escape(prop))
                removed_geometry += n
        if not body.strip():
            removed_rules += 1
            return ''
        return selector + '{' + body + '}'

    previous = None
    for _ in range(6):
        if text == previous:
            break
        previous = text
        text = pattern.sub(repl, text)
    return text, removed_rules, removed_geometry


def clean_css(path: Path) -> dict[str, int]:
    original = path.read_text(encoding='utf-8')
    text = original
    stats = {k: 0 for k in (
        'keyframes', 'reduced_motion', 'transition', 'animation', 'will_change',
        'motion_vars', 'smooth_scroll', 'motion_rules', 'dynamic_geometry'
    )}

    text, stats['keyframes'] = remove_balanced(text, re.compile(r'(?i)@(?:-webkit-)?keyframes\s+[\w-]+\s*\{'))
    text, stats['reduced_motion'] = remove_balanced(text, re.compile(r'(?i)@media\s*\([^)]*prefers-reduced-motion\s*:\s*reduce[^)]*\)\s*\{'))
    text, stats['smooth_scroll'] = re.subn(r'(?i)(scroll-behavior\s*:\s*)smooth\b', r'\1auto', text)

    if path.resolve() != STATIC_CONTRACT:
        text, stats['transition'] = strip_decl(text, r'(?:-webkit-)?transition(?:-[a-z-]+)?')
        text, stats['animation'] = strip_decl(text, r'(?:-webkit-)?animation(?:-[a-z-]+)?')
        text, stats['will_change'] = strip_decl(text, r'will-change')
        text, stats['motion_vars'] = strip_decl(text, r'--motion-[a-z0-9_-]+')
        text, stats['motion_rules'], stats['dynamic_geometry'] = clean_simple_rules(text)

    # Remove obsolete motion-system comments and now-empty whitespace.
    text = re.sub(r'(?is)/\*.*?(?:SMOOTH MOTION SYSTEM|motion system|motion effect|route transition).*?\*/', '', text)
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    if text != original:
        path.write_text(text, encoding='utf-8')
    stats['changed'] = int(text != original)
    return stats


def clean_retired_feature_cleanup() -> int:
    path = SRC / 'utils' / 'retiredFeatureCleanup.js'
    if not path.exists():
        return 0
    original = path.read_text(encoding='utf-8')
    text = original
    text = text.replace("  'motion-effects',\n", '')
    text = text.replace("  'brian.ui.motion',\n", '')
    text = text.replace("      ['theme', 'motion', 'motionEffects', 'animation', 'transitions'].forEach((key) => {", "      ['theme'].forEach((key) => {")
    text = text.replace("  delete root.dataset.themeTransition;\n", '')
    text = text.replace("  root.removeAttribute('data-motion-effects');\n", '')
    text = text.replace("  root.removeAttribute('data-motion');\n", '')
    text = text.replace("  root.removeAttribute('data-a11y-motion');\n", '')
    if text != original:
        path.write_text(text, encoding='utf-8')
        return 1
    return 0


def clean_code(path: Path) -> dict[str, int]:
    original = path.read_text(encoding='utf-8')
    text = original
    text, smooth = re.subn(r"(?i)(\bbehavior\s*:\s*)(['\"])smooth\2", r"\1'auto'", text)
    text = text.replace('/utils/motion.js', '/utils/navigation.js')
    text = text.replace("/utils/motion'", "/utils/navigation'")
    text = text.replace('/utils/motion"', '/utils/navigation"')
    if text != original:
        path.write_text(text, encoding='utf-8')
    return {'changed': int(text != original), 'smooth_behavior': smooth}


def retire_navigation_name() -> int:
    old = SRC / 'utils' / 'motion.js'
    new = SRC / 'utils' / 'navigation.js'
    if not old.exists():
        return 0
    new.write_text(old.read_text(encoding='utf-8'), encoding='utf-8')
    old.unlink()
    return 1


def collect_residuals() -> list[str]:
    findings: list[str] = []
    css_checks = [
        ('positive-transition', re.compile(r'(?i)(?<![-\w])(?:-webkit-)?transition(?:-[a-z-]+)?\s*:\s*(?!none\b|0(?:ms|s)?\b)[^;{}]+')),
        ('positive-animation', re.compile(r'(?i)(?<![-\w])(?:-webkit-)?animation(?:-[a-z-]+)?\s*:\s*(?!none\b|0(?:ms|s)?\b)[^;{}]+')),
        ('keyframes', re.compile(r'(?i)@(?:-webkit-)?keyframes\b')),
        ('reduced-motion', re.compile(r'(?i)prefers-reduced-motion')),
        ('smooth-scroll', re.compile(r'(?i)scroll-behavior\s*:\s*smooth')),
        ('motion-selector', re.compile(r'(?i)data-(?:a11y-)?motion|data-motion|\.is-launching|tile-launch-(?:layer|card|label|backdrop)')),
        ('motion-var', re.compile(r'(?i)--motion-[a-z0-9_-]+')),
    ]
    code_checks = [
        ('smooth-behavior', re.compile(r"(?i)\bbehavior\s*:\s*['\"]smooth['\"]")),
        ('startViewTransition', re.compile(r'\bstartViewTransition\b')),
        ('web-animate', re.compile(r'\.animate\s*\(')),
        ('motion-import', re.compile(r"(?:/|['\"])utils/motion(?:\.js)?['\"]?")),
        ('motion-setting', re.compile(r'(?i)motion-effects|brian\.ui\.motion|a11y-motion|data-motion')),
        ('requestAnimationFrame', re.compile(r'\brequestAnimationFrame\b')),
    ]
    for path in SRC.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in ({'.css'} | CODE_SUFFIXES):
            continue
        text = path.read_text(encoding='utf-8', errors='ignore')
        checks = css_checks if path.suffix.lower() == '.css' else code_checks
        for label, pattern in checks:
            # v1159 is allowed to explicitly disable animation/transition, but no
            # positive declarations are exempt.
            for match in pattern.finditer(text):
                if path.resolve() == STATIC_CONTRACT and label in {'motion-selector'}:
                    continue
                line = text.count('\n', 0, match.start()) + 1
                findings.append(f'{label}\t{path.relative_to(ROOT)}:{line}\t{match.group(0)[:120]}')
    return findings


def main() -> None:
    totals: dict[str, int] = {}
    css_changed = 0
    code_changed = 0
    for path in sorted(SRC.rglob('*.css')):
        stats = clean_css(path)
        css_changed += stats.pop('changed')
        for key, value in stats.items():
            totals[key] = totals.get(key, 0) + value

    retired_cleanup_changed = clean_retired_feature_cleanup()
    navigation_renamed = retire_navigation_name()
    for path in sorted(SRC.rglob('*')):
        if path.is_file() and path.suffix.lower() in CODE_SUFFIXES:
            stats = clean_code(path)
            code_changed += stats.pop('changed')
            for key, value in stats.items():
                totals[key] = totals.get(key, 0) + value

    residuals = collect_residuals()
    summary = {
        'css_files_changed': css_changed,
        'code_files_changed': code_changed,
        'retired_cleanup_changed': retired_cleanup_changed,
        'navigation_utility_renamed': navigation_renamed,
        'totals': totals,
        'residual_candidate_count': len(residuals),
    }
    AUDIT_PATH.write_text(
        'BRIAN MOTION SOURCE CLEANUP — STRICT FINAL AUDIT\n\n'
        + json.dumps(summary, indent=2, ensure_ascii=False)
        + '\n\n'
        + '\n'.join(residuals)
        + '\n',
        encoding='utf-8',
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
