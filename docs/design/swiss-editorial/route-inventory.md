# Route Inventory — BRIAN ENGLISH

> Phase 0 Audit · Swiss Editorial Premium V3 Redesign
> Generated: 2026-11-14

## Routing architecture

The app uses **hash-based client-side routing** (`window.location.hash`).  
Router lives entirely in `src/main.jsx` → `getInitialRoute()` + `hashchange` listener.  
The route name is extracted from `#/<route>` or `#/tool/<slug>`.

---

## 1. Top-level page routes

| Hash route | React component (lazy) | CSS files loaded | Auth required | Swiss Editorial scope |
|---|---|---|---|---|
| `#/home` | `src/pages/Home.jsx` → renders `src/pages/HomeApproved.jsx` | `HomeApproved.css`, `HomePracticeIntegration.css`, `HomePracticeByGrade.css`, `HomePracticeFinalFix.css` | No (public, guest browsable) | ❌ Out of scope (separate Home page, different design intent) |
| `#/apps` | `src/pages/WebApps.jsx` | App-level styles | Yes | ❌ Out of scope |
| `#/news` | `src/pages/NewsReader.jsx` | Inline styles | Yes | ❌ Out of scope |
| `#/tools` | `src/pages/SpecialTools.jsx` | Inline styles | Yes | ❌ Out of scope |
| `#/homeroom` | `src/pages/HomeroomWorkspace.jsx` | Various homeroom CSS | Yes | ❌ Out of scope |
| `#/attendance` | `src/pages/AttendanceWorkspace.jsx` | Attendance CSS | Yes | ❌ Out of scope |
| `#/homeroom-portal` | `src/pages/HomeroomPortal.jsx` | - | No | ❌ Out of scope |
| `#/classroom-join` | `src/pages/ClassroomJoin.jsx` | - | No | ❌ Out of scope |
| `#/board-live` | `src/pages/BoardLiveJoin.jsx` | - | No | ❌ Out of scope |
| `#/slideshow` | `src/pages/PhotoSlideshow.jsx` | - | No | ❌ Out of scope |
| `#/quest-join` | `src/features/questatlas/QuestJoin.jsx` | - | No | ❌ Out of scope |
| `#/resources` | `src/pages/Resources.jsx` | - | No | ❌ Out of scope |
| `#/library` | `src/pages/Library.jsx` | - | Yes | ❌ Out of scope |
| `#/resource-library` | `src/pages/ResourceLibrary.jsx` | - | Yes | ❌ Out of scope |
| `#/knowledge-hub` | `src/pages/KnowledgeHub.jsx` | - | Yes | ❌ Out of scope |
| `#/dashboard` | `src/pages/WorkDashboard.jsx` | - | Yes | ❌ Out of scope |
| `#/student-support` | `src/pages/StudentSupportCenter.jsx` | - | Yes | ❌ Out of scope |
| `#/assessment-core` | `src/pages/QuestionBank.jsx` (via AppErrorBoundary) | - | Yes | ❌ Out of scope |
| `#/qb-practice` | `src/pages/QuestionBankPractice.jsx` | - | No | ❌ Out of scope |
| `#/platform-readiness` | `src/pages/PlatformReadiness.jsx` | - | Yes | ❌ Out of scope |
| `#/cloud-operations` | `src/pages/CloudOperations.jsx` | - | Yes | ❌ Out of scope |
| `#/data-governance` | `src/pages/DataGovernance.jsx` | - | Yes | ❌ Out of scope |
| `#/production-hardening` | `src/pages/ProductionHardening.jsx` | - | Yes | ❌ Out of scope |
| `#/app-vault` | `src/pages/HiddenAppsVault.jsx` | - | Yes | ❌ Out of scope |
| `#/qa` | `src/pages/SystemHealthCenter.jsx` | - | Yes | ❌ Out of scope |
| `#/trash` | `src/pages/TrashCenter.jsx` | - | Yes | ❌ Out of scope |
| `#/contact` | `src/pages/Contact.jsx` | - | No | ❌ Out of scope |
| `#/settings` | `src/pages/Settings.jsx` | - | Yes | ❌ Out of scope |
| `#/login` | `src/pages/AuthPage.jsx` (mode=login) | Login scrapbook CSS | No | ❌ Out of scope |
| `#/register` | `src/pages/AuthPage.jsx` (mode=register) | - | No | ❌ Out of scope |
| `#/admin` | `src/pages/AdminPage.jsx` | - | Yes (admin) | ❌ Out of scope |
| `#/setup` | `src/pages/SupabaseSetup.jsx` | - | No | ❌ Out of scope |
| `#/gallery-create` | `src/features/immersive-gallery/v3/MuseumLabStudent.jsx` | creatorPass.css | No (special isolation) | ⚠️ Student-facing; design system may inherit but layout must stay 16:9 |

---

## 2. Tool sub-routes (`#/tool/<slug>`)

Rendered by `src/pages/ToolPage.jsx` using the `selectedTool` from `src/data/apps.js`.

