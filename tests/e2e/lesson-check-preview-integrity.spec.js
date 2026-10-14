import {test,expect} from '@playwright/test';

// V18+ cards show stored static thumbnails; embedded HTML runs only after opening
// an authorized activity. Never reintroduce an eager gallery iframe.
test('Arcade thumbnail fills the card and atmosphere does not overlay it',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.setContent(`
    <div class="bes-vn-atmosphere" aria-hidden="true"><span class="bes-vn-motif">★</span></div>
    <main class="lcs-page--library" style="width:1200px">
      <div class="lcs-arcade-grid">
        <article class="lcs-arcade-card" style="width:320px">
          <div class="lcs-card-media has-static-thumbnail">
            <img class="lcs-card-thumbnail-image" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='540'%3E%3Crect width='800' height='540' fill='%231c3268'/%3E%3C/svg%3E">
          </div>
        </article>
      </div>
    </main>
  `);
  await page.addStyleTag({path:'src/components/VietnamAtmosphereOverlay.css'});
  await page.addStyleTag({path:'src/pages/LessonCheckStudio.css'});
  const overlay=page.locator('.bes-vn-atmosphere');
  const img=page.locator('.lcs-card-thumbnail-image');
  const media=page.locator('.lcs-arcade-card .lcs-card-media');
  await expect(overlay).toBeHidden();
  await expect(img).toBeVisible();
  await expect(media.locator('iframe')).toHaveCount(0);
  const sizes=await page.evaluate(()=>{
    const media=document.querySelector('.lcs-arcade-card .lcs-card-media');
    const image=document.querySelector('.lcs-card-thumbnail-image');
    const outer=media.getBoundingClientRect(),inner=image.getBoundingClientRect();
    return {outer:{width:outer.width,height:outer.height},
      inner:{width:inner.width,height:inner.height},
      objectFit:getComputedStyle(image).objectFit};
  });
  expect(sizes.outer.width).toBeGreaterThan(200);
  expect(Math.abs(sizes.outer.width-sizes.inner.width)).toBeLessThan(3);
  expect(Math.abs(sizes.outer.height-sizes.inner.height)).toBeLessThan(3);
  expect(sizes.objectFit).toBe('cover');
  await page.locator('.lcs-page--library').evaluate(el=>el.remove());
  await expect(overlay).toBeVisible();
});
