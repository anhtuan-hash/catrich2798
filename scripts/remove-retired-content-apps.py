from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def remove_flat_object(text: str, marker: str) -> tuple[str, int]:
    """Remove the first comma-terminated JS object containing marker."""
    marker_at = text.find(marker)
    if marker_at < 0:
        return text, 0
    start = text.rfind("{", 0, marker_at)
    if start < 0:
        return text, 0
    depth = 0
    quote = None
    escaped = False
    end = None
    for index in range(start, len(text)):
        char = text[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in ("'", '"', "`"):
            quote = char
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    if end is None:
        return text, 0
    while end < len(text) and text[end].isspace() and text[end] != "\n":
        end += 1
    if end < len(text) and text[end] == ",":
        end += 1
    if start > 0 and text[start - 1] == " " and text[start - 2:start] == "  ":
        start -= 2
    return text[:start] + text[end:], 1


# 1. Canonical launcher catalog.
apps = read("src/data/apps.js")
for marker in ("slug: 'content-factory'", "slug: 'lesson-pack'"):
    apps, removed = remove_flat_object(apps, marker)
    if not removed:
        raise RuntimeError(f"Catalog object not found: {marker}")
write("src/data/apps.js", apps)

# 2. App shell routes, imports and rendering.
main = read("src/main.jsx")
main = re.sub(r"^import './styles/v1100\.css';\n", "", main, flags=re.M)
main = re.sub(r"^const ContentFactory = lazy\([^\n]+\);\n", "", main, flags=re.M)
main = re.sub(r"^const LessonPack = lazy\([^\n]+\);\n", "", main, flags=re.M)
main = re.sub(r"\s*'content-factory',", "", main)
main = re.sub(r"\s*'lesson-pack',", "", main)
main = re.sub(r"^\s*'content-factory': \{[^\n]+\},\n", "", main, flags=re.M)
main = re.sub(r"^\s*'lesson-pack': \{[^\n]+\},\n", "", main, flags=re.M)
main = re.sub(r"\s*'content-factory': \[[^\]]+\],", "", main)
main = re.sub(r"\s*'lesson-pack': \[[^\]]+\],", "", main)
main = re.sub(r"^\s*\{canAccessRoute && currentRoute === 'content-factory'[^\n]+\}\n", "", main, flags=re.M)
main = re.sub(r"^\s*\{canAccessRoute && currentRoute === 'lesson-pack'[^\n]+\}\n", "", main, flags=re.M)
write("src/main.jsx", main)

# 3. Permissions and access guards.
permissions = read("src/utils/permissions.js")
permissions = re.sub(r"^\s*'content-factory': 'route:content-factory',\n", "", permissions, flags=re.M)
permissions = re.sub(r"^\s*'lesson-pack': 'route:lesson-pack',\n", "", permissions, flags=re.M)
for marker in ("id: ROUTE_PERMISSION_IDS['content-factory']", "id: ROUTE_PERMISSION_IDS['lesson-pack']"):
    permissions, removed = remove_flat_object(permissions, marker)
    if not removed:
        raise RuntimeError(f"Permission object not found: {marker}")
permissions = permissions.replace(" || route === 'content-factory'", "")
permissions = permissions.replace(" || route === 'lesson-pack'", "")
write("src/utils/permissions.js", permissions)

# 4. Search and visual registries.
palette = read("src/components/GlobalCommandPalette.jsx")
for marker in ("route: 'content-factory'", "route: 'lesson-pack'"):
    palette, removed = remove_flat_object(palette, marker)
    if not removed:
        raise RuntimeError(f"Command entry not found: {marker}")
write("src/components/GlobalCommandPalette.jsx", palette)

profiles = read("src/data/designProfiles.js")
profiles, removed = remove_flat_object(profiles, "'lesson-pack':")
if not removed:
    raise RuntimeError("Lesson Pack design profile not found")
write("src/data/designProfiles.js", profiles)

# 5. Connected transfer hub: remove destination and floating quick-add UI.
transfer = read("src/components/ContentTransferHub.jsx")
transfer = transfer.replace(",'content-factory'", "")
transfer, removed = remove_flat_object(transfer, "id: 'lesson-pack'")
if not removed:
    raise RuntimeError("Lesson Pack transfer target not found")
transfer = re.sub(r"^\s*const \[quickNotice, setQuickNotice\] = useState\(''\);\n", "", transfer, flags=re.M)
transfer = re.sub(
    r"\n\s*const currentAppId = selectedTool\?\.slug \|\| currentRoute;.*?\n\s*};\n",
    "\n",
    transfer,
    count=1,
    flags=re.S,
)
transfer = re.sub(r"^\s*\{showQuickLessonPack \?.*?\}\n", "", transfer, count=1, flags=re.M)
transfer = re.sub(r"^\s*\{quickNotice \?.*?\}\n", "", transfer, count=1, flags=re.M)
write("src/components/ContentTransferHub.jsx", transfer)

# 6. Content Ecosystem remains, but no longer dispatches to either retired app.
ecosystem = read("src/utils/contentEcosystem.js")
for marker in ("id: 'content-factory'", "id: 'lesson-pack'"):
    ecosystem, removed = remove_flat_object(ecosystem, marker)
    if not removed:
        raise RuntimeError(f"Ecosystem target not found: {marker}")
ecosystem = ecosystem.replace("'content-factory', ", "").replace(", 'content-factory'", "")
recipe_start = ecosystem.find("id: 'complete-lesson-pack'")
if recipe_start >= 0:
    object_start = ecosystem.rfind("{", 0, recipe_start)
    object_end = ecosystem.find("  },", recipe_start)
    if object_start < 0 or object_end < 0:
        raise RuntimeError("Could not locate complete sequence recipe")
    object_end += len("  },")
    replacement = """{
    id: 'complete-teaching-sequence',
    title: 'Complete teaching sequence',
    titleVi: 'Tiến trình dạy học hoàn chỉnh',
    description: 'Lesson plan, interactive activities, assessment and adaptive practice.',
    descriptionVi: 'Giáo án, hoạt động tương tác, đánh giá và luyện tập thích ứng.',
    outputs: ['lesson-plan-ai', 'textlab-activities', 'assessment-core', 'student-practice'],
  },"""
    ecosystem = ecosystem[:object_start] + replacement + ecosystem[object_end:]
ecosystem = "\n".join(
    line for line in ecosystem.splitlines()
    if "'content-factory':" not in line and "'lesson-pack':" not in line
) + "\n"
helper_at = ecosystem.find("export function createLessonPackTransfer")
if helper_at >= 0:
    ecosystem = ecosystem[:helper_at].rstrip() + "\n"
write("src/utils/contentEcosystem.js", ecosystem)

page = read("src/pages/ContentEcosystem.jsx")
page = page.replace("  createLessonPackTransfer,\n", "")
page = re.sub(r"\n\s*function sendKitToLessonPack\(kit\) \{.*?\n\s*}\n", "\n", page, count=1, flags=re.S)
page = page.replace(
    "Gom nhiều tài sản thành một gói có thể gửi thẳng sang Lesson Pack.",
    "Gom nhiều tài sản thành một bộ nội dung có thể lưu trữ, xuất và tái sử dụng.",
).replace(
    "Bundle assets and send the kit directly to Lesson Pack.",
    "Bundle assets into a content kit for storage, export and reuse.",
)
page = re.sub(
    r"<footer><button onClick=\{\(\) => exportKit\(kit\)\}>JSON</button><button className=\"primary\" onClick=\{\(\) => sendKitToLessonPack\(kit\)\}>.*?</button></footer>",
    '<footer><button className="primary" onClick={() => exportKit(kit)}>{vi ? \'Xuất JSON\' : \'Export JSON\'}</button></footer>',
    page,
    count=1,
)
write("src/pages/ContentEcosystem.jsx", page)

assessment = read("src/pages/AssessmentCore.jsx")
assessment = assessment.replace("source: transfer.source || 'content-factory'", "source: transfer.source || 'content-transfer'")
write("src/pages/AssessmentCore.jsx", assessment)

# 7. Permanent guard against either app returning.
audit = r"""import fs from 'node:fs';

const removedSlugs = [
  'worksheet-factory', 'smart-id', 'speaking-studio', 'english-lesson-integration',
  'grammar-builder', 'writing-studio', 'pronunciation-coach', 'ai-workspace',
  'classroom-delivery', 'classroom-join', 'learning-intelligence',
  'content-factory', 'lesson-pack',
];

const removedTitles = [
  'Worksheet Factory', 'SmartID Identity', 'Speaking Studio', 'AI Lesson Integration Studio',
  'Grammar Builder', 'Writing Studio', 'Pronunciation Coach', 'Brian AI Workspace',
  'Classroom Delivery', 'Learning Intelligence',
  'Teaching Content Factory', 'Xưởng tạo học liệu', 'Lesson Pack', 'Gói bài dạy liên thông',
];

const removedPaths = [
  'src/pages/WorksheetFactory.jsx', 'src/pages/WorksheetFactory.css', 'src/utils/worksheetFactory.js',
  'src/pages/SmartIdStudio.jsx', 'src/pages/SmartIdStudio.css',
  'src/pages/SpeakingStudio.jsx',
  'src/pages/EnglishLessonIntegrationStudio.jsx', 'src/components/LessonIntegrationBridgeAdapter.jsx',
  'src/vendor/englishLessonIntegration', 'public/bes-elis-v1142',
  'src/pages/GrammarBuilder.jsx', 'src/pages/GrammarBuilder.css',
  'src/pages/WritingStudio.jsx', 'src/pages/WritingStudio.css',
  'src/pages/PronunciationCoach.jsx', 'src/pages/PronunciationCoach.css',
  'src/pages/AIWorkspace.jsx', 'src/utils/aiWorkspaceFallback.js',
  'src/pages/ClassroomDelivery.jsx', 'src/pages/ClassroomJoin.jsx', 'src/utils/classroomDelivery.js',
  'src/pages/LearningIntelligence.jsx',
  'src/pages/ContentFactory.jsx', 'src/pages/LessonPack.jsx', 'src/utils/lessonPack.js', 'src/styles/v1100.css',
  'src/styles/v1094.css', 'src/styles/v1110.css',
  'supabase/brian_v10_94_learning_intelligence.sql',
  'supabase/brian_v11_1_classroom_delivery.sql',
  'supabase/brian_v11_4_2_lesson_integration.sql',
];

const criticalFiles = [
  'src/data/apps.js', 'src/data/designProfiles.js', 'src/pages/ToolPage.jsx', 'src/pages/Home.jsx',
  'src/main.jsx', 'src/components/GlobalFlatNavigation.jsx', 'src/components/GlobalCommandPalette.jsx',
  'src/utils/permissions.js', 'src/components/ContentTransferHub.jsx', 'src/pages/AIGovernanceCenter.jsx',
  'src/utils/aiGovernance.js', 'src/pages/AutomationCenter.jsx',
  'src/utils/automationEngine.js', 'src/utils/aiProviderHubRuntime.js', 'index.html', 'src/index.css',
  'public/manifest.webmanifest', 'src/utils/contentEcosystem.js',
  'src/pages/ContentEcosystem.jsx', 'src/pages/AssessmentCore.jsx',
];

let failures = 0;
function pass(message) { console.log(`✓ ${message}`); }
function fail(message) { console.error(`✗ ${message}`); failures += 1; }

for (const item of removedPaths) {
  if (fs.existsSync(item)) fail(`retired source still exists: ${item}`);
  else pass(`removed ${item}`);
}

for (const file of criticalFiles) {
  if (!fs.existsSync(file)) { fail(`critical file missing: ${file}`); continue; }
  const text = fs.readFileSync(file, 'utf8');
  for (const slug of removedSlugs) {
    if (text.includes(slug)) fail(`${slug} remains active in ${file}`);
  }
  for (const title of removedTitles) {
    if (text.includes(title)) fail(`${title} remains active in ${file}`);
  }
}

const main = fs.readFileSync('src/main.jsx', 'utf8');
if (main.includes("./styles/v1094.css") || main.includes("./styles/v1110.css") || main.includes("./styles/v1100.css")) fail('retired route CSS is still imported');
else pass('retired route CSS imports removed');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.version !== '11.6.7') fail(`package version is ${pkg.version}`);
else pass('package version remains 11.6.7');
if (pkg.scripts?.['version:sync'] !== 'node scripts/sync-version-v11.6.7.mjs') fail('version sync does not target V11.6.7');
else pass('V11.6.7 version sync active');

const version = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
const release = JSON.parse(fs.readFileSync('public/release-manifest.json', 'utf8'));
if (version.version !== '11.6.7' || release.version !== '11.6.7') fail('public version metadata is not 11.6.7');
else pass('public version metadata is V11.6.7');
if ('requiredMigration' in version || 'requiredMigration' in release) fail('retired application SQL is still marked as required');
else pass('no retired SQL migration is required');

if (fs.existsSync('dist/assets')) {
  const chunkPattern = /WorksheetFactory|SmartId|SpeakingStudio|EnglishLesson|GrammarBuilder|WritingStudio|PronunciationCoach|AIWorkspace|ClassroomDelivery|ClassroomJoin|LearningIntelligence|ContentFactory|LessonPack/i;
  const chunks = fs.readdirSync('dist/assets').filter((name) => chunkPattern.test(name));
  if (chunks.length) fail(`retired production chunks found: ${chunks.join(', ')}`);
  else pass('no retired production chunks');
}

if (failures) {
  console.error(`Application removal audit failed (${failures} issue${failures === 1 ? '' : 's'}).`);
  process.exit(1);
}
console.log('Application removal audit passed.');
"""
write("scripts/audit-removed-apps-v11.6.7.mjs", audit)

# 8. Delete dedicated modules and style layer.
for path in (
    "src/pages/ContentFactory.jsx",
    "src/pages/LessonPack.jsx",
    "src/utils/lessonPack.js",
    "src/styles/v1100.css",
):
    target = ROOT / path
    if target.exists():
        target.unlink()

# 9. Strong active-source verification.
forbidden = re.compile(
    r"content-factory|lesson-pack|ContentFactory|LessonPack|Teaching Content Factory|Xưởng tạo học liệu|Gói bài dạy liên thông"
)
violations: list[str] = []
for path in (ROOT / "src").rglob("*"):
    if path.is_file() and path.suffix in {".js", ".jsx", ".css", ".html", ".json"}:
        text = path.read_text(encoding="utf-8", errors="replace")
        for line_number, line in enumerate(text.splitlines(), 1):
            if forbidden.search(line):
                violations.append(f"{path.relative_to(ROOT)}:{line_number}: {line.strip()}")

report = ROOT / "removal-report.txt"
report.write_text(
    "REMOVAL VIOLATIONS\n" + ("\n".join(violations) if violations else "none") + "\n",
    encoding="utf-8",
)
if violations:
    raise RuntimeError("Retired application references remain:\n" + "\n".join(violations))

# Self-remove all one-off implementation files from the final commit.
for path in (
    ROOT / "scripts/remove-retired-content-apps.py",
    ROOT / ".github/workflows/remove-retired-content-apps.yml",
    report,
):
    if path.exists():
        path.unlink()
