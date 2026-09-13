# Mobile App Shell Architecture Design

Date: 2026-09-13
Status: Approved in principle by product owner; written spec for final review before implementation planning
Repository: `anhtuan-hash/catrich2798`

## 1. Goal

Create a dedicated mobile presentation layer for the whole Brian English web application without replacing the existing desktop experience.

The system keeps one codebase, one data model, one permission model, one routing model, and one set of business logic. It chooses a presentation shell based on device class and tablet orientation.

The mobile experience must feel intentionally designed for phones and portrait tablets rather than looking like a desktop layout that has been compressed.

## 2. Product decisions already approved

1. Phones always use the Mobile UI.
2. Tablets/iPads in portrait use the Mobile UI.
3. Tablets/iPads in landscape use the existing Desktop UI.
4. Laptops/desktops always use the existing Desktop UI, even when the browser window is made narrow.
5. Tablet orientation changes update the presentation mode live without a page reload.
6. Desktop behavior and visual design are preserved except for changes strictly necessary to isolate shared runtime behavior from desktop-only navigation.

## 3. Non-goals

This project does not:

- create a separate `/m` website;
- duplicate business logic or data fetching;
- replace the existing hash routing model;
- redesign the desktop application;
- change permissions, authentication, storage, attendance rules, gradebook rules, or reporting logic;
- rely on viewport width alone to decide whether a user is on mobile.

## 4. Existing architecture constraints

The application is a React/Vite SPA. `src/main.jsx` currently owns route selection and lazy-loading for a large set of pages such as Home, Apps, Games, Homeroom, Resources, Library, Dashboard, Practice, Admin, Settings, QA, Trash and operational pages.

`GlobalFlatNavigation.jsx` is more than a visual navigation component. It also mounts many global bridges and runtimes for dashboard, homeroom, gradebook, reports, TTCM, attendance, weekly practice, profile/settings, AI, editorial behavior and other global features.

`GlobalCompactNavigation.jsx` already has responsive CSS, but its current mobile behavior is mostly desktop compression: the primary menu is hidden, search becomes an icon-sized control, and account controls shrink. That is insufficient for a native-feeling mobile experience.

The new architecture must therefore preserve global runtime bridges while replacing only the presentation/navigation layer on mobile.

## 5. Device and presentation mode architecture

### 5.1 Single source of truth

Add one device-presentation service and one React hook. No page may invent its own device detection rules.

Suggested modules:

- `src/device/presentationMode.js`
- `src/hooks/usePresentationMode.js`

The hook returns at least:

```text
presentationMode: "mobile" | "desktop"
deviceClass: "phone" | "tablet" | "desktop"
orientation: "portrait" | "landscape"
```

### 5.2 Classification strategy

Do not use only `window.innerWidth` or a CSS breakpoint.

Classification should combine, in priority order:

- `navigator.userAgentData` when available;
- conventional user-agent hints when needed;
- touch capability (`navigator.maxTouchPoints`);
- coarse pointer and hover capability;
- physical screen dimensions/aspect ratio;
- tablet-specific heuristics for iPadOS, including iPadOS devices that expose a desktop-class user agent;
- orientation.

The classifier must deliberately prefer `desktop` for Windows/macOS laptops, including touch-enabled laptops, unless evidence strongly identifies a phone/tablet form factor.

### 5.3 Presentation rules

| Device | Portrait | Landscape |
| --- | --- | --- |
| Phone | Mobile | Mobile |
| Tablet/iPad | Mobile | Desktop |
| Laptop/Desktop | Desktop | Desktop |

Browser-window resizing on a laptop must not flip presentation mode.

### 5.4 Test override

Provide a developer/test-only override that can force mobile or desktop presentation. It must not be exposed as a normal user preference.

This can be implemented through a development query flag or local test setting and is intended for automated tests and QA only.

## 6. Global shell architecture

### 6.1 Desktop shell

The current desktop shell remains the production desktop experience.

