import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const cssPaths = [
  '../../src/styles/GradebookStudio.css',
  '../../src/styles/GradebookLifecycle.css',
  '../../src/styles/GradebookAcademicWorkspace.css',
  '../../src/styles/GradebookSpectrumV4.css',
  '../../src/styles/GradebookRosterLayoutHotfix.css',
];
const css = cssPaths.map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const content = `<!doctype html><html lang="vi"><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;font-family:Arial,sans-serif;background:#f4f7fb}
</style><div id="root"><main class="page hr-page gradebook-studio gb4-spectrum gb4-palette-electric"
style="margin:0 auto;width:100%;max-width:100%;padding:12px">
<div class="hr-gradebook" style="min-width:0;width:100%">
<section class="gb-roster-workbench" aria-label="Không gian nhập điểm">
 <div class="gb-roster-workbench-main">
  <label class="gb-roster-search"><svg class="gb-roster-search-icon" width="18" height="18"></svg>
    <span class="sr-only">Tìm học sinh theo tên hoặc mã</span>
    <input type="search" placeholder="Tìm tên hoặc mã HS… (nhấn /)" aria-label="Tìm học sinh" /></label>
  <label class="gb-roster-missing"><input type="checkbox" /><span>Chỉ học sinh còn thiếu điểm</span></label>
  <label class="gb-roster-sort"><span>Sắp xếp</span><select aria-label="Sắp xếp"><option>Thứ tự lớp</option></select></label>
  <span class="gb-roster-count">29/29 học sinh</span>
  <span class="gb-roster-progress"><span class="gb-roster-progress-track"><span style="width:60%"></span></span><small>20/29 đã có điểm</small></span>
 </div>
 <div class="gb-roster-workbench-side"><span class="gb-roster-keyboard-hint">Enter: chuyển hàng · ⌥←→: chuyển ô</span>
 <button type="button" class="gb-roster-next-empty">Ô trống tiếp theo</button>
 <button type="button" class="gb-roster-density">Bảng gọn</button>
 <button type="button" class="gb-roster-focus">Chế độ tập trung</button></div>
</section>
</div></main></div></html>`;

test('Roster controls remain horizontal and compact at desktop, tablet, mobile and zoom', async ({ page }) => {
  for (const [width, height] of [[1440,900],[1280,800],[1024,768],[768,960],[390,844]]) {
    await page.setViewportSize({ width, height });
    await page.setContent(content);
    await page.addStyleTag({ content: css });
    const bounds = await page.evaluate(() => {
      const names = ['.gb-roster-workbench','.gb-roster-workbench-main','.gb-roster-missing','.gb-roster-missing > span','.gb-roster-search','.gb-roster-sort','.gb-roster-workbench-side'];
      const data = Object.fromEntries(names.map(name => {
        const el = document.querySelector(name), r = el.getBoundingClientRect();
        return [name, { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right }];
      }));
      const label = document.querySelector('.gb-roster-missing > span');
      return { data, font:getComputedStyle(label).fontSize, writingMode:getComputedStyle(label).writingMode, whiteSpace:getComputedStyle(label).whiteSpace };
    });
    const a = bounds.data;
    expect(a['.gb-roster-workbench'].height, 'huge blank workbench at '+width).toBeLessThan(width > 850 ? 260 : width > 620 ? 340 : 520);
    expect(a['.gb-roster-missing > span'].height, 'vertical label at '+width).toBeLessThan(52);
    expect(a['.gb-roster-missing > span'].width, 'narrow label at '+width).toBeGreaterThan(width > 375 ? 155 : 125);
    expect(a['.gb-roster-search'].width, 'collapsed search at '+width).toBeGreaterThan(180);
    expect(a['.gb-roster-sort'].width, 'collapsed select at '+width).toBeGreaterThan(170);
    expect(a['.gb-roster-missing'].right).toBeLessThanOrEqual(width + 2);
    expect(bounds.writingMode).toBe('horizontal-tb');
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setContent(content);
  await page.addStyleTag({ content: css });
  await page.evaluate(() => { document.querySelector('#root').style.zoom = '1.25'; });
  const zoom = await page.locator('.gb-roster-missing > span').boundingBox();
  const box = await page.locator('.gb-roster-workbench').boundingBox();
  expect(zoom?.height).toBeLessThan(60);
  expect(box?.height).toBeLessThan(400);
});
