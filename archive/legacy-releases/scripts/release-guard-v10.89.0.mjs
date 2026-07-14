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
  'public/bes-platform-control-v10890.css',
  'public/bes-platform-control-v10890.js',
  'public/bes-unified-work-hub-v10890.css',
  'public/bes-unified-work-hub-v10890.js',
  'public/bes-release-v10.89.0.json',
  'public/bes-work-hub-v10.89.0.json',
  'public/bes-modules-v10.88.0.json',
  'public/bes-feature-flags-v10.88.0.json',
  'public/bes-migrations-v10.89.0.json',
  'public/bes-platform-build-v10.89.0.json',
  'supabase/work_hub_v10_89_0.sql',
  'scripts/install-v10.89.0.mjs',
  'scripts/rollback-v10.89.0.mjs',
  'scripts/platform-doctor-v10.89.0.mjs',
  'scripts/check-work-hub-v10.89.0.mjs'
];

function add(name, ok, detail = '') { checks.push({ name, ok: !!ok, detail }); }
function read(file) { return fs.readFileSync(path.join(cwd, file), 'utf8'); }
function json(file) { try { return JSON.parse(read(file)); } catch { return null; } }
function count(text, pattern) { return (text.match(pattern) || []).length; }
function sha(file) { return fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null; }

required.forEach((file) => add(`exists:${file}`, fs.existsSync(path.join(cwd, file)), file));
const pkg = json('package.json');
const version = json('public/version.json');
const release = json('public/bes-release-v10.89.0.json');
const modules = json('public/bes-modules-v10.88.0.json');
const flags = json('public/bes-feature-flags-v10.88.0.json');
const migrations = json('public/bes-migrations-v10.89.0.json');
const build = json('public/bes-platform-build-v10.89.0.json');
const state = json('.bes-release/v10.89.0.json');
const index = fs.existsSync(path.join(cwd, 'index.html')) ? read('index.html') : '';
const js = fs.existsSync(path.join(cwd, 'public/bes-unified-work-hub-v10890.js')) ? read('public/bes-unified-work-hub-v10890.js') : '';
const platformJs = fs.existsSync(path.join(cwd, 'public/bes-platform-control-v10890.js')) ? read('public/bes-platform-control-v10890.js') : '';
const css = fs.existsSync(path.join(cwd, 'public/bes-unified-work-hub-v10890.css')) ? read('public/bes-unified-work-hub-v10890.css') : '';
const sql = fs.existsSync(path.join(cwd, 'supabase/work_hub_v10_89_0.sql')) ? read('supabase/work_hub_v10_89_0.sql') : '';

