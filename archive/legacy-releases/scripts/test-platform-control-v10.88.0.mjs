#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const jsPath = path.join(cwd, 'public', 'bes-platform-control-v10880.js');
const cssPath = path.join(cwd, 'public', 'bes-platform-control-v10880.css');
const modulesPath = path.join(cwd, 'public', 'bes-modules-v10.88.0.json');
const flagsPath = path.join(cwd, 'public', 'bes-feature-flags-v10.88.0.json');
const releasePath = path.join(cwd, 'public', 'bes-release-v10.88.0.json');
const tests = [];

function add(name, ok, detail = '') { tests.push({ name, ok: !!ok, detail }); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function json(file) { try { return JSON.parse(read(file)); } catch { return null; } }

const js = read(jsPath);
const css = read(cssPath);
const modules = json(modulesPath);
const flags = json(flagsPath);
const release = json(releasePath);
const syntax = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });

add('javascript-syntax', syntax.status === 0, syntax.stderr.trim());
add('version-constant', js.includes("var VERSION = '10.88.0'"), '10.88.0');
add('global-api', js.includes('window.BES_PLATFORM_CONTROL'), 'BES_PLATFORM_CONTROL');
add('open-api', js.includes('open: open'), 'open');
add('report-api', js.includes('report: apiReport'), 'report');
add('flag-api', js.includes('getFlag: flagEnabled'), 'getFlag');
add('module-list-api', js.includes('listModules: getModules'), 'listModules');
add('keyboard-shortcut', js.includes('event.shiftKey') && js.includes("=== 'p'"), 'Cmd/Ctrl+Shift+P');
add('command-center-route', js.includes("route: '#/platform-control'"), '#/platform-control');
add('command-center-api', js.includes('BES_COMMAND_CENTER.addRoute'), 'addRoute');
add('manifest-loading', Object.values({release:1,modules:1,flags:1,migrations:1,build:1,version:1}).length === 6 && js.includes('loadManifests'), 'six manifests');
add('feature-channels', Array.isArray(flags?.channels) && flags.channels.join(',') === 'stable,beta,lab', flags?.channels?.join(',') || 'missing');
add('feature-count', Array.isArray(flags?.flags) && flags.flags.length >= 5, String(flags?.flags?.length || 0));
add('module-count', Array.isArray(modules?.modules) && modules.modules.length >= 20, String(modules?.modules?.length || 0));
add('platform-control-module', modules?.modules?.some?.((item) => item.id === 'platform-control'), 'platform-control');
add('release-no-sql', release?.requiresSql === false, String(release?.requiresSql));
add('release-no-env', release?.requiresEnv === false, String(release?.requiresEnv));
add('release-no-dependency', release?.requiresDependencyInstall === false, String(release?.requiresDependencyInstall));
add('kill-switch-handler', js.includes('interceptNavigation') && js.includes('isModuleDisabled'), 'navigation protection');
add('diagnostics', js.includes('runDiagnostics') && js.includes('exportReport'), 'runtime diagnostics');
add('safe-json-render', js.includes('function esc(value)'), 'HTML escaping');
add('no-eval', !/\beval\s*\(|new\s+Function\s*\(/.test(js), 'no eval');
add('css-shell', css.includes('.bespc-shell'), '.bespc-shell');
add('css-grid', css.includes('.bespc-grid'), '.bespc-grid');
add('css-table', css.includes('.bespc-table'), '.bespc-table');
add('css-mobile', css.includes('@media (max-width: 820px)'), '820px');
add('css-reduced-motion', css.includes('prefers-reduced-motion'), 'reduced motion');
add('css-z-index', css.includes('2147482600'), 'isolated overlay');

const failed = tests.filter((test) => !test.ok);
for (const test of tests) console.log(`${test.ok ? 'PASS' : 'FAIL'}  ${test.name}${test.detail ? ` — ${test.detail}` : ''}`);
console.log(`\nPlatform Control Test: ${tests.length - failed.length}/${tests.length} đạt.`);
if (failed.length) process.exit(1);
