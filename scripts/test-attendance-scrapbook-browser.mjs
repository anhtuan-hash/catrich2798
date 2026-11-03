import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build, preview } from 'vite';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:5199';
const outDir = mkdtempSync(join(tmpdir(), 'attendance-scrapbook-browser-'));
const output = 'test-results/attendance-scrapbook';
mkdirSync(output, { recursive: true });
let browser, page, server;
// Only this fixture build serves a generated roster and test settings. Production
// imports the real database client and the normal authentication flow.
const fixtureRuntime = readFileSync(new URL('../tests/fixtures/attendance-scrapbook.runtime.js', import.meta.url), 'utf8');
const fixtureUrl = base + '/tests/fixtures/attendance-scrapbook.html';

try {
  await build({
    mode: 'test',
    logLevel: 'warn',
    define: { 'import.meta.env.VITE_SUPABASE_URL': "''", 'import.meta.env.VITE_SUPABASE_ANON_KEY': "''" },
    plugins: [{ name: 'attendance-fixture-runtime', enforce: 'pre', transform(_source, id) {
      if (id.endsWith('/src/services/runtime/core.js')) return fixtureRuntime;
    } }],
    build: { outDir, emptyOutDir: true, rollupOptions: { input: resolve('tests/fixtures/attendance-scrapbook.html') } },
  });
  server = await preview({ logLevel: 'warn', build: { outDir }, preview: { host: '127.0.0.1', port: 5199, strictPort: true } });
  browser = await chromium.launch({ headless: true });
  const errors = [];
  async function open(width, query = '') {
    page = await browser.newPage({ viewport: { width, height: 925 } });
    page.setDefaultTimeout(9000);
    await page.clock.setFixedTime(new Date('2026-11-03T09:45:00Z'));
    page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
    // No external service is necessary for this suite.
    await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    await page.addInitScript(() => {
      const recovery = location.search.includes('recovery');
      window.attendanceServer = { missing: recovery, enabled: !recovery, reject: false, revision: 1 };
    });
    await page.goto(fixtureUrl + query + '#/attendance?tab=quick', {waitUntil:'networkidle'});
    await page.waitForFunction(() => Boolean(window.attendanceFixture));
  }
  const settings = visible => page.evaluate(value => window.attendanceFixture.showSettings(value), visible);
  function switchControl(){return page.locator('#settings-attendance-scrapbook').getByRole('switch');}
  async function flip(on) {
    await settings(true);
    await switchControl().click();
    await expect(page.locator('.app-shell')).toHaveAttribute('data-attendance-scrapbook',on?'on':'off');
    await settings(false);
  }
  async function snap(name, width) {
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({ path:output+'/'+name+'-'+width+'.jpg',type:'jpeg',quality:82,fullPage:true, animations:'disabled' });
  }
  const go = name => page.locator('.awu-feature-tile.is-'+name).click();
  const heroImage = () => page.locator('.attendance-topbar').evaluate(el=>getComputedStyle(el).backgroundImage);

  await open(1280,'?recovery=1');
  const baseline = await heroImage();
  await settings(true);
  await expect(switchControl()).toBeDisabled();
  await page.evaluate(()=>{window.attendanceServer.missing=false;window.dispatchEvent(new Event('focus'));});
  await expect(switchControl()).toBeEnabled();
  await switchControl().click();
  await expect(switchControl()).toHaveAttribute('aria-checked','true');
  await page.evaluate(()=>{window.attendanceServer.reject=true;});
  await switchControl().click();
  await expect(page.locator('#settings-attendance-scrapbook [role=alert]')).toContainText('admin');
  await expect(switchControl()).toHaveAttribute('aria-checked','true');
  await page.evaluate(()=>{window.attendanceServer.reject=false;});
  await settings(false);
  await expect(page.locator('.att-m3-roster-entry').first()).toBeVisible();
  const note=page.locator('.attendance-confirm-bar input');
  await note.fill('Ghi chú đang soạn');
  const late=page.locator('.att-m3-roster-entry').first().locator('[data-status=late]');
  await late.click();
  await flip(false);
  assert.equal(await heroImage(),baseline);
  await expect(late).toHaveClass(/is-active/);
  await expect(note).toHaveValue('Ghi chú đang soạn');
  await flip(true);
  await expect(note).toHaveValue('Ghi chú đang soạn');
  await page.close();

  for(const width of [1280,390]) {
    await open(width);
    await expect(page.locator('.app-shell')).toHaveAttribute('data-attendance-scrapbook','on');
    await expect(page.locator('.att-m3-roster-entry').first()).toBeVisible();
    await expect(page.locator('.awu-feature-tile')).toHaveCount(6);
    assert.ok(await page.locator('.awu-feature-tile').evaluateAll(tiles=>tiles.every(t=>{const r=t.getBoundingClientRect();return r.left>=-1 && r.right<=innerWidth+1;})), 'six accessible destinations at '+width);
    assert.match(await heroImage(),/sky.svg/);
    await snap('01-roll-call',width);

    await go('calendar');
    await expect(page.locator('.attendance-daily-class-row').first()).toBeVisible();
    await snap('02-schedule',width);
    const rooms=page.locator('.attendance-calendar-room-chip');
    if(await rooms.count()>1){
      await rooms.nth(1).click();await expect(rooms.nth(1)).toHaveClass(/is-active/);
      await rooms.first().click();
    }

    await go('manage');
    const geo=page.locator('.attendance-manage-class-tile.is-subject-geography');
    await expect(geo).toBeVisible();
    assert.match(await geo.locator('.attendance-manage-tile__topline').evaluate(el=>getComputedStyle(el,'::after').backgroundImage),/classroom-stickers/);
    await snap('03-class-directory',width);
    await geo.click();
    await expect(page.locator('.attendance-manage-detail-roster-card')).toBeVisible();
    await snap('04-class-detail',width);

    await go('report');
    await expect(page.locator('.att-report-m3__metrics > article')).toHaveCount(4);
    await expect(page.locator('.att-report-m3__detail-surface tbody tr').first()).toBeVisible();
    await snap('05-report',width);

    await go('supplemental');
    const host=page.locator('#bes-supplemental-learning-admin');
    await expect(host.locator('.bes-supplemental-empty-state')).toBeVisible();
    await snap('06-supplemental-directory',width);
    await host.locator('[data-action=create-class]').click();
    const className=host.locator('[name=className]');
    await expect(className).toBeVisible();
    const actions = host.locator('.bes-supplemental-savebar');
    const [saveBar, firstField] = await Promise.all([actions.boundingBox(), className.boundingBox()]);
    assert.ok(saveBar && firstField && saveBar.y + saveBar.height <= firstField.y, 'save actions sit above the fields at '+width);
    await className.fill('Lớp đang soạn');
    await flip(false);
    await expect(className).toHaveValue('Lớp đang soạn');
    await flip(true);
    await expect(className).toHaveValue('Lớp đang soạn');
    await snap('07-supplemental-form',width);

    await go('history');
    await expect(host).toHaveCount(0);
    await expect(page).toHaveURL(/#\/attendance\?tab=history$/);
    const session=page.locator('.ahv3__items > button').first();
    const closeSheet = page.getByRole('button', {name:'Đóng chi tiết', exact:true});
    if (width === 390 && await closeSheet.isVisible()) await closeSheet.click();
    await expect(session).toBeVisible();
    await session.click();
    await expect(page.locator('.ahv3__info-grid')).toBeVisible();
    await expect(page.locator('.ahv3__detail')).toContainText('Buổi học minh họa.');
    await snap('08-history',width);
    await page.evaluate(()=>window.attendanceFixture.setRoute('home'));
    await expect(page.locator('html')).toHaveAttribute('data-attendance-scrapbook','off');
    await page.close();
  }
  await open(768,'?role=teacher');
  await expect(page.locator('.awu-feature-tile.is-calendar')).toBeVisible();
  await expect(page.locator('.awu-feature-tile.is-manage')).toHaveCount(0);
  await settings(true);
  await expect(switchControl()).toHaveCount(0);
  await page.close();

  await open(390,'?role=guest');
  await expect(page.locator('.gas-hero')).toBeVisible();
  assert.match(await page.locator('.gas-hero').evaluate(el=>getComputedStyle(el).backgroundImage),/sky.svg/);
  await expect(page.locator('.attendance-confirm-bar')).toHaveCount(0);
  assert.deepEqual(errors,[]);
  console.log('PASS: eight real attendance views on desktop and phone, role restrictions, rejected saves, route isolation, roll-call and supplemental drafts survive ON/OFF.');
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({path:output+'/failure.jpg',type:'jpeg',quality:80,fullPage:true});
    writeFileSync(output+'/failure.txt',await page.locator('body').innerText());
  }
  throw error;
} finally {
  await browser?.close(); await server?.close(); rmSync(outDir,{recursive:true,force:true});
}
