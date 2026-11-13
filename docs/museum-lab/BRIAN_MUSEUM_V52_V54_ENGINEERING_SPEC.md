# BRIAN Museum Lab — Product & Engineering Specification V5.2–V5.4
Version 1.0 · 2026-11-13 · Status: **implementation baseline**
Owner: BRIAN English · English 11 Global Success, Unit 5
Scope: **existing** Museum Lab; no change to BRIAN global navigation, auth, TTCM permissions, or other apps.

## A. Outcomes, constraints, and success criteria
1. Teacher controls **11 activities in 2 × 45 minutes**; navigation remains manual and stage-specific. Student actions must be impossible in locked stages.
2. Student Creator and Teacher Live communicate through existing authenticated, class-scoped APIs. No public publishing as a shortcut for peer review.
3. Teacher dashboard should provide an at-a-glance overview of **up to ten groups at 16:9** and replace the unbounded Saved peer feedback column with selectable group details and concise cards.
4. Preserve the Paper Scrapbook design system, English-only Museum Lab UI, motion toggle, en-US voiceover, and contextual audio/video placement.
5. No invented scientific figures or source claims. Classroom exhibition content may be pre-populated for presentation, but imported/scripted records must retain private administrative provenance so exports never pretend to be observed submissions.
6. Do not reset, rename, publish, or alter the existing ten class-group drafts. New capabilities are non-destructive and feature-gated where appropriate.
7. Baseline browsers: Chrome/Edge desktop (1366×768, 1920×1080), 13-inch laptop, tablet 820px, and 390px mobile. Reduced-motion and keyboard accessibility must remain operational.
8. Production gate: baseline CI + Museum-specific Node tests + Chromium E2E desktop/mobile; no severe a11y, auth or deployment regressions. Never claim publication until production deployment is READY.

## B. Release V5.2 — Classroom Experience (40% total)
### B1. Live Classroom Command Center
**Entry:** Teacher Live / Class groups, and Presenter Fullscreen → Groups. Does not touch the original BRIAN navbar.

**Layout (desktop, 16:9 bounded panel):**
- Top: lesson and current activity (e.g., 09/11), teaching status and a Refresh control.
- Metrics: Groups, current-activity responses, reviewed groups, groups requesting help. These are computed from server data; omit unknown counts.
- Left: up to ten selectable group tiles in responsive grid (5 × 2 at wide width). Each: group label, draft state, current-activity response marker, review count and help marker. Statuses are **not** grades.
- Right: one selected group with inbound comments, outbound comments, current response/challenge status and a button to privately spotlight its museum. Never render all comments at full length simultaneously.
- Optional teacher-only **Quality check**: duplicates and short/unactionable feedback identified through deterministic, explainable pattern detection. These are warnings, not automatic accusations, grades or submission blocks.
- Centered empty state for zero groups, loading status, and keyboard-navigable controls.
- Small screens: one vertical panel with group selector and details; no horizontal overflow.

**Data contract:** extend existing teacher GET `museum-live?operation=state` non-destructively with `helpGroups: string[]`, deduplicated by group_id; `needHelp` becomes unique group count. All other existing fields remain unchanged. Commands use existing `group-gallery` with scoped auth; no extra public API.
**Updates:** retain existing 3-second polling for V5.2, avoid extra DB queries per tick. Incremental realtime subscriptions can be added later only with an authenticated channel and polling fallback.
**Quality detection:** normalized exact matching for substantial comments, plus short-feedback checks. Exclude generic interface labels, group names, and the survey question itself. Do not alter database data or block a student's response.
**Privacy:** no guest group secrets, user identifiers, student personal details or unapproved artwork URLs in dashboard payload.

**Acceptance**
- 10 groups visible without page-level scrolling inside dashboard at 1366×768; scrolling allowed only within detail drawer where required.
- Selecting a tile changes details; spotlight still opens a scoped private draft.
- Both desktop and fullscreen use the same component; fullscreen panel expands to ≥80vw.
- Inbound/outbound peer review counts match backend `feedback`; missing data does not invent counts.
- Quality detector finds exact repeated comments, not normal short expressions like “We recommend”.
- No regression to stage control, QR code, media, or keyboard shortcuts.

### B2. Contextual tools and teacher screen hygiene
- Continue showing student video/audio only when stage-scoped teacher assignments exist.
- In Teacher Live, move very long feedback out of the controls area into Command Center; keep compact count/link.
- No clipped action buttons, overlays extending below the display, or hidden navigation while fullscreen.
- Accessible tab order, focus outlines, readable contrast, `aria-pressed` for group selection.

### B3. Data quality policy
- A teacher-only advisory checks duplicated substantive sentences in group feedback; no automatic rewriting.
- Distinguish classroom choices (N = groups) from personal habits. Preserve original survey notes, source and response count.
- Prepared presentation data does not masquerade as externally validated scientific evidence in exports.

