import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = '/tools/design-to-code/fixtures/settings-paper.html';

async function assertNoHorizontalClipping(page) {
  const metrics = await page.evaluate(() => {
    const root = document.querySelector('[data-design-to-code="settings-paper-v1"]');
    const elements = [...root.querySelectorAll('.sl2-tile,.sl2-widget,.sl2-extra')];
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      clipped: elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.left < -1 || rect.right > innerWidth+1;
      }).map(el => el.className),
    };
  });
  expect(metrics.documentWidth, 'No horizontal body overflow').toBeLessThanOrEqual(metrics.viewportWidth + 2);
  expect(metrics.clipped, 'No card clipped outside viewport').toEqual([]);
}

test('real Settings launcher: modules visible, no clipping, desktop screenshot', async ({ page }, testInfo) => {
  await page.goto(path, { waitUntil: 'networkidle' });
  const surface = page.locator('[data-design-to-code="settings-paper-v1"]');
  await expect(surface).toBeVisible();
  await expect(surface.locator('.sl2-tile')).toHaveCount(11);
  await expect(surface.getByRole('heading', { name: 'Cài đặt hệ thống' })).toBeVisible();
  await assertNoHorizontalClipping(page);
  const shot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await testInfo.attach('settings-paper-desktop.png', { body: shot, contentType: 'image/png' });
  const out = resolve('artifacts/design-to-code');
  await mkdir(out,{recursive:true});
  await page.screenshot({ path: out+'/settings-paper-desktop.png', fullPage:true,animations:'disabled' });
});

test('settings modules retain real interactions: grid, list, pin, search, open', async ({page}) => {
  await page.goto(path);
  const surface = page.locator('[data-design-to-code="settings-paper-v1"]');
  await surface.getByRole('button',{name:'Danh sách'}).click();
  await expect(surface.locator('.sl2-grid.list')).toBeVisible();
  await surface.getByRole('button',{name:'Lưới'}).click();
  await expect(surface.locator('.sl2-grid.list')).toHaveCount(0);
  const pin=surface.getByRole('button',{name:'Ghim Bảo mật'});
  const before=await pin.getAttribute('aria-pressed');
  await pin.click();
  expect(await pin.getAttribute('aria-pressed')).not.toBe(before);
  await surface.getByRole('button',{name:/Tài khoản Hồ sơ và mật khẩu/}).first().click();
  await expect(page.locator('[data-opened-module="account"]')).toBeVisible();
  const search=surface.getByRole('textbox',{name:'Tìm kiếm cài đặt'});
  await search.fill('Sự kiện');
  await expect(surface.locator('.sl2-tile')).toHaveCount(1);
  await search.fill('');
  await expect(surface.locator('.sl2-tile')).toHaveCount(11);
});

test('small-screen Paper UI: settings remain navigable without overflow', async ({page},testInfo) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto(path,{waitUntil:'networkidle'});
  const surface=page.locator('[data-design-to-code="settings-paper-v1"]');
  await expect(surface.locator('.sl2-tile')).toHaveCount(11);
  await assertNoHorizontalClipping(page);
  await surface.getByRole('button',{name:'Danh sách'}).click();
  await assertNoHorizontalClipping(page);
  await surface.getByRole('button',{name:'Lưới'}).click();
  const shot=await page.screenshot({fullPage:true,animations:'disabled'});
  await testInfo.attach('settings-paper-mobile.png',{body:shot,contentType:'image/png'});
  const out=resolve('artifacts/design-to-code');
  await mkdir(out,{recursive:true});
  await page.screenshot({path:out+'/settings-paper-mobile.png',fullPage:true,animations:'disabled'});
});
