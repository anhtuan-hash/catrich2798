#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const results = [];
const add = (name, ok, detail = '') => results.push({ name, ok, detail });
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const readJson = (file) => { try { return JSON.parse(read(file)); } catch { return {}; } };
const count = (text, token) => text.split(token).length - 1;
const sha256 = (file) => fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;

const packagePath = path.join(cwd, 'package.json');
const indexPath = path.join(cwd, 'index.html');
const versionPath = path.join(cwd, 'public', 'version.json');
const releasePath = path.join(cwd, 'public', 'bes-release-v10.88.0-hf1.json');
const statePath = path.join(cwd, '.bes-release', 'v10.88.0-hf1.json');
const cssPath = path.join(cwd, 'public', 'bes-ai-chat-v10881.css');
const jsPath = path.join(cwd, 'public', 'bes-ai-chat-v10881.js');

const pkg = readJson(packagePath);
const index = read(indexPath);
const version = readJson(versionPath);
const release = readJson(releasePath);
const state = readJson(statePath);

add('package.json tồn tại', fs.existsSync(packagePath));
add('index.html tồn tại', fs.existsSync(indexPath));
add('Base package version vẫn là 10.88.0', pkg.version === '10.88.0', String(pkg.version || 'n/a'));
add('CSS v10881 được chèn đúng một lần', count(index, '/bes-ai-chat-v10881.css') === 1, String(count(index, '/bes-ai-chat-v10881.css')));
add('JS v10881 được chèn đúng một lần', count(index, '/bes-ai-chat-v10881.js') === 1, String(count(index, '/bes-ai-chat-v10881.js')));
add('Không còn integration CSS v10872', !index.includes('/bes-ai-chat-v10872.css'));
add('Không còn integration JS v10872', !index.includes('/bes-ai-chat-v10872.js'));
add('Không còn integration CSS v10873', !index.includes('/bes-ai-chat-v10873.css'));
add('Không còn integration JS v10873', !index.includes('/bes-ai-chat-v10873.js'));
add('CSS asset tồn tại', fs.existsSync(cssPath));
add('JS asset tồn tại', fs.existsSync(jsPath));
add('Release manifest tồn tại', fs.existsSync(releasePath));
add('State record tồn tại', fs.existsSync(statePath));
add('Release manifest đúng hotfix', release.hotfixVersion === '10.88.0-hf1');
add('Version registry ghi nhận hotfix', version.lastHotfix === '10.88.0-hf1');
add('AI Chat runtime là v10881', version.aiChatRuntime === 'v10881');
add('Script test hotfix tồn tại', pkg.scripts?.['test:ai-chat-close'] === 'node scripts/test-ai-chat-close-v10.88.0-hf1.mjs');
add('Script verify hotfix tồn tại', typeof pkg.scripts?.['verify:v10.88.0-hf1'] === 'string');
add('Script rollback hotfix tồn tại', pkg.scripts?.['rollback:v10.88.0-hf1'] === 'node scripts/rollback-v10.88.0-hf1.mjs');
add('Không yêu cầu SQL', release.requiresSql === false && state.requiresSql === false);
add('Không yêu cầu Environment Variable', release.requiresEnv === false && state.requiresEnv === false);
add('Không đổi dependency', state.dependencyChanges === false);
add('Giữ lịch sử AI', state.preservesAIHistory === true);
add('Giữ draft AI', state.preservesDrafts === true);
add('package-lock hash không đổi', state.lockHashBefore === state.lockHashAfter && state.lockHashAfter === sha256(path.join(cwd, 'package-lock.json')));

if (fs.existsSync(jsPath)) {
  const syntax = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
  add('JavaScript syntax đạt', syntax.status === 0, (syntax.stderr || '').trim());
  const js = read(jsPath);
  add('Có close cleanup lifecycle', js.includes('beginClose') && js.includes('finishClose'));
  add('Có MutationObserver attributes', js.includes('attributeFilter'));
  add('Không chứa secret', !/VITE_(OPENAI|ANTHROPIC|GEMINI|SUPABASE_SERVICE_ROLE)|service_role\s*[:=]/i.test(js));
}
if (fs.existsSync(cssPath)) {
  const css = read(cssPath);
  add('CSS chặn ghost panel', css.includes('data-bes-ai-chat-lifecycle="closing"') && css.includes('backdrop-filter: none !important'));
}

const failed = results.filter((item) => !item.ok);
console.log('\nBrian English Studio V10.88.0-HF1 · Release Guard\n');
for (const item of results) console.log(`${item.ok ? '✓' : '✗'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nKết quả: ${results.length - failed.length}/${results.length} đạt · ${failed.length} lỗi\n`);
process.exit(failed.length ? 1 : 0);
