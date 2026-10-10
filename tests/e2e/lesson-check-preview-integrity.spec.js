import {test,expect} from '@playwright/test';

test('Arcade thumbnail stays proportional and atmosphere never overlays it',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.setContent(`
    <div class="bes-vn-atmosphere" aria-hidden="true"><span class="bes-vn-motif">★</span></div>
    <main class="lcs-page--library" style="width:1200px">
      <div class="lcs-arcade-grid">
        <article class="lcs-arcade-card" style="width:320px">
          <div class="lcs-card-media">
            <div class="lcs-card-live-preview">
              <iframe title="test game" class="lcs-card-preview-frame" srcdoc="<!doctype html><html><meta name='viewport' content='width=device-width,initial-scale=1'><body style='margin:0'><div id='game-root' style='width:100%;height:100vh;background:#1c3268;color:white'>TEST GAME</div></body></html>"></iframe>
            </div>
          </div>
        </article>
      </div>
    </main>
  `);
  await page.addStyleTag({path:'src/components/VietnamAtmosphereOverlay.css'});
  await page.addStyleTag({path:'src/pages/LessonCheckStudio.css'});
  const overlay=page.locator('.bes-vn-atmosphere');
  const iframe=page.frameLocator('.lcs-card-preview-frame');
  await expect(overlay).toBeHidden();
  await expect(iframe.locator('#game-root')).toBeVisible();
  const geometry=await page.evaluate(()=>{
    const media=document.querySelector('.lcs-arcade-card .lcs-card-media');
    const frame=document.querySelector('.lcs-card-preview-frame');
    const outer=media.getBoundingClientRect();
    const inner=frame.getBoundingClientRect();
    return {virtualWidth:frame.contentWindow?.innerWidth||0,
      outer:{width:outer.width,height:outer.height},
      inner:{width:inner.width,height:inner.height},
      transform:getComputedStyle(frame).transform,
      position:getComputedStyle(frame).transformOrigin};
  });
  expect(geometry.virtualWidth).toBeGreaterThanOrEqual(900);
  expect(Math.abs(geometry.outer.width-geometry.inner.width)).toBeLessThan(2);
  expect(Math.abs(geometry.outer.height-geometry.inner.height)).toBeLessThan(2);
  await page.locator('.lcs-page--library').evaluate(el=>el.remove());
  await expect(overlay).toBeVisible();
});
