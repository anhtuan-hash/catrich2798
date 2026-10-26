# Brian Board — PowerPoint Studio V1 (PPTX)

## Teacher flow
1. Open **Brian Board** from the existing floating dock. Click **PPTX** in the header, or open **Thiết kế → Nhập PowerPoint**.
2. Select a `.pptx` file (maximum 12 MB, up to 20 slides per import, maximum 80 Board pages in one lesson).
3. The importer reads the file **locally in the browser** using existing JSZip; it appends native Board pages, activates the first imported page and opens the **PPTX** inspector.
4. Use slide navigation or the existing **Trang** tab; imported text is editable in the right panel (text, font size, color, delete). Use **Chọn** on the canvas to reposition text, images and simple shapes. Drawing, highlighter, overlays, Undo/Redo and autosave continue to work.
5. For display, click **Trình chiếu trên TV** or use the existing Board TV/remote TV controls; navigate via existing slide/page arrows. Import status reports how many unsupported objects were skipped.
6. Edited slides are saved as a **private Brian Board lesson** using the current per-user IndexedDB mechanism. Existing Board PDF/SVG export functions may be used for distribution.

## Supported import
- Editable text from ordinary text boxes, with approximate size/color/weight and their positions
- Rectangles and ellipses with solid fill and basic outlines
- Embedded PNG, JPEG and WebP picture assets within import safety limits
- Slide ordering via the PPTX `presentation.xml` relationships
- Scaling PPTX slide geometry into Brian Board's 1600×900 canvas
- Per-slide navigation, teacher editing and TV projection of public objects

## Intentionally not claimed as compatible
- **Original PowerPoint animations, transitions, audio/video, linked media, charts, SmartArt, nested group transforms, complex gradients and themes**
- Pixel-perfect typography, line wrapping, special fonts, 3D/effects and full editable Office behavior
- Saving the imported document **back to an editable .pptx file**. V1 edits the native Brian Board objects and stores a Board lesson instead; teachers should preserve their source `.pptx`.
- PowerPoint-specific interactive triggers and VBA. `.pptm` / `.ppt` files are rejected.

## Safety / compatibility
- Browser-local processing only; no PowerPoint bytes sent to an external converter or AI service
- MIME-independent `.pptx` extension + ZIP signature checks, max 12MB archive, max 1800 ZIP entries, 3MB/XML component, 20 slides/import, 450 objects/slide, image caps and restricted media folder paths
- XML rendered as text/SVG through React, not HTML injection; disabled scripts and code execution
- Existing Board owner isolation, local autosave, Undo/Redo, protected teacher notes, public student serialization and TV live controls retained
- Invalid or unsupported components provide visible warnings rather than silently advertising perfect import fidelity

## Tests
- `scripts/test-brian-board-pptx.mjs`: persisted slide identity, safety bounds and teacher/TV integration contracts
- `tests/e2e/brian-board-pptx.spec.js`: synthetic actual zipped PPTX with text, rectangle and embedded picture; edit text, slide navigation, TV interaction, bad-file handling
- Desktop Chromium and iPhone WebKit simulator via isolated CI plus `npx vite build`
- Physical iPad/iPhone uploads, real complex PPTX font/layout fidelity and third-party PowerPoint round-tripping require separate manual acceptance

## Architecture
- `boardPptx.js`: bounded OOXML/ZIP parsing and conversion
- `BoardPptxStudio.jsx/.css`: accessible right-pane editor/navigation and presentation CTA
- `BrianBoard.jsx`: one-click header upload, Design import, per-user lesson append, state, and safe callbacks
- `boardModel.js`, `BoardCanvas.jsx`, public Board TV renderer: limited model additions for slide identity and font-weight
- No new floating dock button, Supabase table, AI integration, backend function or paid dependency.
