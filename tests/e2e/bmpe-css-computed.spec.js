// Isolated computed-style tests: CSS cascade, not production performance benchmarks.
// Uses the *real* legacy & GlobalMotionSystem stylesheets from this repository.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const combinedCss = source('src/styles/v1159.css') + '\n' + source('src/styles/GlobalMotionSystem.css');

async function mountProbe(page, { pagePreset = 'editorial-rise', interaction = 'soft-press' } = {}) {
  await page.setContent(`<!doctype html>
<html lang="vi" data-motion-mode="editorial-calm"
 data-motion-page="${pagePreset}" data-motion-interaction="${interaction}"
 style="--gm-slow:285ms;--gm-fast:135ms;--gm-ease:cubic-bezier(.22,1,.36,1);--gm-ease-emphasized:cubic-bezier(.22,1,.36,1)">
<head><meta charset="utf-8"><style>${combinedCss}</style></head>
<body>
  <main id="bes-main-content"><h1>Brian English</h1></main>
  <button id="bmpe-button" type="button">Open</button>
  <section class="ttcm-m3-shell"><div class="ttcm-m3-toolbar">TTCM</div></section>
</body></html>`);
}

test('enabled page motion is not neutralized by legacy global CSS', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mountProbe(page);
  const result = await page.locator('#bes-main-content').evaluate((node) => {
    const style = getComputedStyle(node);
    return { animationName: style.animationName, duration: parseFloat(style.animationDuration) };
  });
  expect(result.animationName).toContain('gm-v2-page-rise');
  expect(result.duration).toBeGreaterThan(0);
});

test('micro interaction transitions remain enabled without a global disable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mountProbe(page);
  const style = await page.locator('#bmpe-button').evaluate((node) => {
    const computed = getComputedStyle(node);
    return { properties: computed.transitionProperty, duration: parseFloat(computed.transitionDuration) };
  });
  expect(style.properties).toContain('transform');
  expect(style.duration).toBeGreaterThan(0);
  await expect(page.locator('.ttcm-m3-shell')).toHaveCSS('border-radius', '28px');
});

test('user-selected no-motion and OS reduced-motion remain available', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mountProbe(page, { pagePreset: 'none', interaction: 'none' });
  const animationWhenNone = await page.locator('#bes-main-content').evaluate((el) => getComputedStyle(el).animationName);
  expect(animationWhenNone).toBe('none');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    document.documentElement.dataset.motionPage = 'editorial-rise';
    document.documentElement.dataset.motionInteraction = 'soft-press';
  });
  const reduced = await page.locator('#bes-main-content').evaluate((node) => getComputedStyle(node).animationName);
  expect(reduced).toBe('none');
});
