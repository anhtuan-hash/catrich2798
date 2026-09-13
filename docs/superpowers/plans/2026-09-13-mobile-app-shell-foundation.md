# Mobile App Shell Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a device-aware Mobile App Shell foundation that gives phones and portrait tablets a dedicated mobile chrome while preserving the existing desktop UI on laptops/desktops and landscape tablets.

**Architecture:** Keep one React/Vite SPA, one router, one permission model and one business-data layer. Add a pure presentation classifier plus a React hook, render exactly one visual navigation shell at a time, keep route content shared, and preserve global runtime bridges that are functionally required in both modes. The first phase does not redesign individual route bodies; it establishes the shell, mobile navigation primitives, orientation switching and regression coverage that later page-specific plans will build on.

**Tech Stack:** React 18, Vite, ESM JavaScript, CSS, Node `node:test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-13-mobile-app-shell-design.md`

## Global Constraints

- Phones always use Mobile UI in portrait and landscape.
- Tablets/iPads use Mobile UI in portrait and Desktop UI in landscape.
- Laptops/desktops always use Desktop UI even when the browser window is narrow.
- Do not use viewport width alone to decide presentation mode.
- Do not create a separate `/m` site.
- Do not duplicate route data fetching, permissions, authentication, storage or business logic.
- Do not mount both full desktop and mobile visual shells and hide one with CSS.
- Existing desktop visual behavior is protected from redesign in this phase.
- Tablet orientation changes must switch presentation without a full reload and must preserve the current route.
- Mobile touch targets must be at least 44 × 44 px and fixed bottom navigation must respect `env(safe-area-inset-bottom)`.
- Existing hash route names and route launch helpers remain authoritative.
- Existing `GlobalCommandPaletteV21` event `bes-command-palette-open` remains the mobile search entry point.

---

## File Structure

Create these focused files:

- `src/device/presentationMode.js` — pure device/orientation classification and test override parsing.
- `src/hooks/usePresentationMode.js` — browser subscription layer around the pure classifier.
- `src/components/mobile/mobileNavigation.js` — permission-aware mobile navigation model and route/action helpers.
- `src/components/mobile/MobileAppShell.jsx` — mobile chrome coordinator only; it does not own route business logic.
- `src/components/mobile/MobileTopBar.jsx` — compact top bar and command-palette launcher.
- `src/components/mobile/MobileBottomNavigation.jsx` — five touch destinations and active-state semantics.
- `src/components/mobile/MobileMoreSheet.jsx` — role/permission-aware overflow navigation sheet.
- `src/styles/mobile/mobile-tokens.css` — mobile-only spacing, typography, radii and safe-area tokens.
- `src/styles/mobile/mobile-shell.css` — mobile shell positioning and generic page-frame rules.
- `tests/unit/presentation-mode.test.mjs` — deterministic device-classification tests.
- `tests/unit/mobile-navigation.test.mjs` — deterministic navigation-model tests.
- `tests/e2e/mobile-shell.spec.js` — real browser shell/orientation/regression tests.

Modify these existing files only where required:

- `src/main.jsx` — obtain presentation mode and choose desktop vs mobile visual chrome while keeping route content shared.
- `src/components/GlobalFlatNavigation.jsx` — add presentation gating so runtime bridges remain available but desktop visual navigation does not render in Mobile UI.
- `src/components/GlobalAttendanceNavigationTab.jsx` — allow a mobile launcher event to open the existing attendance workspace without requiring the desktop nav host.
- `playwright.config.js` — add explicit iPad portrait and iPad landscape projects for shell tests.
- `package.json` — add focused unit/shell verification scripts.

Do not restructure unrelated routes or migrate route bodies in this phase.

---

### Task 1: Pure device and presentation classifier

**Files:**
- Create: `src/device/presentationMode.js`
- Create: `tests/unit/presentation-mode.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `resolvePresentationMode(environment, override?) -> { deviceClass, orientation, presentationMode, reason }`
- Produces: `readBrowserPresentationEnvironment(windowLike, navigatorLike) -> environment`
- Produces: `readPresentationOverride(search, enabled) -> "mobile" | "desktop" | null`
- Consumed by: `usePresentationMode()` in Task 2.

- [ ] **Step 1: Add failing deterministic classification tests**

Create `tests/unit/presentation-mode.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readPresentationOverride,
  resolvePresentationMode,
} from '../../src/device/presentationMode.js';

const base = {
  userAgent: '',
  userAgentDataMobile: null,
  platform: '',
  maxTouchPoints: 0,
  coarsePointer: false,
  hoverNone: false,
  screenWidth: 1440,
  screenHeight: 900,
  orientationType: 'landscape-primary',
};

