#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SELF = Path(__file__).resolve()
TOMBSTONE = ROOT / 'src/utils/retiredFeatureCleanup.js'

SLUGS = [
    'lesson-plan-ai', 'exam-studio', 'word2graph', 'wordgraph-studio',
    'student-practice', 'learner-sprint', 'reading-studio', 'assessment-core',
    'flying-words', 'random-group', 'random-group-generator', 'group-maker',
    'classroom-screen', 'content-ecosystem', 'automation-center',
    'collaboration-hub', 'knowledge-train', 'word-orbit', 'activity-graph',
    'crossword-trial',
]

COMPONENTS = [
    'LessonArchitect', 'ExamStudioUploadPage', 'ExamStudio', 'WordGraphStudio',
    'StudentPractice', 'ReadingStudio', 'AssessmentCore', 'FlyingWords',
    'RandomGroup', 'GroupMaker', 'ClassroomScreen', 'ContentEcosystem',
    'AutomationCenter', 'CollaborationHub', 'KnowledgeTrain', 'WordOrbit',
    'ActivityGraph', 'CrosswordTrial',
]

DISPLAY_MARKERS = [
    'Lesson Architect', 'Exam Studio', 'WordGraph Studio', 'Learner Sprint',
    'Reading Studio', 'Ngân hàng câu hỏi', 'Từ ngữ biết bay',
    'Brian Group Maker', 'Brian Classroom Stage',
    'Hệ sinh thái nội dung dạy học', 'Trung tâm tự động hóa',
    'Trung tâm tự động hoá', 'Không gian cộng tác', 'Đoàn tàu tri thức',
    'Quỹ đạo từ vựng', 'Brian Activity Graph', 'Ô chữ bản thử',
    'Ô chữ bàn thử',
]

FILENAME_TOKENS = [
    'lessonarchitect', 'examstudio', 'wordgraph', 'word2graph',
    'studentpractice', 'learnersprint', 'readingstudio', 'assessmentcore',
    'flyingwords', 'randomgroup', 'groupmaker', 'classroomscreen',
    'contentecosystem', 'automationcenter', 'collaborationhub',
    'knowledgetrain', 'wordorbit', 'activitygraph', 'crosswordtrial',
]

APP_ONLY_PATHS = [
    'src/pages/SpecializedAppPage.jsx',
    'src/utils/specializedAppEngines.js',
    'src/utils/automationEngine.js',
    'src/utils/collaborationGovernance.js',
    'src/styles/OpaqueTeachingApps.css',
    'apps/classroom-screen',
]

JS_FILES = [
    'src/components/FlatAppIcon.jsx',
    'src/components/GlobalCommandPaletteV2.jsx',
    'src/components/GlobalCommandPaletteV21.jsx',
    'src/pages/HomeApproved.jsx',
    'src/pages/ResourceLibraryBase.jsx',
    'src/pages/Games.jsx',
    'src/utils/aiActions.js',
    'src/utils/gemini.js',
    'src/utils/launcherPreferences.js',
    'src/utils/permissions.js',
    'src/main.jsx',
    'src/pages/ToolPage.jsx',
    'src/pages/appsDirectoryData.js',
    'src/data/apps.js',
    'src/data/appVisibilityRegistry.js',
    'src/data/designProfiles.js',
    'src/appBootstrap.js',
    'src/appBootstrap.jsx',
    'vite.config.js',
]

CSS_FILES = [
    'src/components/GlobalAppsAndroidDrawer.css',
    'src/components/GlobalHome16x9Fit.css',
    'src/components/GlobalHomeAuroraV3.css',
    'src/components/GlobalHomeGooglePolish.css',
    'src/index.css',
    'src/styles/legacy/01-foundation.css',
    'src/styles/legacy/02-workspaces.css',
    'src/styles/legacy/03-operations.css',
    'src/styles/legacy/05-connected-platform.css',
    'src/styles/v1137.css',
]

LOWER_MARKERS = [value.lower() for value in SLUGS + COMPONENTS + DISPLAY_MARKERS]


