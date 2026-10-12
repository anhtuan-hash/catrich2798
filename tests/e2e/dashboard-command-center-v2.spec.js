import { test, expect } from '@playwright/test';

const DEMO_KEY = 'bes-offline-demo-user-v943';
const demoUser = {
  id: 'command-center-e2e', authId: 'command-center-e2e',
  role: 'admin', name: 'Dashboard QA', school: 'Brian QA',
  email: 'dashboard.qa@brianenglish.local', approved: true,
  createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z',
  permissions: { mode: 'all', allowed: [] }, provider: 'offline-demo', demo: true,
};

async function openDashboard(page) {
  await page.addInitScript(({ key, user }) => {
    localStorage.setItem(key, JSON.stringify(user));
    localStorage.setItem('bet-language', 'vi');
  }, { key: DEMO_KEY, user: demoUser });
  await page.goto('/#/dashboard');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'dashboard');
  await expect(page.locator('.dcc-root')).toBeVisible({ timeout: 15000 });
}

test('command center exposes actionable cards and role-aware filters', async ({ page }) => {
  await openDashboard(page);
  await expect(page.locator('.dcc-stat')).toHaveCount(4);
  await expect(page.locator('.dcc-filters button')).toHaveCount(5);
  await page.locator('.dcc-filters').getByRole('button', { name: 'Quá hạn' }).click();
  await expect(page.locator('.dcc-filters').getByRole('button', { name: 'Quá hạn' })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.dcc-stats').getByRole('button', { name: /Chờ duyệt/i }).click();
  await expect(page.locator('.dcc-filters').getByRole('button', { name: 'Chờ duyệt' })).toHaveAttribute('aria-pressed', 'true');
});

test('weather location persists without changing other app settings', async ({ page }) => {
  await openDashboard(page);
  const location = page.locator('.editorial-weather-location');
  await expect(location).toHaveValue('binh-duong');
  await location.selectOption('ho-chi-minh');
  await expect(location).toHaveValue('ho-chi-minh');
  await page.reload();
  await expect(page.locator('.editorial-weather-location')).toHaveValue('ho-chi-minh');
});

test('mobile Bento UI does not introduce horizontal overflow and retains Drop Zone', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await openDashboard(page);
  await expect(page.locator('.dcc-stat')).toHaveCount(4);
  await expect(page.locator('.brian-dashboard-drop-zone')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 2);
});

test('2.1 shows the same number of events on the overview card and day agenda', async ({ page }) => {
  await openDashboard(page);
  await expect.poll(async () => {
    const card = await page.locator('.dcc-stat--blue .dcc-stat-number').innerText();
    const agenda = await page.locator('.gd-count-chip').innerText();
    return Number(card.replace(/[^0-9]/g, '')) === Number(agenda.match(/\d+/)?.[0] || -1);
  }).toBe(true);
});

test('2.1 switches from Today to seven grouped days and back', async ({ page }) => {
  await openDashboard(page);
  const toggle = page.locator('.gd-calendar-range-toggle');
  await toggle.getByRole('button', { name: '7 ngày tới' }).click();
  await expect(page.locator('.gd-week-day')).toHaveCount(7);
  await expect(toggle.getByRole('button', { name: '7 ngày tới' })).toHaveAttribute('aria-pressed', 'true');
  await toggle.getByRole('button', { name: 'Hôm nay' }).click();
  await expect(page.locator('.gd-date-poster')).toBeVisible();
});