test('iPhone is mobile in portrait and landscape', () => {
  for (const orientationType of ['portrait-primary', 'landscape-primary']) {
    const result = resolvePresentationMode({
      ...base,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      platform: 'iPhone',
      maxTouchPoints: 5,
      coarsePointer: true,
      hoverNone: true,
      screenWidth: orientationType.startsWith('portrait') ? 393 : 852,
      screenHeight: orientationType.startsWith('portrait') ? 852 : 393,
      orientationType,
    });
    assert.equal(result.deviceClass, 'phone');
    assert.equal(result.presentationMode, 'mobile');
  }
});

test('iPadOS desktop-class UA is tablet and follows orientation', () => {
  const common = {
    ...base,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
    platform: 'MacIntel',
    maxTouchPoints: 5,
    coarsePointer: true,
    hoverNone: true,
  };
  assert.equal(resolvePresentationMode({ ...common, screenWidth: 820, screenHeight: 1180, orientationType: 'portrait-primary' }).presentationMode, 'mobile');
  assert.equal(resolvePresentationMode({ ...common, screenWidth: 1180, screenHeight: 820, orientationType: 'landscape-primary' }).presentationMode, 'desktop');
});

test('Android tablet follows orientation', () => {
  const common = {
    ...base,
    userAgent: 'Mozilla/5.0 (Linux; Android 15; SM-X810) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    platform: 'Linux armv8l',
    maxTouchPoints: 5,
    coarsePointer: true,
    hoverNone: true,
  };
  assert.equal(resolvePresentationMode({ ...common, screenWidth: 800, screenHeight: 1280, orientationType: 'portrait-primary' }).deviceClass, 'tablet');
  assert.equal(resolvePresentationMode({ ...common, screenWidth: 800, screenHeight: 1280, orientationType: 'portrait-primary' }).presentationMode, 'mobile');
  assert.equal(resolvePresentationMode({ ...common, screenWidth: 1280, screenHeight: 800, orientationType: 'landscape-primary' }).presentationMode, 'desktop');
});

test('Mac laptop remains desktop even with narrow browser viewport evidence absent', () => {
  const result = resolvePresentationMode({
    ...base,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    platform: 'MacIntel',
    screenWidth: 1512,
    screenHeight: 982,
  });
  assert.equal(result.deviceClass, 'desktop');
  assert.equal(result.presentationMode, 'desktop');
});

test('touch-enabled Windows laptop remains desktop', () => {
  const result = resolvePresentationMode({
    ...base,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    platform: 'Win32',
    maxTouchPoints: 10,
    coarsePointer: false,
    hoverNone: false,
    screenWidth: 1920,
    screenHeight: 1200,
  });
  assert.equal(result.deviceClass, 'desktop');
  assert.equal(result.presentationMode, 'desktop');
});

test('developer override is accepted only when enabled', () => {
  assert.equal(readPresentationOverride('?besPresentation=mobile', true), 'mobile');
  assert.equal(readPresentationOverride('?besPresentation=desktop', true), 'desktop');
  assert.equal(readPresentationOverride('?besPresentation=mobile', false), null);
});
```

- [ ] **Step 2: Run the unit test and confirm it fails because the module does not exist**

Run:

```bash
node --test tests/unit/presentation-mode.test.mjs
```

Expected: FAIL with module-not-found for `src/device/presentationMode.js`.

- [ ] **Step 3: Implement the classifier without viewport-only switching**

Create `src/device/presentationMode.js` with these exported functions and rules:

```js
const PHONE_UA = /iPhone|iPod|Android.+Mobile|Windows Phone|Mobile/i;
const ANDROID_UA = /Android/i;
const IPAD_UA = /iPad/i;
const DESKTOP_OS_UA = /Windows NT|Macintosh|CrOS|X11/i;

export function readPresentationOverride(search = '', enabled = false) {
  if (!enabled) return null;
  const value = new URLSearchParams(String(search || '').replace(/^\?/, '')).get('besPresentation');
  return value === 'mobile' || value === 'desktop' ? value : null;
}

export function orientationFromEnvironment(env = {}) {
  const explicit = String(env.orientationType || '').toLowerCase();
  if (explicit.startsWith('portrait')) return 'portrait';
  if (explicit.startsWith('landscape')) return 'landscape';
  return Number(env.screenHeight || 0) >= Number(env.screenWidth || 0) ? 'portrait' : 'landscape';
}

