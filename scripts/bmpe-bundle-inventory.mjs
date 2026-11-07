/**
 * BMPE Wave 3: reproducible build inventory for Vite dist.
 * Does not assert FPS; compares bundle bytes only when a valid baseline exists.
 * Usage: node scripts/bmpe-bundle-inventory.mjs [--baseline <report.json>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const root = process.cwd();
const dist = path.join(root, 'dist');
const args = process.argv.slice(2);
const optionIndex = args.indexOf('--baseline');
const baselinePath = optionIndex >= 0 ? args[optionIndex + 1] : null;
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('BMPE bundle inventory requires a finished Vite dist/index.html');
  process.exit(1);
}
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const file = path.join(dir, item.name);
    return item.isDirectory() ? walk(file) : item.isFile() ? [file] : [];
  });
}
const all = walk(dist);
const assets = all.filter((file) => /\.(?:js|css|woff2|avif|webp|png|jpe?g|svg)$/.test(file)).map((file) => {
  const payload = fs.readFileSync(file);
  const relative = path.relative(dist, file).replaceAll(path.sep, '/');
  return {
    path: relative,
    kind: path.extname(file).slice(1),
    raw: payload.length,
    gzip: ['js','css','svg'].includes(path.extname(file).slice(1)) ? gzipSync(payload, { level: 6 }).length : null,
    brotli: ['js','css','svg'].includes(path.extname(file).slice(1)) ? brotliCompressSync(payload).length : null,
    sha256: createHash('sha256').update(payload).digest('hex'),
  };
}).sort((a,b) => b.raw-a.raw || a.path.localeCompare(b.path));

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const initialPaths = [...html.matchAll(/(?:src|href)=["'](?:\/)?(assets\/[^"']+\.(?:css|js))["']/g)].map((match) => match[1]);
const initial = assets.filter((file) => initialPaths.includes(file.path));
const sum = (rows, key) => rows.reduce((n,x)=>n+(x[key]||0),0);
const totals = (rows)=> ({
  files: rows.length, jsBytes: sum(rows.filter(x=>x.kind==='js'),'raw'),
  cssBytes: sum(rows.filter(x=>x.kind==='css'),'raw'),
  rawBytes: sum(rows,'raw'), gzipBytes: sum(rows,'gzip'),
  brotliBytes: sum(rows,'brotli'),
});
const report = {
  schema: 'bmpe-vite-bundle-inventory-v1',
  commit: process.env.GITHUB_SHA || 'local-unverified',
  capturedAt: new Date().toISOString(),
  environment: process.env.CI ? 'ci' : 'local',
  note: 'Build asset sizes only; not hardware FPS or official RUM Web Vitals.',
  totals: totals(assets), initial: totals(initial),
  largestAssets: assets.slice(0,25), initialAssetPaths: initialPaths,
  comparison: null,
};
if (baselinePath) {
  if (!fs.existsSync(baselinePath)) {
    console.error('BMPE baseline file missing: ' + baselinePath);
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath,'utf8'));
  if (baseline.schema !== report.schema || !baseline.initial || !baseline.totals) {
    console.error('BMPE baseline schema mismatch');
    process.exit(1);
  }
  const ratio = (current,old) => old > 0 ? Number(((current-old)/old*100).toFixed(2)) : null;
  report.comparison = {
    baselineCommit: baseline.commit,
    initialRawChangePct: ratio(report.initial.rawBytes,baseline.initial.rawBytes),
    initialGzipChangePct: ratio(report.initial.gzipBytes,baseline.initial.gzipBytes),
    totalRawChangePct: ratio(report.totals.rawBytes,baseline.totals.rawBytes),
    targetInitialGzipDeltaPct: 5,
    budgetPassed: null,
    explanation: 'Threshold remains informational until the approved baseline represents the same route and build settings.',
  };
}
console.log(JSON.stringify(report,null,2));