test('2.1 searches task labels and keeps news collapsed by default', async ({ page }) => {
  await openDashboard(page);
  const search = page.locator('.dcc-task-search input[role="searchbox"]');
  const visibility = await page.evaluate(() => {
    const field = document.querySelector('.dcc-task-search input');
    const parents = [];
    for (let item = field; item && parents.length < 5; item = item.parentElement) {
      const style = getComputedStyle(item);
      const box = item.getBoundingClientRect();
      parents.push({ tag: item.tagName, class: String(item.className || '').slice(0, 70), display: style.display, visibility: style.visibility, width: box.width, height: box.height, tabindex: item.getAttribute('tabindex') });
    }
    return parents;
  });
  console.log('SEARCH_VISIBILITY_DIAGNOSTIC', JSON.stringify(visibility));
  await expect(search).toBeVisible();
  await expect(search).toHaveAttribute('aria-label', 'Tìm công việc...');
  await search.fill('a unique phrase that cannot match any task');
  await expect(page.locator('.dcc-empty')).toBeVisible();
  const toggle = page.locator('.dcc-news-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('2.1 week layout avoids horizontal overflow on phones', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await openDashboard(page);
  await page.locator('.gd-calendar-range-toggle').getByRole('button', { name: '7 ngày tới' }).click();
  await expect(page.locator('.gd-week-day')).toHaveCount(7);
  const width = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(width[0]).toBeLessThanOrEqual(width[1] + 2);
});

test('2.2 shows next event strip, source freshness and task scopes', async ({ page }) => {
  await openDashboard(page);
  await expect(page.locator('.dcc-next-event')).toBeVisible();
  await expect(page.locator('.dcc-sync-strip')).toBeVisible();
  const scope = page.locator('.dcc-scope-switch');
  await expect(scope.getByRole('button', { name: 'Toàn tổ' })).toHaveAttribute('aria-pressed', 'true');
  await scope.getByRole('button', { name: 'Việc của tôi' }).click();
  await expect(scope.getByRole('button', { name: 'Việc của tôi' })).toHaveAttribute('aria-pressed', 'true');
  await scope.getByRole('button', { name: 'Toàn tổ' }).click();
  await expect(scope.getByRole('button', { name: 'Toàn tổ' })).toHaveAttribute('aria-pressed', 'true');
});

test('2.2 can search task 119 beyond the legacy 80-task display cap', async ({ page }) => {
  await openDashboard(page);
  await page.evaluate((user) => {
    const tasks = Array.from({ length: 120 }, (_, index) => ({
      id: 'v22-e2e-task-' + index,
      title: 'Task ' + String(index).padStart(3, '0'),
      description: 'Individual task for search regression',
      item_type: 'task',
      status: 'assigned',
      owner_id: user.id,
      assignee_ids: [user.id],
      due_at: '2026-10-01T09:00:00+07:00',
      priority: 'normal',
    }));
    localStorage.setItem('bes-work-hub-v1093-local:' + user.id, JSON.stringify(tasks));
  }, demoUser);
  await page.reload();
  await expect(page.locator('.dcc-root')).toBeVisible();
  await expect(page.locator('.dcc-count')).toContainText('120', { timeout: 15000 });
  const field = page.locator('.dcc-task-search input[role="searchbox"]');
  await field.fill('Task 119');
  await expect(page.locator('.dcc-row-detail strong')).toContainText('Task 119');
  await expect(page.locator('.dcc-priority-row')).toHaveCount(1);
});

test('2.2 stays within mobile viewport with context strip visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDashboard(page);
  await expect(page.locator('.dcc-next-event')).toBeVisible();
  await expect(page.locator('.dcc-sync-strip')).toBeVisible();
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 2);
});

test('2.3 saves card order, visibility and density across reload', async ({ page }) => {
  await openDashboard(page);
  await page.locator('.dcc-customize-trigger').click();
  await expect(page.locator('.dcc-customizer')).toBeVisible();
  await page.getByRole('button', { name: 'Chuyển sang trái: Quá hạn' }).click();
  await expect(page.locator('.dcc-stat-label').first()).toHaveText('Quá hạn');
  const dueSoon = page.locator('.dcc-card-option').filter({ hasText: 'Sắp đến hạn' });
  await dueSoon.locator('.dcc-visibility-button').click();
  await expect(page.locator('.dcc-stat')).toHaveCount(3);
  await page.locator('.dcc-density-selector').getByRole('button', { name: 'Gọn' }).click();
  await expect(page.locator('.dcc-root')).toHaveClass(/dcc-density--compact/);
  await page.reload();
  await expect(page.locator('.dcc-root')).toBeVisible();
  await expect(page.locator('.dcc-stat')).toHaveCount(3);
  await expect(page.locator('.dcc-stat-label').first()).toHaveText('Quá hạn');
  await expect(page.locator('.dcc-root')).toHaveClass(/dcc-density--compact/);
  await page.locator('.dcc-customize-trigger').click();
  await page.locator('.dcc-reset-layout').click();
  await expect(page.locator('.dcc-stat')).toHaveCount(4);
  await expect(page.locator('.dcc-stat-label').first()).toHaveText('Lịch hôm nay');
  await expect(page.locator('.dcc-root')).toHaveClass(/dcc-density--comfortable/);
});

