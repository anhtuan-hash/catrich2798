import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const html = fs.readFileSync('dist/index.html', 'utf8');
const assetDir = 'dist/assets';
const initialCssLinks = [...html.matchAll(/href="\/?assets\/([^"?]+\.css)"/g)].map((match) => match[1]);
const entryScripts = [...html.matchAll(/src="\/?assets\/([^"?]+\.js)"/g)].map((match) => match[1]);
const preloadScripts = [...html.matchAll(/rel="modulepreload"[^>]+href="\/?assets\/([^"?]+\.js)"/g)].map((match) => match[1]);
assert.ok(initialCssLinks.length >= 1, 'Production HTML has no initial CSS asset.');
assert.ok(entryScripts.length >= 1, 'Production HTML has no JavaScript entry asset.');

const initialCss = initialCssLinks.reduce((sum, file) => sum + fs.statSync(path.join(assetDir, file)).size, 0);
const initialCssGzip = initialCssLinks.reduce((sum, file) => sum + gzipSync(fs.readFileSync(path.join(assetDir, file))).length, 0);
const entryJs = entryScripts.reduce((sum, file) => sum + fs.statSync(path.join(assetDir, file)).size, 0);
const initialJsFiles = [...new Set([...entryScripts, ...preloadScripts])];
const initialJs = initialJsFiles.reduce((sum, file) => sum + fs.statSync(path.join(assetDir, file)).size, 0);
const initialJsGzip = initialJsFiles.reduce((sum, file) => sum + gzipSync(fs.readFileSync(path.join(assetDir, file))).length, 0);

assert.ok(initialCss <= 1_100_000, `Initial CSS exceeded 1.10 MB: ${initialCss} bytes.`);
assert.ok(initialCssGzip <= 172_000, `Initial gzipped CSS exceeded 172 KB: ${initialCssGzip} bytes.`);
assert.ok(entryJs <= 200_000, `Entry JavaScript exceeded 200 KB: ${entryJs} bytes.`);
assert.ok(initialJs <= 800_000, `Initial JavaScript exceeded 800 KB: ${initialJs} bytes.`);
assert.ok(initialJsGzip <= 245_000, `Initial gzipped JavaScript exceeded 245 KB: ${initialJsGzip} bytes.`);

const assets = fs.readdirSync(assetDir);
for (const prefix of ['WebApps-', 'Settings-', 'DepartmentWorkspace-', 'AdminPage-', 'UICommandCenter-', 'UIWorkspaceLayoutManager-']) {
  assert.ok(assets.some((file) => file.startsWith(prefix) && file.endsWith('.css')), `Missing route-level CSS chunk ${prefix}*.css.`);
}

console.log(`V12.40.9 performance contract passed: initial CSS ${(initialCss / 1024).toFixed(1)} KB (${(initialCssGzip / 1024).toFixed(1)} KB gzip), initial JS ${(initialJs / 1024).toFixed(1)} KB (${(initialJsGzip / 1024).toFixed(1)} KB gzip), entry JS ${(entryJs / 1024).toFixed(1)} KB.`);
