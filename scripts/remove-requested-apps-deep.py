#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SELF = Path(__file__).resolve()

SLUGS = [
    'lesson-plan-ai',
    'exam-studio',
    'word2graph',
    'wordgraph-studio',
    'student-practice',
    'learner-sprint',
    'reading-studio',
    'assessment-core',
    'flying-words',
    'random-group',
    'random-group-generator',
    'group-maker',
    'classroom-screen',
    'content-ecosystem',
    'automation-center',
    'collaboration-hub',
    'knowledge-train',
    'word-orbit',
    'activity-graph',
    'crossword-trial',
]

COMPONENTS = [
    'LessonArchitect',
    'ExamStudioUploadPage',
    'ExamStudio',
    'WordGraphStudio',
    'StudentPractice',
    'ReadingStudio',
    'AssessmentCore',
    'FlyingWords',
    'RandomGroup',
    'GroupMaker',
    'ClassroomScreen',
    'ContentEcosystem',
    'AutomationCenter',
    'CollaborationHub',
    'KnowledgeTrain',
    'WordOrbit',
    'ActivityGraph',
    'CrosswordTrial',
]

DISPLAY_MARKERS = [
    'Lesson Architect',
    'Exam Studio',
    'WordGraph Studio',
    'Learner Sprint',
    'Reading Studio',
    'Ngân hàng câu hỏi',
    'Từ ngữ biết bay',
    'Brian Group Maker',
    'Brian Classroom Stage',
    'Hệ sinh thái nội dung dạy học',
    'Trung tâm tự động hóa',
    'Trung tâm tự động hoá',
    'Không gian cộng tác',
    'Đoàn tàu tri thức',
    'Quỹ đạo từ vựng',
    'Brian Activity Graph',
    'Ô chữ bản thử',
    'Ô chữ bàn thử',
]

FUNCTION_NAMES = [
    'buildOfflineWordGraphOutline',
    'getSpecializedConfig',
    'buildExamStudio',
]

FILE_TOKENS = [
    'lessonarchitect', 'examstudio', 'wordgraph', 'word2graph',
    'studentpractice', 'learnersprint', 'readingstudio', 'assessmentcore',
    'flyingwords', 'randomgroup', 'groupmaker', 'classroomscreen',
    'contentecosystem', 'automationcenter', 'collaborationhub',
    'knowledgetrain', 'wordorbit', 'activitygraph', 'crosswordtrial',
]

KNOWN_APP_ONLY_FILES = [
    'src/pages/SpecializedAppPage.jsx',
    'src/utils/specializedAppEngines.js',
    'src/utils/automationEngine.js',
    'src/utils/collaborationGovernance.js',
    'src/styles/OpaqueTeachingApps.css',
]

ALLOWED_TOMBSTONE = ROOT / 'src/utils/retiredFeatureCleanup.js'
TEXT_EXTS = {'.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.scss', '.json', '.html', '.md'}


