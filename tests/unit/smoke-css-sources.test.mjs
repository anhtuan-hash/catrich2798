import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const smokePath = path.join(repoRoot, 'scripts/smoke-test.mjs');

function extractCssSources(source) {
  const block = source.match(/const cssSource = \[([\s\S]*?)\]\.map\(/)?.[1] || '';
  return [...block.matchAll(/['"](\.\.\/src\/[^'"]+\.css)['"]/g)].map((match) => match[1]);
}

test('repository smoke test only references CSS files that exist', () => {
  const source = fs.readFileSync(smokePath, 'utf8');
  const cssSources = extractCssSources(source);

  assert.ok(cssSources.length > 0, 'Expected smoke-test.mjs to declare CSS sources');

  const missing = cssSources.filter((relativePath) => {
    const absolutePath = path.resolve(path.dirname(smokePath), relativePath);
    return !fs.existsSync(absolutePath);
  });

  assert.deepEqual(missing, [], `Missing CSS smoke sources: ${missing.join(', ')}`);
});