test('2.3 hides sections but calendar button reveals the hidden calendar', async ({ page }) => {
  await openDashboard(page);
  await page.locator('.dcc-customize-trigger').click();
  const calendarToggle = page.locator('.dcc-section-option').filter({ hasText: 'Lịch làm việc' });
  await calendarToggle.click();
  await expect(calendarToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#dashboard-calendar')).toHaveCount(0);
  await page.locator('.dcc-customize-trigger').click();
  await page.locator('.dcc-stat--blue').click();
  await expect(page.locator('#dashboard-calendar')).toBeVisible();
  await page.reload();
  await expect(page.locator('#dashboard-calendar')).toBeVisible();
});

test('2.3 customizer remains usable at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDashboard(page);
  await page.locator('.dcc-customize-trigger').click();
  await expect(page.locator('.dcc-card-option')).toHaveCount(4);
  await expect(page.locator('.dcc-section-option')).toHaveCount(8);
  const dimensions = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.doc).toBeLessThanOrEqual(dimensions.viewport + 2);
});

test('3.0 Daily Brief and Insights show grounded summaries without blocking old features', async ({ page }) => {
  await openDashboard(page);
  await expect(page.locator('.gd-v3-brief')).toBeVisible();
  await expect(page.locator('.gd-v3-insights')).toBeVisible();
  await expect(page.locator('.gd-v3-insight-cell')).toHaveCount(4);
  await expect(page.locator('.gd-v3-insights-progress')).toHaveAttribute('aria-valuenow', /\d+/);
  await expect(page.locator('.brian-dashboard-drop-zone')).toBeVisible();
  await expect(page.locator('.dcc-stat')).toHaveCount(4);
});

test('3.0 Calendar Month can show current and next month, then return to Today', async ({ page }) => {
  await openDashboard(page);
  const calendar = page.locator('#dashboard-calendar');
  await calendar.getByRole('button', { name: 'Tháng', exact: true }).click();
  await expect(calendar.locator('.gd-v3-month-grid')).toBeVisible();
  await expect(calendar.locator('.gd-v3-month-weekday')).toHaveCount(7);
  await calendar.getByRole('button', { name: 'Tháng tiếp theo' }).click();
  await expect(calendar.locator('.gd-v3-month-cell.is-current-month')).toHaveCount(30);
  await calendar.getByRole('button', { name: 'Hôm nay', exact: true }).click();
  await expect(calendar.locator('.gd-date-poster')).toBeVisible();
});

test('3.0 supports priority and date filters without changing source records', async ({ page }) => {
  await openDashboard(page);
  const filters = page.locator('.gd-v3-task-controls');
  await expect(filters.locator('select')).toHaveCount(2);
  await filters.getByLabel('Lọc theo ưu tiên').selectOption('urgent');
  await expect(filters.getByLabel('Lọc theo ưu tiên')).toHaveValue('urgent');
  await filters.getByLabel('Sắp xếp công việc').selectOption('date');
  await expect(filters.getByLabel('Sắp xếp công việc')).toHaveValue('date');
  await filters.getByLabel('Lọc theo ưu tiên').selectOption('all');
  await expect(page.locator('.dcc-root')).toBeVisible();
});

