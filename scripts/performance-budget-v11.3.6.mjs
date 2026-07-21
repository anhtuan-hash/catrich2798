import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assets = path.join(root, 'dist', 'assets');
if (!fs.existsSync(assets)) throw new Error('dist/assets is missing. Run npm run build first.');

const files = fs.readdirSync(assets).map((name) => {
  const full = path.join(assets, name);
  return { name, size: fs.statSync(full).size };
});
const sum = (items) => items.reduce((total, item) => total + item.size, 0);
const js = files.filter((file) => /\.(?:js|mjs)$/i.test(file.name));
const css = files.filter((file) => /\.css$/i.test(file.name));
const budgetedJs = js.filter((file) => !/pdf\.worker|vendor-pdf/i.test(file.name));
const total = sum(files);
const limits = {
  largestJs: 900 * 1024,
  cssTotal: 1300 * 1024,
  jsTotal: 9 * 1024 * 1024,
  distAssets: 30 * 1024 * 1024,
};
const largestJs = budgetedJs.sort((a, b) => b.size - a.size)[0] || { name: 'none', size: 0 };
const results = [
  ['Largest application JS chunk', largestJs.size, limits.largestJs, largestJs.name],
  ['Total CSS', sum(css), limits.cssTotal, `${css.length} files`],
  ['Total JS', sum(js), limits.jsTotal, `${js.length} files`],
  ['Total dist assets', total, limits.distAssets, `${files.length} files`],
];
const format = (value) => `${(value / 1024).toFixed(1)} KB`;
let failed = 0;
for (const [name, value, limit, detail] of results) {
  const pass = value <= limit;
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: ${format(value)} / ${format(limit)} · ${detail}`);
}
if (failed) process.exit(1);
console.log('V11.3.6 performance budget passed.');
