import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const typography = readFileSync(new URL('../../src/styles/dashboard-hero-typography.css', import.meta.url), 'utf8');
const samples = [
  { name: 'Tuấn Nguyễn Anh', display: 'Tuấn Nguyễn Anh', lines: 1, cls: 'is-medium-name' },
  { name: 'Nguyễn Đăng Minh Hoa', display: 'Nguyễn Đăng\nMinh Hoa', lines: 2, cls: 'is-long-name' },
];

for (const viewport of [{ width: 1365, height: 768 }, { width: 390, height: 844 }]) {
  test(`names share the same optical style and line count at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const measurements = [];
    for (const example of samples) {
      await page.setContent(`
        <style>
          body { margin: 0; }
          .app-shell[data-route="dashboard"] .editorial-hero.is-minimal {
            display: flex; align-items: center; width: 100%; min-height: 320px;
            box-sizing: border-box; padding: 35px 22px;
          }
        </style>
        <div class="app-shell" data-route="dashboard">
          <header class="editorial-hero is-minimal" style="--db-heading-color:#102c49">
            <div class="editorial-hero-copy ${example.lines === 2 ? 'has-balanced-name' : ''}">
              <div class="editorial-hero-heading ${example.cls}">
                <span class="editorial-hero-hello">Xin chào,</span>
                <h1 aria-label="${example.name}">${example.display}</h1>
              </div>
            </div>
          </header>
        </div>
      `);
      await page.addStyleTag({ content: typography });
      const info = await page.evaluate(() => {
        const heading = document.querySelector('h1');
        const style = getComputedStyle(heading);
        const hero = document.querySelector('.editorial-hero');
        const rect = heading.getBoundingClientRect();
        const bound = hero.getBoundingClientRect();
        return {
          text: heading.textContent,
          childSpans: heading.querySelectorAll('span').length,
          weight: style.fontWeight,
          family: style.fontFamily,
          whiteSpace: style.whiteSpace,
          lineHeight: Number.parseFloat(style.lineHeight),
          height: rect.height,
          overflowX: rect.right > bound.right + 2 || rect.left < bound.left - 2,
          backgroundClip: style.webkitBackgroundClip || style.backgroundClip,
          image: style.backgroundImage,
        };
      });
      measurements.push(info);
      expect(info.text).toBe(example.display);
      expect(info.childSpans).toBe(0);
      expect(info.weight).toBe('500');
      expect(info.whiteSpace).toBe('pre-line');
      expect(info.backgroundClip).toBe('text');
      expect(info.image).toContain('linear-gradient');
      expect(info.overflowX).toBe(false);
      expect(info.height / info.lineHeight).toBeGreaterThan(example.lines - .2);
      expect(info.height / info.lineHeight).toBeLessThan(example.lines + .55);
    }
    expect(measurements[0].family).toBe(measurements[1].family);
    expect(measurements[0].weight).toBe(measurements[1].weight);
  });
}
