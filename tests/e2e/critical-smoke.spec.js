import fs from 'node:fs';
import { test, expect } from '@playwright/test';

const CRITICAL_ROUTES = ['#/dashboard', '#/tool/gradebook-studio', '#/settings'];

function captureDiagnostics(page) {
  const pageErrors = [];
  const browserErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error?.message || error)));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    browserErrors.push(text);
    if (text.includes('[AppErrorBoundary]') || /ReferenceError|TypeError|RangeError/i.test(text)) {
      console.log(`[browser-error] ${text}`);
    }
  });
  return { pageErrors, browserErrors };
}

async function dismissOrEnterDemoAdmin(page) {
  const demoAdmin = page.getByRole('button', { name: /Demo Admin/i });
  if (await demoAdmin.isVisible({ timeout: 1200 }).catch(() => false)) {
    await demoAdmin.click();
    await page.waitForTimeout(250);
    return true;
  }
  return false;
}

async function assertHealthyShell(page, diagnostics) {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('#bes-main-content')).toBeVisible();
  await expect(page.locator('#bes-global-wave-loader')).toHaveCount(0);
  const navFailure = page.getByText(/Không thể mở thanh điều hướng|Cannot open navigation/i).first();
  if (await navFailure.isVisible().catch(() => false)) {
    throw new Error(`Navigation boundary opened. pageErrors=${JSON.stringify(diagnostics.pageErrors)} browserErrors=${JSON.stringify(diagnostics.browserErrors)}`);
  }
  await expect(page.locator('body')).not.toContainText(/Application error|Cannot read properties of undefined|ChunkLoadError/i);
}

test('public shell stays healthy without retired global loader', async ({ page }) => {
  const diagnostics = captureDiagnostics(page);
  await page.goto('/#/home');
  await page.waitForTimeout(300);
  await assertHealthyShell(page, diagnostics);
  expect(diagnostics.pageErrors).toEqual([]);
});

for (const route of CRITICAL_ROUTES) {
  test(`${route} boots or falls back safely`, async ({ page }) => {
    const diagnostics = captureDiagnostics(page);

    await page.goto(`/${route}`);
    await dismissOrEnterDemoAdmin(page);
    if (!page.url().includes(route)) await page.goto(`/${route}`);
    await page.waitForTimeout(300);

    await assertHealthyShell(page, diagnostics);
    expect(diagnostics.pageErrors).toEqual([]);
  });
}

test('quick attendance right pane has a real wheel-scroll range without a status banner', async ({ page }) => {
  const baseCss = fs.readFileSync(new URL('../../src/components/GlobalAttendanceNavigationTab.css', import.meta.url), 'utf8');
  const materialCss = fs.readFileSync(new URL('../../src/components/attendance/AttendanceMaterial3.css', import.meta.url), 'utf8');
  const polishCss = fs.readFileSync(new URL('../../public/attendance-ui-polish.css', import.meta.url), 'utf8');
  const launchCss = fs.readFileSync(new URL('../../public/attendance-windows8-launch.css', import.meta.url), 'utf8');
  const rosterRows = Array.from({ length: 26 }, (_, index) => `
    <div class="att-m3-roster-entry">
      <label><span class="attendance-index">${String(index + 1).padStart(2, '0')}</span><div><b>Học sinh ${index + 1}</b><small>HS${index + 1}</small></div><span class="attendance-school-class">10.${(index % 12) + 1}</span><input type="checkbox"></label>
    </div>`).join('');

  await page.setViewportSize({ width: 1536, height: 960 });
  await page.setContent(`<!doctype html><html><head><style>${baseCss}\n${materialCss}\n${polishCss}\n${launchCss}</style></head><body>
    <div class="attendance-layer">
      <section class="attendance-shell">
        <header class="attendance-topbar"><div class="attendance-title"><strong>Điểm danh</strong></div></header>
        <nav class="attendance-tabs"><button class="is-active">Điểm danh nhanh</button></nav>
        <main class="attendance-content">
          <div class="attendance-quick-layout">
            <aside class="attendance-class-list"><header><strong>Lớp đang hoạt động</strong></header><div class="att-m3-class-discovery"></div><div></div></aside>
            <section class="attendance-rollcall">
              <header class="attendance-rollcall-head"><div><h2>Phụ đạo Tiếng Anh 10</h2></div><div class="attendance-summary"><b>26/26</b><span>Có mặt</span><em>0 vắng</em></div></header>
              <div class="attendance-session-controls"><label><span>Ngày điểm danh</span><input value="09/09/2026"></label><label><span>Giáo viên</span><input value="GV"></label><div class="att-m3-period-field"><span>Số tiết</span></div></div>
              <div class="attendance-roster-head"><span>Học sinh</span><span>Lớp chính khóa</span><span>Vắng</span></div>
              <div class="attendance-roster">${rosterRows}</div>
              <section class="att-m3-proof-card"><strong>Minh chứng hình ảnh</strong></section>
              <footer class="attendance-confirm-bar"><label><span>Ghi chú</span><input></label><button>Xác nhận điểm danh</button></footer>
            </section>
          </div>
        </main>
      </section>
    </div>
  </body></html>`);

  const scroller = page.locator('.attendance-rollcall');
  const metrics = await scroller.evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(metrics.overflowY).toBe('auto');
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

  await scroller.hover();
  await page.mouse.wheel(0, 640);
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});
