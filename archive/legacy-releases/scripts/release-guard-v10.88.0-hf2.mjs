#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const cwd = process.cwd();
const files = [
  'public/bes-ai-launcher-slot-v10882.css',
  'public/bes-ai-launcher-slot-v10882.js',
  'public/bes-release-v10.88.0-hf2.json',
  'scripts/install-v10.88.0-hf2.mjs',
  'scripts/rollback-v10.88.0-hf2.mjs',
  'scripts/test-ai-launcher-slot-v10.88.0-hf2.mjs'
];
const results = [];
const add = (name, ok, detail = '') => results.push({ name, ok, detail });
const read = (name) => fs.existsSync(path.join(cwd, name)) ? fs.readFileSync(path.join(cwd, name), 'utf8') : '';

for (const file of files) add(`Có ${file}`, fs.existsSync(path.join(cwd, file)));
const packageJson = JSON.parse(read('package.json') || '{}');
const index = read('index.html');
const css = read('public/bes-ai-launcher-slot-v10882.css');
const js = read('public/bes-ai-launcher-slot-v10882.js');
const release = JSON.parse(read('public/bes-release-v10.88.0-hf2.json') || '{}');

add('Giữ package version 10.88.0', packageJson.version === '10.88.0');
add('Có script verify HF2', Boolean(packageJson.scripts && packageJson.scripts['verify:v10.88.0-hf2']));
add('Có script rollback HF2', Boolean(packageJson.scripts && packageJson.scripts['rollback:v10.88.0-hf2']));
add('Index chỉ có một CSS HF2', (index.match(/bes-ai-launcher-slot-v10882\.css/g) || []).length === 1);
add('Index chỉ có một JS HF2', (index.match(/bes-ai-launcher-slot-v10882\.js/g) || []).length === 1);
add('Release manifest đúng base', release.baseVersion === '10.88.0');
add('Release không yêu cầu SQL', release.requiresSql === false);
add('Release không yêu cầu ENV', release.requiresEnv === false);
add('Release không đổi dependency', release.dependencyChanges === false);
add('CSS không dùng selector chung button toàn site', !/(^|\n)\s*button\s*\{/m.test(css));
add('JS không ghi dữ liệu AI', !/localStorage\.setItem\([\s\S]*(history|conversation|message|api.?key)/i.test(js));
add('Không có file font trong gói', !files.some((file) => /\.(ttf|otf|woff2?)$/i.test(file)));
add('package-lock không bị installer ghi trực tiếp', !read('scripts/install-v10.88.0-hf2.mjs').includes("writeFileSync(path.join(cwd, 'package-lock.json')"));

const combined = files.map(read).join('\n');
add('Không chứa secret pattern', !/(sk-[A-Za-z0-9_-]{20,}|service_role\s*[:=]|SUPABASE_SERVICE_ROLE_KEY\s*=)/i.test(combined));
const digest = crypto.createHash('sha256').update(css + js).digest('hex');
add('Asset digest hợp lệ', /^[a-f0-9]{64}$/.test(digest), digest);

const failed = results.filter((item) => !item.ok);
console.log('\nBrian English Studio V10.88.0-HF2 · Release Guard\n');
for (const item of results) console.log(`${item.ok ? '✓' : '✗'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nKết quả: ${results.length - failed.length}/${results.length} đạt · ${failed.length} lỗi\n`);
process.exit(failed.length ? 1 : 0);
