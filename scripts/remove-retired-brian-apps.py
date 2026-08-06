from pathlib import Path
import json
import re
import shutil

ROOT = Path('.')

TARGET_SLUGS = [
    'lesson-plan-ai', 'exam-studio', 'word2graph', 'student-practice',
    'reading-studio', 'assessment-core', 'flying-words',
    'random-group-generator', 'classroom-screen', 'content-ecosystem',
    'automation-center', 'collaboration-hub', 'knowledge-train',
    'word-orbit', 'activity-graph', 'crossword-trial', 'practice',
]
TARGET_TITLES = [
    'Lesson Architect', 'Exam Studio', 'WordGraph Studio', 'Learner Sprint',
    'Reading Studio', 'Assessment Core', 'Ngân hàng câu hỏi & đề thi',
    'Flying Words', 'Từ Ngữ Biết Bay', 'Brian Group Maker',
    'Brian Classroom Stage', 'Teaching Content Ecosystem',
    'Hệ sinh thái nội dung dạy học', 'Automation Center',
    'Trung tâm tự động hóa', 'Collaboration Hub', 'Không gian cộng tác',
    'Knowledge Train', 'Đoàn Tàu Tri Thức', 'Vocabulary Orbit',
    'Quỹ đạo từ vựng', 'Brian Activity Graph', 'Crossword Trial',
    'Ô Chữ Bàn Thử',
]
COMPONENTS = [
    'LessonArchitect', 'ExamStudio', 'WordGraph', 'Word2Graph',
    'StudentPractice', 'LearnerSprint', 'ReadingStudio', 'AssessmentCore',
    'FlyingWords', 'RandomGroupGenerator', 'ClassroomScreenHost',
    'ContentEcosystem', 'AutomationCenter', 'CollaborationHub',
    'KnowledgeTrain', 'WordOrbit', 'VocabularyOrbit',
    'ActivityGraphStudio', 'CrosswordTrial',
]
FILE_TOKENS = [
    'lessonarchitect', 'examstudio', 'wordgraph', 'word2graph',
    'studentpractice', 'learnersprint', 'readingstudio', 'assessmentcore',
    'flyingwords', 'randomgroupgenerator', 'groupmaker', 'classroomscreen',
    'contentecosystem', 'automationcenter', 'collaborationhub',
    'knowledgetrain', 'wordorbit', 'vocabularyorbit', 'activitygraph',
    'crosswordtrial', 'registeractivitygraph', 'registerwordorbit',
]
PROTECTED = {
    Path('src/main.jsx'), Path('src/pages/ToolPage.jsx'),
    Path('src/data/apps.js'), Path('src/data/designProfiles.js'),
    Path('src/data/appVisibilityRegistry.js'), Path('src/utils/permissions.js'),
    Path('src/applicationBootstrap.jsx'), Path('vite.config.js'),
    Path('package.json'), Path('scripts/audit-removed-apps-v11.6.7.mjs'),
    Path('scripts/remove-retired-brian-apps.py'),
}


def normalized(value):
    return re.sub(r'[^a-z0-9]+', '', str(value).lower())


def matching_brace(text, start):
    depth = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    i = start
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if ch == '\n': line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped: escaped = False
            elif ch == '\\': escaped = True
            elif ch == quote: quote = None
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
        if ch in "'\"`":
            quote = ch
            i += 1
            continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: return i
        i += 1
    return -1


def remove_app_objects(text):
    markers = []
    for slug in TARGET_SLUGS:
        markers += [f"slug: '{slug}'", f'slug: "{slug}"']
    for title in TARGET_TITLES:
        markers += [f"title: '{title}'", f'title: "{title}"', f"titleVi: '{title}'", f'titleVi: "{title}"']
    changed = True
    while changed:
        changed = False
        i = 0
        while i < len(text):
            if text[i] != '{':
                i += 1
                continue
            end = matching_brace(text, i)
            if end < 0: break
            block = text[i:end + 1]
            if any(marker in block for marker in markers):
                left, right = i, end + 1
                while left > 0 and text[left - 1] in ' \t\r\n': left -= 1
                if left > 0 and text[left - 1] == ',':
                    left -= 1
                else:
                    while right < len(text) and text[right] in ' \t\r\n': right += 1
                    if right < len(text) and text[right] == ',': right += 1
                text = text[:left] + text[right:]
                changed = True
                break
            i = end + 1
    return text


def remove_named_function(text, name):
    match = re.search(rf'\bfunction\s+{re.escape(name)}\s*\(', text)
    if not match: return text
    brace = text.find('{', match.end())
    if brace < 0: return text
    end = matching_brace(text, brace)
    if end < 0: return text
    return text[:match.start()] + text[end + 1:]


def line_has_target(line):
    low = line.lower()
    return any(slug in low for slug in TARGET_SLUGS) or any(title.lower() in low for title in TARGET_TITLES) or any(component.lower() in low for component in COMPONENTS)


