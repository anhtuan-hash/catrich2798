# Site Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce production regression risk by strengthening CI, adding browser-level observability and smoke coverage, hardening Hero Theme coverage, and removing clearly obsolete maintenance artifacts.

**Architecture:** Keep existing runtime behavior unchanged unless needed for observability. Add focused CI/E2E contracts rather than a second test framework; browser telemetry posts sanitized error envelopes to a same-origin API endpoint. Cleanup is limited to artifacts demonstrably superseded by code already on `main`.

**Tech Stack:** React/Vite, Playwright, Vercel Functions, GitHub Actions, Supabase-backed server security helpers.

**Spec:** User-approved site audit priorities from 2026-09-03.

## Global Constraints

- Do not weaken existing auth/RLS or expose secrets.
- Do not send browser error stack/message payloads without size limits and sanitization.
- Do not delete active feature workflows; only retire one-time/superseded artifacts with evidence.
- Keep Hero Theme fail-open behavior: no valid published theme means original Hero remains unchanged.
- Required CI target names must remain stable so GitHub branch protection can require them.

---

### Task 1: CI gate and critical browser smoke

**Files:**
- Modify: `.github/workflows/frontend-build.yml`
- Create: `tests/e2e/critical-smoke.spec.js`

- [ ] Add a failing contract requiring a stable `Frontend Build / build` check plus a Chromium Playwright smoke step.
- [ ] Run the PR CI and confirm RED before implementation.
- [ ] Add browser smoke coverage for public shell, Dashboard route boot/fallback, Gradebook route boot/fallback, Settings route boot/fallback, and absence of the retired 10-bar loader.
- [ ] Run CI and confirm GREEN.

### Task 2: Client-side error telemetry

**Files:**
- Create: `src/utils/clientErrorTelemetry.js`
- Create: `api/client-error-report.js`
- Modify: `src/main.jsx`
- Create: `scripts/test-client-error-telemetry.mjs`
- Modify: `.github/workflows/frontend-build.yml`

- [ ] Write a failing contract requiring `error`, `unhandledrejection`, route/version/request metadata, same-origin POST, throttling and payload caps.
- [ ] Confirm RED.
- [ ] Implement sanitized client capture and a rate-limited Vercel endpoint using existing security/audit helpers without requiring login.
- [ ] Confirm contract and production build GREEN.

### Task 3: Hero Theme registry/runtime regression matrix

**Files:**
- Create: `scripts/test-hero-theme-registry-matrix.mjs`
- Modify: `.github/workflows/frontend-build.yml`

- [ ] Write a failing contract that enumerates every registered Hero and verifies a selector, unique `heroKey`, ORIGINAL fallback, persistent runtime observer, and nested Material Hero compatibility.
- [ ] Confirm RED if any current gap exists; otherwise establish the matrix as a baseline guard.
- [ ] Make only minimal implementation corrections if the matrix exposes a real gap.
- [ ] Confirm GREEN.

### Task 4: Retire clearly superseded maintenance artifacts

**Files:**
- Delete only one-time workflow/trigger files proven obsolete by current `main`.
- Close only PRs whose objective is already merged/superseded.

- [ ] Close PR #642 because the global loader has already been retired on `main` with regression coverage.
- [ ] Retire `retire-seven-apps-once.yml` only if its requested removal is already enforced by current removed-app audits.
- [ ] Remove stale `.cleanup-*` trigger files that have no runtime role.
- [ ] Leave ambiguous feature PRs/workflows untouched and document them for later review.

### Task 5: Branch protection handoff

**Files:**
- Create: `docs/operations/main-branch-protection.md`

- [ ] Document exact required checks: `Frontend Build / build`, Supabase Egress P0/P1/P2 guards, and Homeroom Audit Source Export.
- [ ] Document GitHub rules: PR required, no force-push, no deletion, require checks up-to-date.
- [ ] Verify the current connector cannot write branch rulesets; do not emulate protection with app code.
- [ ] After code merge, report the one remaining GitHub Settings action if API write access is still unavailable.