The implementation should avoid visually changing existing desktop navigation, header spacing, route behavior, permissions, notifications, account menus and page layouts.

### 6.2 Mobile shell

Introduce a dedicated shell, suggested as:

- `src/components/mobile/MobileAppShell.jsx`
- `src/components/mobile/MobileTopBar.jsx`
- `src/components/mobile/MobileBottomNavigation.jsx`
- `src/components/mobile/MobileMoreSheet.jsx`
- `src/components/mobile/MobilePageFrame.jsx`
- `src/styles/mobile/mobile-tokens.css`
- `src/styles/mobile/mobile-shell.css`

The shell wraps the same route content already produced by the app.

### 6.3 Global runtime isolation

Because `GlobalFlatNavigation.jsx` currently mixes visual navigation and global runtime bridges, implementation must separate or gate those responsibilities.

Preferred implementation direction:

- keep global behavior bridges mounted in both presentation modes when they are functionally required;
- render the existing desktop navigation only in Desktop UI;
- render the new mobile navigation only in Mobile UI;
- explicitly mark desktop-only visual bridges so they do not inject duplicate tabs or chrome into Mobile UI;
- preserve side effects that are required for permissions, notifications, attendance, weekly practice, profile/settings and other runtime behavior.

This is a targeted separation of presentation from runtime behavior, not a general refactor of unrelated code.

## 7. Mobile navigation model

### 7.1 Top bar

The mobile top bar is sticky and compact, approximately 56–64 px high plus safe-area padding when needed.

It contains only essential actions:

- menu or contextual back button;
- Brian English identity or current page title;
- search when relevant;
- notification indicator where appropriate;
- compact account/avatar entry.

Desktop primary navigation pills must not appear in the mobile top bar.

### 7.2 Bottom navigation

Mobile UI uses a fixed bottom navigation sized for touch and iPhone safe areas.

Authenticated users use five primary destinations:

1. Trang chủ
2. Ứng dụng
3. Primary action, permission-aware (prefer Điểm danh for users who can access it; otherwise Bài tập/Practice)
4. Thông báo
5. Tài khoản

Guests use a public-safe equivalent based only on routes they can access.

Every destination must still pass through the existing permission system. Hidden or forbidden destinations are not surfaced.

### 7.3 More navigation

All remaining allowed routes are available from a full-height or near-full-height mobile sheet/drawer opened from the top menu or account/navigation context.

The sheet groups destinations by function rather than reproducing a long horizontal desktop menu.

Suggested groups include:

- Dạy & học
- Lớp học
- Điểm danh
- Sổ điểm & báo cáo
- TTCM / công việc
- Thư viện & tài nguyên
- Công cụ
- Quản trị & hệ thống

Groups and items are role/permission aware.

## 8. Mobile visual system

### 8.1 Core dimensions

