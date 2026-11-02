import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:5198';
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5198', '--strictPort'], { stdio: 'pipe' });
let browser, log = '';
vite.stderr.on('data', chunk => { log += String(chunk); });
const output = 'test-results/dashboard-scrapbook-admin';
mkdirSync(output, { recursive: true });
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (vite.exitCode !== null) throw new Error(log);
    try { if ((await fetch(base + '/tests/fixtures/dashboard-scrapbook-admin.html')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'fixture server is ready');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Intercept only this test page's runtime. Production code has no test bypass.
  await page.addInitScript(() => { window.scrapbookServer = { missing: true, enabled: false, reject: false, revision: 1 }; });
  await page.route('**/src/services/runtime/core.js*', route => route.fulfill({
    contentType: 'text/javascript',
    body: `
      const row = () => ({ dashboard_scrapbook_enabled: window.scrapbookServer.enabled, updated_at: new Date(1793600000000 + window.scrapbookServer.revision * 1000).toISOString() });
      export const getRuntimeClient = () => ({
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => window.scrapbookServer.missing
          ? { error: { message: 'column dashboard_scrapbook_enabled does not exist' } } : { data: row() } }) }) }),
        rpc: async (_name, args) => {
          if (window.scrapbookServer.reject) return { error: { message: 'Only an approved administrator can change the Dashboard theme.' } };
          window.scrapbookServer.enabled = args.p_enabled;
          window.scrapbookServer.revision++;
          return { data: [row()] };
        }
      });
      export const subscribeTable = () => () => {};
    `,
  }));
  await page.goto(base + '/tests/fixtures/dashboard-scrapbook-admin.html', { waitUntil: 'networkidle' });
  const card = page.locator('#settings-dashboard-scrapbook');
  const toggle = card.getByRole('switch');
  await expect(toggle).toBeDisabled();
  await expect(card.getByRole('alert')).toContainText('does not exist');
  // Migration is applied while Settings remains open: focus refresh unlocks
  // the toggle and removes the stale error without a page reload.
  await page.evaluate(() => { window.scrapbookServer.missing = false; window.dispatchEvent(new Event('focus')); });
  await expect(toggle).toBeEnabled();
  await expect(card.getByRole('alert')).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.evaluate(() => { window.scrapbookServer.reject = true; });
  await toggle.click();
  await expect(card.getByRole('alert')).toContainText('approved administrator');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.evaluate(() => { window.scrapbookServer.reject = false; });
  await card.getByRole('button', { name: 'Tải lại cấu hình' }).click();
  await expect(card.getByRole('alert')).toHaveCount(0);

  const inspect = () => card.evaluate(el => {
    const layout = el.querySelector('.dashboard-scrapbook-admin__layout');
    const copy = el.querySelector('.dashboard-scrapbook-admin__copy').getBoundingClientRect();
    const toggle = el.querySelector('[role=switch]').getBoundingClientRect();
    const preview = el.querySelector('.dashboard-scrapbook-admin__preview');
    return {
      display: getComputedStyle(layout).display,
      columns: getComputedStyle(layout).gridTemplateColumns.split(' ').length,
      previewVisible: getComputedStyle(preview).display !== 'none',
      copyTop: copy.top, toggleTop: toggle.top, toggleHeight: toggle.height,
      overflow: el.scrollWidth > el.clientWidth + 1,
    };
  });
  const desktop = await inspect();
  assert.equal(desktop.display, 'grid');
  assert.equal(desktop.columns, 3);
  assert.equal(desktop.previewVisible, true);
  assert.ok(Math.abs(desktop.copyTop - desktop.toggleTop) < 2, 'switch aligns with the heading, not below the text');
  assert.ok(desktop.toggleHeight >= 44, 'toggle has a touch target of at least 44px');
  assert.equal(desktop.overflow, false);
  await page.screenshot({ path: output + '/desktop.png', fullPage: true });

  await page.locator('.settings-launcher-drawer').evaluate(el => { el.style.setProperty('width', '600px', 'important'); });
  const narrowDrawer = await inspect();
  assert.equal(narrowDrawer.columns, 2, 'narrow desktop drawer responds to container width');
  assert.equal(narrowDrawer.previewVisible, false);
  assert.equal(narrowDrawer.overflow, false);
  await page.screenshot({ path: output + '/narrow-drawer.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.settings-launcher-drawer').evaluate(el => { el.style.removeProperty('width'); });
  const mobile = await inspect();
  assert.equal(mobile.columns, 2);
  assert.equal(mobile.previewVisible, false);
  assert.equal(mobile.overflow, false);
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page.screenshot({ path: output + '/mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: real admin panel, portal CSS, wide/narrow/mobile layouts, migration recovery, ON/OFF, rejected save and keyboard toggle.');
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
}