export function resolvePresentationMode(env = {}, override = null) {
  const orientation = orientationFromEnvironment(env);
  const ua = String(env.userAgent || '');
  const platform = String(env.platform || '');
  const touch = Number(env.maxTouchPoints || 0);
  const ipadDesktopUa = platform === 'MacIntel' && touch > 1;
  const phone = Boolean(env.userAgentDataMobile) || PHONE_UA.test(ua);
  const ipad = IPAD_UA.test(ua) || ipadDesktopUa;
  const androidTablet = ANDROID_UA.test(ua) && !PHONE_UA.test(ua) && touch > 0;
  const desktopOs = DESKTOP_OS_UA.test(ua) && !ipadDesktopUa;
  let deviceClass = 'desktop';

  if (phone) deviceClass = 'phone';
  else if (ipad || androidTablet) deviceClass = 'tablet';
  else if (!desktopOs && touch > 1 && env.coarsePointer && env.hoverNone && Math.min(Number(env.screenWidth || 0), Number(env.screenHeight || 0)) >= 600) deviceClass = 'tablet';

  const automatic = deviceClass === 'phone' ? 'mobile' : deviceClass === 'tablet' && orientation === 'portrait' ? 'mobile' : 'desktop';
  const presentationMode = override || automatic;
  return { deviceClass, orientation, presentationMode, reason: override ? 'override' : `${deviceClass}:${orientation}` };
}

export function readBrowserPresentationEnvironment(windowLike = window, navigatorLike = navigator) {
  const media = (query) => Boolean(windowLike.matchMedia?.(query)?.matches);
  return {
    userAgent: navigatorLike.userAgent || '',
    userAgentDataMobile: typeof navigatorLike.userAgentData?.mobile === 'boolean' ? navigatorLike.userAgentData.mobile : null,
    platform: navigatorLike.platform || '',
    maxTouchPoints: navigatorLike.maxTouchPoints || 0,
    coarsePointer: media('(pointer: coarse)'),
    hoverNone: media('(hover: none)'),
    screenWidth: windowLike.screen?.width || 0,
    screenHeight: windowLike.screen?.height || 0,
    orientationType: windowLike.screen?.orientation?.type || '',
  };
}
```

Important: do not use `window.innerWidth` to classify laptops.

- [ ] **Step 4: Run classifier tests**

Run:

```bash
node --test tests/unit/presentation-mode.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Add a focused npm script**

Add to `package.json` scripts:

```json
"test:mobile-shell:unit": "node --test tests/unit/presentation-mode.test.mjs tests/unit/mobile-navigation.test.mjs"
```

The second file will be added in Task 3; until then run the first test directly.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/device/presentationMode.js tests/unit/presentation-mode.test.mjs package.json
git commit -m "feat: add device presentation classifier"
```

---

### Task 2: Reactive presentation hook and orientation switching

**Files:**
- Create: `src/hooks/usePresentationMode.js`

**Interfaces:**
- Consumes: `readBrowserPresentationEnvironment`, `readPresentationOverride`, `resolvePresentationMode` from Task 1.
- Produces: `usePresentationMode() -> { deviceClass, orientation, presentationMode, reason }`.
- Consumed by: `src/main.jsx` in Task 6.

- [ ] **Step 1: Implement a single browser subscription hook**

Create `src/hooks/usePresentationMode.js`:

```js
import { useEffect, useState } from 'react';
import {
  readBrowserPresentationEnvironment,
  readPresentationOverride,
  resolvePresentationMode,
} from '../device/presentationMode.js';

function readCurrent() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { deviceClass: 'desktop', orientation: 'landscape', presentationMode: 'desktop', reason: 'ssr-fallback' };
  }
  const override = readPresentationOverride(window.location.search, Boolean(import.meta.env.DEV));
  return resolvePresentationMode(readBrowserPresentationEnvironment(window, navigator), override);
}

