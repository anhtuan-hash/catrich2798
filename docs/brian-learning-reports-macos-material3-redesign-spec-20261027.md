# BRIAN REPORTS — MACOS × MATERIAL 3 REDESIGN
**Design / implementation specification v1.0 · 27 October 2026**
**Target:** \`#/tool/brian-team\` > Bồi dưỡng & Phụ đạo
**Scope:** visual composition, accessibility, responsive UI and information hierarchy; **no change to DB/business logic**.

## 1. Design concept and invariants
A cohesive elegant visual language combining macOS polished restraint with Material 3 components: generous spatial rhythm, layered near-white surfaces, subtle acrylic-like translucency in noncritical chrome, expressive Material color roles, touch-friendly affordances, typography with a clear hierarchy, floating rounded shapes without visual clutter. Use system fonts, SVG Lucide already installed, native CSS (no new assets, remote fonts, package dependency, AI or cost).

Maintain:
- All existing TTCM/teacher permission checks and Supabase/RLS mechanisms;
- Smart assignment from confirmed attendance (teacher-specific even when co-teaching);
- Two programmes in one teacher-assignment table, one assignment per teacher/type/month;
- Check-all/clear/bulk revoke only empty drafts; submitted/approved/written work protected;
- Individual draft/save/submit, TTCM comments/approval, reports, deadlines, year analytics, CSV and native Print/PDF;
- nav timer, events and notifications, same route, existing tabs and floating dock;
- Monthly professional reporting unaffected by specialist-specific styles.

## 2. Information architecture
BrianTeamPortal still provides two top-level areas:
1. **Báo cáo chuyên môn tháng**
2. **Bồi dưỡng & Phụ đạo** (active programme)
Within Specialist:
- Top contextual area: \`Quản lý HSG & Phụ đạo\` / \`Báo cáo của tôi\`;
- One premium feature hero for both modes;
- Action row: left role-specific descriptor, right Refresh / Giao báo cáo (TTCM only);
- Feedback region immediately beneath action row;
- TTCM inner tabs: Báo cáo giáo viên, Tổng hợp tổ, Thống kê tháng; programme selector only when summarizing;
- TTCM 4 compact KPI cards in teacher list mode;
- one department selector; main content panel below;
- teacher keeps private task list and existing five-section form, attendance journal.

## 3. Design tokens
In \`LearningReportsMacMaterial.css\` (imported at end of Specialist Workspace):
- Ink: #163251 / dark navy; secondary #60758d; tertiary #7f91a6;
- Primary #2563db, hover #1d4ed8; on-primary white; pale primary #e8f1ff;
- Secondary teal #159c80 for progress; green #14845b for success;
- Warning amber #aa6b17; red #b33c4a; accent purple #8553ce;
- Canvas #f5f8fc; surface #fff; surface-container-low #f8fbff; border #dce6f1;
- Radius: 12 / 16 / 20 / 26 / 30 px; button min-height 42 px; table compact 44-52 px row;
- Shadows subtle (0 6px 28px rgba(29,59,102,.06)); no costly blur on long scrolling table;
- Focus ring 3px semitransparent blue, visible on keyboard;
- Motion: 160–220 ms transform/color only, respects reduced motion.

## 4. Hero layout
- Horizontal compact 16:5ish feature banner, 28px radii, light blue-white-peach gradient.
- Eyebrow \`BRIAN REPORTS · SPECIALIST PROGRAMMES\`, expressive 44-52 px navy heading (clamped).
- Subtitle single clear line when possible.
- Right: decorative *CSS composition* of two overlapping circles + tilted document glyph with three lines/bar chart from Lucide; drawn only with CSS/available icons (no remote image requests).
- Hero does not hide title beneath floating dock. 70px safety gutter on desktop.
- Responsive below 660px: decorative icon reduced/hide, title 29–34px.

## 5. Actions, tabs, state
- Align descriptor with visual spacing (fix former concatenated text issue). Desktop left descriptor / right actions; stack at narrow widths.
- Three inner views styled as Material 3 segmented surfaces with active tonal fill + slim blue indicator, not harsh bordered tabs. Tabs retain proper aria-selected.
- Toast/error banner with icon, unmistakable success/error color and dismiss button, screen-reader status preserved.
- Do not derive status from example screenshot text: all counts and messages come from real state.

## 6. KPI cards
4 per row desktop; 2 on tablet; 1 on small phone. Each: 44px softly tinted icon tile (FileText, Clock3, CheckCircle2, AlertCircle), 11–13px label, 30px tabular numeral, proper spacing, no gradients behind metric text. Use existing computed values \`filtered.length\`, \`pending\`, \`done\`, \`filtered.length-done\`.

## 7. Teacher assignment list
- Single rounded card with icon + eyebrow + title/subtitle and CSV action.
- Search, month and status filters in subtle filled row.
- Select-all/clear/bulk revoke toolbar with persistent disabled states and count.
- Wide table horizontally scrollable on narrow devices; keep teacher name and status readable; padded selection checkbox labels; 0–100% progress pill/track; subdued status chips; per-row \`Xem\` action.
- \`gifted\` blue-bluegray badge; \`remedial\` teal-green badge.
- Hover rows use subtle blue tint, keyboard focus obvious.
- Safety copy at foot in light neutral strip.
- No accordion or separate card for each programme.

## 8. Summary and year stats
Existing \`LearningReportsManagerDashboard\` remains functional but restyled to match surfaces:
- compact hero, right year select, refresh, native Print/PDF;
- deadline card with readable countdown, input and Set/Clear controls;
- 10 soft KPI tiles responsive 5/3/2/1 columns;
- 12-month cards 6/4/3/2 columns with selected month tonal elevation;
- teaching activity bars retain actual data and color semantics;
- monthly and annual roll-up tables share border, row and action styles.
- Print media hides controls/chrome and lays out the report clearly on A4 landscape.

## 9. Auto-assignment composer + teacher editor
- Match entire specialist style; tidy three-column inputs, larger labels, contained verified-data preview and exception panel;
- Header and typed primary action maintain meaning; do not automatically assign as part of page load;
- Teacher report editor, section narrative input, journal and attendance summary use same border/radius/hierarchy; reviewer area clearly distinct.
- Keep legacy instructor/class manual correction disclosure accessible.

## 10. Responsive/accessibility/performance
At <=1200px comfortable 3-col tiles; <=900 2-column; <=650 1-column main, compact action row, scrollable table. All focusable buttons/checkboxes accessible with native HTML labels. Inputs >=42px height. Layout honors safe right gutter for floating dock; no custom global body styles. Avoid backdrop-filter on tables and avoid animating shadows/filters while scrolling. Honor \`prefers-reduced-motion\`. Visually distinct hover/focus/disabled/protected semantics. Light/dark compatibility: primary design light; optional dark surfaces only via CSS \`prefers-color-scheme\` not required because app currently light.

## 11. Internationalization and tests
Reuse existing Vietnamese strings / global legacy translator; any new visible Vietnamese literals require English mappings. Preserve all existing DOM contracts and queries; add visual design contract test that checks CSS scope, KPI icons, accessibility roles, original APIs, business invariants and responsive/reduced-motion. CI must parse JSX, run existing contracts, I18N audit and production bundle.

## 12. Acceptance gates
- Screens: TTCM list, monthly roll-up, annual stats, auto-dispatch composer, teacher view/review render with one design system;
- Supabase data unchanged by deployment; actions still require explicit user clicks;
- no regressions to monthly reports, Brian Focus/Board, attendance, notifications or floating navigation;
- no new dependencies, services, images, cost or third-party calls;
- PR Preview build success; merge only after focused CI passes and validate Production status.
