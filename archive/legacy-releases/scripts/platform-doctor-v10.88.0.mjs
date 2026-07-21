#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const reportDir = path.join(cwd, 'reports');
const findings = [];
function finding(level, code, message, detail = '') { findings.push({ level, code, message, detail }); }
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) walk(file, out); else out.push({ file, stat });
  }
  return out;
}
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }

const pkg = readJson(path.join(cwd, 'package.json'));
const version = readJson(path.join(cwd, 'public', 'version.json'));
const build = readJson(path.join(cwd, 'public', 'bes-platform-build-v10.88.0.json'));
const migrations = readJson(path.join(cwd, 'public', 'bes-migrations-v10.88.0.json'));
const modules = readJson(path.join(cwd, 'public', 'bes-modules-v10.88.0.json'));

if (!pkg) finding('error', 'PACKAGE_INVALID', 'package.json không tồn tại hoặc không hợp lệ.');
if (pkg && pkg.version !== '10.88.0') finding('error', 'VERSION_PACKAGE', 'package.json chưa ở V10.88.0.', pkg.version);
if (!version || version.version !== '10.88.0') finding('error', 'VERSION_MANIFEST', 'public/version.json chưa đồng bộ V10.88.0.', version?.version || 'missing');
if (!build || build.version !== '10.88.0') finding('error', 'BUILD_MANIFEST', 'Build manifest chưa hợp lệ.');
if (!modules || !Array.isArray(modules.modules)) finding('error', 'MODULE_REGISTRY', 'Module Registry không hợp lệ.');

const sqlFiles = walk(path.join(cwd, 'supabase')).filter(({ file }) => file.endsWith('.sql'));
if (!migrations) finding('error', 'MIGRATION_MANIFEST', 'Không đọc được migration inventory.');
else if (migrations.count !== sqlFiles.length) finding('warning', 'MIGRATION_COUNT', 'Số migration trong manifest khác thư mục supabase.', `${migrations.count} / ${sqlFiles.length}`);
else finding('info', 'MIGRATION_COUNT', 'Migration inventory đồng bộ.', String(sqlFiles.length));

const publicFiles = walk(path.join(cwd, 'public'));
for (const { file, stat } of publicFiles) {
  if (stat.size > 2_000_000) finding('warning', 'LARGE_PUBLIC_ASSET', 'Asset public lớn hơn 2 MB.', `${path.relative(cwd, file)} — ${stat.size} bytes`);
}
const sourceFiles = walk(path.join(cwd, 'src')).filter(({ file }) => /\.(js|jsx|ts|tsx|css)$/.test(file));
for (const { file, stat } of sourceFiles) {
  if (stat.size > 700_000) finding('warning', 'LARGE_SOURCE_FILE', 'Source file lớn hơn 700 KB.', `${path.relative(cwd, file)} — ${stat.size} bytes`);
}

const cssPatches = publicFiles.filter(({ file }) => /bes-.*\.css$/i.test(path.basename(file)));
if (cssPatches.length > 16) finding('warning', 'CSS_PATCH_COUNT', 'Có nhiều lớp CSS runtime; nên hợp nhất trong các bản tiếp theo.', String(cssPatches.length));
else finding('info', 'CSS_PATCH_COUNT', 'Số lớp CSS runtime trong ngưỡng theo dõi.', String(cssPatches.length));

const scanTargets = [...sourceFiles, ...publicFiles.filter(({ file, stat }) => stat.size < 500_000 && /\.(js|json|html|css)$/.test(file))];
const secretPattern = /(service[_-]?role|supabase[_-]?service|sk-[a-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,})/i;
for (const { file } of scanTargets) {
  let content = '';
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
  if (secretPattern.test(content) && !/THIRD_PARTY_NOTICES|README|docs/i.test(file)) {
    finding('warning', 'POSSIBLE_SECRET', 'Phát hiện chuỗi có thể là secret trong source/public.', path.relative(cwd, file));
  }
}

if (modules?.modules) {
  const ids = modules.modules.map((m) => m.id);
  const routes = modules.modules.map((m) => m.route);
  if (new Set(ids).size !== ids.length) finding('error', 'DUPLICATE_MODULE_ID', 'Module Registry có ID trùng.');
  if (new Set(routes).size !== routes.length) finding('error', 'DUPLICATE_MODULE_ROUTE', 'Module Registry có route trùng.');
  for (const module of modules.modules) {
    for (const dependency of module.dependencies || []) {
      if (!ids.includes(dependency)) finding('warning', 'MISSING_MODULE_DEPENDENCY', `${module.id} phụ thuộc module chưa đăng ký.`, dependency);
    }
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  version: '10.88.0',
  totals: {
    error: findings.filter((f) => f.level === 'error').length,
    warning: findings.filter((f) => f.level === 'warning').length,
    info: findings.filter((f) => f.level === 'info').length
  },
  findings
};
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, 'platform-doctor-v10.88.0.json');
fs.writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`);

for (const item of findings) console.log(`${item.level.toUpperCase().padEnd(7)} ${item.code} — ${item.message}${item.detail ? ` (${item.detail})` : ''}`);
console.log(`\nPlatform Doctor: ${summary.totals.error} lỗi · ${summary.totals.warning} cảnh báo · ${summary.totals.info} thông tin.`);
console.log(`Báo cáo: ${path.relative(cwd, reportPath)}`);
if (summary.totals.error) process.exit(1);