- horizontal page gutter: 16 px typical, 12 px minimum on narrow devices;
- standard card radius: 16–20 px;
- standard vertical gap: 12–16 px;
- touch targets: minimum 44 × 44 px;
- body text: approximately 16 px, never artificially shrunk to fit;
- fixed bottom navigation reserves content space so page content is never covered;
- use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` where applicable.

### 8.2 General behavior

- no horizontal page scrolling for ordinary screens;
- long tab/filter groups scroll horizontally instead of shrinking labels;
- desktop multi-column forms become single-column or simple two-column layouts only when touch usability remains good;
- dialogs become bottom sheets or full-screen mobile dialogs when appropriate;
- dense tables become mobile cards, stacked rows or drill-down lists;
- destructive actions remain explicit and separated from common actions;
- secondary metadata is visually quieter but remains accessible.

## 9. Page adaptation strategy

The whole application is divided into layout families. This avoids creating an unrelated one-off mobile design for every route.

### 9.1 Home and editorial pages

Examples: Home and public landing content.

Mobile treatment:

- compact hero;
- headline and calls-to-action shown before decorative media where possible;
- full-width cards;
- weekly practice content reorganized as tappable week cards;
- large decorative grade numbers and desktop-only whitespace are reduced;
- admin/TTCM controls remain available but move into compact action menus or sheets.

### 9.2 Catalog and library pages

Examples: Apps, Games, Resources, Library, Resource Library.

Mobile treatment:

- one or two-column card grids depending on available phone width;
- sticky or compact search/filter bar;
- horizontal filter chips;
- item details open as dedicated pages/sheets instead of narrow desktop side panels.

### 9.3 Homeroom, class, attendance and gradebook

These are priority mobile workflows because they are likely to be used while teachers are moving around.

Mobile treatment:

- class selector optimized for one-handed use;
- attendance roster as large status rows/cards with clear present/absent/late actions;
- date/session information pinned or summarized at the top;
- student details and edits use sheets/full-screen dialogs;
- gradebook tables use student-row drill-down or controlled horizontal data regions only where a real table is unavoidable;
- reporting/export controls move into action menus instead of being permanently spread across the screen.

No attendance permission or time-window rule changes are part of this redesign.

### 9.4 Dashboard, TTCM and operational pages

Examples: Dashboard, Cloud Operations, Data Governance, Production Hardening and administrative workspaces.

Mobile treatment:

- KPIs stack vertically or in two-column metric cards;
- dense control panels become grouped sections;
- large data tables use summary cards plus detail view;
- multi-pane workspaces become one pane at a time with explicit navigation;
- desktop information density is preserved through progressive disclosure rather than tiny text.

### 9.5 Weekly practice and assessment flows

Mobile treatment:

- keep the same questions, scoring and submission behavior;
- controls become thumb-friendly;
- option rows use full-width tappable targets;
- progress is sticky/compact;
- long instructions collapse where safe;
- submission confirmation and errors use mobile dialogs/sheets.

### 9.6 Auth, settings and account

Mobile treatment:

- single-column forms;
- large inputs and buttons;
- account preferences grouped into sections;
- notification center may use a full-screen mobile panel;
- no desktop popover is forced into a narrow phone viewport.

### 9.7 Tool pages and complex embedded experiences

Tool-specific screens keep their existing business logic. Each tool chooses the nearest shared mobile layout primitive before any bespoke mobile work is added.

If a tool genuinely requires a wide canvas, the mobile shell provides an explicit focused workspace rather than silently scaling the whole desktop page down.

## 10. Routing, state and data flow

Routing remains hash-based and existing route names remain valid.

The mobile shell calls the existing route launcher/navigation helpers. Deep links do not change.

All of the following stay shared between mobile and desktop:

- authentication session;
- role and permission checks;
- Supabase/data services;
- local/session storage conventions;
- notification data;
- attendance state;
- homeroom and gradebook data;
- weekly practice data;
- admin settings;
- export/reporting logic.

Presentation mode is not allowed to fork or duplicate business data.

## 11. Orientation transition behavior

When a tablet changes from portrait to landscape or back:

- presentation mode updates without a full page reload;
- the current route is preserved;
- route-level data is not re-fetched merely because the shell changed unless the page itself normally requires it;
- unsaved form state should be preserved where technically possible;
- overlays/popovers that cannot transfer safely between shells close gracefully;
- scrolling may reset only when required to avoid broken layout.

Phones stay mobile in both orientations.

## 12. Accessibility and touch requirements

Mobile implementation must preserve or improve accessibility:

- minimum 44 px touch targets;
- visible keyboard focus states;
- semantic headings and landmarks;
- accessible labels for icon-only buttons;
- no color-only status communication;
- support browser text zoom without overlapping core controls;
- respect reduced-motion preferences;
- bottom sheets/dialogs trap focus correctly and return focus when closed.

## 13. Performance requirements

The mobile shell must not load a second copy of page business logic.

Avoid mounting both full desktop and mobile DOM trees and hiding one with CSS. Only the active presentation shell should render its visual chrome.

Mobile-specific components should be lazy where useful, but navigation itself must remain fast enough to appear immediately with the app shell.

Existing lazy-loaded route chunks remain in use.

## 14. Rollout sequence

Implementation should be incremental while preserving a continuously usable desktop application.

### Phase 1 — Foundation

- device/presentation classifier;
- mobile design tokens;
- mobile top bar and bottom navigation;
- mobile more/menu sheet;
- integration with existing global runtime bridges;
- automated device-mode tests.

### Phase 2 — Home and Practice

- Home mobile redesign matching the approved visual direction;
- weekly practice browser and runner;
- mobile search/filter behavior.

### Phase 3 — Teacher-critical workflows

- attendance;
- homeroom/class management;
- gradebook;
- reports.

### Phase 4 — Content and catalog workflows

- Apps;
- Games;
- Resources;
- Library;
- Resource Library;
- Knowledge/content areas still present in production.

### Phase 5 — Administration and advanced tools

- Dashboard/TTCM workspaces;
- Admin;
- Settings;
- system/operations pages;
- remaining tools and special pages.

### Phase 6 — Cross-device regression and polish

- visual regression;
- orientation transitions;
- safe areas;
- keyboard/accessibility pass;
- performance and overflow cleanup.

## 15. Test matrix

At minimum, automated and manual regression should cover:

| Case | Expected shell |
| --- | --- |
| iPhone portrait | Mobile |
| iPhone landscape | Mobile |
| Android phone portrait | Mobile |
| Android phone landscape | Mobile |
| iPad portrait | Mobile |
| iPad landscape | Desktop |
| Android tablet portrait | Mobile |
| Android tablet landscape | Desktop |
| Mac/Windows laptop normal window | Desktop |
| Mac/Windows laptop narrow browser window | Desktop |
| Touch-enabled Windows laptop | Desktop |

Route smoke tests should cover every route surfaced by `main.jsx`, subject to its normal authentication/permission requirements.

Each adapted route should also be checked for:

- no unintended horizontal overflow;
- content not hidden by fixed bottom navigation;
- correct safe-area behavior;
- modal/sheet accessibility;
- preserved permissions;
- no desktop regression.

## 16. Visual regression targets

Create screenshots for representative mobile widths and for at least one portrait tablet. Compare critical screens across releases.

Priority visual baselines:

- Home;
- Apps;
- Attendance;
- Homeroom/class list;
- Gradebook;
- Reports;
- Dashboard;
- Weekly Practice;
- Settings/account.

Desktop screenshots for the same routes protect the existing laptop UI from accidental changes.

## 17. Failure handling

If device detection is uncertain, prefer Desktop UI on desktop-class operating systems and prefer Mobile UI only when phone/tablet evidence is strong.

If orientation APIs are unavailable, derive orientation from physical screen dimensions and update on resize/orientation events conservatively.

If mobile-specific presentation for a route is not yet implemented during rollout, the route must remain functional inside a safe mobile page frame rather than becoming unreachable.

## 18. Success criteria

The redesign is complete when:

1. phones never receive the compressed desktop navigation/layout as the primary experience;
2. portrait tablets use the mobile shell and landscape tablets use the desktop shell;
3. laptops keep Desktop UI regardless of narrow browser width;
4. every production route remains reachable according to the same permissions as before;
5. teacher-critical workflows are comfortably usable one-handed on a modern phone;
6. ordinary mobile pages have no unintended horizontal overflow;
7. desktop visual and functional regression tests pass;
8. orientation changes do not lose route context or cause a full reload;
9. mobile and desktop share the same business logic and data sources.

## 19. Implementation boundary

The first implementation plan must focus on the shared shell and foundation before page-by-page redesign work. It must not attempt an uncontrolled all-at-once rewrite.

The existing desktop UI is treated as a protected behavior surface. Mobile presentation is added alongside it through a shared, device-aware shell architecture.