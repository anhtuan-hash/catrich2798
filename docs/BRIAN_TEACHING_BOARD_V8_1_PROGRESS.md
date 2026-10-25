# Brian Teaching Board V8.1 — Incremental Upgrade Progress

Date: 2026-10-25. Existing GitHub: `anhtuan-hash/catrich2798` (`main`).
Production app: https://esl-brian.vercel.app and https://esl-pek.vercel.app.

## Measured progress: 72.5% of the 20-item V8 proposal

- **12 function groups substantially delivered**: #1 Lasso, #3 Layers, #4 Precision Eraser, #5 Geometry (deterministic recognizer, ruler/protractor/compass), #9 Templates, #10 Reusable Assets, #11 Thumbnail Frames, #12 Private Presenter Notes, #13 Frame Transitions (Fly, Instant, Focus), #14 Local Checkpoints, #15 Activity Pins, #20 Reliability Center.
- **4 partially delivered**: #2 Transform Studio (8 draggable resize handles, keyboard resize and scale; rotation/flexible smart distribution not yet done); #6 PDF Annotation Pro (PDF page import to raster + separate vector ink exists; no native editable PDF markup object model); #7 Image Studio (freeform crop, blur/grayscale on selected region, existing imported image scaling and text notes; no full filter/border/rounded-photo editor); #8 Diagram Builder (linked two-node connections and Mind Map/Timeline templates; not a full auto-layout designer).
- **4 not yet shipped**: #16 Live Polling, #17 multi-device Word Cloud, #18 collaborative Sticky Wall, #19 authenticated TV pairing across devices. These all require a secure real-time and moderation design and cost/RLS assessment before deployment.

Progress calculation: 12 completed + 0.75 for Transform + 0.50 PDF + 0.75 Image + 0.50 Diagram = 14.5 / 20 = **72.5%**. This is feature-scope equivalence only. Physical-device acceptance remains outstanding.

## V8.1 changes just released

1. Fixed freeform Lasso to collect a genuine multi-point pointer trace rather than only start/end coordinates.
2. Added the eight transform handles around a selected group. Drag corners/sides for anchored resizing, or focus a handle and use arrow keys. One grouped resize is one Undo step. Connected diagram arrows are recalculated afterward.
3. Implemented Focus Frame Transition: camera eases to a wider establishing view before approaching the next frame, with two easing halves and final-state correction. The Instant mode cancels any earlier flight; reduced-motion settings remain authoritative.
4. Built a freeform Image Studio crop editor, with keyboard-accessible draggable corners and center. A PNG/JPEG/WebP image is encoded locally using browser canvas. The original version remains recoverable using Undo.
5. Added local selected-region blur and grayscale from the same edit UI, with no image upload, API charge or AI integration.
6. Added actual two-stroke protractor (angle between two rays), ruler (length in **board units**, not physical cm) and compass circle gestures. Geometry annotations are saved as ordinary public Board vector shapes/text so that student-safe PDF and same-device TV keep matching the teacher view. Multi-part geometry commits as one Undo action.
7. Extended the automated `test-brian-board-v8.mjs` build gate to cover geometry, locked elements, privacy of teacher notes, eight-handled transforms, image editor implementation and Lasso trajectory.

## How to use
- **Chọn / Select** or **Lasso** → select a group → drag one of the 8 circular selection handles to resize; use toolbar buttons to duplicate or reorder.
- **Thước / Ruler** → drag a line; Board annotates its pixel-independent board-unit length.
- **Thước góc / Protractor** → drag the first ray from the angle's vertex; then drag the second ray. A numeric angle in degrees is created.
- **Compa / Compass** → drag from the circle center out to set its radius.
- **Lớp / Layers** → locate an Image entry → select Crop, Blur or Grayscale → move/resize the selected rectangle → Apply. Use Undo to reverse.
- **Khung / Frames** → choose `Focus Zoom` as transition, then click Go to Frame or use the frame deck.

## Guardrails and limitations
- No modification to Brian Focus, persistent YouTube, Supabase RLS, student grades, live student submission endpoints or paid services.
- Student projection sanitization still controls which objects can appear, and private presenter notes stay local and unbroadcast.
- A ruler's unit is the Board's abstract coordinate unit, **not** real cm/inches. A protractor uses two drawn ray gestures. Canvas transform resize remains distinct from actual rotation.
- Any JPG/PNG/WebP embedded source must respect the app's existing image size limits; some browsers may lack canvas filtering.
- Build tests and Vercel READY are not equivalent to direct QA on Apple Pencil, Android touchscreens, Safari or a physical classroom TV.
- Remaining online features will not be exposed without session tokens, expiry, moderation, access control, cost ceilings and load tests.
