import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'compact-desktop', width: 1024, height: 768 },
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
];

const FONT_SCALES = [100, 110, 120, 130, 140];

const DEMO_USER = {
  id: 'offline-demo-admin',
  authId: 'offline-demo-admin',
  role: 'admin',
  name: 'Typography QA Admin',
  school: 'Brian English Studio QA',
  email: 'typography.qa@brianenglish.local',
  approved: true,
  permissions: { mode: 'all', allowed: [] },
  provider: 'offline-demo',
  demo: true,
};

const BASE_PREFERENCES = {
  designLanguage: 'brian-unified',
  theme: 'light',
  language: 'vi',
  accentColor: 'blue',
  displayDensity: 'medium',
  themeIntensity: 'balanced',
  tileBorder: 'soft',
  indicatorMode: 'on',
  motionMode: 'off',
  performanceMode: 'high',
  surfaceStyle: 'soft',
  cornerStyle: 'balanced',
  shadowStyle: 'soft',
  backgroundStyle: 'solid',
  motionStyle: 'tile',
};

function expectedAppColumns(width, scale) {
  if (scale < 130) return null;
  if (width <= 760) return 1;
  if (width <= 1120) return scale === 140 ? 2 : 3;
  return scale === 140 ? 3 : 4;
}

async function openRoute(page, route, scale) {
  await page.addInitScript(({ demoUser, preferences, fontScale }) => {
    window.localStorage.setItem('bes-offline-demo-user-v943', JSON.stringify(demoUser));
    window.localStorage.setItem('bes-ui-preferences-v12', JSON.stringify({
      ...preferences,
      fontScale,
      updatedAt: Date.now(),
    }));
    window.localStorage.setItem('bes-font-scale', String(fontScale));
  }, { demoUser: DEMO_USER, preferences: BASE_PREFERENCES, fontScale: scale });

  await page.goto(`/#/${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((fontScale) => (
    document.documentElement.dataset.burs === 'comfortable-v3'
      && document.documentElement.dataset.fontScale === String(fontScale)
      && window.BURS?.mode === 'comfortable-v3'
  ), scale);
}

async function auditTypography(page, route) {
  return page.evaluate((activeRoute) => {
    const rootSelector = activeRoute === 'home' ? '.brian-home-approved3d' : '.bui-launch--apps';
    const root = document.querySelector(rootSelector);
    if (!root) return { missingRoot: rootSelector, undersized: [], horizontalOverflow: true, columns: 0 };

    window.BURS?.audit?.();

    const selectors = [
      rootSelector,
      '.bes-top-chrome',
      '.global-notice-shell',
      '.global-flat-navigation',
      '.bes-recent-apps-v12408',
    ];
    const roots = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
    const candidateSelector = 'p,li,dd,dt,small,label,a,button,input,textarea,select,option,strong,b,em,span';
    const candidates = [...new Set(roots.flatMap((item) => [item, ...item.querySelectorAll(candidateSelector)]))];
    const controlSelector = 'button,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),textarea,select,option,[role="button"],[role="tab"],[role="menuitem"],[contenteditable="true"]';
    const meaningful = /[\p{L}\p{N}]/u;

    const directText = (element) => Array.from(element.childNodes || [])
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const undersized = [];
    for (const element of candidates) {
      if (!(element instanceof Element) || element.closest('svg') || element.getAttribute('aria-hidden') === 'true') continue;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || rect.width < 1 || rect.height < 1) continue;
      const isControl = element.matches(controlSelector);
      const text = directText(element);
      if (!isControl && (text.length < 2 || !meaningful.test(text))) continue;
      const size = Number.parseFloat(style.fontSize || '0');
      const minimum = isControl ? 14 : 13;
      if (Number.isFinite(size) && size + 0.05 < minimum) {
        undersized.push({
          tag: element.tagName.toLowerCase(),
          className: String(element.className || '').slice(0, 100),
          text: text.slice(0, 80),
          size,
          minimum,
        });
      }
    }

    const viewportWidth = document.documentElement.clientWidth;
    const pageOverflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > viewportWidth + 2;
    const rootOverflow = root.scrollWidth > root.clientWidth + 2 && getComputedStyle(root).overflowX !== 'hidden';
    const grid = activeRoute === 'apps' ? root.querySelector('.launcher-custom-grid') : null;
    const columns = grid
      ? getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length
      : 0;

    return {
      missingRoot: '',
      undersized,
      horizontalOverflow: pageOverflow || rootOverflow,
      columns,
      bursReport: window.BURS?.report || null,
    };
  }, route);
}

for (const viewport of VIEWPORTS) {
  for (const scale of FONT_SCALES) {
    for (const route of ['home', 'apps']) {
      test(`${route} · ${viewport.name} ${viewport.width}px · ${scale}%`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openRoute(page, route, scale);

        const routeSelector = route === 'home' ? '.brian-home-approved3d' : '.bui-launch--apps';
        await expect(page.locator(routeSelector)).toBeVisible({ timeout: 15_000 });

        const result = await auditTypography(page, route);
        expect(result.missingRoot, `Missing route root at ${viewport.width}px / ${scale}%`).toBe('');
        expect(result.undersized, `Text below minimum at ${viewport.width}px / ${scale}%: ${JSON.stringify(result.undersized.slice(0, 8))}`).toEqual([]);
        expect(result.horizontalOverflow, `Horizontal page overflow at ${viewport.width}px / ${scale}%`).toBe(false);

        if (route === 'apps') {
          const expectedColumns = expectedAppColumns(viewport.width, scale);
          if (expectedColumns) {
            expect(result.columns, `Apps grid column count at ${viewport.width}px / ${scale}%`).toBeLessThanOrEqual(expectedColumns);
          }
        }
      });
    }
  }
}