test('3.0 Widget Studio presets, order and size are persistent', async ({ page }) => {
  await openDashboard(page);
  await page.locator('.dcc-customize-trigger').click();
  const presets = page.locator('.gd-v3-preset-bar');
  await presets.getByRole('button', { name: 'Giáo viên', exact: true }).click();
  await expect(presets.getByRole('button', { name: 'Giáo viên', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.gd-v3-widget').first()).toHaveAttribute('data-widget', 'quickActions');
  const calendarControl = page.locator('.gd-v3-editor-widget').filter({ hasText: 'Lịch làm việc' });
  await calendarControl.locator('select').selectOption('tall');
  await expect(page.locator('.gd-v3-widget--calendar')).toHaveClass(/gd-v3-widget--tall/);
  await page.reload();
  await expect(page.locator('.gd-v3-widget').first()).toHaveAttribute('data-widget', 'quickActions');
  await expect(page.locator('.gd-v3-widget--calendar')).toHaveClass(/gd-v3-widget--tall/);
  await page.locator('.dcc-customize-trigger').click();
  await page.locator('.dcc-reset-layout').click();
  await expect(page.locator('.gd-v3-widget').first()).toHaveAttribute('data-widget', 'calendar');
});

test('3.0 respects mobile viewport with new widgets', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await openDashboard(page);
  await expect(page.locator('.gd-v3-brief')).toBeVisible();
  await expect(page.locator('.gd-v3-insights')).toBeVisible();
  const widths=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,
    client:document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client+2);
  await page.locator('.dcc-customize-trigger').click();
  await expect(page.locator('.gd-v3-editor-widget')).toHaveCount(4);
  const widthsEditor=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  expect(widthsEditor[0]).toBeLessThanOrEqual(widthsEditor[1]+2);
});

test('3.1 command palette finds apps, navigates and closes with Escape', async ({ page }) => {
  await openDashboard(page);
  await page.keyboard.press('Alt+Shift+K');
  const palette=page.getByRole('dialog',{name:'Tìm nhanh BRIAN'});
  await expect(palette).toBeVisible();
  const search=palette.getByRole('combobox',{name:'Tìm kiếm nhanh'});
  await expect(palette.locator('.gd-v31-palette-search')).toHaveAttribute('data-bes-keep-search','true');
  await expect(search).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill('Sổ điểm');
  await expect(palette.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(palette).toHaveCount(0);
  await page.locator('.gd-v31-search-trigger').click();
  await expect(palette).toBeVisible();
  await palette.getByRole('combobox',{name:'Tìm kiếm nhanh'}).fill('Sổ điểm');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/apps/);
});

test('3.1 focus mode persists and keeps priority work available', async ({ page }) => {
  await openDashboard(page);
  const focus=page.locator('.gd-v31-mode-button');
  await focus.click();
  await expect(page.locator('.gd-v31-page')).toHaveClass(/gd-v31-focus/);
  await expect(page.locator('.dcc-priority')).toBeVisible();
  await expect(page.locator('.gd-top-grid')).toBeHidden();
  await page.reload();
  await expect(page.locator('.gd-v31-page')).toHaveClass(/gd-v31-focus/);
  await page.locator('.gd-v31-mode-button').click();
  await expect(page.locator('.gd-top-grid')).toBeVisible();
});

test('3.1 midnight theme is per-account, persists and returns to daylight', async ({page})=>{
  await openDashboard(page);
  const theme=page.locator('.gd-v31-theme-button');
  await theme.click();
  await expect(page.locator('.gd-v31-page')).toHaveAttribute('data-dashboard-theme','midnight');
  await page.reload();
  await expect(page.locator('.gd-v31-page')).toHaveAttribute('data-dashboard-theme','midnight');
  await page.locator('.gd-v31-theme-button').click();
  await expect(page.locator('.gd-v31-page')).toHaveAttribute('data-dashboard-theme','daylight');
});

test('3.1 search, midnight theme and focus toolbar fit mobile', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openDashboard(page);
  await page.locator('.gd-v31-theme-button').click();
  await expect(page.locator('.gd-v31-page')).toHaveAttribute('data-dashboard-theme','midnight');
  await page.locator('.gd-v31-search-trigger').click();
  await expect(page.getByRole('dialog',{name:'Tìm nhanh BRIAN'})).toBeVisible();
  const sizes=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  expect(sizes[0]).toBeLessThanOrEqual(sizes[1]+2);
  await page.keyboard.press('Escape');
  await page.locator('.gd-v31-mode-button').click();
  await expect(page.locator('.dcc-priority')).toBeVisible();
  const focusSizes=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  expect(focusSizes[0]).toBeLessThanOrEqual(focusSizes[1]+2);
});

