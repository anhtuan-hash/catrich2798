import { test, expect } from '@playwright/test';

async function waitForHome(page) {
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toBeVisible();
}

test('phone uses the approved premium mobile Home composition', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const mobileHome = page.locator('[data-bes-mobile-home="true"]');
  await expect(mobileHome).toBeVisible();
  await expect(mobileHome.locator('[data-mobile-home-premium]')).toBeVisible();
  await expect(mobileHome.locator('[data-mobile-home-dateline]')).toHaveCount(0);
  await expect(mobileHome.locator('[data-mobile-home-hero] .hero-cms')).toHaveCount(0);

  const art = mobileHome.locator('[data-mobile-home-hero-art]');
  await expect(art).toBeVisible();
  await expect(art).toHaveAttribute('src', /mobile-home-premium-hero\.webp$/);
  await expect(mobileHome.getByRole('heading', { name: /Học tốt hơn/i })).toBeAttached();
  await expect(mobileHome.getByRole('button', { name: /^Bắt đầu$/i })).toBeVisible();
  await expect(mobileHome.getByRole('button', { name: /^Xem ngay$/i })).toBeVisible();
});

test('premium mobile Home suppresses global atmosphere and keeps a light canvas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const atmosphere = page.locator('.bes-vn-atmosphere');
  if (await atmosphere.count()) {
    await expect(atmosphere).toBeHidden();
  }

  const diagnostics = await page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        selector,
        display: style.display,
        background: style.background,
        backgroundColor: style.backgroundColor,
        position: style.position,
        zIndex: style.zIndex,
      };
    };
    return {
      html: read('html'),
      body: read('body'),
      appShell: read('.app-shell'),
      main: read('#bes-main-content'),
      mobileHome: read('.bes-mobile-home.is-premium'),
      atmosphere: read('.bes-vn-atmosphere'),
    };
  });
  console.log('MOBILE_HOME_VISUAL_DIAGNOSTICS', JSON.stringify(diagnostics));

  const canvas = page.locator('.bes-mobile-home.is-premium');
  const background = await canvas.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(background).not.toBe('rgb(0, 0, 0)');
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
});

test('desktop preserves existing Home body', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await waitForHome(page);
  await expect(page.locator('.bha-editorial-dateline')).toBeVisible();
  await expect(page.locator('[data-bes-mobile-home="true"]')).toHaveCount(0);
});

test('portrait iPad uses premium mobile Home body', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-portrait');
  await waitForHome(page);
  await expect(page.locator('[data-bes-mobile-home="true"] [data-mobile-home-premium]')).toBeVisible();
  await expect(page.locator('.bha-editorial-dateline')).toHaveCount(0);
});

test('landscape iPad preserves desktop Home body', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-landscape');
  await waitForHome(page);
  await expect(page.locator('.bha-editorial-dateline')).toBeVisible();
  await expect(page.locator('[data-bes-mobile-home="true"]')).toHaveCount(0);
});

test('premium Home keeps hero, quick actions, then weekly practice', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const hero = page.locator('[data-mobile-home-hero]');
  const quick = page.locator('[data-mobile-home-quick-actions]');
  const practice = page.locator('[data-mobile-home-practice]');
  await expect(hero).toBeVisible();
  await expect(quick).toBeVisible();
  await expect(practice).toBeVisible();

  const [heroBox, quickBox, practiceBox] = await Promise.all([
    hero.boundingBox(),
    quick.boundingBox(),
    practice.boundingBox(),
  ]);
  expect(heroBox?.y || 0).toBeLessThan(quickBox?.y || Number.MAX_SAFE_INTEGER);
  expect(quickBox?.y || 0).toBeLessThan(practiceBox?.y || Number.MAX_SAFE_INTEGER);
});

test('premium Home exposes exactly four compact quick actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const quick = page.locator('[data-mobile-home-quick-actions] button');
  await expect(quick).toHaveCount(4);
  await expect(page.getByRole('button', { name: /^Học$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Thống kê$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Lịch học$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Thành tích$/i })).toBeVisible();

  for (let index = 0; index < 4; index += 1) {
    const box = await quick.nth(index).boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(72);
  }
});

test('weekly practice shows all three premium grade cards in one row', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const cards = page.locator('[data-mobile-grade-card]');
  await expect(cards).toHaveCount(3);
  const boxes = await Promise.all([0, 1, 2].map((index) => cards.nth(index).boundingBox()));
  expect(Math.max(...boxes.map((box) => box?.y || 0)) - Math.min(...boxes.map((box) => box?.y || 0))).toBeLessThanOrEqual(4);
  boxes.forEach((box) => expect(box?.width || 0).toBeGreaterThanOrEqual(88));
});

