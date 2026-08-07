#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_EXTS = {'.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.scss'}
RESOLVE_EXTS = ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.scss', '.json']


def resolves(source: Path, specifier: str) -> bool:
    if not specifier.startswith('.'):
        return True
    candidate = (source.parent / specifier).resolve()
    for suffix in RESOLVE_EXTS:
        path = Path(str(candidate) + suffix)
        if path.is_file():
            return True
    if candidate.is_dir():
        for name in ('index.js', 'index.jsx', 'index.ts', 'index.tsx', 'index.css'):
            if (candidate / name).is_file():
                return True
    return False


def remove_missing_import_lines(path: Path) -> None:
    original = path.read_text(encoding='utf-8')
    lines = original.splitlines(keepends=True)
    kept: list[str] = []
    changed = False
    patterns = [
        re.compile(r"^\s*import(?:\s+[^;]*?\s+from\s+|\s*)['\"]([^'\"]+)['\"]\s*;?\s*$"),
        re.compile(r"^\s*(?:const|let|var)\s+\w+\s*=\s*lazy\(\(\)\s*=>\s*import\(['\"]([^'\"]+)['\"]\)\)\s*;?\s*$"),
        re.compile(r"^\s*@import\s+(?:url\()?['\"]([^'\"]+)['\"]\)?\s*;?\s*$"),
    ]
    for line in lines:
        specifier = None
        for pattern in patterns:
            match = pattern.match(line.rstrip('\n'))
            if match:
                specifier = match.group(1)
                break
        if specifier and not resolves(path, specifier):
            print(f'removed missing import from {path.relative_to(ROOT)}: {specifier}')
            changed = True
            continue
        kept.append(line)
    if changed:
        path.write_text(''.join(kept), encoding='utf-8')


def fix_design_profiles() -> None:
    path = ROOT / 'src/data/designProfiles.js'
    if not path.exists():
        return
    text = path.read_text(encoding='utf-8')
    text = re.sub(
        r'export const APP_DESIGN_PROFILES\s*=\s*\{\s*;\s*',
        'export const APP_DESIGN_PROFILES = {};\n\n',
        text,
        flags=re.S,
    )
    path.write_text(text, encoding='utf-8')
    print('repaired src/data/designProfiles.js')


def main() -> None:
    fix_design_profiles()
    for path in ROOT.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in SOURCE_EXTS:
            continue
        if '.git' in path.parts or 'node_modules' in path.parts or 'dist' in path.parts:
            continue
        remove_missing_import_lines(path)
    print('Missing local import repair complete.')


if __name__ == '__main__':
    main()
