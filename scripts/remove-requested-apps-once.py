from pathlib import Path
import json
import re
import textwrap

CATALOG_SLUGS = [
    'lesson-plan-ai',
    'exam-studio',
    'word2graph',
    'student-practice',
    'reading-studio',
    'assessment-core',
    'flying-words',
    'classroom-screen',
    'content-ecosystem',
    'automation-center',
    'collaboration-hub',
    'knowledge-train',
    'crossword-trial',
]
DYNAMIC_SLUGS = ['word-orbit', 'activity-graph']
GROUP_MAKER_ALIASES = [
    'random-group-generator',
    'random-group',
    'group-maker',
    'brian-group-maker',
]
RETIRED_ROUTES = [
    'practice',
    'content-ecosystem',
    'assessment-core',
    'automation-center',
    'collaboration-hub',
]
COMPONENTS = [
    'LessonArchitect',
    'ExamStudioUploadPage',
    'WordGraphStudio',
    'StudentPractice',
    'ReadingStudio',
    'ReadingStudioAccordionLibrary',
    'AssessmentCore',
    'FlyingWordsGame',
    'FlyingWordsContrast',
    'RandomGroupGenerator',
    'ClassroomScreenHost',
    'ContentEcosystem',
    'AutomationCenter',
    'CollaborationHub',
    'KnowledgeTrainGame',
    'WordOrbitGame',
    'ActivityGraphStudio',
    'CrosswordTrialGame',
    'SpecializedAppPage',
]


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, content):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


