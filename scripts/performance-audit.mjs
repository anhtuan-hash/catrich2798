import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cssPath = path.join(root, 'src', 'index.css');
const distAssets = path.join(root, 'dist', 'assets');
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

const count = (pattern, text = css) => (text.match(pattern) || []).length;
const bytes = (file) => fs.existsSync(file) ? fs.statSync(file).size : 0;
const format = (n) => `${(n / 1024).toFixed(1)} KB`;

const report = [];
report.push('Brian English Studio performance audit');
report.push('---------------------------------------');
report.push(`CSS size: ${format(bytes(cssPath))}`);
report.push(`CSS lines: ${css.split('\n').length}`);
report.push(`@keyframes: ${count(/@keyframes/g)}`);
report.push(`animation declarations: ${count(/\banimation\s*:/g)}`);
const heavyFx = new RegExp(['backdrop','filter'].join('-') + '|\\bfilter\\s*:', 'g');
report.push(`heavy effect declarations: ${count(heavyFx)}`);
report.push(`Lite motion patch present: ${css.includes('V8.8 Deep Performance Runtime Patch') ? 'yes' : 'no'}`);
report.push(`Adaptive performance patch present: ${css.includes('V8.9 Adaptive Performance Mode') ? 'yes' : 'no'}`);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
report.push(`Motion boot script present: ${html.includes('bes-motion-boot') ? 'yes' : 'no'}`);
report.push(`Performance boot attribute present: ${html.includes('bes-performance-mode') ? 'yes' : 'no'}`);

if (fs.existsSync(distAssets)) {
  const files = fs.readdirSync(distAssets).map((name) => ({ name, size: bytes(path.join(distAssets, name)) }));
  const top = files.sort((a, b) => b.size - a.size).slice(0, 10);
  const pdfWorkers = files.filter((file) => /pdf\.worker/i.test(file.name));
  report.push('');
  report.push('Prebuilt dist assets are included for direct drag-and-drop deployment.');
  report.push(`PDF worker files in current dist: ${pdfWorkers.length}`);
  top.forEach((file) => report.push(`- ${file.name}: ${format(file.size)}`));
}

console.log(report.join('\n'));
