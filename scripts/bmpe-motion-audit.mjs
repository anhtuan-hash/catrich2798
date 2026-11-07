// BMPE Wave 0/1: source audit, not a substitute for computed-style or device tests.
// Run: node scripts/bmpe-motion-audit.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const walk = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(target);
    return entry.isFile() && target.endsWith('.css') ? [target] : [];
  });
};
const posix = (file) => path.relative(root, file).split(path.sep).join('/');
const cssFiles = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'public'))];
const source = fs.readFileSync(path.join(root, 'src/styles/v1159.css'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
const motion = fs.readFileSync(path.join(root, 'src/utils/globalMotionSystem.js'), 'utf8');
const results = cssFiles.map((file) => {
  const css = fs.readFileSync(file, 'utf8');
  return {
    path: posix(file),
    bytes: Buffer.byteLength(css),
    important: (css.match(/!important/g) || []).length,
    keyframes: (css.match(/@keyframes\s+/g) || []).length,
    animationNoneImportant: (css.match(/animation\s*:\s*none\s*!important/g) || []).length,
    transitionNoneImportant: (css.match(/transition\s*:\s*none\s*!important/g) || []).length,
    largeVisualFilters: (css.match(/(?:backdrop-filter|filter)\s*:/g) || []).length,
  };
});
const summary = {
  schema: 'bmpe-static-audit-v1',
  note: 'Static inventory only. Selectors, mount state, cascade and FPS still require browser verification.',
  commit: process.env.GITHUB_SHA || 'unrecorded-local-run',
  cssFilesScanned: results.length,
  cssBytesScanned: results.reduce((n, x) => n + x.bytes, 0),
  totalImportant: results.reduce((n, x) => n + x.important, 0),
  totalKeyframes: results.reduce((n, x) => n + x.keyframes, 0),
  conditionalDisableCandidates: results.filter((x) => x.animationNoneImportant || x.transitionNoneImportant).sort((a,b) => b.animationNoneImportant - a.animationNoneImportant),
  v1159Sha256: crypto.createHash('sha256').update(source).digest('hex'),
  v1159TtcmSkinPresent: source.includes('/* TTCM CHANNEL') && source.includes('.ttcm-m3-shell'),
  globalMotionV2Present: motion.includes('MOTION_LIBRARY') && motion.includes('applyGlobalMotionConfig'),
  v1159Imported: main.includes("import './styles/v1159.css'"),
  allActiveRouteIdsStatic: [...new Set([...main.matchAll(/currentRoute\s*===\s*['"]([^'"]+)['"]/g)].map((m) => m[1]))].sort(),
  manualVerificationNeeded: ['macOS Safari/Chrome/Edge', 'Windows Edge/Chrome/Firefox', 'visual parity for legacy hover overrides', 'authenticated route parity'],
};
console.log(JSON.stringify(summary, null, 2));
if (/html\s+body\s+:not\(#brian-motion-retired-a#brian-motion-retired-b\)/.test(source) ||
    /Retire motion globally while preserving static layout/.test(source)) {
  console.error('BMPE GATE FAILED: legacy unscoped global motion kill-switch remains');
  process.exitCode = 1;
}
if (!summary.v1159TtcmSkinPresent || !summary.globalMotionV2Present || !summary.v1159Imported) {
  console.error('BMPE GATE FAILED: required Brian motion/TTCM integration is missing');
  process.exitCode = 1;
}