| Slug / Hash | Description | Rendered component | CSS files | Swiss Editorial scope |
|---|---|---|---|---|
| `immersive-gallery` | **BRIAN Museum Lab V3** | `src/features/immersive-gallery/v3/MuseumLabApp.jsx` → wraps in `ImmersiveShell` | `museumLab.css`, `museumPaper.css`, `v2/tokens.css`, `v2/swiss.css` + all museum v3 CSS | ✅ **PRIMARY SCOPE** — all sub-screens |
| `sync-doctor` | Brian Sync Doctor | ToolPage generic | Tool CSS | ❌ Out of scope |
| `questatlas` | QuestAtlas | ToolPage generic | Quest CSS | ❌ Out of scope |
| `work-dashboard` | redirects to `#/dashboard` | WorkDashboard | - | ❌ Out of scope |
| `student-support` | redirects to `#/student-support` | StudentSupportCenter | - | ❌ Out of scope |
| `gradebook-studio` | Gradebook Studio | ToolPage generic | Gradebook CSS | ❌ Out of scope |
| `brian-team` | Brian Team | ToolPage generic | - | ❌ Out of scope |
| `assessment-core` | redirects to `#/assessment-core` | QuestionBank | - | ❌ Out of scope |
| `lesson-check-studio` | Lesson Check Studio | ToolPage generic | lesson-check CSS | ❌ Out of scope |
| `thpt-practice-hub` | THPT Practice Hub | ToolPage generic | thpt CSS | ❌ Out of scope |
| `knowledge-hub` | redirects to `#/knowledge-hub` | KnowledgeHub | - | ❌ Out of scope |
| `platform-readiness` | redirects to `#/platform-readiness` | PlatformReadiness | - | ❌ Out of scope |
| `cloud-operations` | redirects to `#/cloud-operations` | CloudOperations | - | ❌ Out of scope |
| `data-governance` | redirects to `#/data-governance` | DataGovernance | - | ❌ Out of scope |
| `resource-library-hub` | redirects to `#/resource-library` | ResourceLibrary | - | ❌ Out of scope |
| `news-reader` | redirects to `#/news` | NewsReader | - | ❌ Out of scope |
| `vietnam-tax` | Vietnam Tax Studio | ToolPage generic | - | ❌ Out of scope |
| `textlab-activities` | TextLab Activities | ToolPage generic | - | ❌ Out of scope |
| `textcare` | TextCare Fixer | ToolPage generic | - | ❌ Out of scope |

---

## 3. In-scope routes: immersive-gallery sub-screens

The `MuseumLabApp.jsx` manages an internal tab router. All sub-screens render inside `ImmersiveShell` (`.igv2` root).

| Internal tab ID | Nav item label | JSX component | CSS files | Priority |
|---|---|---|---|---|
| `home` (overview) | Overview | `v2/screens/OverviewScreen.jsx` | `v2/swiss.css`, `v2/tokens.css` | 🔴 Phase 2 (landing/overview) |
| `lessons` | Lessons | `v3/MuseumLessonFlow.jsx` (LessonsList) | `museumLessonPaperV57.css`, `museumLessonQr.css` | 🟡 Phase 3 |
| `submissions` | Submissions | `v2/screens/SubmissionsScreen.jsx` | `v2/swiss.css`, `v2/tokens.css` | 🟡 Phase 3 |
| `gallery` / `exhibitions` | Exhibitions | `v2/screens/ExhibitionsScreen.jsx` | `v2/swiss.css`, `v2/tokens.css`, `museumExhibition.css` | 🟡 Phase 3 |
| `wizard` / `teaching-plan` | Teaching plan | `v2/screens/TeachingPlanScreen.jsx` | `v2/advanced.css`, `v2/tokens.css` | 🟡 Phase 3 |
| `live` / `teacher-live` | Teacher Live | `v2/screens/TeacherLiveScreen.jsx` | `v2/advanced.css`, `museumLive.css` | 🟡 Phase 3 |
| `evidence` / `competition-dossier` | Competition dossier | `v2/screens/DossierScreen.jsx` | `v2/advanced.css` | 🟡 Phase 3 |
| `settings` | Settings & access | `v2/screens/SettingsScreen.jsx` | `v2/swiss.css` | 🟡 Phase 3 |

**Shell components (rendered on every screen):**
- `v2/shell/ImmersiveShell.jsx` — `.igv2` wrapper; renders CompetitionBanner + SideNav + main + Footer
- `v2/shell/CompetitionBanner.jsx` — full-width contest masthead
- `v2/shell/SideNavigation.jsx` — 8-item left sidebar nav
- `v2/shell/Footer.jsx` — 3-column info footer + credit rail
- `v2/shell/EditorialHeading.jsx` — editorial hero heading
- `v2/shell/MetricStrip.jsx` — live metric row
- `v2/shell/ActionTile.jsx` — 4 nav tiles on overview
- `v2/shell/GroupCard.jsx` — group status cards
- `v2/shell/ContentPanel.jsx` — content panel wrapper

---

## 4. Global chrome (present on all authenticated routes)

| Component | File | Notes |
|---|---|---|
| Global navigation | `src/components/GlobalFlatNavigation.jsx` → `GlobalCompactNavigation.jsx` | Multi-part import of many sub-components and CSS; wraps mobile shell |
| Footer | `src/components/Footer.jsx` | Bilingual teacher identity cards; uses `FooterCompactDisclosure.css`, `FooterAuthCards.css`, etc. |
| Status menu bar | `src/components/StatusMenuBar.jsx` | Top chrome status strip |
| Smart Bubble Dock | `src/components/SmartBubbleDock.jsx` | Floating dock |

> [!NOTE] The global `GlobalFlatNavigation` is **distinct** from the igv2 `SideNavigation`. Both exist simultaneously on the `immersive-gallery` route: global nav at top of page, v2 sidebar inside the `.igv2` region.
