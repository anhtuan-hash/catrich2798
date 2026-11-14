# Implementation Plan — Swiss Editorial Premium V3 (`swiss-editorial-v3`)

Canonical visual target: `design/reference/swiss-editorial-approved.png`  
Target entry route: `#/tool/immersive-gallery` (`src/pages/ToolPage.jsx` -> `src/features/immersive-gallery/v3/MuseumLabApp.jsx`)

## Architectural Decisions

1. **Preserve Global Chrome & Contracts**:
   - Keep `src/main.jsx`, `src/data/apps.js`, `src/components/GlobalFlatNavigation.jsx`, `src/components/Footer.jsx`, and global Footer CSS contracts untouched.
   - Inside `.app-shell[data-tool="immersive-gallery"]:has(.igv2)`, suppress only the duplicate outer `.signature-footer-collapsible` via scoped CSS in `v2/swiss.css` so `.igv2` renders the complete competition banner, shell navigation, active screen, and 3-card Swiss Editorial footer cleanly.
2. **Full-Width Horizontal Shell (Replacing Left Navy Sidebar)**:
   - Inside `ImmersiveShell` (`.igv2`):
     1. `<CompetitionBanner />` at top of competition app content (official contest banner with circular seals, slanted `BÀI DỰ THI` & `CẤP THÀNH PHỐ · NĂM HỌC 2026–2027` ribbons, and yellow teacher highlight pill).
     2. `<nav className="igv2-topbar">` horizontal navigation bar: left Brian English brand logo, primary navigation pills (`Overview`, `Lessons`, `Submissions`, `Exhibitions`, `Teaching Plan`) + secondary teacher pills (`Teacher Live`, `Competition Dossier`), and right utility cluster (`Search`, `Bell` pending review badge, `Settings`, `Help`, teacher avatar pill).
     3. `<main className="igv2-main-full">` full-width editorial canvas (`max-width: 1360px`).
     4. `<Footer />` 3-card Swiss Editorial credential grid + dark-navy closing strip (no portrait image).
3. **Fix Tab Routing in `MuseumLabApp.jsx`**:
   - Restore `LessonWizard` on `tab === 'wizard'` (`onCreate`) and bind `NAV_TO_TAB['teaching-plan'] = 'templates'` (`TeachingPlanScreen`), while keeping all `audit-site-language`, passcode, and frozen-readonly assertions intact.

## Phased Rollout

- **Phase 0**: Branch `swiss-editorial-v3`, `AGENTS.md`, `design/reference/swiss-editorial-approved.png`, and `docs/design/swiss-editorial/*` audit docs.
- **Phase 1**: Design tokens (`v2/tokens.css`), `MuseumLabApp.jsx` routing/topbar props, `ImmersiveShell.jsx` topbar shell, `Footer.jsx` 3-card upgrade, and `v2/swiss.css` visual architecture + outer-footer suppression.
- **Phase 2**: Canonical `OverviewScreen.jsx` & `OverviewScreen.css` (Editorial hero + diagonal campus photo, 4 numbered chamfered tiles `01–04`, live data `Recent Lesson` + `Learning Progress` 2-column grid with diagonal gallery preview, 3 quick action cards).
- **Phase 3**: `.igv2 .bml` theme unification across `Lessons`, `LessonWizard`, `Submissions`, `Exhibitions` (3D preview), `Teaching Plan`, `Teacher Live`, `Competition Dossier`, and `Settings`.
- **Phase 4**: Node audit gates, Vite production build, unit tests, and Playwright visual & functional QA (`1199x1312`, `1440x900`, `1366x768`, `768x1024`, `390x844`).
- **Phase 5**: Evidence archival and clean commit on `swiss-editorial-v3` (awaiting user approval before any merge or production deploy).
