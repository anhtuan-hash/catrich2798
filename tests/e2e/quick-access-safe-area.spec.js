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

  test('V4.7: Command Palette opens with Ctrl/Cmd+K and returns permission-aware apps', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');

    await expect(page.locator('.bqa-command-palette')).toBeVisible();
    const input = page.locator('.bqa-command-palette-search input');
    await expect(input).toBeFocused();
    await input.fill('Dashboard');
    await expect(page.locator('.bqa-command-palette-result').first()).toContainText('Dashboard');

    await page.keyboard.press('Escape');
    await expect(page.locator('.bqa-command-palette')).toBeHidden();
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

  test('V4.1: Adaptive Dock applies proximity distances without changing rail geometry', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();
    const buttons = page.locator('.bqa-rail-items[data-adaptive-dock="true"] .bqa-rail-button');
    await expect(buttons).toHaveCount(await buttons.count());
    expect(await buttons.count()).toBeGreaterThanOrEqual(3);

    const railBefore = await page.locator('.bqa-rail').evaluate((rail) => {
      const rect = rail.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    });

    await buttons.nth(2).hover();
    await page.waitForTimeout(220);

    await expect(buttons.nth(2)).toHaveAttribute('data-dock-distance', '0');
    await expect(buttons.nth(1)).toHaveAttribute('data-dock-distance', '1');
    await expect(buttons.nth(0)).toHaveAttribute('data-dock-distance', '2');

    // Headless browser pointer-capability media queries can report coarse/none
    // even though hover() is available. The DOM proximity contract is therefore
    // asserted here; the transform values themselves are covered by the static
    // V4.1 CSS contract checks.
    const railAfter = await page.locator('.bqa-rail').evaluate((rail) => {
      const rect = rail.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    });
    expect(Math.abs(railAfter.width - railBefore.width)).toBeLessThan(0.5);
    expect(Math.abs(railAfter.left - railBefore.left)).toBeLessThan(0.5);
  });

  test('V4.2: live status capsules render API-driven status and progress', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();

    await page.evaluate(() => {
      window.BrianQuickAccessCapsules?.set?.({
        itemId: 'route:apps',
        label: 'Ứng dụng',
        text: '3 cập nhật mới',
        tone: 'warning',
        progress: 40,
      });
    });

    const appsButton = page.locator('.bqa-rail-button[aria-label="Ứng dụng"]');
    await appsButton.hover();
    await page.waitForTimeout(180);

    const capsule = page.locator('.bqa-status-capsule');
    await expect(capsule).toBeVisible();
    await expect(capsule).toContainText('Ứng dụng');
    await expect(capsule).toContainText('3 cập nhật mới');
    await expect(capsule).toHaveClass(/is-warning/);

    const progress = await capsule.locator('.bqa-status-capsule-progress > i').evaluate((bar) => getComputedStyle(bar).width);
    expect(Number.parseFloat(progress)).toBeGreaterThan(0);

    await page.evaluate(() => window.BrianQuickAccessCapsules?.clear?.('route:apps'));
    await page.mouse.move(800, 700);
    await page.waitForTimeout(160);
    await expect(capsule).toBeHidden();
  });

  test('V4.3: Quick Peek exposes contextual actions without opening the app first', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();

    const attendanceButton = page.locator('.bqa-rail-button[aria-label="Điểm danh"]');
    await attendanceButton.hover();
    await page.waitForTimeout(460);

    const peek = page.locator('.bqa-peek-card');
    await expect(peek).toBeVisible();
    await expect(peek).toContainText('Điểm danh');

    const actions = peek.locator('.bqa-peek-actions');
    await expect(actions).toBeVisible();
    await expect(actions.getByRole('button', { name: /Điểm danh ngay/i })).toBeVisible();
    await expect(peek.locator('.bqa-peek-open')).toBeVisible();
  });

  test('V4.6: notification center aggregates permitted Quick Access updates', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();

    await page.evaluate(() => {
      window.BrianQuickAccessNotifications?.push?.({
        id: 'qa-notification-center-test',
        itemId: 'route:apps',
        title: 'Ứng dụng',
        text: 'Có 2 cập nhật cần xem',
        tone: 'warning',
      });
    });

    const bell = page.locator('.bqa-rail-notifications');
    await expect(bell).toBeVisible();
    await expect(bell).toContainText('1');
    await bell.click();

    const center = page.locator('.bqa-notification-center');
    await expect(center).toBeVisible();
    await expect(center).toContainText('Thông báo');
    await expect(center).toContainText('Ứng dụng');
    await expect(center).toContainText('Có 2 cập nhật cần xem');

    await page.evaluate(() => window.BrianQuickAccessNotifications?.clear?.('qa-notification-center-test'));
    await page.waitForTimeout(120);
    await expect(page.locator('.bqa-rail-notifications')).toBeHidden();
  });

  test('V4.8: workflow bundles persist selected steps and resume one step at a time', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();

    const workflowButton = page.locator('.bqa-rail-workflows');
    await expect(workflowButton).toBeVisible();
    await workflowButton.click();

    const center = page.locator('.bqa-workflow-center');
    await expect(center).toBeVisible();
    await center.locator('input[type="text"]').fill('Buổi sáng');

    const picker = center.locator('.bqa-workflow-picker');
    await picker.getByRole('button', { name: /Dashboard/i }).click();
    await picker.getByRole('button', { name: /Ứng dụng/i }).click();
    await expect(center.locator('.bqa-workflow-builder-head')).toContainText('2/5');

    await center.locator('.bqa-workflow-save').click();
    const card = center.locator('.bqa-workflow-card').filter({ hasText: 'Buổi sáng' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('2 bước');

    await card.getByRole('button', { name: /Bắt đầu/i }).click();
    await expect(page).toHaveURL(/#\/dashboard/);

    await expect(page.locator('.bqa-root')).toBeVisible();
    await page.locator('.bqa-rail-workflows').click();
    const active = page.locator('.bqa-workflow-active');
    await expect(active).toBeVisible();
    await expect(active).toContainText('Buổi sáng');
    await expect(active).toContainText('1/2');
    await expect(active).toContainText('Ứng dụng');

    const stored = await page.evaluate(() => {
      const key = Object.keys(sessionStorage).find((candidate) => candidate.startsWith('bes-quick-access-workflow-run:'));
      return key ? JSON.parse(sessionStorage.getItem(key) || 'null') : null;
    });
    expect(stored?.nextIndex).toBe(1);
  });

  test('V4.9: time-aware workspace shows local-time priorities and can be disabled per account', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();

    await page.locator('.bqa-rail').hover();
    const timeAware = page.locator('.bqa-time-aware');
    await expect(timeAware).toBeVisible();
    await expect(timeAware).toHaveAttribute('data-time-band', /morning|teaching|wrapup|quiet/);
    await expect(timeAware.locator('.bqa-time-aware-items button')).toHaveCount(3);

    await page.locator('.bqa-rail-settings').click();
    const customizer = page.locator('.bqa-customizer');
    await expect(customizer).toBeVisible();

    const toggle = customizer.locator('.bqa-personalize-toggle').filter({ hasText: 'Ưu tiên theo thời gian' });
    const checkbox = toggle.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    await page.locator('.bqa-done').click();
    await page.locator('.bqa-rail').hover();
    await expect(page.locator('.bqa-time-aware')).toHaveCount(0);
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-time-aware', 'false');
  });

  test('V4.10: classroom presentation mode masks sensitive chrome and restores it on exit', async ({ page }) => {
    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toBeVisible();

    await page.evaluate(() => {
      window.BrianQuickAccessNotifications?.push?.({
        id: 'qa-classroom-private-alert',
        itemId: 'route:apps',
        title: 'Cập nhật nội bộ',
        text: 'Thông báo riêng cho giáo viên',
        tone: 'warning',
      });
    });

    await expect(page.locator('.bqa-rail-notifications')).toBeVisible();

    const accountName = page.locator('.brian-nav__account > strong');
    if (await accountName.count()) await expect(accountName).toBeVisible();

    const presentation = page.locator('.bqa-rail-classroom');
    await expect(presentation).toBeVisible();
    await presentation.click();

    const root = page.locator('.bqa-root');
    await expect(root).toHaveAttribute('data-classroom-mode', 'true');
    await expect(root).toHaveClass(/is-classroom-mode/);
    await expect(page.locator('html')).toHaveAttribute('data-brian-classroom-mode', 'true');
    await expect(page.locator('.bqa-classroom-banner')).toBeVisible();

    await expect(page.locator('.bqa-rail-notifications')).toBeHidden();
    await expect(page.locator('.bqa-rail-workflows')).toBeHidden();
    await expect(page.locator('.bqa-rail-button[aria-label="Báo cáo"]')).toHaveCount(0);
    await expect(page.locator('.bqa-rail-button[aria-label="TTCM"]')).toHaveCount(0);
    await expect(page.locator('.bqa-rail-button[aria-label="Kế hoạch"]')).toHaveCount(0);

    const reportTab = page.locator('.brian-nav__reports-tab');
    if (await reportTab.count()) await expect(reportTab).toBeHidden();
    const ttcmTab = page.locator('.brian-nav__ttcm-tab');
    if (await ttcmTab.count()) await expect(ttcmTab).toBeHidden();
    const globalBell = page.locator('.brian-nav__bell');
    if (await globalBell.count()) await expect(globalBell).toBeHidden();
    if (await accountName.count()) await expect(accountName).toBeHidden();

    const stored = await page.evaluate(() => {
      const key = Object.keys(sessionStorage).find((candidate) => candidate.startsWith('bes-quick-access-classroom-mode:'));
      return key ? sessionStorage.getItem(key) : null;
    });
    expect(stored).toBe('true');

    await presentation.click();
    await expect(root).toHaveAttribute('data-classroom-mode', 'false');
    await expect(page.locator('html')).toHaveAttribute('data-brian-classroom-mode', 'false');
    await expect(page.locator('.bqa-classroom-banner')).toHaveCount(0);
    if (await accountName.count()) await expect(accountName).toBeVisible();

    await page.evaluate(() => window.BrianQuickAccessNotifications?.clear?.('qa-classroom-private-alert'));
  });

  test('V4.11: sidebar themes switch instantly and persist for the account', async ({ page }) => {
    await page.goto('/#/apps');
    const root = page.locator('.bqa-root');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-theme-style', 'glass');

    await page.locator('.bqa-rail').hover();
    await page.locator('.bqa-rail-settings').click();

    const customizer = page.locator('.bqa-customizer');
    await expect(customizer).toBeVisible();
    const themes = customizer.locator('.bqa-theme-picker');
    await expect(themes).toBeVisible();
    await expect(themes.locator('> button')).toHaveCount(4);

    const colorTheme = themes.locator('> button').filter({ hasText: 'Color' });
    await colorTheme.click();
    await expect(root).toHaveAttribute('data-theme-style', 'color');
    await expect(colorTheme).toHaveClass(/is-active/);

    await page.locator('.bqa-done').click();
    await page.reload();
    await expect(page.locator('.bqa-root')).toBeVisible();
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-theme-style', 'color');

    await page.locator('.bqa-rail').hover();
    await page.locator('.bqa-rail-settings').click();
    const paperTheme = page.locator('.bqa-theme-picker > button').filter({ hasText: 'Paper' });
    await paperTheme.click();
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-theme-style', 'paper');
  });

  test('V4.12: spatial memory restores device workspace, side, last app and panel position', async ({ page }) => {
    await page.goto('/#/apps');
    const root = page.locator('.bqa-root');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-spatial-memory', 'true');

    await page.locator('.bqa-rail').hover();
    const workspaceTabs = page.locator('.bqa-workspace-tabs');
    await workspaceTabs.getByRole('button', { name: 'Chủ nhiệm', exact: true }).click();
    await expect(root).toHaveAttribute('data-workspace', 'homeroom');

    const panel = page.locator('.bqa-panel');
    await panel.evaluate((element) => {
      element.scrollTop = Math.min(24, Math.max(0, element.scrollHeight - element.clientHeight));
      element.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await page.waitForTimeout(180);

    await page.locator('.bqa-rail-settings').click();
    const customizer = page.locator('.bqa-customizer');
    await expect(customizer).toBeVisible();
    const contextControl = customizer.locator('.bqa-context-memory-control');
    await expect(contextControl).toBeVisible();
    const contextCheckbox = contextControl.locator('input[type="checkbox"]');
    await expect(contextCheckbox).toBeChecked();
    await contextCheckbox.uncheck();

    const spatialControl = customizer.locator('.bqa-spatial-control');
    await expect(spatialControl).toBeVisible();
    await expect(spatialControl.locator('input[type="checkbox"]')).toBeChecked();

    await customizer.getByRole('button', { name: 'Phải', exact: true }).click();
    await expect(root).toHaveAttribute('data-side', 'right');
    await page.locator('.bqa-done').click();

    await page.locator('.bqa-rail-button[aria-label="Dashboard"]').click();
    await expect(page).toHaveURL(/#\/dashboard/);
    await page.waitForTimeout(180);

    const stored = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('bes-quick-access-spatial-v1:'));
      return key ? JSON.parse(localStorage.getItem(key) || 'null') : null;
    });
    expect(stored?.workspace).toBe('homeroom');
    expect(stored?.side).toBe('right');
    expect(stored?.lastItemId).toBe('route:dashboard');
    expect(Object.keys(stored?.scroll || {}).length).toBeGreaterThan(0);

    await page.reload();
    await expect(page.locator('.bqa-root')).toBeVisible();
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-workspace', 'homeroom');
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-side', 'right');

    await page.locator('.bqa-edge-trigger').hover({ force: true });
    await page.waitForTimeout(420);
    await expect(page.locator('.bqa-root')).toHaveClass(/is-open/);
    await page.locator('.bqa-rail-settings').click();
    const resetSpatial = page.locator('.bqa-spatial-control').getByRole('button', { name: 'Quên bố cục thiết bị' });
    await resetSpatial.click();
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-workspace', 'all');
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-side', 'left');
  });

  test('V4.13: route workspace memory restores a different workspace for each page context', async ({ page }) => {
    await page.goto('/#/apps');
    const root = page.locator('.bqa-root');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-context-memory', 'true');
    await expect(root).toHaveAttribute('data-context-key', 'apps');

    await page.locator('.bqa-rail').hover();
    await page.locator('.bqa-workspace-tabs').getByRole('button', { name: 'Chủ nhiệm', exact: true }).click();
    await expect(root).toHaveAttribute('data-workspace', 'homeroom');

    await page.goto('/#/dashboard');
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-context-key', 'dashboard');
    await page.locator('.bqa-rail').hover();
    await page.locator('.bqa-workspace-tabs').getByRole('button', { name: 'Giảng dạy', exact: true }).click();
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-workspace', 'teaching');

    await page.goto('/#/apps');
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-context-key', 'apps');
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-workspace', 'homeroom');

    await page.goto('/#/dashboard');
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-context-key', 'dashboard');
    await expect(page.locator('.bqa-root')).toHaveAttribute('data-workspace', 'teaching');

    const stored = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('bes-quick-access-context-v1:'));
      return key ? JSON.parse(localStorage.getItem(key) || '{}') : {};
    });
    expect(stored.apps).toBe('homeroom');
    expect(stored.dashboard).toBe('teaching');

    await page.locator('.bqa-rail').hover();
    await page.locator('.bqa-rail-settings').click();
    const control = page.locator('.bqa-context-memory-control');
    await expect(control).toBeVisible();
    await expect(control.locator('input[type="checkbox"]')).toBeChecked();
    await control.getByRole('button', { name: 'Quên ngữ cảnh đã nhớ' }).click();

    const cleared = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('bes-quick-access-context-v1:'));
      return key ? JSON.parse(localStorage.getItem(key) || '{}') : {};
    });
    expect(cleared).toEqual({});
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
