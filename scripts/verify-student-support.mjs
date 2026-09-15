import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const main = read('src/main.jsx');
const apps = read('src/data/apps.js');
const permissions = read('src/utils/permissions.js');

assert(main.includes("currentRoute === 'student-support'"), 'main.jsx chưa render route student-support');
assert(main.includes("'student-support'"), 'main.jsx chưa đăng ký route student-support');
assert(apps.includes("slug: 'student-support'"), 'apps.js chưa có launcher Student Support');
assert(permissions.includes("'student-support': 'route:student-support'"), 'permissions.js chưa map route:student-support');
assert(fs.existsSync(path.join(root, 'src/pages/StudentSupportCenter.jsx')), 'Thiếu StudentSupportCenter.jsx');

const forbiddenPatterns = [
  /\bcallAI\b/,
  /\/api\/ai\b/i,
  /openrouter/i,
  /embedding(?:s)?\b/i,
  /aiProviders?/i,
];

const allowedTextOnly = /Không AI|No AI|non-AI|deterministic/i;
const scanTargets = [
  'src/studentSupport',
  'src/components/studentSupport',
  'src/pages/StudentSupportCenter.jsx',
];

const failures = [];
function scan(target) {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) return;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(full)) scan(path.join(target, entry));
    return;
  }
  if (!/\.(?:js|jsx|mjs)$/.test(full)) return;
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (allowedTextOnly.test(line) && !/import|from\s+['"]|fetch\(|rpc\(/.test(line)) return;
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(line)) failures.push(`${target}:${index + 1}: ${pattern}`);
    }
  });
}
scanTargets.forEach(scan);

if (failures.length) {
  console.error('STUDENT SUPPORT VERIFY FAILED');
  failures.forEach((item) => console.error(' -', item));
  process.exit(1);
}

console.log('✅ Student Support route/permission contract present and no executable AI dependency detected.');
