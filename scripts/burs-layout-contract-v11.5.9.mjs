import fs from 'node:fs';
const css = fs.readFileSync('src/styles/v1159.css', 'utf8');
const required = [
  '1560px', '1440px', '1179px', '999px', '899px', '699px', '420px',
  '.gb-setup-grid', '.ws-setup-grid', '.pc-setup-grid', '.wf-config-layout',
  'grid-template-columns: repeat(2, minmax(0, 1fr))',
  'grid-template-columns: minmax(0, 1fr)',
  '--burs-touch-size: 2.75rem',
];
for (const token of required) if (!css.includes(token)) throw new Error(`BURS layout contract missing ${token}`);

const main = fs.readFileSync('src/main.jsx', 'utf8');
for (const token of ["./styles/v1159.css", 'installBursReadability();', 'data-burs="comfortable"', 'bes:font-scale-changed']) {
  if (!main.includes(token)) throw new Error(`Main bootstrap missing ${token}`);
}

console.log('BURS responsive layout contracts PASS (1440/1280/1024/768/390 families covered).');
