import fs from 'node:fs';

function mustRead(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing required file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`${label}: missing ${needle}`);
}

const workflow = mustRead('.github/workflows/critical-e2e.yml');
const spec = mustRead('tests/e2e/critical-smoke.spec.js');
const config = mustRead('playwright.config.js');

requireText(workflow, 'name: Critical E2E', 'Critical E2E workflow');
requireText(workflow, 'npx playwright install --with-deps chromium', 'Critical E2E browser install');
requireText(workflow, 'playwright test tests/e2e/critical-smoke.spec.js', 'Critical E2E execution');
requireText(spec, '#bes-global-wave-loader', 'Critical smoke loader regression');
requireText(spec, "#/dashboard", 'Critical smoke Dashboard route');
requireText(spec, "#/tool/gradebook-studio", 'Critical smoke Gradebook route');
requireText(spec, "#/settings", 'Critical smoke Settings route');

if (config.includes("executablePath: process.env.BES_CHROMIUM_EXECUTABLE || '/usr/bin/chromium'")) {
  throw new Error('Playwright config must not hard-code /usr/bin/chromium when CI installs bundled Chromium.');
}

console.log('Critical E2E contract OK');
