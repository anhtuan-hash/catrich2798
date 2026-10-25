import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  // Test fixture must never call the live Supabase REST endpoint.
  await page.route('https://**/*',route=>route.abort('blockedbyclient'));
  await page.goto('/tests/fixtures/sync-doctor-qa.html');
  await expect(page.getByRole('heading',{name:/Sync Doctor/i})).toBeVisible();
});

test('synthetic access: teacher/guest denied; administrator/head can navigate without write actions',async({page})=>{
  const tabBar=page.locator('.bsd-tabs');
  await expect(tabBar).toBeVisible();
  await page.getByTestId('role-teacher').click();
  await expect(page.locator('.bsd-denied')).toBeVisible();
  await expect(tabBar).toHaveCount(0);
  await page.getByTestId('role-guest').click();
  await expect(page.locator('.bsd-denied')).toBeVisible();
  await page.getByTestId('role-head').click();
  await expect(tabBar).toBeVisible();
  await page.getByTestId('role-admin').click();
  await expect(tabBar).toBeVisible();

  await tabBar.getByRole('button',{name:'Cài đặt'}).click();
  await expect(page.locator('.bsd-release-gates')).toBeVisible();
  await expect(page.locator('.bsd-release-gate.pending')).toHaveCount(0);
  await expect(page.locator('.bsd-release-gate strong.pending')).toHaveCount(1);
  await expect(page.locator('.bsd-release-gate strong.pass')).toHaveCount(3);
  await expect(page.locator('.bsd-release-gates')).toContainText('hai tài khoản');
  await expect(page.locator('.bsd-release-gates')).toContainText('vẫn bị khóa');

  await page.getByTestId('change-language').click();
  await expect(tabBar.getByRole('button',{name:'Settings'})).toBeVisible();
  await expect(page.locator('.bsd-release-gates')).toContainText('remain disabled');
});

test('all 7 tabs are reachable; mobile root does not force document horizontal overflow',async({page})=>{
  const bar=page.locator('.bsd-tabs');
  for(const name of ['Tổng quan','Vấn đề','Nguồn dữ liệu','Kế hoạch sửa','Nhật ký','Cài đặt','Giám sát']){
    const button=bar.getByRole('button',{name,exact:true});
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await expect(button).toHaveAttribute('aria-current','page');
  }
  const dims=await page.evaluate(()=>({
    viewport:document.documentElement.clientWidth,
    total:document.documentElement.scrollWidth,
    tabs:document.querySelector('.bsd-tabs')?.scrollWidth||0,
    tabClient:document.querySelector('.bsd-tabs')?.clientWidth||0,
  }));
  expect(dims.total).toBeLessThanOrEqual(dims.viewport+3);
  // Tabs may scroll inside their own strip on narrow devices.
  expect(dims.tabs).toBeGreaterThanOrEqual(dims.tabClient);
});

test('vertical touch/wheel scrolling remains usable and role switch clears protected content',async({page,isMobile})=>{
  await page.locator('.bsd-tabs').getByRole('button',{name:'Cài đặt'}).click();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.evaluate(()=>window.scrollBy(0,550));
  const first=await page.evaluate(()=>window.scrollY);
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);
  if(height>page.viewportSize().height+50)expect(first).toBeGreaterThan(0);
  await page.getByTestId('role-teacher').click();
  await expect(page.locator('.bsd-denied')).toBeVisible();
  await expect(page.locator('.bsd-release-gates')).toHaveCount(0);
  await page.getByTestId('role-admin').click();
  await expect(page.locator('.bsd-tabs')).toBeVisible();
  if(isMobile){
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(3);
  }
});
