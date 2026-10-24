import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../../src/components/BrianFocus/' + file, import.meta.url), 'utf8');
const base = read('FocusEffectsLibrary.css');
const transition = read('FocusTransitionVariants.css');
const allEffects = ['portal', 'fade', 'zoom', 'rise', 'slide', 'curtain', 'iris', 'flip', 'blur'];

test('all Focus gallery previews run continuously instead of freezing after one animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setContent('<div class="bfc-overlay"><div class="bfc-effect-gallery"><div class="bfc-effect-gallery__demo" data-demo-effect="flip" data-demo-direction="enter">11:41</div></div></div>');
  await page.addStyleTag({ content: base });
  await page.addStyleTag({ content: transition });
  const target = page.locator('.bfc-effect-gallery__demo');

  for (const id of allEffects) {
    await target.evaluate((el, effect) => { el.dataset.demoEffect = effect; }, id);
    const state = await target.evaluate(el => {
      const { animationName, animationIterationCount, animationDuration } = getComputedStyle(el);
      return { animationName, animationIterationCount, animationDuration, running: el.getAnimations().length > 0 };
    });
    expect(state.animationName, id).toContain('bfc-demo-loop-' + id + '-enter');
    expect(state.animationIterationCount, id).toBe('infinite');
    expect(state.animationDuration, id).toBe('3.4s');
    expect(state.running, id).toBe(true);
  }

  await target.evaluate(el => { el.dataset.demoEffect = 'flip'; });
  const before = await target.evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(550);
  const after = await target.evaluate(el => getComputedStyle(el).transform);
  expect(after).not.toBe(before);

  await target.evaluate(el => { el.dataset.demoDirection = 'exit'; });
  await expect.poll(() => target.evaluate(el => getComputedStyle(el).animationName))
    .toContain('bfc-demo-loop-flip-exit');

  await target.evaluate(el => { el.dataset.demoEffect = 'none'; });
  await expect.poll(() => target.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test('Reduce Motion blocks looping preview animations for accessibility', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setContent('<div class="bfc-overlay"><div class="bfc-effect-gallery"><div class="bfc-effect-gallery__demo" data-demo-effect="zoom" data-demo-direction="enter">11:41</div></div></div>');
  await page.addStyleTag({ content: base });
  await page.addStyleTag({ content: transition });
  const name = await page.locator('.bfc-effect-gallery__demo').evaluate(el => getComputedStyle(el).animationName);
  expect(name).toBe('none');
});
