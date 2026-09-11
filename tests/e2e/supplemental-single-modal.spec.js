import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = [
  fs.readFileSync(path.join(root, 'src/components/GlobalAttendanceNavigationTab.css'), 'utf8'),
  fs.readFileSync(path.join(root, 'src/styles/SupplementalLearning.css'), 'utf8'),
  fs.readFileSync(path.join(root, 'src/styles/SupplementalLearningAdminCompleteness.css'), 'utf8'),
  fs.readFileSync(path.join(root, 'src/styles/SupplementalSingleModal.css'), 'utf8'),
].join('\n');
const bridge = fs.readFileSync(path.join(root, 'src/supplementalSingleModalBridge.js'), 'utf8')
  .replace(/^import\s+['"].*?['"];?\s*$/m, '')
  .replace(/export\s*\{[^}]*\};?\s*$/m, '');

async function setup(page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setContent(`
    <div class="attendance-layer">
      <section class="attendance-shell" role="dialog" aria-modal="true" aria-label="Điểm danh lớp phụ đạo và bồi dưỡng học sinh giỏi">
        <header class="attendance-topbar"><strong>Điểm danh lớp phụ đạo &amp; bồi dưỡng</strong></header>
        <nav class="attendance-tabs">
          <button type="button" class="is-active">Lịch điểm danh</button>
          <button type="button" class="bes-supplemental-nav-tab">Học bổ sung</button>
          <button type="button">Lịch sử</button>
          <button type="button">Báo cáo</button>
        </nav>
        <main class="attendance-content"><section data-native-content>Native Attendance content</section></main>
      </section>
    </div>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bridge });
}

test.describe('Supplemental single-modal bridge', () => {
  test('Admin workspace is moved into Attendance content without a second dialog/backdrop', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'bes-supplemental-learning-admin';
      host.innerHTML = `<div class="bes-supplemental-backdrop"></div><section class="bes-supplemental-dialog" role="dialog" aria-modal="true"><header class="bes-supplemental-dialog-head"><h2>Học bổ sung</h2><button data-action="close">×</button></header><main>Admin content</main></section>`;
      document.body.append(host);
    });

    const host = page.locator('.attendance-content > #bes-supplemental-learning-admin');
    await expect(host).toHaveCount(1);
    await expect(page.locator('#bes-supplemental-learning-admin .bes-supplemental-backdrop')).toHaveCount(0);
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    await expect(page.locator('.attendance-tabs')).toBeVisible();
    await expect(page.locator('[data-native-content]')).toBeHidden();
    expect(await page.locator('.bes-supplemental-admin-workspace').evaluate((node) => getComputedStyle(node).position)).toBe('relative');
  });

  test('supplemental rollcall replaces only Attendance content and keeps the native shell', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'bes-supplemental-rollcall';
      host.innerHTML = `<div class="bes-supplemental-backdrop"></div><section class="bes-supplemental-rollcall" role="dialog" aria-modal="true"><header><h2>Bù bài toán 12</h2><button data-rollcall-close>×</button></header><main>2 học sinh</main><footer><button data-rollcall-close>Thoát</button></footer></section>`;
      document.body.append(host);
    });

    await expect(page.locator('.attendance-content > #bes-supplemental-rollcall')).toHaveCount(1);
    await expect(page.locator('#bes-supplemental-rollcall .bes-supplemental-backdrop')).toHaveCount(0);
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    await expect(page.locator('.attendance-topbar')).toBeVisible();
    await expect(page.locator('.attendance-tabs')).toBeVisible();
    expect(await page.locator('.bes-supplemental-rollcall-workspace').evaluate((node) => getComputedStyle(node).position)).toBe('relative');
  });

  test('filtered supplemental History/Report stays inline and clears legacy body backdrop state', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => {
      document.body.classList.add('bes-supplemental-report-exclusive');
      const panel = document.createElement('section');
      panel.id = 'bes-supplemental-reporting-panel';
      panel.className = 'bes-supplemental-reporting-panel is-exclusive';
      panel.innerHTML = '<header class="bes-supplemental-reporting-head"><h2>Lịch sử Học bổ sung</h2></header><main>History content</main>';
      document.querySelector('.attendance-shell').append(panel);
    });

    await expect(page.locator('.attendance-content > #bes-supplemental-reporting-panel')).toHaveCount(1);
    await expect(page.locator('body')).not.toHaveClass(/bes-supplemental-report-exclusive/);
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    await expect(page.locator('.attendance-tabs')).toBeVisible();
    expect(await page.locator('.bes-supplemental-reporting-workspace').evaluate((node) => getComputedStyle(node).position)).toBe('relative');
  });
});
