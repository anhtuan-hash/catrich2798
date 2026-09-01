# Welcome Motion Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the first-visit welcome visual scene into an isolated iframe document so system-wide motion styles/runtime cannot suppress its animations.

**Architecture:** Keep lifecycle/persistence in `src/firstVisitWelcome.js`, but load all welcome CSS as Vite inline strings and inject them into an iframe `srcdoc`. Bind the existing interaction logic to the iframe document after it loads. Remove all side-effect welcome CSS imports from the parent app.

**Tech Stack:** Vite 8, vanilla JavaScript, CSS animations, iframe `srcdoc`, GitHub/Vercel preview pipeline.

**Spec:** `docs/superpowers/specs/2026-09-01-welcome-motion-isolation.md`

## Global Constraints

- Do not change first-visit key/version semantics.
- Do not change auth/recovery route exclusions.
- Do not remove reduced-motion accessibility behavior.
- Preserve all existing welcome visual/motion layers.
- Do not add new dependencies.
- Production is updated only from a green preview commit.

---

### Task 1: Lock isolation behavior with failing contracts

**Files:**
- Modify: `scripts/test-editorial-app-heroes.mjs`

**Interfaces:**
- Consumes: current application bootstrap and welcome module source text.
- Produces: contract checks for parent-style removal, `?inline` imports, iframe srcdoc, sandbox, and iframe document binding.

- [ ] **Step 1: Write failing checks**

Add checks that require:

```js
!files.applicationBootstrap.includes("import './styles/FirstVisitWelcome.css';")
!files.applicationBootstrap.includes("import './styles/FirstVisitWelcomeAmbient.css';")
files.firstVisitWelcome.includes("FirstVisitWelcome.css?inline")
files.firstVisitWelcome.includes("FirstVisitWelcomeMotion.css?inline")
files.firstVisitWelcome.includes("FirstVisitWelcomeVisibilityTune.css?inline")
files.firstVisitWelcome.includes("FirstVisitWelcomeAmbient.css?inline")
files.firstVisitWelcome.includes("document.createElement('iframe')")
files.firstVisitWelcome.includes('frame.srcdoc = welcomeFrameDocument')
files.firstVisitWelcome.includes("frame.setAttribute('sandbox', 'allow-same-origin')")
files.firstVisitWelcome.includes('frame.contentDocument')
```

- [ ] **Step 2: Push test-only commit**

Commit message:

```text
test: require isolated welcome motion document
```

- [ ] **Step 3: Verify preview fails for the new isolation checks only**

Expected: existing checks green; new isolation checks red.

---

### Task 2: Isolate welcome CSS from the parent document

**Files:**
- Modify: `src/applicationBootstrap.jsx`
- Modify: `src/firstVisitWelcome.js`

**Interfaces:**
- Consumes: four existing welcome CSS files.
- Produces: `welcomeFrameDocument(forceFullMotion)` and a fixed fullscreen iframe host.

- [ ] **Step 1: Replace side-effect imports**

Remove parent-document welcome CSS imports and load styles as strings:

```js
import welcomeBaseCss from './styles/FirstVisitWelcome.css?inline';
import welcomeMotionCss from './styles/FirstVisitWelcomeMotion.css?inline';
import welcomeTuneCss from './styles/FirstVisitWelcomeVisibilityTune.css?inline';
import welcomeAmbientCss from './styles/FirstVisitWelcomeAmbient.css?inline';
```

- [ ] **Step 2: Build a standalone iframe document**

Create `welcomeFrameDocument(forceFullMotion)` that returns a complete `<!doctype html>` document with viewport metadata, reset styles, the concatenated welcome CSS in `<style>`, and the existing welcome markup inside `.brian-welcome-root`.

- [ ] **Step 3: Mount a sandboxed frame**

Create an iframe with:

```js
const frame = document.createElement('iframe');
frame.id = WELCOME_ROOT_ID;
frame.setAttribute('sandbox', 'allow-same-origin');
frame.srcdoc = welcomeFrameDocument(forceFullMotion);
```

Apply fixed viewport geometry using inline properties with `important` priority so parent styles cannot hide or resize the host.

- [ ] **Step 4: Preserve parent lifecycle**

Keep localStorage seen-state, protected-route checks, body scroll lock, storage synchronization and parent custom events unchanged.

---

### Task 3: Rebind interactions inside the isolated document

**Files:**
- Modify: `src/firstVisitWelcome.js`

**Interfaces:**
- Consumes: loaded iframe `contentDocument` and `contentWindow`.
- Produces: existing beam/parallax/card/CTA interactions and accessible dismissal behavior inside the frame.

- [ ] **Step 1: Initialize after iframe load**

Resolve:

```js
const frameDocument = frame.contentDocument;
const frameWindow = frame.contentWindow;
const root = frameDocument.querySelector('.brian-welcome-root');
```

- [ ] **Step 2: Bind pointer and card motion to iframe elements**

Preserve the current requestAnimationFrame-throttled beam, reflection, parallax, feature-card and CTA logic; use frame-local DOM nodes and avoid parent-realm `instanceof HTMLElement/PointerEvent` checks.

- [ ] **Step 3: Bind keyboard accessibility to iframe document**

Attach Escape and focus-trap handling to `frameDocument`. Focus the primary CTA after load and restore the previous parent focus on cleanup.

- [ ] **Step 4: Preserve visibility pause behavior locally**

On parent `visibilitychange`, toggle `.is-motion-paused` on the iframe root only. Do not depend on any global app motion class.

---

### Task 4: Verify and integrate

**Files:**
- Test: `scripts/test-editorial-app-heroes.mjs`
- Build: project production build

**Interfaces:**
- Consumes: completed feature branch.
- Produces: verified production commit.

- [ ] **Step 1: Verify Vercel preview**

Expected: UI contract passes and both Vite builds complete.

- [ ] **Step 2: Review branch diff**

Expected scope: spec/plan, contract test, `applicationBootstrap.jsx`, `firstVisitWelcome.js`; no unrelated app/backend files.

- [ ] **Step 3: Fast-forward `main`**

Use a non-force update to the exact green preview commit.

- [ ] **Step 4: Verify production**

Expected: production deployment READY, `esl-brian.vercel.app` returns 200, and the production JS bundle contains iframe/srcdoc isolation markers while the main CSS no longer contains the welcome animation stylesheet payload.
