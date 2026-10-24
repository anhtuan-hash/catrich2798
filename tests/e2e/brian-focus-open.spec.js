import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Regression: the old CSS-only Focus opening animation sometimes did not run,
// even though closing through Web Animations already worked.
const read = file => readFileSync(new URL('../../src/components/BrianFocus/' + file, import.meta.url), 'utf8');
const motionModule = read('focusEnterMotion.js');
const baseCSS = read('BrianFocus.css');
const transitionsCSS = read('BrianFocusTransitions.css');
const variantsCSS = read('FocusTransitionVariants.css');
const effects = ['portal','fade','zoom','rise','slide','curtain','iris','flip','blur'];

async function prepare(page, reducedMotion='no-preference') {
  await page.emulateMedia({reducedMotion});
  await page.setContent('<main id="root">The previous page</main><div class="bfc-overlay" data-focus-transition="entering" data-focus-enter="portal"><div class="bfc-overlay__center">Brian Focus</div></div>');
  await page.addStyleTag({content:baseCSS});
  await page.addStyleTag({content:transitionsCSS});
  await page.addStyleTag({content:variantsCSS});
  await page.evaluate(async source => {
    const blob = new Blob([source], {type:'application/javascript'});
    const url = URL.createObjectURL(blob);
    try { window.startFocusEnter = (await import(url)).startFocusEnter; }
    finally { URL.revokeObjectURL(url); }
  }, motionModule);
}

test('every selected opening effect actually moves the Focus overlay', async ({page}) => {
  await prepare(page);
  for (const effect of effects) {
    const state=await page.evaluate(effect => {
      const el=document.querySelector('.bfc-overlay');
      el.dataset.focusEnter=effect;
      // Other CSS keyframes would race without the explicit animation:none.
      el.getAnimations().forEach(animation=>animation.cancel());
      const animation=window.startFocusEnter(el,effect);
      animation.currentTime=20;
      const styles=()=>({opacity:getComputedStyle(el).opacity,
        transform:getComputedStyle(el).transform,clipPath:getComputedStyle(el).clipPath,
        filter:getComputedStyle(el).filter});
      const from=styles();
      animation.currentTime=675;
      const to=styles();
      const running=animation.playState === 'running' || animation.playState === 'finished';
      animation.cancel();
      return {from,to,running};
    },effect);
    expect(state.running,effect).toBe(true);
    expect(state.from,effect).not.toEqual(state.to);
  }
});

test('opening No Motion is the only explicitly instant choice',async ({page})=>{
  await prepare(page);
  expect(await page.evaluate(()=>window.startFocusEnter(document.querySelector('.bfc-overlay'),'none'))).toBe(null);
});

test('Reduce Motion still gets a visible 210ms opening crossfade',async ({page})=>{
  await prepare(page,'reduce');
  const result=await page.evaluate(()=>{
    const el=document.querySelector('.bfc-overlay');
    const animation=window.startFocusEnter(el,'flip',{reducedMotion:true});
    animation.currentTime=15;
    const from=Number(getComputedStyle(el).opacity);
    animation.currentTime=185;
    const to=Number(getComputedStyle(el).opacity);
    return {from,to,duration:animation.effect.getTiming().duration};
  });
  expect(result.duration).toBe(210);
  expect(result.from).toBeLessThan(result.to);
});
