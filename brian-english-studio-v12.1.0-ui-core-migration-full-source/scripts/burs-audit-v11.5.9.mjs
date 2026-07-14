import fs from 'node:fs';
import path from 'node:path';

const roots = ['src'];
const cssFiles = [];
for (const root of roots) walk(root);

function walk(current) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.css')) cssFiles.push(full);
  }
}

const small = [];
const pxPattern = /font-size\s*:\s*([0-9]*\.?[0-9]+)(px|rem|em)/g;
for (const file of cssFiles) {
  const source = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = pxPattern.exec(source))) {
    const numeric = Number(match[1]);
    const unit = match[2];
    const pixels = unit === 'px' ? numeric : numeric * 16;
    if (pixels > 0 && pixels < 13) {
      const line = source.slice(0, match.index).split('\n').length;
      small.push({ file, line, value: match[0], pixels });
    }
  }
}

if (small.length) {
  console.error('BURS audit found font sizes below 13px:');
  small.slice(0, 40).forEach((item) => console.error(`- ${item.file}:${item.line} ${item.value}`));
  throw new Error(`BURS minimum-text contract failed (${small.length} declarations).`);
}

const bursCss = fs.readFileSync('src/styles/v1159.css', 'utf8');
for (const token of [
  '--burs-font-meta', '--burs-font-body', '--burs-card-pad', '--burs-control-height',
  'data-burs="comfortable"', '@media (max-width: 1179px)', '@media (max-width: 999px)',
  '@media (max-width: 899px)', '@media (max-width: 699px)', '@media (max-width: 420px)',
]) {
  if (!bursCss.includes(token)) throw new Error(`BURS CSS missing ${token}`);
}

const runtime = fs.readFileSync('src/utils/bursReadability.js', 'utf8');
for (const token of ['MIN_TEXT_PX = 13', 'MIN_CONTROL_PX = 14', 'MutationObserver', 'ShadowRoot', 'bes:font-scale-changed', 'window.BURS']) {
  if (!runtime.includes(token)) throw new Error(`BURS runtime missing ${token}`);
}

console.log(`BURS typography audit PASS (${cssFiles.length} CSS files, 0 declarations below 13px).`);
