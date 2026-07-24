from pathlib import Path

path = Path('scripts/remove-retired-content-apps.py')
text = path.read_text(encoding='utf-8')
start_marker = '# 7. Permanent guard against either app returning.\n'
end_marker = '# 8. Delete dedicated modules and style layer.\n'
start = text.find(start_marker)
end = text.find(end_marker)
if start < 0 or end < 0 or end <= start:
    raise SystemExit('Could not locate audit block in removal script')

replacement = r'''# 7. Add a dedicated permanent guard for these two removals.
legacy_audit = read("scripts/audit-removed-apps-v11.6.7.mjs")
legacy_audit = legacy_audit.replace("'src/pages/ContentFactory.jsx', ", "")
write("scripts/audit-removed-apps-v11.6.7.mjs", legacy_audit)

content_audit = r"""import fs from 'node:fs';

const removedPaths = [
  'src/pages/ContentFactory.jsx',
  'src/pages/LessonPack.jsx',
  'src/utils/lessonPack.js',
  'src/styles/v1100.css',
];
const activeFiles = [
  'src/data/apps.js',
  'src/main.jsx',
  'src/utils/permissions.js',
  'src/components/GlobalCommandPalette.jsx',
  'src/data/designProfiles.js',
  'src/components/ContentTransferHub.jsx',
  'src/utils/contentEcosystem.js',
  'src/pages/ContentEcosystem.jsx',
  'src/pages/AssessmentCore.jsx',
];
const forbidden = [
  'content-factory',
  'lesson-pack',
  'ContentFactory',
  'LessonPack',
  'Teaching Content Factory',
  'Xưởng tạo học liệu',
  'Gói bài dạy liên thông',
];

let failures = 0;
const pass = (message) => console.log(`✓ ${message}`);
const fail = (message) => { console.error(`✗ ${message}`); failures += 1; };

for (const file of removedPaths) {
  if (fs.existsSync(file)) fail(`retired source still exists: ${file}`);
  else pass(`removed ${file}`);
}

for (const file of activeFiles) {
  if (!fs.existsSync(file)) { fail(`active file missing: ${file}`); continue; }
  const text = fs.readFileSync(file, 'utf8');
  for (const token of forbidden) {
    if (text.includes(token)) fail(`${token} remains active in ${file}`);
  }
}

const main = fs.readFileSync('src/main.jsx', 'utf8');
if (main.includes("./styles/v1100.css")) fail('retired Lesson Pack stylesheet is still imported');
else pass('retired stylesheet import removed');

if (fs.existsSync('dist/assets')) {
  const chunks = fs.readdirSync('dist/assets').filter((name) => /ContentFactory|LessonPack/i.test(name));
  if (chunks.length) fail(`retired production chunks found: ${chunks.join(', ')}`);
  else pass('no retired production chunks');
}

if (failures) {
  console.error(`Content app removal audit failed (${failures} issue${failures === 1 ? '' : 's'}).`);
  process.exit(1);
}
console.log('Content app removal audit passed.');
"""
write("scripts/audit-content-apps-removed.mjs", content_audit)

import json
package = json.loads(read("package.json"))
package.setdefault("scripts", {})["audit:removed-content-apps"] = "node scripts/audit-content-apps-removed.mjs"
write("package.json", json.dumps(package, ensure_ascii=False, indent=2) + "\n")

'''

text = text[:start] + replacement + text[end:]
path.write_text(text, encoding='utf-8')