add('package-version', pkg?.version === '10.89.0', pkg?.version || 'missing');
add('version-manifest', version?.version === '10.89.0', version?.version || 'missing');
add('release-manifest', release?.version === '10.89.0', release?.version || 'missing');
add('build-manifest', build?.version === '10.89.0', build?.version || 'missing');
add('state-record', state?.version === '10.89.0', state?.version || 'missing');
add('style-tag-once', count(index, /bes-unified-work-hub-v10890\.css/g) === 1, String(count(index, /bes-unified-work-hub-v10890\.css/g)));
add('script-tag-once', count(index, /bes-unified-work-hub-v10890\.js/g) === 1, String(count(index, /bes-unified-work-hub-v10890\.js/g)));
add('platform-style-once', count(index, /bes-platform-control-v10890\.css/g) === 1, String(count(index, /bes-platform-control-v10890\.css/g)));
add('platform-script-once', count(index, /bes-platform-control-v10890\.js/g) === 1, String(count(index, /bes-platform-control-v10890\.js/g)));
add('legacy-platform-script-removed', count(index, /bes-platform-control-v10880\.js/g) === 0, String(count(index, /bes-platform-control-v10880\.js/g)));
add('version-meta-once', count(index, /name=["']bes-app-version["']/g) === 1, String(count(index, /name=["']bes-app-version["']/g)));
add('verify-script', pkg?.scripts?.['verify:v10.89']?.includes('test:work-hub'), pkg?.scripts?.['verify:v10.89'] || 'missing');
add('doctor-script', pkg?.scripts?.['platform:doctor'] === 'node scripts/platform-doctor-v10.89.0.mjs', pkg?.scripts?.['platform:doctor'] || 'missing');
add('rollback-script', pkg?.scripts?.['rollback:v10.89.0'] === 'node scripts/rollback-v10.89.0.mjs', pkg?.scripts?.['rollback:v10.89.0'] || 'missing');
add('release-guard-script', pkg?.scripts?.['release:guard:v10.89'] === 'node scripts/release-guard-v10.89.0.mjs', pkg?.scripts?.['release:guard:v10.89'] || 'missing');
add('module-registry-shape', Array.isArray(modules?.modules) && modules.modules.length >= 23, String(modules?.modules?.length || 0));
add('work-hub-module', !!modules?.modules?.find?.((item) => item.id === 'work-hub' && item.route === '#/work-hub'), 'work-hub');
add('platform-module-version', modules?.modules?.find?.((item) => item.id === 'platform-control')?.version === '10.89.0', modules?.modules?.find?.((item) => item.id === 'platform-control')?.version || 'missing');
add('unique-module-ids', Array.isArray(modules?.modules) && new Set(modules.modules.map((item) => item.id)).size === modules.modules.length, 'module ids');
add('unique-module-routes', Array.isArray(modules?.modules) && new Set(modules.modules.map((item) => item.route)).size === modules.modules.length, 'module routes');
add('work-hub-flags', ['work_hub.enabled','work_hub.approval_queue','work_hub.realtime'].every((key) => flags?.flags?.some?.((item) => item.key === key)), 'three flags');
add('release-channels', JSON.stringify(flags?.channels) === JSON.stringify(['stable','beta','lab']), JSON.stringify(flags?.channels || []));
add('migration-inventory-shape', Array.isArray(migrations?.migrations) && Number.isInteger(migrations?.count), String(migrations?.count ?? 'missing'));
add('migration-count-sync', migrations?.count === migrations?.migrations?.length, `${migrations?.count}/${migrations?.migrations?.length}`);
add('required-migration', migrations?.requiredMigration === 'work_hub_v10_89_0.sql', migrations?.requiredMigration || 'missing');
add('sql-required', release?.requiresSql === true && version?.requiresSql === true, `${release?.requiresSql}/${version?.requiresSql}`);
add('no-env-required', release?.requiresEnv === false, String(release?.requiresEnv));
add('no-dependency-install', release?.requiresDependencyInstall === false, String(release?.requiresDependencyInstall));
add('runtime-api', js.includes('window.BES_WORK_HUB'), 'BES_WORK_HUB');
add('platform-version-runtime', platformJs.includes("var VERSION = '10.89.0'"), '10.89.0');
add('command-center-integration', js.includes('BES_COMMAND_CENTER.addRoute'), 'addRoute');
add('keyboard-shortcut', js.includes('event.shiftKey') && js.includes("=== 'w'"), 'Cmd/Ctrl+Shift+W');
add('five-work-views', ['renderInbox','renderBoard','renderCalendar','renderApprovals','renderActivity'].every((name) => js.includes(`function ${name}`)), 'views');
add('role-aware-ui', js.includes('function isLeader()') && js.includes("state.view === 'approvals' && isLeader()"), 'role aware');
add('realtime-or-polling', js.includes("client.channel('bes-work-hub-v10890')") && js.includes('POLL_MS'), 'Realtime + fallback');
add('no-eval', !/\beval\s*\(|new\s+Function\s*\(/.test(js), 'no eval/new Function');
add('no-service-role-key', !/service[_-]?role/i.test(js), 'no service role');
add('css-shell', css.includes('.beswh-shell') && css.includes('.beswh-sidebar') && css.includes('.beswh-main'), 'layout selectors');
add('css-responsive', css.includes('@media (max-width: 900px)') && css.includes('@media (max-width: 560px)'), 'responsive');
add('css-reduced-motion', css.includes('prefers-reduced-motion'), 'accessibility');
add('sql-core-tables', ['work_hub_items','work_hub_comments','work_hub_activity','work_hub_notifications'].every((table) => sql.includes(`create table if not exists public.${table}`)), 'four tables');
add('sql-rls', ['work_hub_items','work_hub_comments','work_hub_activity','work_hub_notifications'].every((table) => sql.includes(`alter table public.${table} enable row level security`)), 'RLS');
add('sql-no-destructive-table', !/drop\s+table|\btruncate\b/i.test(sql), 'no drop/truncate');
add('asset-size-js', Buffer.byteLength(js) < 180000, `${Buffer.byteLength(js)} bytes`);
add('asset-size-css', Buffer.byteLength(css) < 100000, `${Buffer.byteLength(css)} bytes`);
add('package-lock-preserved', !state || state.lockHashBefore === state.lockHashAfter, `${state?.lockHashBefore || 'n/a'} / ${state?.lockHashAfter || 'n/a'}`);
if (state?.lockHashAfter && fs.existsSync(path.join(cwd, 'package-lock.json'))) {
  add('package-lock-current-hash', sha(path.join(cwd, 'package-lock.json')) === state.lockHashAfter, sha(path.join(cwd, 'package-lock.json')) || 'missing');
}

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nRelease Guard V10.89.0: ${checks.length - failed.length}/${checks.length} đạt.`);
if (failed.length) {
  console.error(`Có ${failed.length} kiểm tra không đạt. Không nên deploy Production.`);
  process.exit(1);
}
console.log('Source sẵn sàng. Cần xác nhận migration Work Hub đã chạy thành công trước khi mở cho người dùng.');
