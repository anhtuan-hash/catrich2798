import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiRoot = path.join(root, 'api');

function collectFunctionSources(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectFunctionSources(fullPath));
      continue;
    }
    if (/\.(?:js|mjs|cjs|ts|mts|cts)$/.test(entry.name)) {
      found.push(path.relative(root, fullPath).replaceAll('\\', '/'));
    }
  }
  return found.sort();
}

const functions = collectFunctionSources(apiRoot);
assert.ok(
  functions.length <= 12,
  `Vercel Hobby allows at most 12 Serverless Functions; api/ currently contains ${functions.length}: ${functions.join(', ')}`,
);

const gatewayOnlyHelpers = [
  '_briefing-weather.js',
  '_check-embed.js',
  '_google-drive-homeroom-backup.js',
  '_weekly-practice-drive-action.js',
  '_weekly-practice-file.js',
  '_work-hub-archive-resource.js',
  '_work-hub-file-access.js',
  '_work-hub-file-action.js',
  '_work-hub-file.js',
];

for (const helper of gatewayOnlyHelpers) {
  assert.equal(
    fs.existsSync(path.join(apiRoot, helper)),
    false,
    `Gateway-only handler ${helper} must live outside api/ so Vercel does not count it as a separate function.`,
  );
}

console.log(`PASS: Vercel Hobby function budget is ${functions.length}/12.`);
