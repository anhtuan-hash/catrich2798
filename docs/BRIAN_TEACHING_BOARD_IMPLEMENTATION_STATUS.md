# Brian Teaching Board — implementation and acceptance (2026-10-24)

## Architecture and deployment contract
- Implemented as `src/components/BrianBoard/`; activated through `src/main.jsx` for logged-in admin, department head and teachers, isolated from BrianFocus component state and its persistent YouTube iframe.
- Current app uses three individually positioned floating actions; the Board gets exactly one fourth coordinated action, not a surprise migration of all existing buttons to a dormant UnifiedFloatingDock component. Registered `board` action ID in `src/utils/unifiedFloatingDock.js` and the optional dormant Dock.
- Board WAAPI enter/exit is independent (does not modify Focus enter/exit).
- Offline working copy: `brian-board-private-drafts` IndexedDB store, owner-qualified keys and serialized write transactions.
- Optional CLOUD backup: new isolated `public.brian_board_cloud_lessons`, with owner RLS; only manual, not automatic. Actual SQL verified enabled RLS and deny anon privileges.
- Local second screen: `public/brian-board-viewer.html` + BroadcastChannel on the SAME browser origin/machine; viewer receives allowlisted student-only content. Cross-device television publishing is NOT implemented.

## Feature matrix (honest status)
| Approved area | Status | What exists / what remains |
| --- | --- | --- |
| 1 Infinite canvas | Foundation implemented | Vector pen/highlighter/erase, pan, zoom, pressure points, one-commit strokes; spatial indexing/infinite tiled worlds and advanced smoothing remain |
| 2 Lesson pages | Implemented core | Add/duplicate/reorder/lock/hide/delete, multi-lesson private library; thumbnails and PDF import remain |
| 3 Ink and shapes | Implemented core | Pen, highlighter, stroke erase, rect, ellipse, line, text, sticky, selection/drag and undo/redo; lasso/rotation/grouping remain |
| 4 Teaching spotlight | Partial | Local laser and spotlight, explicit answer curtains; reveal workflows advanced pending |
| 5 Interactive objects | Partial | Flashcards with explicit answer reveal; matching/sorting/sentence rearrangement pending |
| 6 Classroom controls | Partial | Local session timer, manual team scores (2–8), manual name picker; trusted classroom roster integration pending |
| 7 Multimedia | Partial | Local image import PNG/JPEG/WebP <=2 MB, export SVG; PDF/audio/YouTube within Board and cloud asset bucket pending |
| 8 Teacher/student dual display | Local mode implemented | A separate *same-machine* student-only viewer over BroadcastChannel; secure remote viewer with TTL/revocation pending |
| 9 Library/recovery | Core implemented | IndexedDB autosave, multiple lessons, optional owner-RLS cloud snapshots, new-copy restore; multi-device background sync/version history/asset bucket pending |
| 10 Motion/Focus bridge | Foundation implemented | Portal WAAPI real open/close; Focus media left mounted; user closes Focus first before opening Board. Seamless handoff controls pending |

## Mandatory regression checks
`node scripts/test-brian-board-foundation.mjs` is required within `npm run build` and tests IndexedDB owner isolation, lesson history, rendering source contracts, safe student projection, allowed-mode hook wiring and preserved Focus.
Legacy Focus and 3-floating-button tests remain in build. Vercel READY refers to build, not an authenticated teacher session.
 
## Manual signed-in QA still required
1. Mac teacher: open Board; draw 100 strokes, Ctrl/Cmd+Z then redo; edit a lesson title; close/reopen and confirm exact strokes/pages from IndexedDB.
2. Mobile Android and iPhone: drawing vs screen scrolling, 390px small landscape, keyboard input, sidebar toggle, safe areas.
3. Admin/department_head/teacher vs student/guest: only allowed roles see Board; no ability to publish or read another owner's Cloud lessons.
4. IndexedDB low-storage/blocked: visible error, close confirmation prevents silent loss.
5. Focus opened + active YouTube: Board refuses overlapping fullscreen; close Focus while music continues, then open Board. Exit Board leaves Focus player intact.
6. Same-machine TV: teacher starts display, viewer sees only public page and explicitly revealed flashcards; verify teacher notes/privateAnswer and admin controls never reach student payload; ending presentation revokes updates.
7. Cloud: manual backup on device A, new-copy restore on same user, conflict behavior and size-limit on images.
8. Three themes, print/clock readability, return focus on Close; reduce-motion fade.
