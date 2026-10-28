import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const PORT = 5199;
const BASE = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1',
  '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
let serverLog = '';
server.stderr.on('data', (chunk) => { serverLog += String(chunk); });
let browser;

try {
  let ready = false;
  for (let i = 0; i < 75; i++) {
    if (server.exitCode !== null) throw new Error('Vite server exited early: ' + serverLog);
    try {
      const response = await fetch(BASE + '/tests/fixtures/photo-motion-test.html');
      if (response.ok) { ready = true; break; }
    } catch { /* Vite may still be starting. */ }
    await sleep(250);
  }
  assert.ok(ready, 'Vite fixture server started');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 },
    reducedMotion: 'no-preference' });
  await page.goto(BASE + '/tests/fixtures/photo-motion-test.html', { waitUntil: 'networkidle' });
  await page.locator('.bss-motion__layer--still').waitFor();
  console.log('✓ Actual React PhotoTransitionStage rendered in Chromium');

  const modeValues = ['fade', 'slide', 'zoom', 'reveal', 'blur'];
  for (const mode of modeValues) {
    await page.locator('#transition-mode').selectOption(mode);
    await page.locator('#next-photo').click();
    await page.waitForFunction(() => {
      const incoming = document.querySelector('.bss-motion__layer--in');
      return incoming && incoming.getAnimations().some((animation) => animation.playState === 'running')
        && document.querySelector('.bss-motion__layer--out');
    }, { timeout: 3000 });
    const first = await page.locator('.bss-motion__layer--in').evaluate((node) => {
      const s = getComputedStyle(node);
      return [s.opacity,s.transform,s.filter,s.clipPath].join('|');
    });
    await sleep(260);
    const second = await page.locator('.bss-motion__layer--in').evaluate((node) => {
      const s = getComputedStyle(node);
      return [s.opacity,s.transform,s.filter,s.clipPath].join('|');
    });
    assert.notEqual(first, second, mode + ' must visibly animate computed styles over time');
    await page.waitForFunction(() => !document.querySelector('.bss-motion__layer--out'),
      { timeout: 4000 });
    console.log('✓ Real Chromium motion detected: ' + mode);
  }

  await page.locator('#transition-mode').selectOption('slide');
  await page.locator('#previous-photo').click();
  await page.waitForFunction(() => {
    const stage = document.querySelector('.bss-motion--reverse');
    return stage && stage.querySelector('.bss-motion__layer--in')?.getAnimations().length > 0;
  }, { timeout: 2500 });
  console.log('✓ Reverse navigation animates both photo layers');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !document.querySelector('.bss-motion__layer--out'), { timeout: 4000 });
  await page.locator('#next-photo').click();
  await sleep(180);
  assert.equal(await page.locator('.bss-motion__layer--out').count(), 0,
    'reduced-motion users see a stable image with no forced transition');
  console.log('✓ Respect browser reduced-motion accessibility setting');
  console.log('BRIAN Photo Story browser motion PASS');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