def normalize(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', value.lower())


def remove_path(path: Path) -> None:
    if not path.exists():
        return
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()
    print(f'deleted {path.relative_to(ROOT)}')


def delete_named_app_files() -> None:
    for rel in APP_ONLY_PATHS:
        remove_path(ROOT / rel)

    src = ROOT / 'src'
    if not src.exists():
        return
    candidates = sorted(src.rglob('*'), key=lambda p: len(p.parts), reverse=True)
    for path in candidates:
        if not path.exists() or path.resolve() == TOMBSTONE.resolve():
            continue
        name = normalize(path.name)
        if any(token in name for token in FILENAME_TOKENS):
            remove_path(path)


def scan_brace_pairs(text: str) -> list[tuple[int, int]]:
    stack: list[int] = []
    pairs: list[tuple[int, int]] = []
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    i = 0
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if ch == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/':
                block_comment = False
                i += 2
            else:
                i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = ''
            i += 1
            continue
        if ch == '/' and nxt == '/':
            line_comment = True
            i += 2
            continue
        if ch == '/' and nxt == '*':
            block_comment = True
            i += 2
            continue
        if ch in ('\'', '"', '`'):
            quote = ch
        elif ch == '{':
            stack.append(i)
        elif ch == '}' and stack:
            pairs.append((stack.pop(), i))
        i += 1
    return pairs


def expand_entry(text: str, start: int, end_inclusive: int) -> tuple[int, int]:
    line_start = text.rfind('\n', 0, start) + 1
    if not text[line_start:start].strip():
        start = line_start
    end = end_inclusive + 1
    while end < len(text) and text[end] in ' \t':
        end += 1
    if end < len(text) and text[end] == ',':
        end += 1
    while end < len(text) and text[end] in ' \t':
        end += 1
    if end < len(text) and text[end] == '\n':
        end += 1
    else:
        left = start - 1
        while left >= 0 and text[left] in ' \t':
            left -= 1
        if left >= 0 and text[left] == ',':
            start = left
    return start, end


def remove_ranges(text: str, ranges: list[tuple[int, int]]) -> str:
    if not ranges:
        return text
    merged: list[list[int]] = []
    for start, end in sorted(ranges):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    for start, end in reversed(merged):
        text = text[:start] + text[end:]
    return text


def remove_target_objects(text: str) -> str:
    patterns: list[tuple[re.Pattern[str], bool]] = []
    for slug in SLUGS:
        esc = re.escape(slug)
        patterns.extend([
            (re.compile(rf"\bslug\s*:\s*['\"]{esc}['\"]", re.I), False),
            (re.compile(rf"\b(?:id|route|tool|target)\s*:\s*['\"]{esc}['\"]", re.I), False),
            (re.compile(rf"['\"]{esc}['\"]\s*:\s*\{{", re.I), True),
        ])

    for _ in range(5):
        pairs = scan_brace_pairs(text)
        removals: list[tuple[int, int]] = []
        for pattern, keyed in patterns:
            for match in pattern.finditer(text):
                containing = [(a, b) for a, b in pairs if a <= match.start() <= b]
                if not containing:
                    continue
                a, b = min(containing, key=lambda pair: pair[1] - pair[0])
                start = match.start() if keyed else a
                removals.append(expand_entry(text, start, b))
        if not removals:
            break
        text = remove_ranges(text, removals)
    return text


def remove_multiline_imports(text: str) -> str:
    lines = text.splitlines(keepends=True)
    result: list[str] = []
    buffer: list[str] = []
    collecting = False

    def keep(statement: str) -> bool:
        low = statement.lower()
        return not any(marker in low for marker in LOWER_MARKERS + FILENAME_TOKENS)

    for line in lines:
        if collecting:
            buffer.append(line)
            joined = ''.join(buffer)
            if ';' in line or re.search(r"\bfrom\s+['\"][^'\"]+['\"]", joined):
                if keep(joined):
                    result.extend(buffer)
                buffer = []
                collecting = False
            continue
        if re.match(r'^\s*(?:import|export\s+\{)', line):
            buffer = [line]
            collecting = True
            if ';' in line or re.search(r"\bfrom\s+['\"][^'\"]+['\"]", line):
                if keep(line):
                    result.append(line)
                buffer = []
                collecting = False
        else:
            result.append(line)
    if buffer and keep(''.join(buffer)):
        result.extend(buffer)
    return ''.join(result)


def remove_component_functions(text: str) -> str:
    for name in COMPONENTS:
        patterns = [
            re.compile(rf'(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+{re.escape(name)}\b'),
            re.compile(rf'(?:export\s+)?(?:const|let|var)\s+{re.escape(name)}\s*='),
            re.compile(rf'(?:export\s+)?(?:default\s+)?class\s+{re.escape(name)}\b'),
        ]
        for pattern in patterns:
            while True:
                match = pattern.search(text)
                if not match:
                    break
                brace = text.find('{', match.end())
                if brace < 0:
                    break
                pair = next(((a, b) for a, b in scan_brace_pairs(text) if a == brace), None)
                if not pair:
                    break
                start, end = expand_entry(text, match.start(), pair[1])
                text = text[:start] + text[end:]
    return text


def clean_resource_library(text: str) -> str:
    # Preserve the resource library itself while replacing retired launch targets.
    fallback = 'resource-library-hub'
    for slug in SLUGS:
        text = re.sub(rf"(['\"]){re.escape(slug)}\1", rf"'{fallback}'", text)
    return text


def clean_js_file(path: Path) -> None:
    if not path.exists() or path.resolve() == TOMBSTONE.resolve():
        return
    original = path.read_text(encoding='utf-8')
    text = original
    if path.name == 'ResourceLibraryBase.jsx':
        text = clean_resource_library(text)
    text = remove_multiline_imports(text)
    text = remove_target_objects(text)
    text = remove_component_functions(text)

    output: list[str] = []
    for line in text.splitlines(keepends=True):
        low = line.lower()
        if 'currentroute === &&' in low:
            continue
        if any(marker in low for marker in LOWER_MARKERS):
            # Remaining target lines are aliases, launcher entries, route branches,
            # CSS-like class maps, or app-specific ranking rules.
            continue
        output.append(line)
    text = ''.join(output)
    text = re.sub(r',\s*,', ',', text)
    text = re.sub(r'\[\s*,', '[', text)
    text = re.sub(r',\s*\]', ']', text)
    text = re.sub(r'\{\s*,', '{', text)
    text = re.sub(r',\s*\}', '}', text)
    if text != original:
        path.write_text(text, encoding='utf-8')
        print(f'cleaned {path.relative_to(ROOT)}')


def find_css_brace(text: str, start: int) -> int:
    quote = ''
    escaped = False
    comment = False
    i = start
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if comment:
            if ch == '*' and nxt == '/':
                comment = False
                i += 2
            else:
                i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = ''
            i += 1
            continue
        if ch == '/' and nxt == '*':
            comment = True
            i += 2
            continue
        if ch in ('\'', '"'):
            quote = ch
        elif ch == '{':
            return i
        i += 1
    return -1


def matching_css_brace(text: str, start: int) -> int:
    depth = 0
    quote = ''
    escaped = False
    comment = False
    i = start
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if comment:
            if ch == '*' and nxt == '/':
                comment = False
                i += 2
            else:
                i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = ''
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


def split_css_selectors(prelude: str) -> list[str]:
    parts: list[str] = []
    start = 0
    round_depth = square_depth = 0
    quote = ''
    escaped = False
    for i, ch in enumerate(prelude):
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = ''
            continue
        if ch in ('\'', '"'):
            quote = ch
        elif ch == '(':
            round_depth += 1
        elif ch == ')':
            round_depth = max(0, round_depth - 1)
        elif ch == '[':
            square_depth += 1
        elif ch == ']':
            square_depth = max(0, square_depth - 1)
        elif ch == ',' and round_depth == 0 and square_depth == 0:
            parts.append(prelude[start:i])
            start = i + 1
    parts.append(prelude[start:])
    return parts


def clean_css_block(text: str) -> str:
    result: list[str] = []
    cursor = 0
    while cursor < len(text):
        brace = find_css_brace(text, cursor)
        if brace < 0:
            result.append(text[cursor:])
            break
        close = matching_css_brace(text, brace)
        if close < 0:
            result.append(text[cursor:])
            break
        prelude = text[cursor:brace]
        body = text[brace + 1:close]
        stripped = prelude.strip()
        low = stripped.lower()
        if stripped.startswith('@'):
            if any(marker in low for marker in SLUGS + FILENAME_TOKENS):
                pass
            elif low.startswith(('@media', '@supports', '@layer', '@container', '@document')):
                child = clean_css_block(body)
                if child.strip():
                    result.append(prelude + '{' + child + '}')
            else:
                result.append(prelude + '{' + body + '}')
        else:
            selectors = split_css_selectors(prelude)
            kept = [selector for selector in selectors if not any(marker in selector.lower() for marker in SLUGS + FILENAME_TOKENS)]
            if kept:
                leading = re.match(r'^\s*', prelude).group(0)
                result.append(leading + ',\n'.join(selector.strip() for selector in kept) + '{' + body + '}')
        cursor = close + 1
    return ''.join(result)


def clean_css_file(path: Path) -> None:
    if not path.exists():
        return
    original = path.read_text(encoding='utf-8')
    lines = []
    for line in original.splitlines(keepends=True):
        low = line.lower()
        if line.lstrip().startswith('@import') and any(marker in low for marker in SLUGS + FILENAME_TOKENS):
            continue
        lines.append(line)
    text = clean_css_block(''.join(lines))
    if text != original:
        path.write_text(text, encoding='utf-8')
        print(f'cleaned {path.relative_to(ROOT)}')


def clean_package() -> None:
    path = ROOT / 'package.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    scripts = data.get('scripts', {})
    build = str(scripts.get('build', ''))
    build = re.sub(r'\s*&&\s*vite build --config apps/classroom-screen/vite\.config\.ts', '', build)
    scripts['build'] = build
    for key in list(scripts):
        if key == 'build':
            continue
        command = str(scripts[key]).lower()
        if any(slug in command for slug in SLUGS):
            del scripts[key]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('cleaned package.json')


def clean_version_sync() -> None:
    path = ROOT / 'scripts/sync-version-v11.6.7.mjs'
    if not path.exists():
        return
    original = path.read_text(encoding='utf-8')
    text = re.sub(r"^import\s+['\"]\.\/prepare-streamlined-catalog-v3\.mjs['\"];?\s*$\n?", '', original, flags=re.M)
    if text != original:
        path.write_text(text, encoding='utf-8')
        print('cleaned scripts/sync-version-v11.6.7.mjs')


def add_tombstones() -> None:
    text = TOMBSTONE.read_text(encoding='utf-8')
    match = re.search(r'const RETIRED_APP_ROUTES = new Set\(\[(.*?)\]\);', text, flags=re.S)
    if not match:
        raise RuntimeError('RETIRED_APP_ROUTES was not found')
    values = re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))
    for slug in SLUGS:
        for route in (slug, f'tool/{slug}'):
            if route not in values:
                values.append(route)
    rendered = "const RETIRED_APP_ROUTES = new Set([\n" + ''.join(f"  '{value}',\n" for value in values) + ']);'
    text = text[:match.start()] + rendered + text[match.end():]
    TOMBSTONE.write_text(text, encoding='utf-8')
    print('updated retired route tombstones')


def remove_empty_dirs() -> None:
    for path in sorted((p for p in ROOT.rglob('*') if p.is_dir()), key=lambda p: len(p.parts), reverse=True):
        if '.git' in path.parts or 'node_modules' in path.parts:
            continue
        try:
            next(path.iterdir())
        except StopIteration:
            path.rmdir()
        except OSError:
            pass


def main() -> None:
    delete_named_app_files()
    clean_package()
    clean_version_sync()
    for rel in JS_FILES:
        clean_js_file(ROOT / rel)
    for rel in CSS_FILES:
        clean_css_file(ROOT / rel)
    add_tombstones()
    remove_path(ROOT / 'scripts/prepare-streamlined-catalog-v3.mjs')
    remove_empty_dirs()
    print('Targeted deep cleanup v2 completed.')


if __name__ == '__main__':
    main()
