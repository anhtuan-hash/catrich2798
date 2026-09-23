import { test, expect } from '@playwright/test';

const DEMO_SESSION_KEY = 'bes-offline-demo-user-v943';
const COLLISION_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="tab"]',
  '[role="gridcell"]',
  '[role="columnheader"]',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'th',
  'td',
].join(',');

function adminUser() {
  return {
    id: 'quick-access-safe-area-admin',
    authId: 'quick-access-safe-area-admin',
    role: 'admin',
    name: 'Quick Access Layout Admin',
    school: 'Brian English Regression',
    email: 'quick-access.safe-area@brianenglish.local',
    approved: true,
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
    permissions: { mode: 'all', allowed: [] },
    provider: 'offline-demo',
    demo: true,
  };
}

async function installDemoSession(page) {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.localStorage.setItem('bet-language', 'vi');
  }, { key: DEMO_SESSION_KEY, value: adminUser() });
}

async function getOcclusionReport(page, boundarySelector) {
  return page.evaluate(({ boundarySelector, collisionSelector }) => {
    const shell = document.querySelector('.app-shell');
    const main = document.querySelector('#bes-main-content');
    const boundaryElement = document.querySelector(boundarySelector);
    if (!shell || !main || !boundaryElement) {
      return { missing: true, shell: Boolean(shell), main: Boolean(main), boundary: Boolean(boundaryElement) };
    }

    const boundary = boundaryElement.getBoundingClientRect();
    const boundaryRight = boundary.right + 2;
    const overlaps = [];

    [...main.querySelectorAll(collisionSelector)].forEach((element) => {
      if (element.closest('[aria-hidden="true"]')) return;
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) <= 0.01) return;
      if (style.position === 'fixed') return;

      const rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      if (rect.right <= 0 || rect.left >= window.innerWidth) return;
      if (rect.left + 0.5 >= boundaryRight) return;

      overlaps.push({
        tag: element.tagName,
        text: String(element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 80),
        left: Math.round(rect.left),
        boundaryRight: Math.round(boundaryRight),
      });
    });

    return {
      missing: false,
      route: shell.dataset.route,
      state: shell.dataset.quickAccessState,
      safeMode: shell.dataset.quickAccessSafeMode,
      shift: Number(shell.dataset.quickAccessSafeShift || 0),
      boundaryRight: Math.round(boundaryRight),
      overlaps: overlaps.slice(0, 12),
    };
  }, { boundarySelector, collisionSelector: COLLISION_SELECTOR });
}

const routes = [
  ['Ứng dụng', '#/apps', 'apps'],
  ['Dashboard', '#/dashboard', 'dashboard'],
  ['Chủ nhiệm', '#/homeroom', 'homeroom'],
  ['Báo cáo/TTCM', '#/tool/brian-team', 'tool'],
  ['Sổ điểm', '#/tool/gradebook-studio', 'tool'],
  ['Kho tài liệu', '#/resource-library', 'resource-library'],
  ['Ngân hàng câu hỏi', '#/assessment-core', 'assessment-core'],
  ['Cài đặt', '#/settings', 'settings'],
];

