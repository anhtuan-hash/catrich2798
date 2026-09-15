import { test, expect } from '@playwright/test';

async function expectMobileChrome(page) {
  await expect(page.locator('.app-shell')).toHaveAttribute('data-presentation', 'mobile');
  await expect(page.locator('.bes-mobile-topbar')).toBeVisible();
  await expect(page.locator('.bes-mobile-bottomnav')).toBeVisible();
  await expect(page.locator('.brian-nav')).toHaveCount(0);
}

async function expectDesktopChrome(page) {
  await expect(page.locator('.app-shell')).toHaveAttribute('data-presentation', 'desktop');
  await expect(page.locator('.brian-nav')).toBeVisible();
  await expect(page.locator('.bes-mobile-bottomnav')).toHaveCount(0);
}

test('phone uses mobile chrome and hides desktop navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'phone');
  await expectMobileChrome(page);
  await expect(page.locator('.bes-mobile-bridge-host')).toHaveAttribute('hidden', '');

  const bottomPadding = await page.locator('#bes-main-content').evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingBottom));
  expect(bottomPadding).toBeGreaterThanOrEqual(68);
});

test('phone mobile chrome uses large touch and typography scale', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/home');
  await expectMobileChrome(page);

  const topbarHeight = await page.locator('.bes-mobile-topbar').evaluate((element) => Number.parseFloat(getComputedStyle(element).minHeight));
  expect(topbarHeight).toBeGreaterThanOrEqual(72);

  const brandMark = await page.locator('.bes-mobile-brand__mark').boundingBox();
  expect(brandMark?.width || 0).toBeGreaterThanOrEqual(42);
  expect(brandMark?.height || 0).toBeGreaterThanOrEqual(42);

  const brandTitleSize = await page.locator('.bes-mobile-brand__copy strong').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(brandTitleSize).toBeGreaterThanOrEqual(17);

  const touchTarget = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bes-mobile-touch')) || 0);
  expect(touchTarget).toBeGreaterThanOrEqual(50);

  const bottomItem = await page.locator('.bes-mobile-bottomnav__item').first().boundingBox();
  expect(bottomItem?.height || 0).toBeGreaterThanOrEqual(60);
});

test('portrait iPad uses mobile chrome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-portrait');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'tablet');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-orientation', 'portrait');
  await expectMobileChrome(page);
});

test('landscape iPad uses desktop chrome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-landscape');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'tablet');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-orientation', 'landscape');
  await expectDesktopChrome(page);
});

test('desktop remains desktop after narrow viewport resize', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'desktop');
  await expectDesktopChrome(page);

  await page.setViewportSize({ width: 560, height: 900 });
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'desktop');
  await expectDesktopChrome(page);
});

test('desktop stored override opens the real mobile shell and can return to desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.addInitScript(() => localStorage.setItem('bes-presentation-override', 'mobile'));
  await page.goto('/#/home');

  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'desktop');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-presentation-override', 'mobile');
  await expectMobileChrome(page);

  const stageWidth = await page.locator('#root').evaluate((element) => element.getBoundingClientRect().width);
  expect(stageWidth).toBeLessThanOrEqual(430.5);

  const returnButton = page.locator('.bes-mobile-desktop-return');
  await expect(returnButton).toBeVisible();
  await returnButton.click();
  await expectDesktopChrome(page);
  await expect(page.locator('.app-shell')).not.toHaveAttribute('data-presentation-override', 'mobile');
  expect(await page.evaluate(() => localStorage.getItem('bes-presentation-override'))).toBeNull();
});

test('mobile menu opens as a left navigation drawer without changing route', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/home');
  const originalHash = await page.evaluate(() => window.location.hash);

  await page.getByRole('button', { name: 'Mở menu' }).click();
  const drawer = page.getByRole('dialog', { name: 'Điều hướng Brian English' });
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveClass(/bes-mobile-drawer/);

  await drawer.evaluate(async (element) => {
    const animations = element.getAnimations();
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  });

  const box = await drawer.boundingBox();
  const viewport = page.viewportSize();
  expect(box?.x || 0).toBeLessThanOrEqual(1);
  expect(box?.width || 0).toBeGreaterThan((viewport?.width || 0) * 0.72);
  expect(box?.width || 0).toBeLessThan((viewport?.width || 0) * 0.94);
  expect(box?.height || 0).toBeGreaterThan((viewport?.height || 0) * 0.9);

  const firstButtonMinHeight = await page.locator('.bes-mobile-drawer button').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).minHeight));
  expect(firstButtonMinHeight).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => window.location.hash)).toBe(originalHash);
});

