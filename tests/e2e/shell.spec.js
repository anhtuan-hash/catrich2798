import { test, expect } from '@playwright/test';

test('public shell boots without legacy DOM patch assets', async ({ page }) => {
  await page.goto('/#/home');
  await expect(page.locator('#bes-main-content')).toBeVisible();
  await expect(page.locator('meta[name="bes-app-version"]')).toHaveAttribute('content', '11.1.0');
  const legacy = await page.locator('[data-bes-command-center-version],[data-bes-ai-chat-hotfix],[data-bes-ai-slot-hotfix],[data-bes-platform-version]').count();
  expect(legacy).toBe(0);
});

test('keyboard focus and skip link work', async ({ page }) => {
  await page.goto('/#/home');
  await page.keyboard.press('Tab');
  await expect(page.locator('.bes-skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#bes-main-content')).toBeFocused();
});
