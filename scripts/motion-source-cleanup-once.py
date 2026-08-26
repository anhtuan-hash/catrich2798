#!/usr/bin/env python3
"""One-time removal of legacy presentation motion from Brian source.

The cleanup is intentionally conservative:
- static transforms used for layout/artwork are preserved;
- transitions, animations, keyframes and smooth scrolling are removed;
- transform/translate/scale/rotate declarations are removed only from
  interaction/state selectors that change geometry;
- the final v1159 static safety contract is preserved unchanged;
- the legacy utils/motion.js navigation shim is renamed to utils/navigation.js.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
STATIC_CONTRACT = (SRC / "styles" / "v1159.css").resolve()
AUDIT_PATH = ROOT / "motion-cleanup-audit.txt"

CSS_SUFFIXES = {".css"}
CODE_SUFFIXES = {".js", ".jsx", ".ts", ".tsx"}

INTERACTION_MARKERS = (
    ":hover",
    ":active",
    ":focus",
    ":focus-visible",
    ":focus-within",
    ".is-launching",
    ".launching",
    ".state-running",
    ".recording",
    "[data-motion",
    "[data-a11y-motion",
)

MOTION_ONLY_SELECTOR_MARKERS = (
    ".tile-launch-layer",
    ".tile-launch-card",
    ".tile-launch-label",
    ".route-transition",
    ".brian-route-motion",
    ".brian-route-page",
)


def matching_brace(text: str, open_index: int) -> int:
    depth = 0
    quote = None
    in_comment = False
    i = open_index
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if in_comment:
            if ch == "*" and nxt == "/":
                in_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch == "/" and nxt == "*":
            in_comment = True
            i += 2
            continue
        if ch in ("'", '"'):
            quote = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def remove_balanced_blocks(text: str, start_pattern: re.Pattern[str]) -> tuple[str, int]:
    removed = 0
    pos = 0
    while True:
        match = start_pattern.search(text, pos)
        if not match:
            break
        brace = text.find("{", match.start(), match.end() + 4)
        if brace < 0:
            pos = match.end()
            continue
        end = matching_brace(text, brace)
        if end < 0:
            pos = match.end()
            continue
        start = match.start()
        while start > 0 and text[start - 1] in " \t":
            start -= 1
        if start > 0 and text[start - 1] == "\n":
            start -= 1
        text = text[:start] + "\n" + text[end + 1 :]
        removed += 1
        pos = max(0, start - 1)
    return text, removed


def strip_property_everywhere(text: str, property_pattern: str) -> tuple[str, int]:
    # Preserve the character that separates this declaration from the previous one.
    pattern = re.compile(
        rf"(?is)(^|[;{{])([ \t\r\n]*)(?:{property_pattern})\s*:\s*([^;{{}}]*)(;?)"
    )
    count = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal count
        count += 1
        return match.group(1)

    return pattern.sub(repl, text), count


def replace_smooth_scroll(text: str) -> tuple[str, int]:
    count = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal count
        count += 1
        return f"{match.group(1)}auto{match.group(2)}"

    text = re.sub(
        r"(?i)(scroll-behavior\s*:\s*)smooth([^;{}]*;?)",
        repl,
        text,
    )
    return text, count


def strip_simple_rule_bodies(text: str, *, remove_motion_only: bool, remove_dynamic_geometry: bool) -> tuple[str, int, int]:
    # Repeatedly visits innermost CSS rules. At-rules with nested rules are left alone.
    simple_rule = re.compile(r"([^{}]+)\{([^{}]*)\}")
    motion_blocks = 0
    geometry_props = 0

    def clean_once(source: str) -> str:
        nonlocal motion_blocks, geometry_props

        def repl(match: re.Match[str]) -> str:
            nonlocal motion_blocks, geometry_props
            selector = match.group(1)
            body = match.group(2)
            low = selector.lower()

            if remove_motion_only and any(marker in low for marker in MOTION_ONLY_SELECTOR_MARKERS):
                motion_blocks += 1
                return ""

            if remove_dynamic_geometry and any(marker in low for marker in INTERACTION_MARKERS):
                for prop in ("transform", "translate", "scale", "rotate"):
                    body, removed = strip_property_everywhere(body, re.escape(prop))
                    geometry_props += removed
            return selector + "{" + body + "}"

        return simple_rule.sub(repl, source)

    previous = None
    passes = 0
    while text != previous and passes < 3:
        previous = text
        text = clean_once(text)
        passes += 1
    return text, motion_blocks, geometry_props


def clean_css(path: Path) -> dict[str, int]:
    original = path.read_text(encoding="utf-8")
    text = original
    stats: dict[str, int] = {
        "keyframes": 0,
        "reduced_motion_blocks": 0,
        "transition_props": 0,
        "animation_props": 0,
        "will_change_props": 0,
        "motion_vars": 0,
        "smooth_scroll": 0,
        "motion_blocks": 0,
        "dynamic_geometry": 0,
    }

    keyframes_re = re.compile(r"(?i)@(?:-webkit-)?keyframes\s+[\w-]+\s*\{")
    reduced_re = re.compile(r"(?i)@media\s*\([^)]*prefers-reduced-motion\s*:\s*reduce[^)]*\)\s*\{")
    text, stats["keyframes"] = remove_balanced_blocks(text, keyframes_re)
    text, stats["reduced_motion_blocks"] = remove_balanced_blocks(text, reduced_re)

    text, stats["smooth_scroll"] = replace_smooth_scroll(text)

    # v1159 is the deliberate last-resort static safety net. Keep its explicit
    # transition:none / animation:none contract while cleaning every other CSS file.
    if path.resolve() != STATIC_CONTRACT:
        text, stats["transition_props"] = strip_property_everywhere(
            text, r"(?:-webkit-)?transition(?:-[a-z-]+)?"
        )
        text, stats["animation_props"] = strip_property_everywhere(
            text, r"(?:-webkit-)?animation(?:-[a-z-]+)?"
        )
        text, stats["will_change_props"] = strip_property_everywhere(text, r"will-change")
        text, stats["motion_vars"] = strip_property_everywhere(text, r"--motion-[a-z0-9_-]+")
        text, stats["motion_blocks"], stats["dynamic_geometry"] = strip_simple_rule_bodies(
            text,
            remove_motion_only=True,
            remove_dynamic_geometry=True,
        )

    # Remove now-empty reduced-motion comments / excessive blank space without
    # minifying or otherwise rewriting the stylesheet.
    text = re.sub(r"(?i)/\*[^*]*(?:motion|animation|transition)[^*]*\*/\s*(?=\n\s*\n)", "", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)

    if text != original:
        path.write_text(text, encoding="utf-8")
    stats["changed"] = int(text != original)
    return stats


def clean_code(path: Path) -> dict[str, int]:
    original = path.read_text(encoding="utf-8")
    text = original
    smooth_count = 0
    import_count = 0

    def behavior_repl(match: re.Match[str]) -> str:
        nonlocal smooth_count
        smooth_count += 1
        return match.group(1) + match.group(2) + "auto" + match.group(2)

    text = re.sub(
        r"(?i)(\bbehavior\s*:\s*)(['\"])smooth\2",
        behavior_repl,
        text,
    )

    # Only rename the retired central utility import; do not touch unrelated
    # third-party modules whose names happen to contain 'motion'.
    renamed = text.replace("/utils/motion.js", "/utils/navigation.js")
    renamed = renamed.replace("/utils/motion'", "/utils/navigation'")
    renamed = renamed.replace('/utils/motion"', '/utils/navigation"')
    if renamed != text:
        import_count = 1
        text = renamed

    if text != original:
        path.write_text(text, encoding="utf-8")
    return {"changed": int(text != original), "smooth_behavior": smooth_count, "motion_import": import_count}


def retire_motion_utility() -> int:
    old = SRC / "utils" / "motion.js"
    new = SRC / "utils" / "navigation.js"
    if not old.exists():
        return 0
    content = old.read_text(encoding="utf-8")
    content = content.replace(
        "/**\n * Legacy import path retained for compatibility.\n * Route changes are immediate; no transition state, timers, classes or motion\n * preferences are created or consulted here.\n */",
        "/** Immediate route navigation helper. Presentation motion is intentionally absent. */",
    )
    new.write_text(content, encoding="utf-8")
    old.unlink()
    return 1


def collect_residuals() -> list[str]:
    findings: list[str] = []
    css_checks = [
        ("keyframes", re.compile(r"(?i)@(?:-webkit-)?keyframes\b")),
        ("reduced-motion", re.compile(r"(?i)prefers-reduced-motion")),
        ("smooth-scroll", re.compile(r"(?i)scroll-behavior\s*:\s*smooth")),
        ("data-motion", re.compile(r"(?i)data-(?:a11y-)?motion|data-motion")),
        ("launch-motion-class", re.compile(r"(?i)tile-launch-(?:layer|card|label)|\.is-launching")),
    ]
    code_checks = [
        ("smooth-behavior", re.compile(r"(?i)\bbehavior\s*:\s*['\"]smooth['\"]")),
        ("requestAnimationFrame", re.compile(r"\brequestAnimationFrame\b")),
        ("startViewTransition", re.compile(r"\bstartViewTransition\b")),
        ("web-animate", re.compile(r"\.animate\s*\(")),
        ("motion-import", re.compile(r"(?:/|['\"])utils/motion(?:\.js)?['\"]?")),
        ("motion-setting", re.compile(r"(?i)motion-effects|brian\.ui\.motion|a11y-motion|data-motion")),
    ]

    for path in SRC.rglob("*"):
        if not path.is_file():
            continue
        suffix = path.suffix.lower()
        if suffix not in CSS_SUFFIXES | CODE_SUFFIXES:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        rel = path.relative_to(ROOT)
        checks = css_checks if suffix in CSS_SUFFIXES else code_checks
        for label, pattern in checks:
            for match in pattern.finditer(text):
                line = text.count("\n", 0, match.start()) + 1
                # v1159 intentionally mentions browser View Transition pseudo-elements
                # only to disable them; those are not startViewTransition JS calls.
                findings.append(f"{label}\t{rel}:{line}\t{match.group(0)[:120]}")

    return findings


def main() -> None:
    summary = {
        "css_files_changed": 0,
        "code_files_changed": 0,
        "navigation_utility_renamed": 0,
        "totals": {},
    }
    totals: dict[str, int] = {}

    for path in sorted(SRC.rglob("*.css")):
        stats = clean_css(path)
        summary["css_files_changed"] += stats.pop("changed", 0)
        for key, value in stats.items():
            totals[key] = totals.get(key, 0) + value

    summary["navigation_utility_renamed"] = retire_motion_utility()

    for path in sorted(SRC.rglob("*")):
        if path.is_file() and path.suffix.lower() in CODE_SUFFIXES:
            stats = clean_code(path)
            summary["code_files_changed"] += stats.pop("changed", 0)
            for key, value in stats.items():
                totals[key] = totals.get(key, 0) + value

    summary["totals"] = totals
    residuals = collect_residuals()

    report = [
        "BRIAN MOTION SOURCE CLEANUP — ONE-TIME AUDIT",
        "",
        json.dumps(summary, indent=2, ensure_ascii=False),
        "",
        f"Residual candidate count: {len(residuals)}",
        "",
        *residuals,
        "",
    ]
    AUDIT_PATH.write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report[:20]))
    print(f"Full audit written to {AUDIT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
