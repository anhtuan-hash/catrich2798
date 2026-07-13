#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const cwd = process.cwd();
const checks = [];
function add(name, ok, detail = '') { checks.push({ name, ok: !!ok, detail }); }
function read(file) { return fs.readFileSync(path.join(cwd, file), 'utf8'); }
function json(file) { try { return JSON.parse(read(file)); } catch { return null; } }
function count(text, pattern) { return (text.match(pattern) || []).length; }

const required = [
  'public/bes-unified-work-hub-v10890.js',
  'public/bes-unified-work-hub-v10890.css',
  'public/bes-work-hub-v10.89.0.json',
  'supabase/work_hub_v10_89_0.sql',
  'scripts/install-v10.89.0.mjs',
  'scripts/rollback-v10.89.0.mjs'
];
required.forEach((file) => add(`exists:${file}`, fs.existsSync(path.join(cwd, file)), file));

const pkg = json('package.json');
const version = json('public/version.json');
const modules = json('public/bes-modules-v10.88.0.json');
const flags = json('public/bes-feature-flags-v10.88.0.json');
const manifest = json('public/bes-work-hub-v10.89.0.json');
const index = fs.existsSync(path.join(cwd, 'index.html')) ? read('index.html') : '';
const js = fs.existsSync(path.join(cwd, 'public/bes-unified-work-hub-v10890.js')) ? read('public/bes-unified-work-hub-v10890.js') : '';
const css = fs.existsSync(path.join(cwd, 'public/bes-unified-work-hub-v10890.css')) ? read('public/bes-unified-work-hub-v10890.css') : '';
const sql = fs.existsSync(path.join(cwd, 'supabase/work_hub_v10_89_0.sql')) ? read('supabase/work_hub_v10_89_0.sql') : '';

add('package-version', pkg?.version === '10.89.0', pkg?.version || 'missing');
add('version-manifest', version?.version === '10.89.0', version?.version || 'missing');
add('requires-sql', version?.requiresSql === true && version?.requiredMigration === 'work_hub_v10_89_0.sql', `${version?.requiresSql}/${version?.requiredMigration}`);
add('verify-script', typeof pkg?.scripts?.['verify:v10.89'] === 'string' && pkg.scripts['verify:v10.89'].includes('test:work-hub'), pkg?.scripts?.['verify:v10.89'] || 'missing');
add('rollback-script', pkg?.scripts?.['rollback:v10.89.0'] === 'node scripts/rollback-v10.89.0.mjs', pkg?.scripts?.['rollback:v10.89.0'] || 'missing');
add('style-tag-once', count(index, /bes-unified-work-hub-v10890\.css/g) === 1, String(count(index, /bes-unified-work-hub-v10890\.css/g)));
add('script-tag-once', count(index, /bes-unified-work-hub-v10890\.js/g) === 1, String(count(index, /bes-unified-work-hub-v10890\.js/g)));
add('platform-style-v10890-once', count(index, /bes-platform-control-v10890\.css/g) === 1, String(count(index, /bes-platform-control-v10890\.css/g)));
add('platform-script-v10890-once', count(index, /bes-platform-control-v10890\.js/g) === 1, String(count(index, /bes-platform-control-v10890\.js/g)));
add('module-registry-entry', !!modules?.modules?.find?.((item) => item.id === 'work-hub' && item.route === '#/work-hub'), 'work-hub');
add('feature-flag-entry', !!flags?.flags?.find?.((item) => item.key === 'work_hub.enabled'), 'work_hub.enabled');
add('manifest-shape', manifest?.version === '10.89.0' && Array.isArray(manifest?.workflow) && manifest.workflow.length >= 8, manifest?.version || 'missing');
add('runtime-api', js.includes('window.BES_WORK_HUB'), 'BES_WORK_HUB');
add('command-center-integration', js.includes('BES_COMMAND_CENTER.addRoute'), 'addRoute');
add('route-integration', js.includes("var ROUTE = '#/work-hub'"), '#/work-hub');
add('keyboard-shortcut', js.includes('event.shiftKey') && js.includes("=== 'w'"), 'Cmd/Ctrl+Shift+W');
add('supabase-client-adapter', js.includes("mode: 'client'") && js.includes("client.rpc('work_hub_my_context')"), 'client adapter');
add('supabase-rest-adapter', js.includes("mode: 'rest'") && js.includes("return request('rpc/' + name"), 'REST adapter');
add('no-service-role-discovery', !/service[_-]?role/i.test(js), 'no service role');
add('no-eval', !/\beval\s*\(|new\s+Function\s*\(/.test(js), 'no eval/new Function');
add('ui-views', ['renderInbox', 'renderBoard', 'renderCalendar', 'renderApprovals', 'renderActivity'].every((name) => js.includes(`function ${name}`)), 'five views');
add('responsive-css', css.includes('@media (max-width: 900px)') && css.includes('@media (max-width: 560px)'), 'tablet/mobile');
add('reduced-motion', css.includes('prefers-reduced-motion'), 'accessibility');
add('closed-root-hidden', css.includes('#beswh-root[data-open="true"]') && css.includes('display: none'), 'no ghost overlay');
add('sql-transaction', /^--[\s\S]*\nbegin;/i.test(sql) && /\ncommit;\n/i.test(sql), 'BEGIN/COMMIT');
for (const table of ['work_hub_items', 'work_hub_comments', 'work_hub_activity', 'work_hub_notifications']) {
  add(`sql-table:${table}`, sql.includes(`create table if not exists public.${table}`), table);
  add(`sql-rls:${table}`, sql.includes(`alter table public.${table} enable row level security`), table);
}
add('sql-context-rpc', sql.includes('create or replace function public.work_hub_my_context()'), 'work_hub_my_context');
add('sql-transition-rpc', sql.includes('create or replace function public.work_hub_transition_item('), 'work_hub_transition_item');
add('sql-role-helper', sql.includes('create or replace function public.work_hub_is_leader('), 'work_hub_is_leader');
add('sql-realtime', sql.includes('alter publication supabase_realtime add table public.work_hub_items'), 'Realtime');
add('sql-safe-rerun', sql.includes('create table if not exists') && sql.includes('drop policy if exists'), 'idempotent markers');
add('sql-no-drop-table', !/drop\s+table/i.test(sql), 'no DROP TABLE');
add('sql-no-truncate', !/\btruncate\b/i.test(sql), 'no TRUNCATE');
add('asset-size-js', Buffer.byteLength(js) < 180000, `${Buffer.byteLength(js)} bytes`);
add('asset-size-css', Buffer.byteLength(css) < 100000, `${Buffer.byteLength(css)} bytes`);

try {
  execFileSync(process.execPath, ['--check', path.join(cwd, 'public', 'bes-unified-work-hub-v10890.js')], { stdio: 'ignore' });
  add('javascript-syntax', true, 'node --check');
} catch { add('javascript-syntax', false, 'node --check failed'); }

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nUnified Work Hub Test: ${checks.length - failed.length}/${checks.length} đạt.`);
if (failed.length) {
  console.error(`Có ${failed.length} kiểm tra không đạt.`);
  process.exit(1);
}
