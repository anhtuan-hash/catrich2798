import fs from 'node:fs';
if (!fs.existsSync('dist/index.html')) throw new Error('Run build first.');
const runtime = fs.statSync('src/utils/bursReadability.js').size;
const css = fs.statSync('src/styles/v1159.css').size;
if (runtime > 18000) throw new Error(`BURS runtime too large: ${runtime}`);
if (css > 50000) throw new Error(`BURS CSS too large: ${css}`);
const mainCss = fs.readdirSync('dist/assets').filter((file) => file.startsWith('index-') && file.endsWith('.css'))
  .map((file) => ({ file, size: fs.statSync(`dist/assets/${file}`).size }))
  .sort((a, b) => b.size - a.size)[0];
if (!mainCss || mainCss.size > 1_500_000) throw new Error(`Main CSS budget exceeded: ${mainCss?.size || 0}`);
console.log(`V11.5.9 performance budget PASS (${runtime} B runtime, ${css} B BURS CSS, ${mainCss.size} B main CSS).`);
