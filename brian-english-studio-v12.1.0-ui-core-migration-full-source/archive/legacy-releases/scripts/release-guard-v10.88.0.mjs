#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const cwd = process.cwd();
const checks = [];
const required = [
  'package.json',
  'index.html',
  'public/version.json',
  'public/bes-platform-control-v10880.css',
  'public/bes-platform-control-v10880.js',
  'public/bes-release-v10.88.0.json',
  'public/bes-modules-v10.88.0.json',
  'public/bes-feature-flags-v10.88.0.json',
  'public/bes-migrations-v10.88.0.json',
  'public/bes-platform-build-v10.88.0.json',
  'scripts/install-v10.88.0.mjs',
  'scripts/rollback-v10.88.0.mjs',
  'scripts/platform-doctor-v10.88.0.mjs',
  'scripts/test-platform-control-v10.88.0.mjs'
];

function add(name, ok, detail = '') {
  checks.push({ name, ok: !!ok, detail });
}
function read(file) { return fs.readFileSync(path.join(cwd, file), 'utf8'); }
function json(file) { try { return JSON.parse(read(file)); } catch { return null; } }
function count(text, pattern) { return (text.match(pattern) || []).length; }
function sha(file) { return fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null; }

required.forEach((file) => add(`exists:${file}`, fs.existsSync(path.join(cwd, file)), file));
const pkg = json('package.json');
const version = json('public/version.json');
const release = json('public/bes-release-v10.88.0.json');
const modules = json('public/bes-modules-v10.88.0.json');
const flags = json('public/bes-feature-flags-v10.88.0.json');
const migrations = json('public/bes-migrations-v10.88.0.json');
const build = json('public/bes-platform-build-v10.88.0.json');
const state = json('.bes-release/v10.88.0.json');
const index = fs.existsSync(path.join(cwd, 'index.html')) ? read('index.html') : '';
const js = fs.existsSync(path.join(cwd, 'public/bes-platform-control-v10880.js')) ? read('public/bes-platform-control-v10880.js') : '';
const css = fs.existsSync(path.join(cwd, 'public/bes-platform-control-v10880.css')) ? read('public/bes-platform-control-v10880.css') : '';

add('package-version', pkg?.version === '10.88.0', pkg?.version || 'missing');
add('version-manifest', version?.version === '10.88.0', version?.version || 'missing');
add('release-manifest', release?.version === '10.88.0', release?.version || 'missing');
add('build-manifest', build?.version === '10.88.0', build?.version || 'missing');
add('state-record', state?.version === '10.88.0', state?.version || 'missing');
add('style-tag-once', count(index, /bes-platform-control-v10880\.css/g) === 1, String(count(index, /bes-platform-control-v10880\.css/g)));
add('script-tag-once', count(index, /bes-platform-control-v10880\.js/g) === 1, String(count(index, /bes-platform-control-v10880\.js/g)));
add('version-meta-once', count(index, /name=["']bes-app-version["']/g) === 1, String(count(index, /name=["']bes-app-version["']/g)));
add('verify-script', pkg?.scripts?.['verify:v10.88']?.includes('test:platform-control'), pkg?.scripts?.['verify:v10.88'] || 'missing');
add('doctor-script', pkg?.scripts?.['platform:doctor'] === 'node scripts/platform-doctor-v10.88.0.mjs', pkg?.scripts?.['platform:doctor'] || 'missing');
add('rollback-script', pkg?.scripts?.['rollback:v10.88.0'] === 'node scripts/rollback-v10.88.0.mjs', pkg?.scripts?.['rollback:v10.88.0'] || 'missing');
add('release-guard-script', pkg?.scripts?.['release:guard'] === 'node scripts/release-guard-v10.88.0.mjs', pkg?.scripts?.['release:guard'] || 'missing');
add('module-registry-shape', Array.isArray(modules?.modules) && modules.modules.length >= 20, String(modules?.modules?.length || 0));
add('platform-control-module', !!modules?.modules?.find?.((item) => item.id === 'platform-control' && item.route === '#/platform-control'), 'platform-control');
add('unique-module-ids', Array.isArray(modules?.modules) && new Set(modules.modules.map((item) => item.id)).size === modules.modules.length, 'module ids');
add('unique-module-routes', Array.isArray(modules?.modules) && new Set(modules.modules.map((item) => item.route)).size === modules.modules.length, 'module routes');
add('feature-flags-shape', Array.isArray(flags?.flags) && flags.flags.length >= 5, String(flags?.flags?.length || 0));
add('release-channels', JSON.stringify(flags?.channels) === JSON.stringify(['stable','beta','lab']), JSON.stringify(flags?.channels || []));
add('migration-inventory-shape', Array.isArray(migrations?.migrations) && Number.isInteger(migrations?.count), String(migrations?.count ?? 'missing'));
add('migration-count-sync', migrations?.count === migrations?.migrations?.length, `${migrations?.count}/${migrations?.migrations?.length}`);
add('no-sql-required', release?.requiresSql === false, String(release?.requiresSql));
add('no-env-required', release?.requiresEnv === false, String(release?.requiresEnv));
add('no-dependency-install', release?.requiresDependencyInstall === false, String(release?.requiresDependencyInstall));
add('runtime-api', js.includes('window.BES_PLATFORM_CONTROL'), 'BES_PLATFORM_CONTROL');
add('command-center-integration', js.includes('BES_COMMAND_CENTER.addRoute'), 'addRoute');
add('keyboard-shortcut', js.includes("event.shiftKey") && js.includes("=== 'p'"), 'Cmd/Ctrl+Shift+P');
add('feature-api', js.includes('getFlag: flagEnabled'), 'getFlag');
add('diagnostic-export', js.includes('exportReport'), 'exportReport');
add('kill-switch', js.includes('interceptNavigation') && js.includes('platform.module_kill_switch'), 'module kill switch');
add('no-eval', !/\beval\s*\(|new\s+Function\s*\(/.test(js), 'no eval/new Function');
add('no-remote-runtime-url', !/https?:\/\//.test(js), 'no remote URL');
add('css-dialog', css.includes('.bespc-shell') && css.includes('.bespc-sidebar') && css.includes('.bespc-main'), 'layout selectors');
add('css-responsive', css.includes('@media (max-width: 820px)'), 'mobile breakpoint');
add('css-reduced-motion', css.includes('prefers-reduced-motion'), 'accessibility');
add('asset-size-js', Buffer.byteLength(js) < 180000, `${Buffer.byteLength(js)} bytes`);
add('asset-size-css', Buffer.byteLength(css) < 100000, `${Buffer.byteLength(css)} bytes`);
add('package-lock-preserved', !state || state.lockHashBefore === state.lockHashAfter, `${state?.lockHashBefore || 'n/a'} / ${state?.lockHashAfter || 'n/a'}`);
if (state?.lockHashAfter && fs.existsSync(path.join(cwd, 'package-lock.json'))) {
  add('package-lock-current-hash', sha(path.join(cwd, 'package-lock.json')) === state.lockHashAfter, sha(path.join(cwd, 'package-lock.json')) || 'missing');
}

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nRelease Guard V10.88.0: ${checks.length - failed.length}/${checks.length} đạt.`);
if (failed.length) {
  console.error(`Có ${failed.length} kiểm tra không đạt. Không nên deploy Production.`);
  process.exit(1);
}
console.log('Sẵn sàng cho bước build/test/deploy.');
