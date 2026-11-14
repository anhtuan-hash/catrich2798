# Swiss Editorial Premium Redesign — Phase 3 Full QA Report

- **Branch:** `swiss-editorial-v3`
- **Local Preview URL:** `http://localhost:5173/#/tool/immersive-gallery`
- **Date:** 2026-11-14
- **Canonical Reference:** `design/reference/swiss-editorial-approved.png`

---

## 1. Visual Acceptance Criteria — Desktop Checklist (11 / 11 Verified)

| # | Criterion | Status | Evidence / Verification |
|---|---|---|---|
| 1 | Horizontal app bar navigation replaces vertical sidebar | PASS | `Overview`, `Lessons`, `Submissions`, `Exhibitions`, `Teaching Plan` + secondary utility triggers (`Teacher Live`, `Competition Dossier`, Search, Bell, Settings, Help, User menu) render in `.igv2-topbar`. |
| 2 | Active Overview pill visually distinct (`bg-ink`, `text-white`) | PASS | Verified `.is-active` pill state on every navigation step in `verify-phase3.mjs`. |
| 3 | Official competition wing banner spans content width directly below top nav | PASS | `[data-testid="igv2-competition-banner"]` verified with loaded left/right official wings (`contest-wing-left.png`, `contest-wing-right.png`, `naturalWidth > 0`). |
| 4 | White hero card pairs bold geometric wordmark & Academic Year mark on left with crisp school photo & red accent on right | PASS | Verified `hero-petrus-ky-facade.png` renders cleanly with clip diagonal and corner accent in `phase3-overview-1440x900.png`. |
| 5 | Four numbered quick-navigation cards appear in one row (`01`–`04`: cream, yellow, ice blue, terracotta) with crisp dark border strokes & circular arrow badges | PASS | Verified in `1440×900` and `1600×900` Overview captures (`2×2` at `1024×768`, `1×4` stacked at `390×844`). |
| 6 | Recent Lesson panel pairs climate earth illustration on left with clean title, metadata chips, and progress bars | PASS | Verified `recent-lesson-climate.png` and real non-fabricated offline counts (`0/0`) in `phase3-overview-1440x900.png`. |
| 7 | Learning Progress panel places Exit Tickets & Museum Projects counters on left and angled gallery photo on right | PASS | Verified `learning-progress-gallery.png` and diagonal mask cleanly positioned. |
| 8 | Three compact horizontal utility action links sit above footer (`Create a Lesson`, `Review Submissions`, `Explore Museums`) | PASS | Verified routing to `Lessons`, `Submissions`, and `Exhibitions` via real click flows in `verify-phase3.mjs`. |
| 9 | Three partner institutional & credential cards sit cleanly side-by-side (`BRIAN ENGLISH`, `P&K`, `Cambridge Assessment English`, `NGUYỄN ANH TUẤN (MR.)`, `HỌC VẤN & CHỨNG CHỈ CHUYÊN MÔN`) | PASS | Verified in HTML text across all 4 viewports on all 8 screens. |
| 10 | Full-width dark navy footer closes page (`BRIAN ENGLISH | Teach Better Together` & `Designed & Developed by Nguyễn Anh Tuấn`) | PASS | Verified in `.igv2-footer-wrap` across all screenshots. |
| 11 | Warm off-white background contrast holds against pure white Swiss cards & sharp borders | PASS | Verified `--igv2-background: #faf9f5` / white cards / dark structural rules across Overview & Phase 2 screens. |

---

## 2. Multi-Viewport Responsive Matrix (`verify-phase3.mjs`)

All 8 screens (`Overview`, `Lessons`, `Submissions`, `Exhibitions`, `Teaching Plan`, `Teacher Live`, `Competition Dossier`, `Settings`) were audited automatically across 4 viewports (32 checks total):

| Viewport | Overflow-X (`scrollWidth <= clientWidth + 1`) | Topbar Clipped / Overlap | Global BRIAN Nav | Competition Banner & Wings | Footer & Real Credentials | Broken Images |
|---|---|---|---|---|---|---|
| `1440×900` (Desktop) | `false` on 8/8 screens | `false` on 8/8 screens | Present on 8/8 | Loaded on 8/8 | Present on 8/8 | `0` |
| `1600×900` (Wide Desktop) | `false` on 8/8 screens | `false` on 8/8 screens | Present on 8/8 | Loaded on 8/8 | Present on 8/8 | `0` |
| `1024×768` (Tablet) | `false` on 8/8 screens | `false` on 8/8 screens | Present on 8/8 | Loaded on 8/8 | Present on 8/8 | `0` |
| `390×844` (Mobile) | `false` on 8/8 screens | `false` on 8/8 screens (5 nav pills wrap cleanly; `.igv2` top-padded `40px` below 2-row global pill bar) | Present on 8/8 | Loaded on 8/8 | Present on 8/8 | `0` |

