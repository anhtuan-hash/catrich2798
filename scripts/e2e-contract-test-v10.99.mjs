import fs from 'node:fs';
const checks = [
  ['Playwright config', fs.existsSync('playwright.config.js')],
  ['Shell E2E', fs.existsSync('tests/e2e/shell.spec.js')],
  ['Security E2E', fs.existsSync('tests/e2e/security.spec.js')],
  ['Responsive E2E', fs.existsSync('tests/e2e/responsive.spec.js')],
  ['Preview script', Boolean(JSON.parse(fs.readFileSync('package.json','utf8')).scripts.preview)],
];
let failed=0; for(const [name,ok] of checks){console.log(`${ok?'✓':'✗'} ${name}`); if(!ok)failed++;} if(failed)process.exit(1); console.log(`E2E contract test: ${checks.length}/${checks.length} passed`);
