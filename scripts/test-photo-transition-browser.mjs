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

  async function assertWholeArtwork(label) {
    const geometry = await page.evaluate(() => {
      const stage = document.querySelector('.bhs-home__stage, .bss-stage');
      const view = stage?.querySelector('.bss-motion');
      const img = view?.querySelector('.bss-motion__layer--still .bss-motion__image');
      const controls = stage?.querySelector('.bhs-home__controls, .bss-stage-controls');
      if (!stage || !view || !img || !controls) return null;
      const r = (node) => { const rect = node.getBoundingClientRect(); return {
        x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height
      }; };
      const viewBox = r(view), imageBox = r(img);
      const natural = { width:img.naturalWidth, height:img.naturalHeight };
      const scale = Math.min(imageBox.width/natural.width, imageBox.height/natural.height);
      return {
        stage:r(stage),view:viewBox,controls:r(controls),image:imageBox,
        fit:getComputedStyle(img).objectFit,natural,
        painted:{width:natural.width*scale,height:natural.height*scale},
      };
    });
    assert.ok(geometry, label + ': artwork and control bar exist');
    assert.ok(geometry.natural.width && geometry.natural.height,
      label + ': artwork is a decoded image');
    assert.equal(geometry.fit, 'contain', label + ': image is not cropped by CSS cover');
    assert.ok(geometry.view.bottom <= geometry.controls.y - 2,
      label + ': artwork sits above the transport controls, not beneath them: ' + JSON.stringify(geometry));
    assert.ok(geometry.image.width <= geometry.view.width + 1 &&
      geometry.image.height <= geometry.view.height + 1 &&
      geometry.image.width > 0 && geometry.image.height > 0,
      label + ': image element stays inside safe viewport');
    assert.ok(geometry.painted.width <= geometry.view.width + 1 &&
      geometry.painted.height <= geometry.view.height + 1,
      label + ': portrait and landscape image content fits without clipping');
    console.log('✓ Whole uncropped artwork: ' + label + ' (' +
      geometry.natural.width + '×' + geometry.natural.height + ')');
  }

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
    await assertWholeArtwork('home ' + mode);
    console.log('✓ Real Chromium motion detected: ' + mode);
  }

  // Test gallery and mobile breakpoints independently of the home layout.
  await page.locator('#toggle-layout').click();
  await page.locator('.bss-stage .bss-motion__layer--still').waitFor();
  await assertWholeArtwork('full gallery desktop');
  await page.locator('#previous-photo').click();
  await page.waitForFunction(() => !document.querySelector('.bss-motion__layer--out'), { timeout: 4000 });
  await assertWholeArtwork('full gallery portrait artwork');
  await page.setViewportSize({ width: 390, height: 844 });
  await assertWholeArtwork('full gallery mobile portrait');
  await page.locator('#toggle-layout').click();
  await page.locator('.bhs-home__stage .bss-motion__layer--still').waitFor();
  await assertWholeArtwork('homepage mobile portrait');
  await page.setViewportSize({ width: 1200, height: 800 });
  await assertWholeArtwork('homepage desktop portrait');

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