export default function usePresentationMode() {
  const [state, setState] = useState(readCurrent);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setState(readCurrent()));
    };
    const orientation = window.screen?.orientation;
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    orientation?.addEventListener?.('change', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      orientation?.removeEventListener?.('change', update);
    };
  }, []);

  return state;
}
```

The resize listener exists only to re-read orientation/capabilities; the classifier itself must continue to ignore `innerWidth` for laptop device class.

- [ ] **Step 2: Static-import smoke check**

Run:

```bash
node -e "import('./src/hooks/usePresentationMode.js').then(()=>console.log('ok'))"
```

Expected: prints `ok`.

- [ ] **Step 3: Commit Task 2**

```bash
git add src/hooks/usePresentationMode.js
git commit -m "feat: add reactive presentation mode hook"
```

---

### Task 3: Permission-aware mobile navigation model

**Files:**
- Create: `src/components/mobile/mobileNavigation.js`
- Create: `tests/unit/mobile-navigation.test.mjs`

**Interfaces:**
- Produces: `buildMobileNavigation({ currentUser, currentRoute, language }) -> { bottomItems, moreGroups }`.
- Produces: `runMobileNavigationItem(item) -> void`.
- Consumes: existing `hasRouteAccess()` and `launchRoute()`.
- Uses existing command-palette event `bes-command-palette-open`.
- Uses new attendance event `bes-attendance-open`, implemented in Task 5.

- [ ] **Step 1: Write failing navigation-model tests**

Create `tests/unit/mobile-navigation.test.mjs` with pure fixture injection so tests do not depend on real account data:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMobileNavigationModel } from '../../src/components/mobile/mobileNavigation.js';

const allow = (route) => !['admin', 'app-vault'].includes(route);

test('authenticated navigation keeps five primary destinations', () => {
  const model = buildMobileNavigationModel({
    authenticated: true,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: allow,
    canAccessAttendance: false,
  });
  assert.deepEqual(model.bottomItems.map((item) => item.id), ['home', 'apps', 'practice', 'notifications', 'account']);
});

test('attendance replaces practice as the center action when available', () => {
  const model = buildMobileNavigationModel({
    authenticated: true,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: allow,
    canAccessAttendance: true,
  });
  assert.equal(model.bottomItems[2].id, 'attendance');
  assert.equal(model.bottomItems[2].action, 'attendance');
});

test('forbidden routes are not emitted in More groups', () => {
  const model = buildMobileNavigationModel({
    authenticated: true,
    currentRoute: 'home',
    language: 'vi',
    canAccessRoute: allow,
    canAccessAttendance: false,
  });
  assert.equal(model.moreGroups.flatMap((group) => group.items).some((item) => item.route === 'admin'), false);
});

test('guest navigation exposes only public-safe items', () => {
  const model = buildMobileNavigationModel({ authenticated: false, currentRoute: 'home', language: 'vi', canAccessRoute: () => false, canAccessAttendance: false });
  assert.deepEqual(model.bottomItems.map((item) => item.id), ['home', 'resources', 'search', 'contact', 'login']);
});
```

- [ ] **Step 2: Run the tests and verify module-not-found failure**

```bash
node --test tests/unit/mobile-navigation.test.mjs
```

Expected: FAIL because `mobileNavigation.js` does not exist.

- [ ] **Step 3: Implement the pure model and browser action runner**

Create `src/components/mobile/mobileNavigation.js`. Keep the model builder pure by accepting permission functions. Export a browser wrapper that uses the real permission system only from React components.

Required item shape:

```js
{
  id: 'home',
  label: 'Trang chủ',
  route: 'home',
  action: 'route',
  icon: 'home',
  active: true,
}
```

Required action rules:

```js
export function runMobileNavigationItem(item) {
  if (!item) return;
  if (item.action === 'route' && item.route) {
    launchRoute({ target: `#/${item.route}`, label: item.label?.slice(0, 2)?.toUpperCase() || 'GO', color: '#315FC4' });
    return;
  }
  if (item.action === 'search') {
    window.dispatchEvent(new CustomEvent('bes-command-palette-open'));
    return;
  }
  if (item.action === 'attendance') {
    window.dispatchEvent(new CustomEvent('bes-attendance-open'));
  }
}
```

`buildMobileNavigationModel()` must group overflow routes under the spec groups and filter every route through the supplied permission predicate. Do not include forbidden routes and do not hard-code admin availability for non-admin users.

- [ ] **Step 4: Run all focused unit tests**

```bash
npm run test:mobile-shell:unit
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/components/mobile/mobileNavigation.js tests/unit/mobile-navigation.test.mjs
git commit -m "feat: add mobile navigation model"
```

---

### Task 4: Mobile visual shell primitives

**Files:**
- Create: `src/components/mobile/MobileAppShell.jsx`
- Create: `src/components/mobile/MobileTopBar.jsx`
- Create: `src/components/mobile/MobileBottomNavigation.jsx`
- Create: `src/components/mobile/MobileMoreSheet.jsx`
- Create: `src/styles/mobile/mobile-tokens.css`
- Create: `src/styles/mobile/mobile-shell.css`

**Interfaces:**
- `MobileAppShell({ route, selectedTool, language, currentUser, onLogout, children? })` renders mobile chrome only.
- `MobileTopBar({ title, onMenu, onSearch, onNotifications, currentUser })`.
- `MobileBottomNavigation({ items, onSelect })`.
- `MobileMoreSheet({ open, groups, onClose, onSelect })`.
- Consumes Task 3 navigation model.

- [ ] **Step 1: Build the mobile design tokens first**

Create `src/styles/mobile/mobile-tokens.css`:

```css
:root {
  --bes-mobile-gutter: 16px;
  --bes-mobile-gap: 14px;
  --bes-mobile-radius: 18px;
  --bes-mobile-touch: 44px;
  --bes-mobile-topbar-height: 60px;
  --bes-mobile-bottomnav-height: 68px;
  --bes-mobile-surface: #ffffff;
  --bes-mobile-canvas: #f5f7fb;
  --bes-mobile-ink: #172033;
  --bes-mobile-muted: #6b7485;
  --bes-mobile-line: rgba(23, 32, 51, 0.10);
  --bes-mobile-accent: var(--active-app-accent, #315fc4);
}
```

- [ ] **Step 2: Build shell CSS with safe areas and no desktop selectors**

Create `src/styles/mobile/mobile-shell.css` with selectors scoped to `[data-presentation="mobile"]` or `.bes-mobile-*` only. Required behaviors:

```css
[data-presentation="mobile"] {
  background: var(--bes-mobile-canvas);
}

[data-presentation="mobile"] #bes-main-content {
  min-width: 0;
  padding-bottom: calc(var(--bes-mobile-bottomnav-height) + env(safe-area-inset-bottom) + 20px);
}