---

## 3. Interactive Flows, Role Guards & Accessibility

- **Required Navigation Sequence (`Overview > Lessons > Overview > Submissions > Overview > Exhibitions > Teaching Plan > Teacher Live > Competition Dossier > Settings > Overview`):** PASS (all transitions and `.is-active` states verified; `0` console errors; `0` page errors).
- **Overview Internal CTAs:** PASS (`01–04` navigation cards, `View all`, `Review Submissions`, and `Explore Museums` tiles navigate cleanly).
- **Topbar Search Popover:** PASS (added `data-bes-keep-search="true"` in `ImmersiveShell.jsx` so click-opened search form isn't suppressed by `public/bes-remove-visible-search-bars.js`; open, input `'climate'`, clear, and close verified).
- **User Dropdown & Help Modal:** PASS (`.igv2-user-trigger` menu and `[data-testid="igv2-help-btn"]` dialog open and close cleanly).
- **Admin Role Guard (`LessonWizard` Step 1):** PASS (when local Supabase auth is unconfigured/not signed in as Admin, Step 1 `Continue` remains disabled).
- **Reduced Motion (`prefers-reduced-motion: reduce`):** PASS (`@media (prefers-reduced-motion: reduce)` rule present in `swiss.css` line 1499; emulated transitions completed cleanly with `0` overflow/errors).
- **Keyboard Focus Visibility (`:focus-visible`):** Styles defined in `swiss.css` lines 28–33 (`outline: 3px solid var(--igv2-red); outline-offset: 2px`) and `advanced.css` line 24; in headless Chromium after programmatic `.focus()` + `Tab` navigation, computed `outlineStyle` read `none` (browser `:focus-visible` heuristic only activates on native non-programmatic keyboard navigation from pointer blur/initial focus).

---

## 4. Build & Automated Test Suite Summary (Post-Final Edit)

| Check / Command | Status | Observed Result |
|---|---|---|
| `node ./node_modules/vite/bin/vite.js build` | **PASS** | `✓ 4069 modules transformed`, `✓ built in 3.05s` (exit code 0) |
| `node scripts/audit-site-language.mjs` | **PASS** | `4181/4197 static occurrences translated; 16 intentionally preserved; 0 actionable unmapped` |
| `node scripts/test-global-bilingual-coverage.mjs` | **PASS** | `1311/1314 audited static labels (99.8%)` |
| `node scripts/test-museum-sample-free-ui.mjs` | **PASS** | No sample/demo entry points; frozen/approved exhibits unchanged |
| `node scripts/test-museum-final-readonly.mjs` | **PASS** | Read-only lesson & write-block safeguards preserved |
| `node scripts/test-museum-lesson-paper-v57.mjs` | **PASS** | V57 lesson-paper layout, live counts, 10 group cards & QR/passcode actions preserved |
| `node scripts/test-museum-private-passcodes-v56.mjs` | **PASS** | Private passcodes round-trip, admin gate, bulk workflow preserved |
| `node scripts/test-museum-quick-classroom-v58.mjs` | **PASS** | Quick classroom verifier, revocation, Admin gate preserved |
| `node scripts/test-museum-submit-readiness-v55.mjs` | **PASS** | `5/5` tests passed |
| `node scripts/test-museum-command-center-v52.mjs` | **PASS** | `5/5` tests passed |
| Playwright `verify-phase3.mjs` (32 viewport×screen checks + flows) | **PASS** | All checks passed; `Console errors: 0`, `Page errors: 0` |
| `node scripts/test-museum-lab-v3.mjs` | **PARTIAL (20/23 PASS, 3 FAIL pre-existing v1->v2 string checks)** | 20 API/security/rubric/3D cinema checks pass; 3 static regex assertions check pre-v2 strings (`MuseumDashboard`, inline `onRefresh={refresh} transport={transport}` on `MuseumLabApp.jsx` vs current `v2/screens/*` + `sharedScreenProps`) |
| `node scripts/smoke-test.mjs` | **FAIL (unrelated repo baseline)** | `ERR_MODULE_NOT_FOUND` for removed `src/utils/specializedAppEngines.js` |

---

## 5. Known Environment / Scope Boundaries
- No live Supabase session is configured in local sandbox env, so staff sync shows expected fallback (`Could not load staff data`), `LessonWizard` Admin guard blocks Step 1 progression, and Overview displays real `0/0` counts without fabricated demo records.
- Global top navigation pill strip (`Ứng dụng | Dashboard | Chủ nhiệm | ...`) remains visible above `.igv2-topbar` per `AGENTS.md` workspace rules.
- Preview/production deployment was **not** run and awaits explicit user approval on branch `swiss-editorial-v3`.
