# Brian Teaching Board V8 — Implementation & acceptance report

Date: 2026-10-25. Project: `anhtuan-hash/catrich2798`. Production alias: `https://esl-brian.vercel.app`.

## Progress accounting

The user approved 20 proposals. Completion is counted against the *original* scope, not just whether a menu or mockup exists.

- **10 substantially implemented**: (1) Magic Lasso, (3) Layer Manager, (4) Precision Eraser, (9) Teaching Template Library, (10) Reusable Teaching Assets, (11) Frame thumbnails, (12) Private Presenter Notes, (14) Lesson Checkpoints, (15) Activity Pins, (20) Reliability Center.
- **6 partially implemented / narrower scope than original**: (2) Transform Studio supports group selection, z-order, duplicate, scale and move, but not eight freehand handles/rotation; (5) Smart Geometry recognizes held lines, ellipses and rectangles, but has no compass/protractor/ruler; (6) PDF pages can already be imported and annotated on Board, but V8 doesn't add a full PDF-native annotation layer; (7) Image Studio supports local 12%-edge crops and group scaling, not a full photo editor; (8) Diagram Builder provides node-linked arrows and teaching templates, not automatic layout for every flowchart; (13) Frame transitions support smooth fly and instant modes, while Focus preset shares fly behavior pending a bespoke transition.
- **4 not deployed**: (16) student-device Live Polling, (17) multi-device Word Cloud, (18) multi-device Collaborative Sticky Wall, (19) authenticated pairing with a TV running on another device. These require explicit authenticated sessions, expiry, moderation and RLS isolation; insecure broadcast ports and unbounded paid dependencies were *not* introduced.

**Implementation-equivalent V8 progress: 65%** = 10 fully implemented + 6 half-credit / 20 original items. This is a feature-scope indicator, not a claim that all physical-device QA is complete.

## Teacher workflow

### Edit on an infinite canvas
Select the Lasso tool (the icon next to Select); draw a closed loop around the **centers** of desired strokes and objects. The floating contextual toolbar offers Front/Back, +15%/−15%, Clone, Delete, and Save Asset. When exactly two items are selected, use **Connect nodes →** for a relationship arrow; the arrow follows linked objects when moved.

### Precise ink removal
Choose Precision Eraser, sweep along a stroke and release. Strokes are split at erased segments rather than removing entire text/shape objects. Objects individually locked in Layers are preserved. All committed edits use the existing lesson Undo/Redo stack.

### Design a quick classroom board
Open **Templates / Mẫu**. Seven real editable layouts are included: Reading 2 Columns, Grammar, Vocabulary Wall, Debate, Timeline, Exit Ticket, Mind Map. They insert editable Board vector objects into the current view; no AI or internet dependency. Select one or more supported objects with Lasso → Save Asset to retain them in an owner-scoped local gallery for future lessons. Embedded image-heavy assets have a 1 MB per-asset limit.

### Frames and presenter notes
Open **Frames / Khung**. Each card now includes a miniature of visible content and a **teacher-private Presenter Notes** textarea. Choose Smooth Fly or Instant; Focus appears as a transitional preset but needs bespoke animation beyond Fly. Notes are stored in `page.frames[].teacherNotes` and never included in the separate student/TV payload. The original PDF export of published frame views remains intact.

### Interactive Activity Pins
In the existing Activities tab, select the pin icon beside an activity. A teacher-only Activity card is inserted on the infinite canvas and can be clicked to open the actual interactive stage. Student-facing TV continues to render an allowlisted, answer-safe projection; the teacher-only pin metadata is not broadcast.

### Private history and reliability
In Library, save **named checkpoints**. Up to six per lesson are retained in the existing owner-scoped IndexedDB store, with explicit restoration and Undo support. The Reliability panel shows actual browser storage usage/quota when available, browser online/offline status, local TV-display opened status and save confirmation, with explicit private backup and browser persistent-storage request. A green browser online state does not imply Supabase or remote TV connectivity.

### Images and geometry
Use the Layer inspector to crop 12% from any edge of an embedded PNG/JPEG/WebP image. It is performed locally via Canvas 2D, and Undo can reverse it. In Design, enable optional **Smart Geometry** and pause the pen for 0.65 seconds at the end of a sufficiently large stroke to convert a line or closed shape into a precise vector equivalent. Geometry recognition uses mathematical heuristics, not AI; leave it off for handwriting-intensive lessons.

## Technical details & safeguards

- Files: `boardV8Tools.js`, `boardAssets.js`, `boardImageStudio.js`, `BoardFrameThumbnail.jsx`, `BoardReliabilityPanel.jsx`, plus updates to `BoardCanvas.jsx`, `BrianBoard.jsx`, `boardSpatial.js`, `boardModel.js`, `boardStorage.js`, `BoardVisualRefresh.css`.
- Private notes, checkpoints and saved reusable assets are stored locally under an owner-scoped key; no new Supabase schema or paid service.
- The sanitizer `sanitizeStudentPage` excludes teacher-only Activity Pins, hidden layers, private notes, activity answer keys and teacher-only objects. Connected diagrams project only drawing positions, not their internal node IDs.
- Existing Brian Focus background YouTube functionality, Supabase records, Sync Doctor and other app modules remain outside the changes.
- Hard limits: 3000 objects/page, 32 frames/page, six checkpoints/lesson, 30 reusable asset entries, up to 30 objects and 1 MB per asset.
- Studio source-based regression suite `scripts/test-brian-board-v8.mjs` is included in the production npm build alongside previous Brian Board/Focus/Sync Doctor gates.
- This phase is not tested with a signed-in iPad/Apple Pencil, Android Chrome physical touchscreen or real multi-device projector. Browser and CSS behavior require manual classroom acceptance.

## Safe future work for remaining 35%

1. Complete eight-handle selection/rotation and a non-destructive PDF-native annotation model.
2. Extend image cropping to interactive rectangle handles and complete rulers/protractors.
3. Design a first-party realtime service with short-lived tokens scoped to teacher, lesson and expiry, RLS and moderation. Only after verifying price/free-tier limits should multi-device Polling/Word Cloud/Sticky Wall/TV pairing be deployed.
4. Validate all touch gestures and Student Preview/TV privacy on physical hardware, then release in phases rather than simultaneously exposing student submission endpoints.