test('grade action keeps a phone touch target and opens live lesson list', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const action = page.locator('[data-mobile-grade-card="10"] [data-mobile-grade-toggle]');
  const box = await action.boundingBox();
  expect(box?.width || 0).toBeGreaterThanOrEqual(44);
  expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  await action.click();
  await expect(page.locator('[data-mobile-practice-grade="10"]')).toBeVisible();
});

test('premium Home stays inside viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);
  await expect(page.locator('[data-mobile-home-premium]')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('premium Hero artwork is responsive and CTA hotspots remain accessible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const hero = page.locator('[data-mobile-home-hero]');
  const art = page.locator('[data-mobile-home-hero-art]');
  const [heroBox, artBox] = await Promise.all([hero.boundingBox(), art.boundingBox()]);
  expect(heroBox?.width || 0).toBeGreaterThan(320);
  expect(heroBox?.height || 0).toBeGreaterThan(180);
  expect(artBox?.width || 0).toBeLessThanOrEqual((heroBox?.width || 0) + 1);

  const primary = await page.getByRole('button', { name: /^Bắt đầu$/i }).boundingBox();
  const secondary = await page.getByRole('button', { name: /^Xem ngay$/i }).boundingBox();
  expect(primary?.height || 0).toBeGreaterThanOrEqual(44);
  expect(secondary?.height || 0).toBeGreaterThanOrEqual(44);
});

test('mobile Home brand keeps Brian English identity', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const brand = page.locator('.bes-mobile-brand[data-home-brand="true"]');
  await expect(brand).toBeVisible();
  await expect(brand).toContainText('Brian English');
  await expect(brand).not.toContainText('Trang chủ');
});

test('weekly practice stays compact until a grade is opened and can expand long lists', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  await expect(page.locator('[data-mobile-practice-panel]')).toHaveCount(0);
  await page.locator('[data-mobile-grade-card="10"] [data-mobile-grade-toggle]').click();
  const cards = page.locator('[data-mobile-practice-grade="10"] [data-mobile-practice-card]');
  const initialCount = await cards.count();
  expect(initialCount).toBeLessThanOrEqual(4);

  const expand = page.getByRole('button', { name: /Xem tất cả bài|View all lessons/i });
  if (await expand.count()) {
    await expand.click();
    expect(await cards.count()).toBeGreaterThan(initialCount);
  }
});

test('premium mobile Home removes the old credential-heavy footer from the visual flow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const footer = page.locator('footer.signature-footer-collapsible');
  if (await footer.count()) {
    await expect(footer).toBeHidden();
  }
});

test('published mobile Hero follows its real artwork ratio and leaves no vertical blank space', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  const wideHeroDataUrl = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22600%22 viewBox=%220 0 1200 600%22%3E%3Crect width=%221200%22 height=%22600%22 fill=%22%23dbeafe%22/%3E%3C/svg%3E';

  await page.route('**/hero/mobile-current.json*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        schemaVersion: 1,
        mobileHero: { url: wideHeroDataUrl, fit: 'contain' },
      }),
    });
  });

  await waitForHome(page);

  const hero = page.locator('[data-mobile-home-hero]');
  const art = page.locator('[data-mobile-home-hero-art]');
  await expect(hero).toBeVisible();
  await expect(art).toHaveAttribute('data-mobile-home-direct-hero', 'cms');
  await art.evaluate(async (image) => {
    if (!image.complete || image.naturalWidth === 0) await image.decode();
  });

  const geometry = await hero.evaluate((element) => {
    const image = element.querySelector('[data-mobile-home-hero-art]');
    const box = element.getBoundingClientRect();
    const naturalRatio = image.naturalWidth / image.naturalHeight;
    const visibleContainHeight = box.width / naturalRatio;
    return {
      heroRatio: box.width / box.height,
      naturalRatio,
      verticalBlankSpace: Math.max(0, box.height - visibleContainHeight),
    };
  });

  expect(geometry.naturalRatio).toBeCloseTo(2, 2);
  expect(Math.abs(geometry.heroRatio - geometry.naturalRatio)).toBeLessThan(0.03);
  expect(geometry.verticalBlankSpace).toBeLessThanOrEqual(2);
});
