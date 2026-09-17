# TTCM Schedule Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Kênh TTCM → Lịch làm việc from a flat weekly grid into the approved illustrated weekly timeline while preserving every existing scheduling workflow.

**Architecture:** Keep `GlobalWorkScheduleCenter.jsx` as the single source of schedule data, import/upload/edit/delete logic, permissions, drawer and modals. Add a dedicated presentation skin loaded only by `GlobalWorkScheduleCompatibleCenter.jsx`; the skin transforms the existing week DOM into a seven-column vertical timeline and supplies the approved hero/footer illustrations with lightweight CSS/SVG geometry, without changing API/data contracts.

**Tech Stack:** React, CSS, GitHub Actions, existing Vite build.

**Spec:** Approved TTCM weekly timeline mockup from the current conversation.

## Global Constraints

- Preserve Supabase/API/data shape and all scheduling permissions.
- Preserve File mẫu, Upload lịch, Thêm lịch, search/scope/view controls, event drawer, edit/delete, import preview and notifications.
- Preserve the full graphical proposal: illustrated hero, stat cards, weekly timeline rails, today emphasis, empty-day illustration and scenic quote footer.
- Do not add dependencies or external image assets; graphics must be CSS/inline-SVG based.
- Maintain responsive behavior and horizontal week usability on narrower screens.

---

### Task 1: Add visual contract and CI gate

**Files:**
- Create: `scripts/test-ttcm-schedule-timeline-ui.mjs`
- Create: `.github/workflows/ttcm-schedule-timeline.yml`

**Interfaces:**
- Consumes: existing `GlobalWorkScheduleCenter.jsx`, `GlobalWorkScheduleCompatibleCenter.jsx` and schedule CSS.
- Produces: a deterministic contract that fails until the approved timeline skin exists.

- [ ] **Step 1: Write the failing visual contract** checking for the dedicated timeline stylesheet import, illustrated hero, equal seven-day timeline, day rails, current-day highlight, visual filter legend, empty-state art and scenic quote footer.
- [ ] **Step 2: Run the contract in GitHub Actions and verify RED** because the new skin does not yet exist.
- [ ] **Step 3: Keep production code unchanged during RED.**

### Task 2: Implement the approved timeline skin

**Files:**
- Create: `src/components/GlobalWorkScheduleTimeline.css`
- Modify: `src/components/GlobalWorkScheduleCompatibleCenter.jsx`

**Interfaces:**
- Consumes: existing `.work-schedule-*` markup and current week/month/agenda state.
- Produces: the approved visual hierarchy without touching schedule data or mutation handlers.

- [ ] **Step 1: Import `GlobalWorkScheduleTimeline.css` from the compatibility wrapper.**
- [ ] **Step 2: Rebuild the schedule hero** with pastel blue atmosphere, calendar/plants/books illustration, handwritten education slogan, premium buttons and four illustrated metric cards.
- [ ] **Step 3: Recompose the weekly calendar as a vertical timeline** with day/date headers, count labels, dashed rails, colored nodes, elevated event cards, current-day column and styled “Xem thêm”.
- [ ] **Step 4: Preserve existing search/scope/view controls** as compact utility controls while adding the visual category legend from the mockup.
- [ ] **Step 5: Add empty-day coffee illustration and scenic quote footer** using inline SVG/data-URI/CSS geometry so the graphics survive deploy without external assets.
- [ ] **Step 6: Add responsive rules** for desktop, medium-width horizontal scrolling and mobile stacking while retaining click targets.

### Task 3: Verify and review

**Files:**
- Test: `scripts/test-ttcm-schedule-timeline-ui.mjs`
- Existing CI: Frontend Build and Critical E2E.

**Interfaces:**
- Consumes: completed implementation.
- Produces: merge-ready PR with verified behavior.

- [ ] **Step 1: Run the timeline contract and confirm GREEN.**
- [ ] **Step 2: Run production build.**
- [ ] **Step 3: Run repository Critical E2E and ensure existing TTCM/schedule behavior remains intact.**
- [ ] **Step 4: Review the PR diff for accidental data/API/permission changes.**
- [ ] **Step 5: Leave the verified PR ready for explicit production merge approval.**