def clean_shared_file(path):
    if not path.exists(): return
    text = path.read_text(encoding='utf-8')
    original = text

    # Remove side-effect imports and lazy imports of retired pages.
    text = re.sub(
        r'^\s*import\s+[\s\S]*?;\s*$',
        lambda match: '' if line_has_target(match.group(0)) else match.group(0),
        text,
        flags=re.M,
    )

    kept = []
    for line in text.splitlines(True):
        compact = line.strip()
        if not line_has_target(line):
            kept.append(line)
            continue
        removable = (
            compact.startswith('import ') or
            ('lazy(' in line and ('const ' in line or 'import(' in line)) or
            compact.startswith('if (') or compact.startswith('if(') or
            'currentRoute ===' in line or 'route ===' in line or
            'selectedTool' in line or 'tool?.slug' in line or
            re.match(r"^['\"][^'\"]+['\"]\s*:\s*\{", compact) or
            re.match(r"^[A-Za-z0-9_$]+\s*:\s*\{", compact) or
            compact.startswith('//')
        )
        if not removable:
            kept.append(line)
    text = ''.join(kept)

    for slug in TARGET_SLUGS:
        q = re.escape(slug)
        text = re.sub(rf"\s*['\"]{q}['\"]\s*,?", '', text)
        text = re.sub(rf"(['\"]{q}['\"]\s*:\s*)\{{[^{{}}]*\}}\s*,?", '', text)

    text = re.sub(r',\s*,', ',', text)
    text = re.sub(r'\[\s*,', '[', text)
    text = re.sub(r',\s*\]', ']', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    if text != original:
        path.write_text(text, encoding='utf-8')


# Remove standalone Classroom Stage bundle and dedicated files for all requested apps.
if Path('apps/classroom-screen').exists():
    shutil.rmtree('apps/classroom-screen')

roots = [Path('src'), Path('public'), Path('scripts'), Path('tests'), Path('supabase'), Path('docs'), Path('build')]
for base in roots:
    if not base.exists(): continue
    for path in list(base.rglob('*')):
        if not path.is_file() or path in PROTECTED: continue
        name = normalized(path.name)
        if any(token in name for token in FILE_TOKENS):
            path.unlink(missing_ok=True)

# Remove dedicated root documentation/report files.
for path in ROOT.glob('*'):
    if not path.is_file() or path in PROTECTED: continue
    if any(token in normalized(path.name) for token in FILE_TOKENS):
        path.unlink(missing_ok=True)

apps_path = Path('src/data/apps.js')
if apps_path.exists():
    text = remove_app_objects(apps_path.read_text(encoding='utf-8'))
    apps_path.write_text(re.sub(r'\n{3,}', '\n\n', text).rstrip() + '\n', encoding='utf-8')

vite_path = Path('vite.config.js')
if vite_path.exists():
    text = vite_path.read_text(encoding='utf-8')
    text = remove_named_function(text, 'randomGroupGeneratorPlugin')
    text = re.sub(r'^.*randomGroupGeneratorPlugin\(\).*$\n?', '', text, flags=re.M)
    vite_path.write_text(re.sub(r'\n{3,}', '\n\n', text), encoding='utf-8')

package_path = Path('package.json')
package = json.loads(package_path.read_text(encoding='utf-8'))
package['scripts']['build'] = re.sub(
    r'\s*&&\s*vite build --config apps/classroom-screen/vite\.config\.ts',
    '',
    package['scripts']['build'],
)
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

for path in [
    Path('src/main.jsx'), Path('src/pages/ToolPage.jsx'),
    Path('src/applicationBootstrap.jsx'), Path('src/data/designProfiles.js'),
    Path('src/data/appVisibilityRegistry.js'), Path('src/utils/permissions.js'),
    Path('src/components/GlobalCommandPalette.jsx'),
    Path('src/components/GlobalFlatNavigation.jsx'), Path('src/pages/Home.jsx'),
    Path('src/components/ContentTransferHub.jsx'), Path('src/pages/WebApps.jsx'),
]:
    clean_shared_file(path)

# Strict release guard: no dedicated files, active registry/route references, or production chunks.
audit_path = Path('scripts/audit-removed-apps-v11.6.7.mjs')
audit_path.write_text(f'''import fs from 'node:fs';
import path from 'node:path';

const retiredSlugs = {json.dumps(TARGET_SLUGS, ensure_ascii=False)};
const retiredTitles = {json.dumps(TARGET_TITLES, ensure_ascii=False)};
const retiredTokens = {json.dumps(FILE_TOKENS, ensure_ascii=False)};
const criticalFiles = [
  'src/data/apps.js', 'src/main.jsx', 'src/pages/ToolPage.jsx',
  'src/applicationBootstrap.jsx', 'src/data/designProfiles.js',
  'src/data/appVisibilityRegistry.js', 'src/utils/permissions.js',
  'src/components/GlobalCommandPalette.jsx', 'src/components/GlobalFlatNavigation.jsx',
  'src/pages/Home.jsx', 'src/components/ContentTransferHub.jsx', 'vite.config.js',
];
let failures = 0;
const fail = (message) => {{ console.error(`✗ ${{message}}`); failures += 1; }};
const pass = (message) => console.log(`✓ ${{message}}`);

function walk(root) {{
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, {{ withFileTypes: true }}).flatMap((entry) => {{
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? walk(full) : [full.replaceAll('\\\\', '/')];
  }});
}}

for (const root of ['src', 'apps', 'public', 'dist']) {{
  for (const file of walk(root)) {{
    const normalized = path.basename(file).toLowerCase().replace(/[^a-z0-9]+/g, '');
    for (const token of retiredTokens) {{
      if (normalized.includes(token.toLowerCase().replace(/[^a-z0-9]+/g, ''))) fail(`retired app file remains: ${{file}}`);
    }}
  }}
}}
for (const file of criticalFiles) {{
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8').toLowerCase();
  for (const slug of retiredSlugs) if (text.includes(slug.toLowerCase())) fail(`${{slug}} remains active in ${{file}}`);
  for (const title of retiredTitles) if (text.includes(title.toLowerCase())) fail(`${{title}} remains active in ${{file}}`);
}}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (String(pkg.scripts?.build || '').includes('apps/classroom-screen')) fail('Classroom Stage secondary build remains');
else pass('Classroom Stage secondary build removed');
if (failures) process.exit(1);
pass('requested Brian applications are absent from source routes, registries and production chunks');
''', encoding='utf-8')

print('Removal source transformation completed.')