test('3.2 weekly planning dock shows exactly seven interactive days and a day agenda', async ({ page }) => {
  await openDashboard(page);
  const dock = page.locator('[data-dashboard-weekly-planner="true"]');
  await expect(dock).toBeVisible();
  const days = dock.locator('.gd-v32-planner-day');
  await expect(days).toHaveCount(7);
  await expect(days.first()).toHaveAttribute('aria-pressed','true');
  await days.nth(2).click();
  await expect(days.nth(2)).toHaveAttribute('aria-pressed','true');
  await expect(days.first()).toHaveAttribute('aria-pressed','false');
  await expect(dock.locator('.gd-v32-planner-day-info')).toBeVisible();
  await dock.getByRole('button',{name:'Sao chép kế hoạch'}).click();
  await expect(dock.getByRole('status').last()).toContainText(/Đã sao chép|Không thể sao chép/);
});

test('3.2 weekly planner respects Focus Mode and Midnight on mobile without overflow', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openDashboard(page);
  const dock=page.locator('[data-dashboard-weekly-planner="true"]');
  await expect(dock).toBeVisible();
  await expect(dock.locator('.gd-v32-planner-day')).toHaveCount(7);
  await page.locator('.gd-v31-theme-button').click();
  await expect(page.locator('.gd-v32-page')).toHaveClass(/gd-v31-midnight/);
  let dimensions=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  expect(dimensions[0]).toBeLessThanOrEqual(dimensions[1]+2);
  await page.locator('.gd-v31-mode-button').click();
  await expect(dock).toBeHidden();
  await page.locator('.gd-v31-mode-button').click();
  await expect(dock).toBeVisible();
  dimensions=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  expect(dimensions[0]).toBeLessThanOrEqual(dimensions[1]+2);
});

test('3.3 approved visual system aligns all major card geometry and page hierarchy', async ({ page }) => {
  await openDashboard(page);
  const root = page.locator('.gd-page.gd-u33');
  await expect(root).toBeVisible();
  await expect(page.locator('.gd-v3-brief')).toBeVisible();
  const metrics = await page.evaluate(() => {
    const select = cls => document.querySelector(cls);
    const bounds = cls => select(cls)?.getBoundingClientRect();
    return {
      radius: ['.dcc-panel','.gd-v32-planner','.gd-v3-insights','.gd-calendar'].map(cls =>
        select(cls) ? getComputedStyle(select(cls)).borderTopLeftRadius : null),
      briefBackground: getComputedStyle(select('.gd-v3-brief')).backgroundColor,
      commandBottom: bounds('.dcc-root')?.bottom ?? 0,
      briefTop: bounds('.gd-v3-brief')?.top ?? 0,
      weeklyTop: bounds('.gd-v32-planner')?.top ?? 0,
    };
  });
  expect(metrics.radius).toEqual(['18px','18px','18px','18px']);
  expect(metrics.briefBackground).toBe('rgb(255, 255, 255)');
  expect(metrics.briefTop).toBeGreaterThanOrEqual(metrics.commandBottom - 1);
  expect(metrics.weeklyTop).toBeGreaterThan(metrics.briefTop);
});

test('3.3 unified design remains responsive in daylight and midnight modes', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await openDashboard(page);
  await expect(page.locator('.gd-page.gd-u33')).toBeVisible();
  const inspect = () => page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    radius: getComputedStyle(document.querySelector('.dcc-panel')).borderTopLeftRadius,
  }));
  let first = await inspect();
  expect(first.content).toBeLessThanOrEqual(first.viewport+2);
  expect(first.radius).toBe('18px');
  await page.locator('.gd-v31-theme-button').click();
  await expect(page.locator('.gd-page')).toHaveClass(/gd-v31-midnight/);
  first = await inspect();
  expect(first.content).toBeLessThanOrEqual(first.viewport+2);
  expect(first.radius).toBe('18px');
  await expect(page.locator('.gd-v32-planner')).toBeVisible();
});