def normalize(text):
    text = re.sub(r'[ \t]+\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r',\s*,', ',', text)
    text = re.sub(r'\[\s*,', '[', text)
    text = re.sub(r',\s*\]', ']', text)
    text = re.sub(r'\{\s*,', '{', text)
    text = re.sub(r',\s*\}', '}', text)
    return text.rstrip() + '\n'


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
            if ch == '\n':
                line_comment = False
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
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
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
        if ch in ("'", '"', '`'):
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def remove_catalog_object(text, slug):
    marker = re.compile(rf"(?m)^\s*slug:\s*'{re.escape(slug)}',")
    match = marker.search(text)
    if not match:
        return text, False
    start = text.rfind('{', 0, match.start())
    if start < 0:
        raise RuntimeError(f'Cannot locate object start for {slug}')
    end_brace = matching_brace(text, start)
    if end_brace < 0:
        raise RuntimeError(f'Cannot locate object end for {slug}')
    start_line = text.rfind('\n', 0, start) + 1
    end = end_brace + 1
    while end < len(text) and text[end] in ' \t':
        end += 1
    if end < len(text) and text[end] == ',':
        end += 1
    if end < len(text) and text[end] == '\n':
        end += 1
    return text[:start_line] + text[end:], True


def remove_named_profile(text, slug):
    pattern = re.compile(rf"(?m)^  (?:'{re.escape(slug)}'|{re.escape(slug)}):\s*\{{")
    match = pattern.search(text)
    if not match:
        return text
    open_brace = text.find('{', match.start())
    close_brace = matching_brace(text, open_brace)
    if close_brace < 0:
        raise RuntimeError(f'Cannot match design profile braces for {slug}')
    end = close_brace + 1
    while end < len(text) and text[end] in ' \t':
        end += 1
    if end < len(text) and text[end] == ',':
        end += 1
    if end < len(text) and text[end] == '\n':
        end += 1
    return text[:match.start()] + text[end:]


def remove_string_tokens(text, values):
    for value in sorted(set(values), key=len, reverse=True):
        escaped = re.escape(value)
        text = re.sub(
            rf"(?m)(?:'{escaped}'|\"{escaped}\"|{escaped})\s*:\s*(?:'[^']*'|\"[^\"]*\"|`[^`]*`),?\s*",
            '',
            text,
        )
        text = re.sub(rf"(?<![\w-])'{escaped}'\s*,?\s*", '', text)
        text = re.sub(rf'(?<![\w-])"{escaped}"\s*,?\s*', '', text)
    return normalize(text)


apps_path = Path('src/data/apps.js')
apps = read(apps_path)
for slug in CATALOG_SLUGS:
    apps, removed = remove_catalog_object(apps, slug)
    if not removed:
        print(f'[catalog] already absent: {slug}')
write(apps_path, normalize(apps))

tool_path = Path('src/pages/ToolPage.jsx')
tool = read(tool_path)
tool = tool.replace("import '../data/registerWordOrbit.js';\n", '')
tool = tool.replace("import '../data/registerActivityGraph.js';\n", '')
for component in COMPONENTS:
    tool = re.sub(
        rf"^const {re.escape(component)} = lazy\(\(\) => import\([^\n]+\)\);\n",
        '',
        tool,
        flags=re.MULTILINE,
    )
tool = re.sub(r"^const specializedToolSlugs = new Set\([^\n]+\);\n", '', tool, flags=re.MULTILINE)
for slug in CATALOG_SLUGS + DYNAMIC_SLUGS:
    tool = re.sub(
        rf"^\s*if \(tool\?\.slug === '{re.escape(slug)}'\)[^\n]*\n",
        '',
        tool,
        flags=re.MULTILINE,
    )
tool = re.sub(r"^\s*if \(specializedToolSlugs\.has\(tool\?\.slug\)\)[^\n]*\n", '', tool, flags=re.MULTILINE)
write(tool_path, normalize(tool))

version_path = Path('src/config/version.js')
version = read(version_path)
version = version.replace("import '../data/registerWordOrbit.js';\n", '')
version = version.replace("import '../data/registerActivityGraph.js';\n", '')
version = re.sub(
    r"export const RELEASE_NAME = '[^']*';",
    "export const RELEASE_NAME = 'Requested Application Retirement';",
    version,
)
write(version_path, normalize(version))

main_path = Path('src/main.jsx')
main = read(main_path)
for component in [
    'StudentPractice',
    'AssessmentCore',
    'AutomationCenter',
    'CollaborationHub',
    'ContentEcosystem',
]:
    main = re.sub(
        rf"^const {re.escape(component)} = lazy\(\(\) => import\([^\n]+\)\);\n",
        '',
        main,
        flags=re.MULTILINE,
    )
main = remove_string_tokens(main, RETIRED_ROUTES)
for route in RETIRED_ROUTES:
    main = re.sub(
        rf"^\s*\{{canAccessRoute && currentRoute === '{re.escape(route)}'[^\n]*\n",
        '',
        main,
        flags=re.MULTILINE,
    )
write(main_path, normalize(main))

profiles_path = Path('src/data/designProfiles.js')
profiles = read(profiles_path)
for slug in CATALOG_SLUGS + DYNAMIC_SLUGS:
    profiles = remove_named_profile(profiles, slug)
write(profiles_path, normalize(profiles))

directory_path = Path('src/pages/appsDirectoryData.js')
directory = remove_string_tokens(read(directory_path), CATALOG_SLUGS + DYNAMIC_SLUGS + GROUP_MAKER_ALIASES)
write(directory_path, directory)

redesign_path = Path('src/pages/WebAppsRedesign.jsx')
redesign = remove_string_tokens(read(redesign_path), CATALOG_SLUGS + DYNAMIC_SLUGS + GROUP_MAKER_ALIASES)
write(redesign_path, redesign)

for filename in [
    'src/data/appVisibilityRegistry.js',
    'src/utils/permissions.js',
    'src/components/GlobalCommandPalette.jsx',
    'src/components/GlobalCompactNavigation.jsx',
    'src/components/GlobalFlatNavigation.jsx',
    'src/components/StatusMenuBar.jsx',
]:
    path = Path(filename)
    if path.exists():
        write(path, remove_string_tokens(read(path), RETIRED_ROUTES + CATALOG_SLUGS + DYNAMIC_SLUGS + GROUP_MAKER_ALIASES))

package_path = Path('package.json')
package_data = json.loads(read(package_path))
if package_data.get('scripts', {}).get('build'):
    package_data['scripts']['build'] = 'npm run build:app'
write(package_path, json.dumps(package_data, ensure_ascii=False, indent=2) + '\n')

cleanup_source = textwrap.dedent(r"""
    const RETIRED_STORAGE_KEYS = new Set([
      'bet-theme',
      'bes-theme-mode',
      'bes-theme-mode-v3',
      'bes-quick-dictionary-history-v1',
    ]);

    const RETIRED_STORAGE_PREFIXES = [
      'bes-global-music-v1:',
      'bes-global-music-v2:',
      'bes-shared-music-v2:',
    ];

    const RETIRED_APP_IDS = Object.freeze([
      'lesson-plan-ai',
      'exam-studio',
      'word2graph',
      'student-practice',
      'reading-studio',
      'assessment-core',
      'flying-words',
      'classroom-screen',
      'content-ecosystem',
      'automation-center',
      'collaboration-hub',
      'knowledge-train',
      'word-orbit',
      'activity-graph',
      'crossword-trial',
      'random-group-generator',
      'random-group',
      'group-maker',
      'brian-group-maker',
    ]);

    const RETIRED_APP_ALIASES = Object.freeze([
      ...RETIRED_APP_IDS,
      'lessonarchitect',
      'examstudio',
      'wordgraph',
      'studentpractice',
      'learner-sprint',
      'readingstudio',
      'assessmentcore',
      'flyingwords',
      'randomgroupgenerator',
      'classroomscreen',
      'contentecosystem',
      'automationcenter',
      'collaborationhub',
      'knowledgetrain',
      'wordorbit',
      'activitygraph',
      'crosswordtrial',
    ]);

    const RETIRED_APP_ROUTES = new Set([
      'practice',
      'content-ecosystem',
      'assessment-core',
      'automation-center',
      'collaboration-hub',
      ...RETIRED_APP_IDS.map((slug) => `tool/${slug}`),
    ]);

    const APPEARANCE_KEY = 'bes-appearance-v2';
    let installed = false;

    function normalizedIdentifier(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^#\/?/, '')
        .replace(/^tool:/, 'tool/')
        .replace(/^\/+|\/+$/g, '');
    }

    function isRetiredIdentifier(value) {
      const normalized = normalizedIdentifier(value);
      if (!normalized) return false;
      if (RETIRED_APP_ROUTES.has(normalized)) return true;
      const slug = normalized.startsWith('tool/') ? normalized.slice(5) : normalized;
      return RETIRED_APP_IDS.includes(slug);
    }

    function sanitizeRetiredValue(value) {
      if (Array.isArray(value)) {
        return value
          .filter((item) => !(typeof item === 'string' && isRetiredIdentifier(item)))
          .map((item) => sanitizeRetiredValue(item));
      }
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key, item]) => !isRetiredIdentifier(key) && !(typeof item === 'string' && isRetiredIdentifier(item)))
          .map(([key, item]) => [key, sanitizeRetiredValue(item)]),
      );
    }

    function removeRetiredStorage() {
      try {
        Object.keys(window.localStorage).forEach((key) => {
          const normalizedKey = key.toLowerCase();
          if (
            RETIRED_STORAGE_KEYS.has(key)
            || RETIRED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
            || RETIRED_APP_ALIASES.some((alias) => normalizedKey.includes(alias))
          ) {
            window.localStorage.removeItem(key);
            return;
          }

          const raw = window.localStorage.getItem(key);
          if (!raw || (!raw.startsWith('{') && !raw.startsWith('['))) return;
          try {
            const sanitized = sanitizeRetiredValue(JSON.parse(raw));
            const next = JSON.stringify(sanitized);
            if (next !== raw) window.localStorage.setItem(key, next);
          } catch {
            // Ignore unrelated values.
          }
        });

        const appearance = JSON.parse(window.localStorage.getItem(APPEARANCE_KEY) || 'null');
        if (appearance && typeof appearance === 'object' && 'theme' in appearance) {
          delete appearance.theme;
          appearance.updatedAt = Date.now();
          window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
        }
      } catch {
        // Storage can be unavailable in private browsing or restricted webviews.
      }
    }

    function currentHashRoute() {
      return String(window.location.hash || '')
        .replace(/^#\/?/, '')
        .split('?')[0]
        .split('&')[0]
        .replace(/^\/+|\/+$/g, '')
        .toLowerCase();
    }

    function redirectRetiredAppRoute() {
      if (!RETIRED_APP_ROUTES.has(currentHashRoute())) return;
      window.location.hash = '#/apps';
    }

    function enforceLightOnlyDocument() {
      const root = document.documentElement;
      root.dataset.theme = 'light';
      root.dataset.besTheme = 'light';
      delete root.dataset.themeMode;
      delete root.dataset.themeTransition;
      root.classList.remove('dark', 'theme-dark');
      root.classList.add('theme-light');
      root.style.colorScheme = 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f7f9fc');
    }

    function clearRetiredMediaCache() {
      if (!('caches' in window)) return;
      window.caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith('bes-media-')).map((key) => window.caches.delete(key))))
        .catch(() => {});
    }

    export function installRetiredFeatureCleanup() {
      if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
      installed = true;
      removeRetiredStorage();
      redirectRetiredAppRoute();
      enforceLightOnlyDocument();
      clearRetiredMediaCache();

      const enforce = () => {
        removeRetiredStorage();
        enforceLightOnlyDocument();
      };
      window.addEventListener('hashchange', redirectRetiredAppRoute);
      window.addEventListener('storage', enforce);
      window.addEventListener('bes:appearance-ready', enforce);
      window.addEventListener('bes:appearance-changed', enforce);
    }

    export const RETIRED_FEATURE_STORAGE = Object.freeze({
      keys: [...RETIRED_STORAGE_KEYS],
      prefixes: [...RETIRED_STORAGE_PREFIXES],
    });

    export const RETIRED_APP_PATHS = Object.freeze([...RETIRED_APP_ROUTES]);
""").lstrip()
write('src/utils/retiredFeatureCleanup.js', cleanup_source)

path_markers = [
    'lessonarchitect', 'lesson-architect', 'lesson-plan-ai',
    'examstudio', 'exam-studio', 'examautorecognition',
    'wordgraph', 'word2graph',
    'studentpractice', 'student-practice', 'learner-sprint',
    'readingstudio', 'reading-studio',
    'assessmentcore', 'assessment-core',
    'flyingwords', 'flying-words',
    'randomgroup', 'random-group', 'group-maker',
    'classroomscreen', 'classroom-screen',
    'contentecosystem', 'content-ecosystem',
    'automationcenter', 'automation-center',
    'collaborationhub', 'collaboration-hub',
    'knowledgetrain', 'knowledge-train',
    'wordorbit', 'word-orbit',
    'activitygraph', 'activity-graph',
    'crosswordtrial', 'crossword-trial',
]
excluded = {
    'src/utils/retiredFeatureCleanup.js',
    '.github/workflows/retire-seven-apps-once.yml',
    'scripts/retire-seven-apps-once.py',
    'scripts/remove-requested-apps-once.py',
}
for path in sorted(Path('.').rglob('*'), reverse=True):
    if not path.is_file():
        continue
    rel = path.as_posix().lstrip('./')
    if rel in excluded or rel.startswith('.git/') or rel.startswith('node_modules/'):
        continue
    if any(marker in rel.lower() for marker in path_markers):
        path.unlink(missing_ok=True)

audit_path = Path('scripts/audit-removed-apps-v11.6.7.mjs')
if audit_path.exists():
    audit = read(audit_path)
    marker = "const removedSlugs = ["
    if marker in audit and "'lesson-plan-ai'" not in audit:
        values = CATALOG_SLUGS + DYNAMIC_SLUGS
        lines = "\n  " + ", ".join(repr(x) for x in values) + ","
        audit = audit.replace(marker, marker + lines, 1)
    write(audit_path, audit)

Path('.github/workflows/retire-seven-apps-once.yml').unlink(missing_ok=True)
Path('scripts/retire-seven-apps-once.py').unlink(missing_ok=True)
Path('scripts/remove-requested-apps-once.py').unlink(missing_ok=True)

print('Requested applications removed from catalog, routes, source files, standalone builds and saved launcher state.')
