#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const VERSION = '11.6.7';
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const pkg = readJson('package.json');
const version = readJson('public/version.json');
const manifest = readJson('public/release-manifest.json');
const config = fs.readFileSync('src/config/version.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('public/sw.js', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(pkg.version === VERSION, `package version mismatch: ${pkg.version}`);
assert(version.version === VERSION, `public/version.json mismatch: ${version.version}`);
assert(manifest.version === VERSION, `release manifest mismatch: ${manifest.version}`);
assert(config.includes(`APP_VERSION = '${VERSION}'`), 'src/config/version.js mismatch');
assert(index.includes(`name="bes-app-version" content="${VERSION}"`), 'index meta version mismatch');
assert(sw.includes(`const VERSION = '${VERSION}';`), 'service worker cache version mismatch');
assert(version.aiDockV2 === true && manifest.aiDockV2 === true, 'AI Dock V2 flag missing');
assert(version.persistentPersonalFont === true && manifest.persistentPersonalFont === true, 'font persistence flag missing');

execFileSync(process.execPath, ['scripts/verify-v11.6.7.mjs'], { stdio: 'inherit' });

const apiFunctions = fs.existsSync('api')
  ? fs.readdirSync('api', { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.js') && !entry.name.startsWith('_')).length
  : 0;
assert(apiFunctions <= 12, `Vercel Functions exceed Hobby limit: ${apiFunctions}/12`);
console.log(`V11.6.7 release guard passed. Vercel Functions: ${apiFunctions}/12.`);
