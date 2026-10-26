# Brian Teaching Board V8.3 — PDF Annotation Studio, Local Image Filters & Labeled Diagrams

**Release date:** October 26, 2026. Repository `anhtuan-hash/catrich2798`, branch `main`.
**Production:** https://esl-brian.vercel.app and https://esl-pek.vercel.app.

## Scope accounting — about 78% of the original twenty V8 requirements

- **13 substantially implemented:** Lasso; 8-handle transform with rotation/align/distribute; Layers; precision eraser; ruler/protractor/compass and deterministic smart shapes; template library; reusable assets; Frame thumbnails; teacher presenter notes; Fly/Instant/Focus transitions; named lesson checkpoints; activity pins; reliability panel.
- **3 partial (now more capable):** PDF Annotation Pro includes local PDF-to-page import, locked image backgrounds, real drag-to-highlight translucent regions, reversible layer show/hide, background lock/visibility, PDF page navigation and tracked annotation cleanup. Image Studio now also includes full-image offline brighter/contrast/vivid/sepia/grayscale presets in addition to freeform crop, blur and grayscale region tools. Diagram Builder now has auto-layout, smart links and **labeled** links that reposition when nodes move.
- **4 not deployed:** cross-device Live Polling, Word Cloud, collaborative Sticky Wall and authenticated TV pairing. These require scoped sessions, short expiry, moderation, RLS and quota/cost controls before code can be safely enabled. Do not count a spec or inaccessible stub as implementation.

Feature-equivalence estimate: 13 fully delivered + 0.80 PDF + 0.90 Image Studio + 0.95 Diagram = 15.65/20 ≈ **78%**. Physical Apple Pencil/Android/TV acceptance testing is still outstanding.

## What changed

### PDF Studio (new dedicated Inspector tab)
1. Open **Thiết kế / Design** → **Nhập PDF / Import PDF** (maximum 15 MB and 12 pages per import).
2. Imported document pages appear as raster image backgrounds, individually **locked by default** so annotation strokes do not accidentally drag the original page.
3. After import the sidebar opens **PDF**. Choose **Tô sáng vùng PDF / Draw PDF highlight** and draw a rectangle on the actual PDF region. Translucent yellow highlighting is an ordinary public vector shape and remains separate from the page's source paper. Markup has Undo/Redo support.
4. **Ẩn/hiện chú thích** temporarily compares the original PDF with the annotated version. **Ẩn/hiện nền PDF** hides or restores source paper independently of tracked vector annotations.
5. **Khóa/mở khóa nền** explicitly changes source paper editing status; the entire page can still be locked through the existing Pages panel.
6. Previous/next **PDF page navigation** jumps among imported PDF pages without resetting unrelated lesson pages.
7. **Xóa nét chú thích** clears only V8.3-tagged annotations, after explicit user confirmation. Previous/legacy annotations and other manually inserted elements are preserved. Undo can restore tagged annotations. Maximum 400 tracked highlights per page; ordinary lesson object limits remain in effect.
8. Student-safe PDF export and the same-device local TV use the original allowlisted content rules. Translucency/visibility are passed as **bounded public shape data**; teacher-only answers remain omitted.

**Limit:** This is image-backed annotation with separate vector ink; it is **not native PDF text selection/editing, OCR, vector layer import, or real PDF redaction**. Visual covering of a secret on the original PDF image is **not** information-security redaction.

### Image Studio improvements
- In **Layers**, for an ordinary unlocked image use **Màu ảnh / Photo** presets: Brighter, Contrast, Vivid, Sepia and Full Grayscale.
- All transformations use the browser's Canvas 2D API and replace only a local image data URL after a strict source/lesson identity check; Undo restores previous image state.
- Imported locked PDF background images are not offered these photo presets by default.
- Previously implemented arbitrary cropping, selected-area blur and selected-area grayscale remain.
- No AI, remote upload, processing API, subscription or data migration; large raster inputs can exceed local memory limits and fail gracefully.

### Concept Diagram improvements
- Select two nodes by Lasso, choose **Nối có nhãn / Labeled link**, enter a short label (up to 60 characters) and create an arrow with its own text object.
- When either source or destination moves or a diagram is laid out, `syncDiagramConnections` updates the arrow and centers its label.
- Labeled link text is public student-visible content: do not put confidential answers there. Use the existing private Presenter Notes for answer keys.

## Testing and safeguards
- New pure `boardPdfAnnotations.js` helper and `BoardPdfStudio.jsx` UI.
- `boardImageStudio.js` adds offline enhancement filters.
- `boardV8Tools.js` gains `createLabeledDiagramConnection` and label sync.
- `scripts/test-brian-board-v8-3.mjs` is a **required build gate** testing privacy, annotation preservation, opacity parity, PDF background controls and diagram labels.
- Build retains all earlier Brian Board, Brian Focus and Sync Doctor test gates.
- Owner-scoped IndexedDB and lesson Undo history remain. No schema, RLS or billing changes and no AI.
- Status READY means compilation and static/unit regression checks passed; it does **not** prove physical-device acceptance or browser-driven End-to-End testing.

## User-facing constraints
- PDF studio's clear command does **not** delete untagged markup made before V8.3.
- Hidden source PDF pages/images and private classroom notes are never sent in student-safe preview.
- This release does not enable remote student access, pairing, anonymous file upload or student submission endpoints. Secure multiscreen features remain unimplemented.