test.describe('Global Quick Access safe area', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 960 });
    await installDemoSession(page);
  });

  for (const [label, route, expectedRoute] of routes) {
    test(`${label}: collapsed rail never covers meaningful page content`, async ({ page }) => {
      await page.goto('/' + route);
      await expect(page.locator('.app-shell')).toHaveAttribute('data-route', expectedRoute);
      await expect(page.locator('.bqa-root')).toBeVisible();
      await expect(page.locator('.app-shell')).toHaveAttribute('data-quick-access-layout', 'true');
      await page.waitForTimeout(1100);

      const report = await getOcclusionReport(page, '.bqa-rail');
      expect(report.missing, JSON.stringify(report, null, 2)).toBe(false);
      if (report.safeMode) expect(['reserve', 'overlay']).toContain(report.safeMode);
      expect(report.overlaps, JSON.stringify(report, null, 2)).toEqual([]);
    });
  }

  test('Apps: hovering the rail fully expands the Quick Access panel', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();
    await page.waitForTimeout(900);

    await page.locator('.bqa-rail').hover();
    await expect(page.locator('.bqa-root')).toHaveClass(/is-open/);
    await page.waitForTimeout(330);

    const panelState = await page.locator('.bqa-panel').evaluate((panel) => {
      const style = getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();
      const header = panel.querySelector('.bqa-panel-header');
      const headerStyle = header ? getComputedStyle(header) : null;
      return {
        visibility: style.visibility,
        opacity: Number(style.opacity),
        pointerEvents: style.pointerEvents,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        transform: style.transform,
        headerOpacity: Number(headerStyle?.opacity || 0),
      };
    });

    expect(panelState.visibility).toBe('visible');
    expect(panelState.opacity).toBeGreaterThan(0.99);
    expect(panelState.pointerEvents).toBe('auto');
    expect(panelState.width).toBeGreaterThanOrEqual(310);
    expect(panelState.height).toBeGreaterThan(380);
    expect(panelState.headerOpacity).toBeGreaterThan(0.99);
    expect(panelState.transform === 'none' || panelState.transform.includes('matrix(1')).toBeTruthy();
  });

  test('Apps: pointer reversal remains stable during Quick Access motion', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();
    await page.waitForTimeout(700);

    await page.locator('.bqa-rail').hover();
    await page.waitForTimeout(90);
    await page.mouse.move(900, 700);
    await page.waitForTimeout(80);
    await page.locator('.bqa-rail').hover();
    await page.waitForTimeout(280);

    await expect(page.locator('.bqa-root')).toHaveClass(/is-open/);
    const state = await page.locator('.bqa-panel').evaluate((panel) => {
      const style = getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();
      return {
        opacity: Number(style.opacity),
        width: Math.round(rect.width),
        visibility: style.visibility,
      };
    });

    expect(state.visibility).toBe('visible');
    expect(state.opacity).toBeGreaterThan(0.98);
    expect(state.width).toBeGreaterThanOrEqual(310);
  });

  test('V2: command search opens with Ctrl/Cmd+K and returns apps', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');

    await expect(page.locator('.bqa-root')).toHaveClass(/is-open/);
    const input = page.locator('.bqa-command-search input');
    await expect(input).toBeFocused();
    await input.fill('Dashboard');
    await expect(page.locator('.bqa-command-result')).toContainText('Dashboard');
  });

  test('V2: Focus mode hides the resting rail and edge hover restores it', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();
    await page.locator('.bqa-rail').hover();
    await expect(page.locator('.bqa-root')).toHaveClass(/is-open/);

    await page.locator('.bqa-mode-switch button').nth(2).click();
    await page.mouse.move(900, 700);
    await page.waitForTimeout(500);
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-sidebar-mode', 'focus');

    const resting = await page.locator('.bqa-rail').evaluate((rail) => {
      const style = getComputedStyle(rail);
      return { opacity: Number(style.opacity), transform: style.transform };
    });
    expect(resting.opacity).toBeLessThan(0.1);

    await page.locator('.bqa-edge-trigger').hover({ force: true });
    await expect(page.locator('.bqa-root')).toHaveClass(/is-open/);
    await page.waitForTimeout(300);
    const openedOpacity = await page.locator('.bqa-rail').evaluate((rail) => Number(getComputedStyle(rail).opacity));
    expect(openedOpacity).toBeGreaterThan(0.95);
  });

  test('V2: quick actions are available from a shortcut row', async ({ page }) => {
    await page.goto('/#/apps');
    await page.locator('.bqa-rail').hover();
    await expect(page.locator('.bqa-root')).toHaveClass(/is-open/);

    const more = page.locator('.bqa-item-more').first();
    await more.click();
    await expect(page.locator('.bqa-action-sheet')).toBeVisible();
    await expect(page.locator('.bqa-action-sheet [role="menuitem"]').first()).toBeVisible();
  });

  test('Dashboard: collapsed Quick Access panel leaves no visible ghost beside the rail', async ({ page }) => {
    await page.goto('/#/dashboard');
    await expect(page.locator('.bqa-root')).toBeVisible();
    await page.waitForTimeout(1100);

    await expect(page.locator('.bqa-root')).toHaveClass(/is-collapsed/);
    await expect(page.locator('.bqa-root')).not.toHaveClass(/is-collapsing/);
    await expect(page.locator('.bqa-panel')).toBeHidden();

    const state = await page.locator('.bqa-panel').evaluate((panel) => {
      const style = getComputedStyle(panel);
      const header = panel.querySelector('.bqa-panel-header');
      const headerStyle = header ? getComputedStyle(header) : null;
      return {
        visibility: style.visibility,
        opacity: Number(style.opacity),
        pointerEvents: style.pointerEvents,
        headerVisibility: headerStyle?.visibility || '',
        headerOpacity: Number(headerStyle?.opacity || 0),
      };
    });

    expect(state.visibility).toBe('hidden');
    expect(state.opacity).toBe(0);
    expect(state.pointerEvents).toBe('none');
    expect(state.headerOpacity).toBe(0);
  });

  test('V3.3.1: right side is a true mirror with rail on the screen edge and panel expanding inward', async ({ page }) => {
    await page.goto('/#/dashboard');
    await expect(page.locator('.bqa-root')).toBeVisible();

    await page.locator('.bqa-rail').hover();
    await expect(page.locator('.bqa-root')).toHaveClass(/is-open/);
    await page.locator('.bqa-rail-settings').click();
    await expect(page.locator('.bqa-customizer')).toBeVisible();

    const personalize = page.locator('.bqa-personalize-panel');
    await expect(personalize).toBeVisible();
    await personalize.getByRole('button', { name: 'Phải', exact: true }).click();
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-side', 'right');

    await page.locator('.bqa-done').click();
    await page.mouse.move(700, 700);
    await page.waitForTimeout(650);

    await expect(page.locator('.app-shell')).toHaveAttribute('data-quick-access-safe-mode', 'overlay');
    await expect(page.locator('.app-shell')).toHaveAttribute('data-quick-access-safe-shift', '0');

    await page.locator('.bqa-edge-trigger').hover({ force: true });
    await page.waitForTimeout(420);
    await expect(page.locator('.bqa-root')).toHaveClass(/is-open/);

    const geometry = await page.evaluate(() => {
      const rail = document.querySelector('.bqa-rail')?.getBoundingClientRect();
      const panel = document.querySelector('.bqa-panel')?.getBoundingClientRect();
      const trigger = document.querySelector('.bqa-edge-trigger')?.getBoundingClientRect();
      return {
        width: window.innerWidth,
        rail: rail ? { left: rail.left, right: rail.right, width: rail.width } : null,
        panel: panel ? { left: panel.left, right: panel.right, width: panel.width } : null,
        trigger: trigger ? { left: trigger.left, right: trigger.right, width: trigger.width } : null,
      };
    });

    expect(geometry.rail).not.toBeNull();
    expect(geometry.panel).not.toBeNull();
    expect(geometry.trigger).not.toBeNull();
    expect(geometry.width - geometry.rail.right).toBeGreaterThanOrEqual(6);
    expect(geometry.width - geometry.rail.right).toBeLessThanOrEqual(10);
    expect(geometry.panel.right).toBeLessThanOrEqual(geometry.rail.left - 6);
    expect(geometry.panel.left).toBeGreaterThanOrEqual(0);
    expect(geometry.trigger.right).toBeGreaterThanOrEqual(geometry.width - 1);
    expect(geometry.trigger.left).toBeGreaterThan(geometry.width - 30);
  });

  test('pinned panel reflows content instead of covering it', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();

    await page.locator('.bqa-rail').hover();
    await expect(page.locator('.bqa-root')).toHaveClass(/is-open/);

    // V2 uses the three-state mode switch. Select Pin directly so this case
    // remains about pinned-layout geometry rather than hover hit-testing.
    await page.locator('.bqa-mode-switch button').nth(1).click();

    await expect(page.locator('.bqa-root')).toHaveClass(/is-pinned/);
    await expect(page.locator('.app-shell')).toHaveAttribute('data-quick-access-state', 'pinned');
    await page.waitForTimeout(850);

    const report = await getOcclusionReport(page, '.bqa-panel');
    expect(report.missing, JSON.stringify(report, null, 2)).toBe(false);
    expect(report.shift, JSON.stringify(report, null, 2)).toBeGreaterThan(0);
    expect(report.overlaps, JSON.stringify(report, null, 2)).toEqual([]);
  });
});