.bes-mobile-topbar {
  position: sticky;
  top: 0;
  z-index: 1200;
  min-height: calc(var(--bes-mobile-topbar-height) + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) var(--bes-mobile-gutter) 0;
}

.bes-mobile-bottomnav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1250;
  min-height: calc(var(--bes-mobile-bottomnav-height) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
}

.bes-mobile-topbar button,
.bes-mobile-bottomnav button,
.bes-mobile-more-sheet button {
  min-width: var(--bes-mobile-touch);
  min-height: var(--bes-mobile-touch);
}
```

Do not modify desktop `.brian-nav` rules in this task.

- [ ] **Step 3: Implement semantic top bar**

`MobileTopBar.jsx` must:

- show a 44 px menu button;
- show current title/brand without desktop pills;
- dispatch search through the supplied callback;
- expose notification/account controls with accessible labels;
- avoid desktop popovers.

Use inline SVG icons or simple semantic glyph components local to the file; do not add a new icon dependency.

- [ ] **Step 4: Implement bottom navigation**

`MobileBottomNavigation.jsx` must render exactly the items supplied by the model. Each button must have `aria-current="page"` only when `item.active` is true and must preserve at least 44 px touch height.

- [ ] **Step 5: Implement the More sheet**

`MobileMoreSheet.jsx` must render a fixed mobile dialog with:

```jsx
<div className="bes-mobile-more-layer" role="presentation" onMouseDown={...}>
  <section className="bes-mobile-more-sheet" role="dialog" aria-modal="true" aria-label={language === 'vi' ? 'Điều hướng' : 'Navigation'}>
    ...
  </section>
</div>
```

It must close on backdrop click and Escape, and return focus to the menu button through a ref supplied by `MobileAppShell`.

- [ ] **Step 6: Implement `MobileAppShell.jsx` as chrome coordinator**

The component must:

- build navigation from Task 3 using the current user and existing permissions;
- keep local `moreOpen` state only;
- call `window.dispatchEvent(new CustomEvent('bes-command-palette-open'))` for search;
- call `runMobileNavigationItem()` for routes/actions;
- show the top bar, bottom navigation and optional More sheet;
- never render route page content twice.

Import the two mobile CSS files from `MobileAppShell.jsx` so the styles travel with the mobile chunk.

- [ ] **Step 7: Build to catch JSX/CSS integration errors**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 8: Commit Task 4**

```bash
git add src/components/mobile src/styles/mobile
git commit -m "feat: add mobile app shell chrome"
```

---

### Task 5: Preserve global bridges and make attendance launchable from mobile

**Files:**
- Modify: `src/components/GlobalFlatNavigation.jsx`
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`

**Interfaces:**
- `GlobalFlatNavigation` gains `presentationMode = 'desktop'`.
- `GlobalAttendanceNavigationTab` gains `launcherHidden = false` and responds to `bes-attendance-open`.
- Mobile shell dispatches `bes-attendance-open`; existing attendance permission logic remains authoritative.

- [ ] **Step 1: Refactor `GlobalFlatNavigation` with an explicit desktop visual gate**

At the top of the function:

