import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build, preview } from 'vite';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:5199';
const outDir = mkdtempSync(join(tmpdir(), 'apps-scrapbook-browser-'));
const output = 'test-results/apps-scrapbook';
mkdirSync(output, { recursive: true });
let browser, page, server;
// Bundle the actual directory, footer and Settings card exactly as a release.
// Replace only their database transport, and only for this fixture build.
const fixtureRuntime = `
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
  `;
try {
  await build({
    mode: 'test',
    logLevel: 'warn',
    define: { 'import.meta.env.VITE_SUPABASE_URL': "''", 'import.meta.env.VITE_SUPABASE_ANON_KEY': "''" },
    plugins: [{ name: 'apps-fixture-runtime', enforce: 'pre', transform(_source, id) {
      if (id.endsWith('/src/services/runtime/core.js')) return fixtureRuntime;
    } }],
    build: { outDir, emptyOutDir: true, rollupOptions: { input: resolve('tests/fixtures/apps-scrapbook.html') } },
  });
  server = await preview({ logLevel: 'warn', build: { outDir }, preview: { host: '127.0.0.1', port: 5199, strictPort: true } });
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
  page.on('requestfailed', request => console.error('Request failed:', request.url(), request.failure()?.errorText));
  await page.addInitScript(() => {
    window.appsServer = { missing: true, enabled: false, reject: false, revision: 1 };
    window.open = url => { window.lastOpenedApp = url; };
  });
  await page.goto(base + '/tests/fixtures/apps-scrapbook.html', { waitUntil: 'networkidle' });
  assert.deepEqual(errors, [], 'fixture mounted without module or render errors');
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
  const logos = await page.locator('.signature-footer-v50-affiliations > img').evaluateAll(images => images.map(image => {
    const rect = image.getBoundingClientRect();
    return { top: rect.top, left: rect.left, right: rect.right, height: rect.height };
  }));
  assert.ok(logos.length === 2 && logos[0].right < logos[1].left && Math.abs(logos[0].top - logos[1].top) < 5 && logos.every(logo => logo.height <= 80 && logo.height > 20), 'affiliation logos share a compact horizontal row');
  const approved = grid.locator('.external-approved-app');
  assert.match(await approved.evaluate(el => getComputedStyle(el).backgroundImage), /paper-grain/);
  await approved.getByRole('button').click();
  assert.equal(await page.evaluate(() => window.lastApprovedApp), 'approved-worksheet');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: output + '/desktop-on.png', fullPage: true });

  // Existing app filters, launch and edit/pin/save operate on the same cards.
  const hero = page.locator('.editorial-apps-hero');
  const pinnedBefore = await grid.locator('[data-app-pinned=true]').count();
  await hero.locator('.editorial-apps-stat.is-pinned').click();
  await expect(approved).toBeHidden();
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
      const art = document.querySelector('.editorial-apps-illustration');
      const artRect = art.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        separated: hero.bottom <= grid.top,
        statsFit: stats.every(r => r.left >= 0 && r.right <= innerWidth) && stats[0].bottom < stats[1].top && stats[1].bottom < stats[2].top,
        artVisible: artRect.width >= 90 && artRect.height >= 150 && getComputedStyle(art, '::after').backgroundImage.includes('teacher-toolkit.webp'),
      };
    });
    assert.deepEqual(dimensions, { overflow: false, separated: true, statsFit: true, artVisible: true }, String(width));
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
  await browser?.close(); await server?.close(); rmSync(outDir, { recursive: true, force: true });
}
