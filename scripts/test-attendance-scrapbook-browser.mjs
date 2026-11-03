import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build, preview } from 'vite';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:5199';
const outDir = mkdtempSync(join(tmpdir(), 'attendance-scrapbook-browser-'));
const output = 'test-results/attendance-scrapbook';
mkdirSync(output, { recursive: true });
let browser, page, server;
// Bundle the actual directory, footer and Settings card exactly as a release.
// Replace only their database transport, and only for this fixture build.
const fixtureRuntime = `
    const row = () => ({ attendance_scrapbook_enabled: window.attendanceServer.enabled, dashboard_scrapbook_enabled: true,
      halloween_home_enabled: false, halloween_footer_enabled: false, november_home_enabled: true,
      november_avatar_url: '', updated_at: new Date(1793600000000 + window.attendanceServer.revision * 1000).toISOString() });
    export const getRuntimeClient = () => ({ from: () => ({ select: columns => ({ eq: () => ({ maybeSingle: async () =>
      window.attendanceServer.missing && columns.includes('attendance_scrapbook_enabled')
        ? { error: { message: 'column attendance_scrapbook_enabled does not exist' } } : { data: row() } }) }) }),
      rpc: async (name, args) => {
        if (name !== 'bes_set_attendance_scrapbook_enabled') throw Error('Unexpected RPC: ' + name);
        if (window.attendanceServer.reject) return { error: { message: 'Only an approved administrator can change the Attendance theme.' } };
        window.attendanceServer.enabled = args.p_enabled; window.attendanceServer.revision++;
        return { data: [row()] };
      }
    });
    export const subscribeTable = options => {
      if (options.key === 'attendance-scrapbook-v1') window.attendanceRealtime = enabled => {
        window.attendanceServer.enabled = enabled; window.attendanceServer.revision++; options.onChange({ new: row() });
      };
      return () => {};
    };
  `;
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
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
  page.on('requestfailed', request => console.error('Request failed:', request.url(), request.failure()?.errorText));
  await page.addInitScript(() => {
    window.attendanceServer = { missing: true, enabled: false, reject: false, revision: 1 };
    window.open = url => { window.lastOpenedApp = url; };
  });
  await page.goto(base + '/tests/fixtures/attendance-scrapbook.html', { waitUntil: 'networkidle' });
  assert.deepEqual(errors, []);
  const toggle=page.getByRole('switch'), shell=page.locator('.app-shell'), hero=page.locator('.attendance-topbar');
  const backdrop=()=>hero.evaluate(el=>getComputedStyle(el).backgroundImage);
  const baseline=await backdrop();
  await expect(toggle).toBeDisabled();
  await page.evaluate(()=>{window.attendanceServer.missing=false;window.dispatchEvent(new Event('focus'));});
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(shell).toHaveAttribute('data-attendance-scrapbook','on');
  assert.match(await backdrop(),/sky.svg/);
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:900});
    const tiles=page.locator('.awu-feature-tile');
    await expect(tiles).toHaveCount(6);
    for(const kind of ['quick','calendar','manage','history','supplemental','report']){
      await page.locator('.awu-feature-tile.is-'+kind).click();
      await expect(page.locator('[data-view]')).toHaveAttribute('data-view',kind);
      if(kind==='supplemental') assert.match(await page.locator('.bes-supplemental-editor-card').evaluate(el=>getComputedStyle(el).backgroundImage),/paper-grain/);
    }
    assert.ok(await tiles.evaluateAll(els=>els.every(el=>{const b=el.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1;})));
    await page.screenshot({path:output+'/'+width+'.png',fullPage:true});
  }
  await page.getByLabel('Ghi chú').fill('draft');
  await page.getByRole('button',{name:'Change route'}).click();
  await expect(shell).toHaveAttribute('data-attendance-scrapbook','off');
  await page.getByRole('button',{name:'Change route'}).click();
  await expect(shell).toHaveAttribute('data-attendance-scrapbook','on');
  await toggle.click();
  await expect(shell).toHaveAttribute('data-attendance-scrapbook','off');
  assert.equal(await backdrop(),baseline);
  await expect(page.getByLabel('Ghi chú')).toHaveValue('draft');
  assert.deepEqual(errors,[]);
} finally {
  await browser?.close(); await server?.close(); rmSync(outDir,{recursive:true,force:true});
}