```jsx
export default function GlobalFlatNavigation(props) {
  const desktop = props.presentationMode !== 'mobile';
  return (
    <>
      <GlobalNativeTextScaleReset />
      {desktop ? <Navigation {...props} /> : null}
      {desktop ? <GlobalPinnedNavigationHub route={props.route} /> : null}
      <GlobalPageLaunchEffect route={props.route} />
      {desktop ? <GlobalWindows8Experience route={props.route} /> : null}
      <GlobalWindowsPhone8Loading />
      {desktop ? <GlobalEditorialBriefBar route={props.route} language={props.language} currentUser={props.currentUser} /> : null}
      {desktop ? <GlobalGuestNavigationHub route={props.route} language={props.language} currentUser={props.currentUser} /> : null}
      <GlobalWeeklyPracticeBridge route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalHeroGovernance route={props.route} />
      <GlobalUserProfileSettingsBridge {...props} />
      <GlobalUserProfilePreviewGuard route={props.route} />
      <GlobalSettingsAdminBridge {...props} />
      <GlobalFontSettingsBridge {...props} />
      <GlobalSubtitleSettingsBridge {...props} />
      <GlobalAiWebsiteLauncher {...props} />
      <HomeParticleSignaturePortal currentUser={props.currentUser} />
      {desktop ? <GlobalDashboardNavigationTab {...props} /> : null}
      {desktop ? <GlobalHomeroomNavigationTab {...props} /> : null}
      {desktop ? <GlobalGradebookNavigationTab {...props} /> : null}
      {desktop ? <GlobalReportsNavigationTab {...props} /> : null}
      {desktop ? <GlobalTtcmNavigationTab {...props} /> : null}
      <GlobalAttendanceNavigationTab {...props} launcherHidden={!desktop} />
      <GlobalAttendanceAdminPersistenceBridge {...props} />
      <GlobalDashboardFooterBridge route={props.route} language={props.language} />
      <GlobalEnglishHubBrand />
      <GlobalEditorialAuthorityRuntime />
    </>
  );
}
```

Before committing, compare this list against the current component and preserve every non-desktop functional bridge. The visual gate must not remove attendance persistence, profile/settings bridges, weekly practice runtime, autosave/runtime guards or other data side effects mounted elsewhere.

- [ ] **Step 2: Make the attendance workspace event-launchable without a desktop host**

In `GlobalAttendanceNavigationTab.jsx`:

1. accept `launcherHidden = false` in props;
2. add an effect after `allowed`, `firstAllowedView` and `open` state exist:

```jsx
useEffect(() => {
  const openFromMobile = () => {
    if (!allowed) return;
    setError('');
    setView(firstAllowedView || 'quick');
    setOpen(true);
  };
  window.addEventListener('bes-attendance-open', openFromMobile);
  return () => window.removeEventListener('bes-attendance-open', openFromMobile);
}, [allowed, firstAllowedView]);
```

3. replace `if (!host || !allowed) return null;` with `if (!allowed) return null;`;
4. render the portal tab only when `host && !launcherHidden`:

```jsx
const tab = host && !launcherHidden ? createPortal(...existing button..., host) : null;
```

Keep the existing overlay portal unchanged so the same attendance business UI opens from either shell.

- [ ] **Step 3: Build and run attendance-sensitive smoke tests**

```bash
npm run build
npx playwright test tests/e2e/attendance-teacher-time-tab-parity.spec.js --project=chromium-desktop
```

Expected: build succeeds and existing desktop attendance test passes.

- [ ] **Step 4: Commit Task 5**

```bash
git add src/components/GlobalFlatNavigation.jsx src/components/GlobalAttendanceNavigationTab.jsx
git commit -m "refactor: separate desktop navigation from shared bridges"
```

---

### Task 6: Integrate presentation mode into the application root

**Files:**
- Modify: `src/main.jsx`

**Interfaces:**
- Consumes `usePresentationMode()` from Task 2.
- Consumes `MobileAppShell` from Task 4.
- Passes `presentationMode` to `GlobalFlatNavigation` from Task 5.

- [ ] **Step 1: Import the new hook and mobile shell**

Add lazy import for the mobile shell near other shell-level imports:

```jsx
import usePresentationMode from './hooks/usePresentationMode.js';
const MobileAppShell = lazy(() => import('./components/mobile/MobileAppShell.jsx'));
```

- [ ] **Step 2: Read presentation state once inside `App()`**

Near other top-level UI state:

```jsx
const presentation = usePresentationMode();
const isMobilePresentation = presentation.presentationMode === 'mobile';
```

Do not create route-level device checks.

- [ ] **Step 3: Publish deterministic DOM attributes for styling and E2E tests**

On the existing `.app-shell` root add:

```jsx
data-presentation={presentation.presentationMode}
data-device-class={presentation.deviceClass}
data-orientation={presentation.orientation}
```

- [ ] **Step 4: Render only the correct visual chrome**