def normalized(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', value.lower())


def remove_path(path: Path) -> None:
    if not path.exists():
        return
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()
    print(f'deleted {path.relative_to(ROOT)}')


def delete_app_files() -> None:
    for rel in KNOWN_APP_ONLY_FILES:
        remove_path(ROOT / rel)

    # The classroom stage is a separate Vite build and must disappear as a whole.
    remove_path(ROOT / 'apps/classroom-screen')

    candidates = sorted((p for p in ROOT.rglob('*') if '.git' not in p.parts), key=lambda p: len(p.parts), reverse=True)
    for path in candidates:
        if not path.exists() or path.resolve() == SELF:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel.startswith('node_modules/') or rel.startswith('dist/'):
            continue
        probe = normalized(path.name)
        rel_probe = normalized(rel)
        if any(token in probe or token in rel_probe for token in FILE_TOKENS):
            # Keep the central tombstone so stale browser links are redirected safely.
            if path.resolve() == ALLOWED_TOMBSTONE.resolve():
                continue
            remove_path(path)


def scan_pairs(text: str, opener: str = '{', closer: str = '}') -> list[tuple[int, int]]:
    stack: list[int] = []
    pairs: list[tuple[int, int]] = []
    i = 0
    quote = ''
    line_comment = False
    block_comment = False
    escaped = False
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
            i += 1
            continue
        if ch == opener:
            stack.append(i)
        elif ch == closer and stack:
            start = stack.pop()
            pairs.append((start, i))
        i += 1
    return pairs


def expand_removal(text: str, start: int, end: int) -> tuple[int, int]:
    line_start = text.rfind('\n', 0, start) + 1
    prefix = text[line_start:start]
    if prefix.strip() in {'', ',', '[', '('}:
        start = line_start
    j = end + 1
    while j < len(text) and text[j] in ' \t':
        j += 1
    if j < len(text) and text[j] == ',':
        j += 1
    while j < len(text) and text[j] in ' \t':
        j += 1
    if j < len(text) and text[j] == '\n':
        j += 1
    else:
        k = start - 1
        while k >= 0 and text[k] in ' \t':
            k -= 1
        if k >= 0 and text[k] == ',':
            start = k
    return start, j


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
    patterns = []
    for slug in SLUGS:
        esc = re.escape(slug)
        patterns.extend([
            rf"\bslug\s*:\s*['\"]{esc}['\"]",
            rf"\b(?:id|route|tool|target)\s*:\s*['\"]{esc}['\"]",
            rf"['\"]{esc}['\"]\s*:\s*\{{",
        ])

    for _ in range(4):
        pairs = scan_pairs(text)
        ranges: list[tuple[int, int]] = []
        for pattern in patterns:
            for match in re.finditer(pattern, text, flags=re.I):
                containing = [(a, b) for a, b in pairs if a <= match.start() <= b]
                if not containing:
                    continue
                a, b = min(containing, key=lambda item: item[1] - item[0])
                # For keyed properties, include the key before the opening brace.
                start = match.start() if re.match(r"['\"]", match.group(0)) else a
                ranges.append(expand_removal(text, start, b))
        if not ranges:
            break
        text = remove_ranges(text, ranges)
    return text


def remove_named_functions(text: str) -> str:
    names = COMPONENTS + FUNCTION_NAMES
    for name in names:
        patterns = [
            rf'(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+{re.escape(name)}\b',
            rf'(?:export\s+)?(?:const|let|var)\s+{re.escape(name)}\s*=',
            rf'(?:export\s+)?(?:default\s+)?class\s+{re.escape(name)}\b',
        ]
        for pattern in patterns:
            while True:
                match = re.search(pattern, text)
                if not match:
                    break
                brace = text.find('{', match.end())
                semi = text.find(';', match.end())
                if brace == -1 or (semi != -1 and semi < brace):
                    line_end = text.find('\n', match.end())
                    text = text[:match.start()] + text[(line_end + 1 if line_end >= 0 else len(text)):]
                    continue
                pair = next(((a, b) for a, b in scan_pairs(text) if a == brace), None)
                if not pair:
                    break
                start, end = expand_removal(text, match.start(), pair[1])
                text = text[:start] + text[end:]
    return text


def remove_import_statements(text: str) -> str:
    markers = [m.lower() for m in SLUGS + COMPONENTS] + FILE_TOKENS
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    collecting: list[str] = []
    for line in lines:
        if collecting:
            collecting.append(line)
            joined = ''.join(collecting)
            if ';' in line or re.search(r"\bfrom\s+['\"][^'\"]+['\"]", joined):
                if not any(marker in joined.lower() for marker in markers):
                    out.extend(collecting)
                collecting = []
            continue
        if re.match(r'^\s*(?:import|export\s+\{)', line):
            collecting = [line]
            if ';' in line or re.search(r"\bfrom\s+['\"][^'\"]+['\"]", line):
                if not any(marker in line.lower() for marker in markers):
                    out.append(line)
                collecting = []
        else:
            out.append(line)
    if collecting and not any(marker in ''.join(collecting).lower() for marker in markers):
        out.extend(collecting)
    return ''.join(out)


def clean_js_like(text: str, path: Path) -> str:
    text = remove_import_statements(text)
    text = remove_target_objects(text)
    text = remove_named_functions(text)

    markers = [m.lower() for m in SLUGS + COMPONENTS + DISPLAY_MARKERS + FUNCTION_NAMES]
    output: list[str] = []
    for line in text.splitlines(keepends=True):
        low = line.lower()
        if 'currentroute === &&' in low:
            continue
        if any(marker in low for marker in markers):
            continue
        output.append(line)
    text = ''.join(output)

    # Repair harmless comma artifacts after removing array/object entries.
    text = re.sub(r',\s*,', ',', text)
    text = re.sub(r'\[\s*,', '[', text)
    text = re.sub(r',\s*\]', ']', text)
    text = re.sub(r'\{\s*,', '{', text)
    text = re.sub(r',\s*\}', '}', text)
    return text


def split_selectors(prelude: str) -> list[str]:
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


def find_next_css_brace(text: str, start: int) -> int:
    i = start
    quote = ''
    comment = False
    escaped = False
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
    i = start
    quote = ''
    comment = False
    escaped = False
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


def clean_css(text: str) -> str:
    marker_words = [m.lower() for m in SLUGS]
    # Remove app-specific imports first.
    text = ''.join(
        line for line in text.splitlines(keepends=True)
        if not (line.lstrip().startswith('@import') and any(m in line.lower() for m in marker_words + FILE_TOKENS))
    )

    def clean_block(block: str) -> str:
        out: list[str] = []
        cursor = 0
        while cursor < len(block):
            brace = find_next_css_brace(block, cursor)
            if brace < 0:
                out.append(block[cursor:])
                break
            close = matching_css_brace(block, brace)
            if close < 0:
                out.append(block[cursor:])
                break
            prelude = block[cursor:brace]
            body = block[brace + 1:close]
            stripped = prelude.strip()
            if stripped.startswith('@'):
                lowered = stripped.lower()
                if any(m in lowered for m in marker_words + FILE_TOKENS):
                    pass
                elif lowered.startswith(('@media', '@supports', '@layer', '@container', '@document')):
                    child = clean_block(body)
                    if child.strip():
                        out.append(prelude + '{' + child + '}')
                else:
                    out.append(prelude + '{' + body + '}')
            else:
                selectors = split_selectors(prelude)
                kept = [selector for selector in selectors if not any(m in selector.lower() for m in marker_words + FILE_TOKENS)]
                if kept:
                    leading = re.match(r'^\s*', prelude).group(0)
                    out.append(leading + ','.join(s.strip() for s in kept) + '{' + body + '}')
            cursor = close + 1
        return ''.join(out)

    return clean_block(text)


def clean_package_json() -> None:
    path = ROOT / 'package.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    scripts = data.get('scripts', {})
    build = scripts.get('build', '')
    build = re.sub(r'\s*&&\s*vite build --config apps/classroom-screen/vite\.config\.ts', '', build)
    scripts['build'] = build
    for key in list(scripts):
        if key == 'build':
            continue
        command = str(scripts[key]).lower()
        if any(slug in command for slug in SLUGS):
            del scripts[key]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def add_tombstones() -> None:
    path = ALLOWED_TOMBSTONE
    text = path.read_text(encoding='utf-8')
    match = re.search(r'const RETIRED_APP_ROUTES = new Set\(\[(.*?)\]\);', text, flags=re.S)
    if not match:
        raise RuntimeError('RETIRED_APP_ROUTES set was not found')
    values = re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))
    for slug in SLUGS:
        for route in (slug, f'tool/{slug}'):
            if route not in values:
                values.append(route)
    rendered = "const RETIRED_APP_ROUTES = new Set([\n" + ''.join(f"  '{value}',\n" for value in values) + ']);'
    text = text[:match.start()] + rendered + text[match.end():]
    path.write_text(text, encoding='utf-8')


