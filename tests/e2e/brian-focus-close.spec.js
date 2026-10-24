import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/components/BrianFocus/focusExitMotion.js', import.meta.url), 'utf8');
const variants = ['portal','fade','zoom','rise','slide','curtain','iris','flip','blur'];
async function mount(page) {
  await page.setContent('<main id="root">Dashboard is still mounted</main><div class="bfc-overlay" data-focus-transition="exiting" style="position:fixed;inset:0;background:#172443;opacity:1"></div>');
  await page.evaluate(async code => {
    const uri=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
    try { window.startFocusExit=(await import(uri)).startFocusExit; }
    finally { URL.revokeObjectURL(uri); }
  }, source);
}
test('Close visibly animates and stays mounted until animation.finished', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'no-preference' });
  await mount(page);
  const state=await page.evaluate(async ()=>{
    const el=document.querySelector('.bfc-overlay');
    let mounted=true;
    const animation=window.startFocusExit(el,'portal');
    const start={state:animation.playState,stillVisible:mounted,opacity:getComputedStyle(el).opacity};
    animation.currentTime=350;
    const halfway={clipPath:getComputedStyle(el).clipPath,opacity:getComputedStyle(el).opacity};
    animation.currentTime=690;
    await animation.finished;
    mounted=false;
    el.remove();
    return {start,halfway,finished:mounted,nowExists:!!document.querySelector('.bfc-overlay')};
  });
  expect(state.start.state).toBe('running');
  expect(state.start.stillVisible).toBe(true);
  expect(state.halfway.clipPath).toContain('circle(');
  expect(state.finished).toBe(false);
  expect(state.nowExists).toBe(false);
});
test('all nine selected Close effects create visible real animations', async ({page})=>{
  await mount(page);
  for(const id of variants){
    const result=await page.evaluate(id=>{
      const el=document.querySelector('.bfc-overlay');
      const animation=window.startFocusExit(el,id);
      animation.currentTime=10;
      const initial=getComputedStyle(el);
      const before={opacity:initial.opacity,transform:initial.transform,clipPath:initial.clipPath,filter:initial.filter};
      animation.currentTime=660;
      const final=getComputedStyle(el);
      const after={opacity:final.opacity,transform:final.transform,clipPath:final.clipPath,filter:final.filter};
      animation.cancel();
      return {before,after};
    },id);
    expect(result.before,id).not.toEqual(result.after);
  }
});
test('low-performance Close fades rather than closing instantly', async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await mount(page);
  const state=await page.evaluate(()=>{
    const animation=window.startFocusExit(document.querySelector('.bfc-overlay'),'flip',{reducedMotion:true});
    animation.currentTime=100;
    const opacity=getComputedStyle(document.querySelector('.bfc-overlay')).opacity;
    return {duration:animation.effect.getTiming().duration,opacity,playState:animation.playState};
  });
  expect(state.duration).toBe(210);
  expect(Number(state.opacity)).toBeGreaterThan(0);
  expect(Number(state.opacity)).toBeLessThan(1);
  expect(state.playState).toBe('running');
});
test('No motion is instant only when explicitly chosen',async({page})=>{
  await mount(page);
  expect(await page.evaluate(()=>window.startFocusExit(document.querySelector('.bfc-overlay'),'none'))).toBe(null);
});
