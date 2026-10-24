import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../../src/components/BrianFocus/' + file, import.meta.url), 'utf8');
const galleryCss = read('FocusEffectsLibrary.css');
const variantsCss = read('FocusTransitionVariants.css');
const playerModule = read('focusPreviewMotion.js');
const effects = ['portal','fade','zoom','rise','slide','curtain','iris','flip','blur'];

const mountGallery = async (page) => {
  await page.setContent('<div class="bfc-overlay"><div class="bfc-effect-gallery"><div class="bfc-effect-gallery__demo" data-demo-effect="flip" data-demo-direction="enter" data-preview-override="false">11:41</div></div></div>');
  await page.addStyleTag({content:galleryCss});
  await page.addStyleTag({content:variantsCss});
  await page.evaluate(async source => {
    const blob = new Blob([source], {type:'application/javascript'});
    const url = URL.createObjectURL(blob);
    try {
      const mod = await import(url);
      window.startFocusPreview = mod.startFocusPreview;
    } finally { URL.revokeObjectURL(url); }
  }, playerModule);
};

test('nine effects start real Web Animations players on the Focus preview', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await mountGallery(page);
  for (const effect of effects) {
    const state = await page.evaluate(id => {
      const node = document.querySelector('.bfc-effect-gallery__demo');
      node.dataset.demoEffect = id;
      node.getAnimations().forEach(animation => animation.cancel());
      const animation = window.startFocusPreview(node,id,'enter');
      return animation && {playState:animation.playState, iterations:animation.effect.getTiming().iterations,
        duration:animation.effect.getTiming().duration};
    }, effect);
    expect(state?.playState,effect).toBe('running');
    expect(state?.iterations,effect).toBe(Infinity);
    expect(state?.duration,effect).toBe(3400);
  }
  // Measure a real visual difference rather than merely checking CSS names.
  const changed = await page.evaluate(async () => {
    const node = document.querySelector('.bfc-effect-gallery__demo');
    node.getAnimations().forEach(animation => animation.cancel());
    const animation = window.startFocusPreview(node,'flip','enter');
    animation.currentTime = 200;
    const first = getComputedStyle(node).transform;
    animation.currentTime = 1200;
    const second = getComputedStyle(node).transform;
    return first !== second;
  });
  expect(changed).toBe(true);
});

test('Replay recreates the running animation, and exit uses reverse direction', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await mountGallery(page);
  const result = await page.evaluate(() => {
    const node = document.querySelector('.bfc-effect-gallery__demo');
    const first = window.startFocusPreview(node,'slide','enter');
    first.cancel();
    const second = window.startFocusPreview(node,'slide','exit');
    return {first:first.playState,second:second.playState,animations:node.getAnimations().length};
  });
  expect(result.first).toBe('idle');
  expect(result.second).toBe('running');
  expect(result.animations).toBeGreaterThan(0);
});

test('system reduced motion is respected unless the user explicitly opts in', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await mountGallery(page);
  const values = await page.evaluate(() => {
    const el = document.querySelector('.bfc-effect-gallery__demo');
    const before = getComputedStyle(el).transform;
    el.dataset.previewOverride = 'true';
    const animation = window.startFocusPreview(el,'zoom','enter');
    animation.currentTime=150;
    const during = getComputedStyle(el).transform;
    return {before,during,player:animation.playState};
  });
  expect(values.before).toBe('none');
  expect(values.player).toBe('running');
  expect(values.during).not.toBe('none');
});