## C. Release V5.3 — Interactive Museum (35% total)
### C1. Interactive exhibition object hotspots
- Inside existing MuseumScene (3D), each exhibit can expose: caption, citation/source, artwork, a descriptive accessible text panel, and optional audio/video only when present.
- Clicking an exhibit should open a non-blocking content drawer with close/ESC and focus restoration.
- No WebGL hard requirement: equivalent 2D cards available and usable with keyboard/touch.
- Hotspots must not introduce unsafe external links or unsanitized HTML.

### C2. Storyboard editor
- Three mandatory exhibit cards: Problem, Evidence, Solution.
- Drag-and-drop for ordering with up/down buttons as accessible fallback.
- Autosave via existing optimistic version checks; conflict messages never silently overwrite a teammate's work.
- Exhibit order and art assets validated on submit, without requiring paid services.

### C3. Live Peer Review 2.0
- Existing classroom feedback rooms remain Creator Pass scoped.
- Reviewer can target **one exhibit** while still completing two substantive English answers and clarity score 1–4.
- Server validates same class, active stage, no self-review, and one group review per room; preserve historical answers.
- Owner sees new feedback with visitor group and exhibit title; can link a comment to a revision.
- Realtime channel is optional enhancement, with auth-safe polling fallback.

### C4. Before/After visual comparison
- Teacher can show selected group's before and after checkpoint, with text diff and synchronized exhibit view.
- Do not rewrite historical snapshots or use fabricated timestamps.
- Teacher may pin one improvement to the stage without making private drafts public.

**V5.3 acceptance:** desktop/mobile gesture, source citations, no anonymous leaks, migrations with verified RLS if new tables/columns are necessary; WebGL fallback tested.

## D. Release V5.4 — Presentation & Competition (25% total)
### D1. English Speaking Studio
- 45–60-second rehearsal for group presentations; record only after explicit user action and microphone permission.
- Review/retake/delete local recording; no indefinite storage or auto-upload; optional ASR depends on a reviewed provider and user consent.
- en-US listening model, speech rate and captions; pronunciation scoring is NOT claimed without a validated instrument.

### D2. Stage-specific motion
- Each of the 11 stages has a distinct meaningful animation (survey freeze, scene transition, exhibit reveal, revision comparison); avoid constant decorative movement.
- Respect `prefers-reduced-motion`, teacher Motion OFF and browser performance.
- Motion never runs offscreen or hides buttons and text.

### D3. Competition evidence portfolio
- Export lesson alignment matrix, frozen group-priority survey (N and source), planned exhibits, actual artwork metadata, group peer review, before/after checkpoints, and exit tickets.
- Mark source class internally; separate presentation preparation data from independently collected classroom evidence.
- Export contains references/links plus source timestamps; redact Creator Pass secrets.
- PDF/DOCX export should not change the original learning artefacts.

### D4. Reliability and recovery
- Teacher stage/index/assignment and active media panel can recover after accidental refresh; never replay a submitted vote.
- Signed URLs reissued only through authorization checks, do not persist secrets in local storage.
- Offline state is display-only unless a reviewed queued-write conflict resolver is installed.

**V5.4 acceptance:** accessibility, speaker consent handling, 2D/WebGL fallback, evidence integrity, responsive motion and load testing at 10 concurrent groups.

## E. Architecture
**Frontend:** React (existing Vite SPA), MuseumLiveTeacher, MuseumLiveStudent, MuseumLabStudent, MuseumScene, MuseumLivePeerFeedback.
**Backend:** serverless-handlers/museum-live.js and existing private gallery operations.
**Database:** existing scoped group/assignment/session tables; RLS/service-role pattern remains mandatory.
**Deployment:** GitHub feature branch → PR → node tests / Playwright / Postgres QA → Vercel Preview → main → Vercel Production READY.
**Observability:** errors reported in Teacher Live with activity and operation context. No passcodes or artwork URLs in logs.
**Security red lines:** teacher cannot access other class; guest cannot fetch other class; no public peer room URL; no auto-publishing; no general insert permission; no unattended mutation of saved student drafts.

## F. Weighted progress ledger
Weights are part of the engineering plan, not optimistic estimates:
- V5.2 (40 pts): command center UI 15; group-status model 7; quality guard 5; responsive/fullscreen 6; CI+deploy 7.
- V5.3 (35 pts): exhibit hotspots 9; storyboard 7; peer review 8; before/after 7; CI+deploy 4.
- V5.4 (25 pts): speaking studio 7; meaningful motion 5; portfolio 5; recovery/performance 5; CI+deploy 3.

Mark points **earned only after source changes and relevant automated verification**, with a separate line for deployed-to-production state. A complete written spec contributes 0 of the 100 implementation points.

## G. Rollback and feature ownership
- Prefer additive UI/components and nonbreaking API response fields.
- Preserve previous GitHub release/deployment; rollback through Vercel if critical runtime issues arise.
- Existing lesson content, group passes, 10 group drafts, survey counts and checkpoints must remain unchanged unless the teacher explicitly authorizes data edits.
- After rollout, review real 10-group classroom interaction before claiming judge-ready stability.