def process_text_files() -> None:
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or path.resolve() in {SELF, ALLOWED_TOMBSTONE.resolve()}:
            continue
        if '.git' in path.parts or 'node_modules' in path.parts or 'dist' in path.parts:
            continue
        if path.suffix.lower() not in TEXT_EXTS:
            continue
        try:
            original = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        if path.name == 'package.json':
            continue
        if path.suffix.lower() in {'.css', '.scss'}:
            updated = clean_css(original)
        elif path.suffix.lower() == '.json':
            # JSON assets with retired app IDs are safer to remove line-wise only when valid afterwards.
            updated = original
            if any(marker.lower() in original.lower() for marker in SLUGS + COMPONENTS):
                try:
                    value = json.loads(original)
                    def prune(obj):
                        if isinstance(obj, dict):
                            return {k: prune(v) for k, v in obj.items() if not any(m in str(k).lower() for m in SLUGS)}
                        if isinstance(obj, list):
                            return [prune(v) for v in obj if not any(m in json.dumps(v, ensure_ascii=False).lower() for m in SLUGS)]
                        return obj
                    updated = json.dumps(prune(value), ensure_ascii=False, indent=2) + '\n'
                except Exception:
                    pass
        else:
            updated = clean_js_like(original, path)
        if updated != original:
            path.write_text(updated, encoding='utf-8')
            print(f'cleaned {path.relative_to(ROOT)}')


def remove_empty_directories() -> None:
    for path in sorted((p for p in ROOT.rglob('*') if p.is_dir()), key=lambda p: len(p.parts), reverse=True):
        if '.git' in path.parts:
            continue
        try:
            next(path.iterdir())
        except StopIteration:
            path.rmdir()
        except OSError:
            pass


def main() -> None:
    delete_app_files()
    clean_package_json()
    process_text_files()
    add_tombstones()
    remove_empty_directories()
    print('Deep cleanup completed. Requested apps now exist only as safe retired-route tombstones.')


if __name__ == '__main__':
    main()
