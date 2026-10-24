import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const css = ['BrianFocus.css', 'BrianFocusCosmic.css'].map(name => readFileSync(new URL('../../src/components/BrianFocus/'+name, import.meta.url),'utf8')).join('\n');
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 740 },
]) {
  test(`ambient Focus clock fits ${viewport.width} x ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.setContent(`<main id="root"><button id="dashboard" style="position:fixed;top:100px;left:40px">Dashboard</button></main>
      <div class="bfc-overlay" role="dialog" aria-modal="true" aria-label="Chế độ tập trung Brian Focus">
        <div class="bfc-cosmos" aria-hidden="true">
          <div class="bfc-cosmos__nebula bfc-cosmos__nebula--a"></div>
          <div class="bfc-cosmos__planet bfc-cosmos__planet--left"></div>
          <div class="bfc-cosmos__stars"><span class="bfc-cosmos__star" style="left:30%;top:20%"></span></div>
        </div>
        <button type="button" class="bfc-overlay__close"><span>Đóng</span><kbd>Esc</kbd></button>
        <div class="bfc-overlay__center">
          <div class="bfc-clock-card">
            <div class="bfc-clock-card__glint"></div>
            <div class="bfc-clock-card__eyebrow"><span>CHẾ ĐỘ TẬP TRUNG</span></div>
            <div class="bfc-clock-face">
              <div class="bfc-clock-face__digits">
                <span class="bfc-clock-face__tile">09</span>
                <span class="bfc-clock-face__colon">:</span>
                <span class="bfc-clock-face__tile">12</span>
              </div>
            </div>
            <div class="bfc-clock-date">Thứ Bảy, 24 tháng 10, 2026</div>
            <div class="bfc-clock-card__rule"></div>
            <div class="bfc-weather">
              <span class="bfc-weather__icon">☀</span>
              <span class="bfc-weather__details"><span class="bfc-weather__city">TP. Hồ Chí Minh</span><span class="bfc-weather__condition">Ít mây</span></span>
              <span class="bfc-weather__temp">26°C</span><button class="bfc-weather__refresh" aria-label="Cập nhật thời tiết">↻</button>
            </div>
            <p class="bfc-clock-card__hint">Một khoảnh khắc bình yên để tập trung.</p><div class="bfc-clock-card__accent"></div>
          </div>
        </div>
      </div>
      <button class="bfc-bubble is-active" aria-label="Thoát chế độ tập trung" aria-pressed="true">✕</button>`);
    await page.addStyleTag({ content: css });
    const info = await page.evaluate(() => {
      const bounds = node => {
        const r = document.querySelector(node).getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
      };
      return {
        card: bounds('.bfc-clock-card'),
        digits: bounds('.bfc-clock-face__digits'),
        bubble: bounds('.bfc-bubble'),
        close: bounds('.bfc-overlay__close'),
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(info.scrollWidth).toBeLessThanOrEqual(viewport.width + 1);
    expect(info.card.x).toBeGreaterThanOrEqual(0);
    expect(info.card.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(info.digits.right).toBeLessThanOrEqual(info.card.right + 1);
    expect(info.close.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(info.bubble.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(info.bubble.bottom).toBeLessThanOrEqual(viewport.height + 1);
    expect(info.card.height).toBeGreaterThan(200);
    await expect(page.getByRole('button',{ name:'Cập nhật thời tiết' })).toBeVisible();
    await expect(page.getByRole('dialog',{ name: 'Chế độ tập trung Brian Focus' })).toBeVisible();
  });
}