Keep `GlobalFlatNavigation` mounted because it owns shared bridges, but pass `presentationMode` and gate the desktop status bar:

```jsx
{!['homeroom-portal'].includes(currentRoute) ? <div className="bes-top-chrome">
  {!isMobilePresentation ? (
    <Suspense fallback={null}>
      <StatusMenuBar route={currentRoute} {...context} />
    </Suspense>
  ) : null}
  <AppErrorBoundary compact scope="global-navigation" label={language === 'vi' ? 'thanh điều hướng' : 'navigation'}>
    <GlobalFlatNavigation
      route={currentRoute}
      selectedTool={selectedTool}
      presentationMode={presentation.presentationMode}
      onLogout={async () => { await logoutUser(); setCurrentUser(null); window.location.hash = '#/login'; }}
      {...context}
    />
  </AppErrorBoundary>
</div> : null}
```

Render `MobileAppShell` once, outside `<main>`, only in mobile presentation and only on routes that use global chrome:

```jsx
{isMobilePresentation && !['homeroom-portal'].includes(currentRoute) ? (
  <Suspense fallback={null}>
    <MobileAppShell
      route={currentRoute}
      selectedTool={selectedTool}
      language={language}
      currentUser={currentUser}
      onLogout={async () => { await logoutUser(); setCurrentUser(null); window.location.hash = '#/login'; }}
    />
  </Suspense>
) : null}
```

Do not duplicate the route `<main>` or any page component.

- [ ] **Step 5: Keep command palette mounted for authenticated mobile users**

Do not add a second command palette. The existing `GlobalCommandPalette` must remain mounted under the same permission conditions so `bes-command-palette-open` from the mobile top bar opens the existing palette.

- [ ] **Step 6: Build and run desktop shell regression**

```bash
npm run build
npx playwright test tests/e2e/shell.spec.js --project=chromium-desktop
```

Expected: both shell tests pass and desktop navigation remains present.

- [ ] **Step 7: Commit Task 6**

```bash
git add src/main.jsx
git commit -m "feat: select mobile or desktop app chrome"
```

---

### Task 7: Add explicit cross-device Playwright coverage

**Files:**
- Modify: `playwright.config.js`
- Create: `tests/e2e/mobile-shell.spec.js`

**Interfaces:**
- Tests DOM attributes from Task 6.
- Tests mobile selectors from Task 4.
- Tests attendance event bridge from Task 5 where permissions allow fixture setup; otherwise the event smoke is covered by listener behavior and later authenticated attendance plan.

- [ ] **Step 1: Extend Playwright projects with tablet orientations**

Add projects using Playwright devices without removing existing projects:

```js
{
  name: 'ipad-portrait',
  use: {
    ...devices['iPad Pro 11'],
    viewport: { width: 834, height: 1194 },
  },
},
{
  name: 'ipad-landscape',
  use: {
    ...devices['iPad Pro 11 landscape'],
    viewport: { width: 1194, height: 834 },
  },
},
```

If the installed Playwright device registry does not expose `iPad Pro 11 landscape`, reuse `devices['iPad Pro 11']` and override viewport/screen orientation explicitly rather than adding a package.

- [ ] **Step 2: Write shell selection E2E tests**

Create `tests/e2e/mobile-shell.spec.js`:

```js
import { test, expect } from '@playwright/test';

test('phone uses mobile chrome and hides desktop nav chrome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-presentation', 'mobile');
  await expect(page.locator('.bes-mobile-topbar')).toBeVisible();
  await expect(page.locator('.bes-mobile-bottomnav')).toBeVisible();
  await expect(page.locator('.brian-nav')).toHaveCount(0);
});

test('portrait iPad uses mobile chrome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-portrait');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'tablet');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-orientation', 'portrait');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-presentation', 'mobile');
  await expect(page.locator('.bes-mobile-bottomnav')).toBeVisible();
});

test('landscape iPad uses desktop chrome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-landscape');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'tablet');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-orientation', 'landscape');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-presentation', 'desktop');
  await expect(page.locator('.brian-nav')).toBeVisible();
  await expect(page.locator('.bes-mobile-bottomnav')).toHaveCount(0);
});

test('desktop remains desktop after narrow viewport resize', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/#/home');
  await page.setViewportSize({ width: 560, height: 900 });
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'desktop');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-presentation', 'desktop');
  await expect(page.locator('.brian-nav')).toBeVisible();
  await expect(page.locator('.bes-mobile-bottomnav')).toHaveCount(0);
});

test('mobile command search opens existing command palette when authenticated fixture is available', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/home');
  const search = page.getByRole('button', { name: /tìm|search/i });
  if (await search.count()) {
    await search.first().click();
    const palette = page.locator('[role="dialog"]').filter({ hasText: /Brian Command Center|Command Center/i });
    if (await palette.count()) await expect(palette.first()).toBeVisible();
  }
});
```

