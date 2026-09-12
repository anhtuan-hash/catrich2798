import { test, expect } from '@playwright/test';

const DEMO_SESSION_KEY = 'bes-offline-demo-user-v943';

function demoUser(role, permissions = { mode: 'all', allowed: [] }) {
  const suffix = role === 'department_head' ? 'ttcm' : role;
  return {
    id: `regression-${suffix}`,
    authId: `regression-${suffix}`,
    role,
    name: role === 'admin' ? 'Regression Admin' : role === 'department_head' ? 'Regression TTCM' : 'Regression Teacher',
    school: 'Brian English Regression',
    email: `regression.${suffix}@brianenglish.local`,
    approved: true,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
    permissions,
    provider: 'offline-demo',
    demo: true,
  };
}

async function installDemoSession(page, user) {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.localStorage.setItem('bet-language', 'vi');
  }, { key: DEMO_SESSION_KEY, value: user });
}

function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error?.stack || error?.message || error)));
  return errors;
}

async function assertRouteBoots(page, route, expectedRoute = route.replace('#/', '').split('/')[0]) {
  await page.goto(`/${route}`);
  await expect(page.locator('#bes-main-content')).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', expectedRoute);
  await expect(page.getByRole('heading', { name: /Chưa được cấp quyền|Permission required/i })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/Application error|ChunkLoadError|Cannot read properties of undefined/i);
}

const roleMatrix = [
  {
    name: 'Admin',
    role: 'admin',
    routes: [
      ['#/home', 'home'],
      ['#/apps', 'apps'],
      ['#/dashboard', 'dashboard'],
      ['#/homeroom', 'homeroom'],
      ['#/tool/gradebook-studio', 'tool'],
      ['#/tool/lesson-plan-ai', 'tool'],
      ['#/resource-library', 'resource-library'],
      ['#/knowledge-hub', 'knowledge-hub'],
      ['#/settings', 'settings'],
      ['#/admin', 'admin'],
      ['#/production-hardening', 'production-hardening'],
    ],
  },
  {
    name: 'TTCM',
    role: 'department_head',
    routes: [
      ['#/home', 'home'],
      ['#/apps', 'apps'],
      ['#/dashboard', 'dashboard'],
      ['#/homeroom', 'homeroom'],
      ['#/tool/gradebook-studio', 'tool'],
      ['#/tool/lesson-plan-ai', 'tool'],
      ['#/resource-library', 'resource-library'],
      ['#/knowledge-hub', 'knowledge-hub'],
      ['#/settings', 'settings'],
      ['#/production-hardening', 'production-hardening'],
    ],
  },
  {
    name: 'Teacher',
    role: 'teacher',
    routes: [
      ['#/home', 'home'],
      ['#/apps', 'apps'],
      ['#/dashboard', 'dashboard'],
      ['#/homeroom', 'homeroom'],
      ['#/tool/gradebook-studio', 'tool'],
      ['#/tool/lesson-plan-ai', 'tool'],
      ['#/resource-library', 'resource-library'],
      ['#/knowledge-hub', 'knowledge-hub'],
      ['#/settings', 'settings'],
    ],
  },
];

for (const scenario of roleMatrix) {
  test(`${scenario.name} critical web routes boot without access or runtime failures`, async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await installDemoSession(page, demoUser(scenario.role));

    for (const [route, expectedRoute] of scenario.routes) {
      await assertRouteBoots(page, route, expectedRoute);
    }

    await expect(pageErrors, `Unhandled browser errors for ${scenario.name}: ${pageErrors.join('\n')}`).toEqual([]);
  });
}

test('Lesson Architect opens its real module instead of falling back to Apps', async ({ page }) => {
  await installDemoSession(page, demoUser('teacher'));
  await page.goto('/#/tool/lesson-plan-ai');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'tool');
  await expect(page).toHaveURL(/#\/tool\/lesson-plan-ai/);
  await expect(page.locator('#bes-main-content')).toContainText(/Lesson Architect/i);
});

test('teacher without route:dashboard is denied and login fallback avoids Dashboard', async ({ page }) => {
  const restricted = demoUser('teacher', {
    mode: 'custom',
    allowed: ['tool:gradebook-studio'],
  });
  await installDemoSession(page, restricted);

  await page.goto('/#/dashboard');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'dashboard');
  await expect(page.getByRole('heading', { name: /Chưa được cấp quyền|Permission required/i })).toBeVisible();

  await page.goto('/#/login');
  await expect.poll(() => page.url()).toMatch(/#\/apps(?:$|[?&])/);
  await expect(page.url()).not.toContain('#/dashboard');

  await page.goto('/#/tool/gradebook-studio');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'tool');
  await expect(page.getByRole('heading', { name: /Chưa được cấp quyền|Permission required/i })).toHaveCount(0);
});
