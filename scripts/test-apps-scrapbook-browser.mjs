import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:5199';
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5199', '--strictPort'], { stdio: 'pipe', env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' } });
let browser, page, log = '';
vite.stderr.on('data', chunk => { log += String(chunk); });
const output = 'test-results/apps-scrapbook';
mkdirSync(output, { recursive: true });
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (vite.exitCode !== null) throw new Error(log);
    try { if ((await fetch(base + '/tests/fixtures/apps-scrapbook.html')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'fixture server is ready');
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.appsServer = { missing: true, enabled: false, reject: false, revision: 1 };
    window.open = url => { window.lastOpenedApp = url; };
  });
  // Test-only transport: real components, store, scope hook and launcher logic.
  // No test identity or mock is shipped in the production application.
  await page.route('**/src/services/runtime/core.js*', route => route.fulfill({ contentType: 'text/javascript', body: `
    const row = () => ({ apps_scrapbook_enabled: window.appsServer.enabled, dashboard_scrapbook_enabled: true,
      halloween_home_enabled: false, halloween_footer_enabled: false, november_home_enabled: true,
      november_avatar_url: '', updated_at: new Date(1793600000000 + window.appsServer.revision * 1000).toISOString() });
    export const getRuntimeClient = () => ({ from: () => ({ select: columns => ({ eq: () => ({ maybeSingle: async () =>
      window.appsServer.missing && columns.includes('apps_scrapbook_enabled')
        ? { error: { message: 'column apps_scrapbook_enabled does not exist' } } : { data: row() } }) }) }),
      rpc: async (name, args) => {
        if (name !== 'bes_set_apps_scrapbook_enabled') throw Error('Unexpected RPC: ' + name);
        if (window.appsServer.reject) return { error: { message: 'Only an approved administrator can change the Apps theme.' } };
        window.appsServer.enabled = args.p_enabled; window.appsServer.revision++;
        return { data: [row()] };
      }
    });
    export const subscribeTable = options => {
      if (options.key === 'apps-scrapbook-v1') window.appsRealtime = enabled => {
        window.appsServer.enabled = enabled; window.appsServer.revision++; options.onChange({ new: row() });
      };
      return () => {};
    };
  ` }));
  await page.goto(base + '/tests/fixtures/apps-scrapbook.html', { waitUntil: 'networkidle' });
  const card = page.locator('#settings-apps-scrapbook');
  const toggle = card.getByRole('switch');
  const shell = page.locator('.app-shell');
  const grid = page.locator('#apps-directory-grid');
  const baseline = await grid.evaluate(el => ({ background: getComputedStyle(el).backgroundImage, columns: getComputedStyle(el).gridTemplateColumns, count: el.querySelectorAll('.editorial-app-card').length }));
  await expect(toggle).toBeDisabled();
  await expect(card.getByRole('alert')).toContainText('does not exist');
  await page.evaluate(() => { window.appsServer.missing = false; window.dispatchEvent(new Event('focus')); });
  await expect(toggle).toBeEnabled();
  await expect(card.getByRole('alert')).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(shell).toHaveAttribute('data-apps-scrapbook', 'on');
  await expect(page.locator('.apps-scrapbook-footer-motto')).toHaveCount(1);
  const adminLayout = await card.evaluate(el => {
    const copy = el.querySelector('.apps-scrapbook-admin__copy').getBoundingClientRect();
    const toggle = el.querySelector('[role=switch]').getBoundingClientRect();
    return { aligned: Math.abs(copy.top - toggle.top) < 2, height: toggle.height, overflow: el.scrollWidth > el.clientWidth + 1 };
  });
  assert.ok(adminLayout.aligned && adminLayout.height >= 44 && !adminLayout.overflow);
  await page.screenshot({ path: output + '/admin-desktop.png', fullPage: true });
  await page.evaluate(() => window.appsFixture.setSettings(false));
  await expect(card).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await grid.locator('.editorial-app-card').count(), baseline.count);
  const desktop = await grid.evaluate(el => ({ columns: getComputedStyle(el).gridTemplateColumns.split(' ').length, background: getComputedStyle(el).backgroundImage }));
  assert.equal(desktop.columns, 5);
  assert.match(desktop.background, /paper-grain/);
  await page.screenshot({ path: output + '/desktop-on.png', fullPage: true });

  // Existing app filters, launch and edit/pin/save operate on the same cards.
  const hero = page.locator('.editorial-apps-hero');
  const pinnedBefore = await grid.locator('[data-app-pinned=true]').count();
  await hero.locator('.editorial-apps-stat.is-pinned').click();
  await expect(grid.locator('.editorial-app-card:visible')).toHaveCount(pinnedBefore);
  await hero.getByRole('button', { name: 'Dùng chung', exact: true }).click();
  await expect(grid.locator('.editorial-app-card:visible')).toHaveCount(1);
  await grid.locator('[data-launcher-item=shared-test] .editorial-app-card-main').click();
  assert.equal(await page.evaluate(() => window.lastOpenedApp), 'https://example.com/teacher');
  await hero.getByRole('button', { name: 'Xem toàn bộ ứng dụng', exact: true }).click();
  await expect(grid.locator('.editorial-app-card:visible')).toHaveCount(baseline.count);
  await hero.locator('.is-secondary').click();
  await expect(page.locator('.apps-directory-native')).toHaveClass(/is-launcher-edit-mode/);
  const editCard = grid.locator('[data-launcher-item=shared-test]');
  await editCard.locator('.editorial-app-card-admin button').first().click();
  await expect(editCard).toHaveAttribute('data-app-pinned', 'true');
  const bounds = await editCard.evaluate(el => { const a = el.querySelector('.editorial-app-card-admin').getBoundingClientRect(); const c = el.getBoundingClientRect(); return { fits: a.bottom <= c.bottom && a.height > 0 }; });
  assert.ok(bounds.fits, 'editing controls fit within the card');
  await hero.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.locator('.apps-directory-native')).not.toHaveClass(/is-launcher-edit-mode/);
  const savedLauncher = await page.evaluate(() => localStorage.getItem('bes-launcher-config-v4'));
  assert.ok(JSON.parse(savedLauncher).pinned.includes('shared-test'));

  // ON/OFF is lossless and cannot leak into Dashboard/Home.
  await page.evaluate(() => window.appsFixture.setSettings(true));
  await toggle.click();
  await expect(shell).toHaveAttribute('data-apps-scrapbook', 'off');
  await expect(page.locator('.apps-scrapbook-footer-motto')).toHaveCount(0);
  const restored = await grid.evaluate(el => ({ background: getComputedStyle(el).backgroundImage, columns: getComputedStyle(el).gridTemplateColumns, count: el.querySelectorAll('.editorial-app-card').length }));
  assert.deepEqual(restored, baseline);
  assert.equal(await page.evaluate(() => localStorage.getItem('bes-launcher-config-v4')), savedLauncher);
  await page.evaluate(() => window.appsServer.reject = true);
  await toggle.click();
  await expect(card.getByRole('alert')).toContainText('approved administrator');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.evaluate(() => { window.appsServer.reject = false; window.appsFixture.setSettings(false); });
  await page.screenshot({ path: output + '/desktop-off.png', fullPage: true });
  await page.evaluate(() => window.appsRealtime(true));
  await expect(shell).toHaveAttribute('data-apps-scrapbook', 'on');
  for (const otherRoute of ['dashboard', 'home']) {
    await page.evaluate(route => window.appsFixture.setRoute(route), otherRoute);
    await expect(shell).toHaveAttribute('data-apps-scrapbook', 'off');
    await expect(page.locator('.apps-scrapbook-footer-motto')).toHaveCount(0);
  }
  await page.evaluate(() => window.appsFixture.setRoute('apps'));
  await expect(shell).toHaveAttribute('data-apps-scrapbook', 'on');
  for (const [width, columns] of [[918, 5], [768, 3], [390, 2], [320, 1]]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
    const dimensions = await page.evaluate(() => {
      const hero = document.querySelector('.editorial-apps-hero').getBoundingClientRect();
      const grid = document.querySelector('#apps-directory-grid').getBoundingClientRect();
      const stats = [...document.querySelectorAll('.editorial-apps-stat')].map(el => el.getBoundingClientRect());
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, separated: hero.bottom <= grid.top, statsFit: stats.every(r => r.left >= 0 && r.right <= innerWidth) };
    });
    assert.deepEqual(dimensions, { overflow: false, separated: true, statsFit: true }, String(width));
    await page.screenshot({ path: output + '/on-' + width + '.png', fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.appsFixture.setSettings(true));
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.screenshot({ path: output + '/admin-mobile.png', fullPage: true });
  await page.evaluate(() => { window.appsFixture.setUser(null); window.appsFixture.setSettings(false); window.appsRealtime(true); });
  await expect(hero.locator('.is-secondary')).toHaveCount(0);
  await expect(page.locator('[data-public-readonly-apps=true]')).toHaveCount(1);
  await page.evaluate(() => { window.appsFixture.setUser({ role: 'teacher', provider: 'supabase', approved: true }); window.appsFixture.setSettings(true); });
  await expect(card).toHaveCount(0);
  assert.ok(await grid.locator('.is-locked').count() > 0, 'teacher app permissions are still enforced');
  await page.evaluate(() => { window.appsFixture.setSettings(false); window.appsFixture.setLanguage('en'); });
  await expect(hero.getByRole('heading')).toContainText('Teacher app');
  await page.screenshot({ path: output + '/teacher-en-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: Apps skin ON/OFF, exact baseline restoration, migration recovery, rejected saves, realtime, route isolation, native launch/filter/pin/save, guest/teacher access and desktop/tablet/mobile layout.');
} catch (error) {
  if (page) { await page.screenshot({ path: output + '/failure.png', fullPage: true }); writeFileSync(output + '/failure.html', await page.content()); }
  throw error;
} finally {
  await browser?.close(); vite.kill('SIGTERM');
}