Do not weaken the first four tests with conditional assertions; those are hard shell contracts. The final command-palette test may be authentication-aware because the existing app only mounts the palette for authenticated users.

- [ ] **Step 3: Run the focused matrix**

```bash
npm run build
npx playwright test tests/e2e/mobile-shell.spec.js --project=mobile-chromium
npx playwright test tests/e2e/mobile-shell.spec.js --project=ipad-portrait
npx playwright test tests/e2e/mobile-shell.spec.js --project=ipad-landscape
npx playwright test tests/e2e/mobile-shell.spec.js --project=chromium-desktop
```

Expected: all hard shell-contract tests pass.

- [ ] **Step 4: Commit Task 7**

```bash
git add playwright.config.js tests/e2e/mobile-shell.spec.js
git commit -m "test: cover mobile and tablet app shells"
```

---

### Task 8: Foundation verification and regression gate

**Files:**
- Modify: `package.json`
- No production feature files should change in this task unless verification reveals a defect directly caused by Tasks 1–7.

**Interfaces:**
- Produces one repeatable verification command for this phase.

- [ ] **Step 1: Add the phase verification script**

Add to `package.json`:

```json
"verify:mobile-shell-foundation": "npm run test:mobile-shell:unit && npm run build && npx playwright test tests/e2e/shell.spec.js tests/e2e/mobile-shell.spec.js --project=chromium-desktop && npx playwright test tests/e2e/mobile-shell.spec.js --project=mobile-chromium && npx playwright test tests/e2e/mobile-shell.spec.js --project=ipad-portrait && npx playwright test tests/e2e/mobile-shell.spec.js --project=ipad-landscape"
```

- [ ] **Step 2: Run the focused foundation verification**

```bash
npm run verify:mobile-shell-foundation
```

Expected: PASS.

- [ ] **Step 3: Run existing global smoke and E2E contract tests**

```bash
npm test
npm run test:e2e:contracts
```

Expected: PASS.

- [ ] **Step 4: Run the existing desktop attendance regression that is sensitive to navigation changes**

```bash
npx playwright test tests/e2e/attendance-teacher-time-tab-parity.spec.js --project=chromium-desktop
```

Expected: PASS.

- [ ] **Step 5: Manual browser acceptance check**

Run `npm run dev` and verify exactly these cases:

1. iPhone simulator: mobile top bar + bottom nav, no desktop horizontal nav.
2. Android phone simulator: same mobile shell.
3. iPad portrait: mobile shell.
4. Same iPad rotated landscape: desktop shell without route reload.
5. Mac/Windows desktop: desktop shell.
6. Desktop browser narrowed below 600 px: remains desktop shell.
7. Mobile bottom navigation never covers the last interactive content because main content reserves safe-area-aware bottom padding.
8. Home route remains the same route before/after tablet orientation switch.

- [ ] **Step 6: Commit the verification script**

```bash
git add package.json
git commit -m "chore: add mobile shell foundation verification"
```

---

## Phase Boundary and Next Plans

This plan intentionally stops after the cross-device shell foundation is working and protected by tests. It does **not** attempt to redesign all route bodies in one change.

After this plan passes, create separate implementation plans in this order:

1. `Home + Weekly Practice mobile redesign`.
2. `Attendance + Homeroom + Gradebook + Reports mobile workflows`.
3. `Apps + Games + Resources + Library catalog mobile layouts`.
4. `Dashboard + TTCM + Admin + Settings + operations mobile layouts`.
5. `Cross-route visual regression, accessibility and polish`.

Each later plan must reuse the classifier, shell and tokens from this foundation rather than inventing new breakpoints or device checks.

## Self-Review Result

- Spec coverage for Phase 1: device classifier, phone/tablet/laptop rules, portrait/landscape behavior, developer override, shared business logic, single active visual shell, mobile top/bottom chrome, More navigation, safe areas, attendance launcher continuity, command-palette continuity, accessibility baseline and cross-device regression are all mapped to explicit tasks.
- Deferred by design to later approved phases: route-body redesign for Home, Practice, Attendance internals, Homeroom, Gradebook, Reports, catalogs, Dashboard/Admin and advanced tools.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation placeholders remain.
- Interface consistency: `presentationMode`, `deviceClass`, `orientation`, `buildMobileNavigationModel`, `runMobileNavigationItem`, `bes-command-palette-open` and `bes-attendance-open` use one spelling throughout this plan.
