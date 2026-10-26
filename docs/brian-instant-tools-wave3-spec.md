# BRIAN INSTANT TOOLS — WAVE 3 · Technical Specification

**Approved scope:** add Quick Notes, Text Tools, Calculator, Quick Links, Checklist to existing Portal with a single existing Toolbox bubble. After release library grows from 10 to 15 utilities. Retain Focus, Board, AI Chat, approvals, Wave 1/2 functionality and permission gates. No AI, Supabase tables, new third-party npm packages, external storage, network service or paid feature.

## Architecture and data
- New isolated `BrianInstantToolsWave3.jsx` / `.css` component with five local-only utilities; register metadata and routes in existing `BrianInstantTools.jsx`.
- Extend `initialState` and `sanitizeState` in `instantToolsCore.mjs` without bumping storage envelope version 1. Existing Wave 1 and Wave 2 saved data and defaults remain intact. Strict bounds and safe on-device serialization.
- Share existing VI/EN setting; real form labels and aria announcements. All tools work without Internet once current application JS is cached. Never request or transmit user text, to-do contents, links or calculation history to a cloud server.
- Continue auto-save to browser localStorage keyed to authenticated user's ID; storage is device/browser-local (not cross-device). Browser quota errors are surfaced with existing warning. User switching remounts the whole Toolbox so notes/checklists cannot leak between users. No use of class/student records.
- No script evaluation; calculator uses a limited arithmetic tokenizer/parser with explicit syntax checks and divide-by-zero errors. No `eval`, `Function`, dynamic imports of user input, or `dangerouslySetInnerHTML`.
- All outbound Quick Links strictly validate HTTPS/HTTP URLs, reject embedded credentials, `javascript:`, `data:` and other schemes; use `target=_blank rel=noopener noreferrer`. Don't fetch links automatically.
- Sound and motion inherit existing policies. Wave 3 does not auto-play audio.

## 11 — QUICK NOTES
- Up to 35 notes. Each: opaque locally generated ID, editable title (max 80 chars), body (max 4000 chars), color from five fixed color keys, `updatedAt`, optional pin state controlled by parent.
- Create, edit, delete with confirmation and one-click pin on the global page while Toolbox is minimized. Pinned overlay is dismissible independently, no screen capture and no modification of other application components. A pinned note is user-scoped and only shown when its ID remains present.
- UI: two-column library/editor on desktop, stacked on mobile. Empty state gives one-click creation. Edits auto-save.

## 12 — TEXT TOOLS
- Input text max 20,000 characters; live word/character (with and without whitespace)/sentence/paragraph statistics; trim/normalize whitespace, uppercase, lowercase, title case; copy output using Clipboard API with visible success/error.
- Unicode-aware grapheme character count when `Intl.Segmenter` exists. Regex fallback, punctuation-aware words, no AI or text transmission. Actions update persisted text. Duplicated whitespace normalization must retain paragraph boundaries as much as possible.

## 13 — CALCULATOR
- Responsive keyboard with digits, decimal separator, basic math (+ − × ÷), parentheses, percent, backspace, clear; also supports keyboard typing of a capped 120-character expression.
- Safe recursive descent arithmetic evaluator: numbers, parentheses, unary +/- and postfix %; operator precedence, finite results, explicit divide by zero/syntax error; no `eval`.
- Show computed result in human-readable format and last 10 history items. No backend gradebook writes.
- Persist entered expression and last calculations; inaccessible to other browser user keys.

## 14 — QUICK LINKS
- Up to 30 entries, title max 70 characters, URL max 500 characters, fixed icon/color selection. Add/edit/delete with confirmation; immediate one-click opening in a new browser tab after URL validation; no automatic fetch or embed.
- Default library empty, never preload private school URL guesses. URL must be http(s) with hostname and without embedded credentials. Optional search in local list.

## 15 — CHECKLIST
- Up to 60 todo rows, each max 160 characters. Add, edit, check/uncheck, delete with confirmation; clear completed with confirmation; progress meter and filters All/Open/Done.
- Browser-local only. No calendars/background notifications, unrelated student/academic writes or timestamps of student activity.

## Cross-cutting UX
- Existing Portal open/minimize/fullscreen and role-dependent floating dock unchanged. Cards 15 total, responsive, tool views constrained to scrollable Portal without horizontal overflow and 44px minimum interactive targets.
- Pinned note overlay is separate, positioned to avoid current four-button right dock, has close and return-to-notes actions, and is not rendered for anonymous users.
- Include detailed test coverage for sanitization, per-user storage keys, URL security, calculator parser security and arithmetic, stats, persisted Wave1/Wave2 data; real browser tests on Desktop Chrome, simulated Android Chromium and iPhone WebKit. CI and Preview READY before merging. Verify Production SHA+READY and domains after merge.

## Acceptance and cost
No AI. No new paid cloud resource or npm dependency. No Supabase mutation. Existing Focus, Board, AI, Approval and other utilities unaffected. Never label any unverified browser/device test as passed.