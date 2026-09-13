import { test, expect } from '@playwright/test';

async function waitForHome(page) {
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.locator('.bha-home')).toBeVisible();
}

async function expectSharedHomeIdentity(page) {
  await expect(page.locator('[data-bes-mobile-home="true"]')).toHaveCount(0);
  await expect(page.locator('.bha-editorial-dateline')).toBeVisible();
  await expect(page.locator('.bha-hero.hero-cms')).toBeVisible();
  await expect(page.locator('.bha-hero.hero-cms')).toContainText('Không gian');
  await expect(page.locator('.bha-hero.hero-cms')).toContainText('Tích hợp các công cụ hỗ trợ giảng dạy');
  await expect(page.locator('.bha-hero.hero-cms').getByRole('button', { name: /Xem hướng dẫn/i })).toBeVisible();
}

async function verticalPosition(locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box.y;
}

test('phone reuses the desktop Home body and Hero identity', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);
  await expectSharedHomeIdentity(page);
});

test('desktop preserves the shared Home body', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await waitForHome(page);
  await expectSharedHomeIdentity(page);
});

test('portrait iPad reuses the shared Home body instead of a separate mobile homepage', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-portrait');
  await waitForHome(page);
  await expectSharedHomeIdentity(page);
});

test('landscape iPad preserves the shared Home body', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-landscape');
  await waitForHome(page);
  await expectSharedHomeIdentity(page);
});

test('phone Home orders Hero then weekly practice then featured tools', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const hero = page.locator('.bha-hero.hero-cms');
  const practice = page.locator('.bha-practice');
  const tools = page.locator('.bha-tools');

  await expect(hero).toBeVisible();
  await expect(practice).toBeVisible();
  await expect(tools).toBeVisible();

  const heroY = await verticalPosition(hero);
  const practiceY = await verticalPosition(practice);
  const toolsY = await verticalPosition(tools);
  expect(heroY).toBeLessThan(practiceY);
  expect(practiceY).toBeLessThan(toolsY);
});

test('phone Weekly Practice shows all three desktop grade cards in one responsive column', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const cards = page.locator('.bha-grades > .bha-grade');
  await expect(cards).toHaveCount(3);
  await expect(page.locator('.bha-folio-grade--10')).toBeVisible();
  await expect(page.locator('.bha-folio-grade--11')).toBeVisible();
  await expect(page.locator('.bha-folio-grade--12')).toBeVisible();

  const columns = await page.locator('.bha-grades').evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);
  expect(columns).toBe(1);
});

test('phone weekly-practice actions remain touch friendly', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const enabledAction = page.locator('.bha-grade-copy > button:not(:disabled)').first();
  if (await enabledAction.count()) {
    const box = await enabledAction.boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  }
});

test('phone Home stays inside viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);
  await expect(page.locator('.bha-home')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('phone Home uses readable desktop Hero typography and large actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const heroTitleSize = await page.locator('.bha-hero.hero-cms .hero-cms__content h1').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(heroTitleSize).toBeGreaterThanOrEqual(38);

  const primaryAction = await page.locator('.bha-hero.hero-cms .hero-cms__button').first().boundingBox();
  expect(primaryAction?.height || 0).toBeGreaterThanOrEqual(48);
});

test('phone Home keeps Brian English dateline instead of a route-title substitute', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const dateline = page.locator('.bha-editorial-dateline');
  await expect(dateline).toBeVisible();
  await expect(dateline).toContainText('BRIAN ENGLISH');
  await expect(dateline).not.toContainText('Trang chủ');
});

test('phone featured tools keep the desktop tool set and responsive cards', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const tools = page.locator('.bha-tools');
  await expect(tools).toBeVisible();
  await expect(tools.locator('.bha-tool').first()).toBeVisible();
  await expect(tools).toContainText('Lesson Architect');
  await expect(tools).toContainText('TextCare Fixer');
});
