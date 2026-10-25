# Brian Teaching Board — Phase 2, classroom-ready enhancements

## Scope
Implemented in ESL Brian `src/components/BrianBoard/` without replacing the existing Brian Focus, its persistent background YouTube iframe, user management, or Supabase tables.

### 1. PDF lesson import (actual)
- Open **Brian Board → Thiết kế / Design → Nhập PDF**.
- Browser-side PDF.js validates `%PDF-`, up to **15 MB**, **12 pages per import**, and the 80-page lesson limit; malicious/unparseable documents produce an error without mutating the lesson.
- Each page is rendered to a private JPEG image background inside a new editable whiteboard page. Teacher may write/annotate above it, undo/redo, and save to owner-specific IndexedDB.
- This is a **rasterized copy**, not editable extracted PDF text. Images may exceed the separate Cloud backup size limit; PDF page backups remain local unless user exports/imports manually.

### 2. Actual PDF output
- Open **Design → Xuất PDF bài dạy cho học sinh**.
- pdf-lib creates a valid multipage 16:9 PDF; up to 50 visible pages, excludes hidden pages and teacher-only objects via `sanitizeStudentPage`. Each exported page is flattened to JPEG (not vector or OCR searchable text), including the teacher's public whiteboard annotations.
- Interactive activity widgets are not currently PDF pages. They remain available as live Board activities and public read-only second-screen questions.

### 3. Three interactive learning activities (real)
- Open **Bài tập / Activities** tab on the right.
- Matching: each line `English | Vietnamese`, 2–12 unique pairs.
- Sentence ordering: original correct phrase tokens separated by `|`, 3–16 pieces.
- Sorting: each line `item | category`, 2–20 items, up to 6 categories.
- Type title/instructions, **Tạo & chạy**. Teacher taps pairs/words/categories; Board checks correct responses, shows count and allows restart / teacher-controlled reveal. Activities are saved inside each owner-private lesson page and restored from IndexedDB. No AI is used.
- The second-screen view receives only **public question text and answer options**, without private correct mapping or teacher-only fields. Ordering prompts are shuffled deterministically before broadcast. Teacher-facing stage shows correctness on the teacher screen; the student display intentionally has no privileged controls.

### 4. Privacy and persistence
- No new Supabase migration was required in Phase 2; the existing separate, owner-restricted Board Cloud table remains intact, and backup is always manually requested.
- Student view projector continues to be a **same-device** BroadcastChannel session; multi-device, remote live classroom broadcast still requires authenticated server-side sessions and is NOT implemented.
- New PDF rendering dependency: **none**; existing `pdfjs-dist` and `pdf-lib` are lazily loaded when needed.
- Safety: 12-page/15-MB import limits, sanitized TV projection, hidden teacher objects omitted from PDF, no shared-data mutations.

## QA
- Build gates: `node scripts/test-brian-board-foundation.mjs` and `node scripts/test-brian-board-phase2.mjs`.
- Phase 2 contract checks: PDF magic header, page and file caps, matching/sorting/ordering auto grading, saved activity normalization, teacher-only answer removal, stable public TV ordering, PDF export privacy, preserved Brian Focus launcher.
- Manual signed-in browser acceptance not yet performed in a real classroom: import 2-page scanned + text PDF, write on both pages, close/reopen, export and inspect the resulting PDF, test touch ordering and matching with TV over HDMI, confirm teacher answers never appear on TV.

## Remaining approved areas
- Secure *different-device* remote presenter sharing with short-lived revocable pairing and teacher authorization.
- File/slide import beyond PDF; accessible interactive object sorting on the Canvas itself (currently shown in the large activity stage), imported class rosters from authoritative permission-filtered datasets, and multimedia embeds with secure isolation.
- Full automated cross-browser device testing and large-board memory/performance profiling.