test('mobile drawer mirrors original primary navigation buttons instead of catalog groups', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/home');

  await page.locator('.bes-mobile-bridge-host').evaluate((host) => {
    window.__mobileOriginalNavClicks = [];
    const add = (key, label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.navKey = key;
      button.textContent = label;
      button.addEventListener('click', () => window.__mobileOriginalNavClicks.push(key));
      host.appendChild(button);
    };
    add('dashboard', 'Dashboard');
    add('homeroom', 'Chủ nhiệm');
    add('gradebook', 'Sổ điểm');
    add('reports', 'Báo cáo');
  });

  await page.getByRole('button', { name: 'Mở menu' }).click();
  const drawer = page.getByRole('dialog', { name: 'Điều hướng Brian English' });
  const primaryNav = drawer.getByRole('navigation', { name: 'Điều hướng chính', exact: true });
  await expect(drawer).toBeVisible();

  await expect(primaryNav.getByRole('button', { name: 'Trang chủ', exact: true })).toBeVisible();
  await expect(primaryNav.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(primaryNav.getByRole('button', { name: 'Chủ nhiệm', exact: true })).toBeVisible();
  await expect(primaryNav.getByRole('button', { name: 'Sổ điểm', exact: true })).toBeVisible();
  await expect(primaryNav.getByRole('button', { name: 'Báo cáo', exact: true })).toBeVisible();
  await expect(drawer.getByText('Dạy & học')).toHaveCount(0);
  await expect(drawer.getByText('Vận hành')).toHaveCount(0);
  await expect(drawer.getByText('Quản trị & hệ thống')).toHaveCount(0);

  await primaryNav.getByRole('button', { name: 'Dashboard', exact: true }).click();
  expect(await page.evaluate(() => window.__mobileOriginalNavClicks)).toContain('dashboard');
});

test('mobile bottom navigation rises above browser visual viewport occlusion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.defineProperties(viewport, {
      height: { get: () => 700 },
      offsetTop: { get: () => 0 },
      width: { get: () => window.innerWidth },
      offsetLeft: { get: () => 0 },
      scale: { get: () => 1 },
    });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  });

  await page.goto('/#/home');
  await expectMobileChrome(page);

  const inset = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bes-mobile-browser-bottom-inset')) || 0);
  expect(inset).toBeGreaterThan(0);

  const bottom = await page.locator('.bes-mobile-bottomnav').evaluate((element) => Number.parseFloat(getComputedStyle(element).bottom));
  expect(bottom).toBeGreaterThanOrEqual(inset);
});

test('mobile login uses Brian English identity and removes the duplicate brand strip', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/login');
  await expectMobileChrome(page);
  await expect(page.locator('.auth-google-page')).toBeVisible();

  const brand = page.locator('.bes-mobile-brand__copy');
  await expect(brand).toContainText('Brian English');
  await expect(brand).not.toContainText('Đăng nhập');
  await expect(page.locator('.auth-google-brand-row')).not.toBeVisible();
});

test('mobile login removes the teacher hero and starts with the auth form', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/login');
  await expect(page.locator('.auth-google-page')).toBeVisible();
  await expect(page.locator('.auth-google-visual')).not.toBeVisible();
  await expect(page.locator('.auth-google-form')).toBeVisible();
});

test('mobile login keeps the auth form readable, touch friendly and inside the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/login');
  const card = page.locator('.auth-google-form');
  await expect(card).toBeVisible();

  const primary = await page.locator('.auth-google-submit').boundingBox();
  expect(primary?.height || 0).toBeGreaterThanOrEqual(52);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('mobile login condenses the global footer instead of showing the full credentials list', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/login');
  await expect(page.locator('.signature-footer-v50')).toBeVisible();
  await expect(page.locator('.signature-footer-v50-credentials ul')).not.toBeVisible();
  await expect(page.locator('.signature-footer-v50-details .detail-centre')).not.toBeVisible();
});

test('desktop login keeps the existing desktop composition', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/#/login');
  await expect(page.locator('.auth-google-page')).toBeVisible();
  await expect(page.locator('.auth-google-brand-row')).toBeVisible();
  await expect(page.locator('.auth-google-visual')).toBeVisible();

  const columns = await page.locator('.auth-google-stage').evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);
  expect(columns).toBe(2);
});
