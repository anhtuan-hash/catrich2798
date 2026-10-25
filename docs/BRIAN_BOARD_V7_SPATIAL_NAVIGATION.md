# Brian Teaching Board V7 — Spatial Navigator & Clean Presentation

Date: October 25, 2026. Production branch: `main`; ESL Brian existing portal. This phase extends the V6 infinite canvas and frames, without removing legacy drawing, quiz, PDF, private notes or school data.

## Ten capabilities

1. **Mini-map / Board Map**: teacher-only spatial overview at the canvas edge. Displays the world origin, frame outlines, rough ink/text/image **geometry only** (never characters, raw notes or answers), selected frame and live viewing rectangle. It is independent of the TV student payload.
2. **Pointer pan on mini-map**: drag or tap the map to center the main viewport at the target location. SVG matrix inversion respects letterboxing/aspect ratios and world coordinates. Keyboard-focused map accepts arrow keys at 20% viewport steps.
3. **Fit all**: calculates content/frame spatial bounds using a pure geometry helper; requests the Board camera to fit the working extent. Empty boards return to the 1600×900 origin. The existing origin button still returns to (0,0).
4. **Mini-map toggle and collapse**: map can be hidden or reduced to its compact header. Default expanded on desktop, collapsed on phones to protect writing space.
5. **Frame deck strip**: visible frames appear as a touch-friendly horizontally scrollable lesson sequence just above the canvas. Tap any frame number/title to fly there. Indicates the current step and frame count.
6. **Reorder frames**: dedicated Up/Down controls in the Frames inspector modify only the sequence; all frame IDs, coordinates and ink remain unchanged.
7. **Duplicate frame**: creates a new ID and offset frame in the same page, placed after the source in the ordered route. **No duplication/deletion of strokes, typed notes or images**. Enforces the existing 32-frame limit.
8. **Distraction-free Clean Mode**: a persistent header action hides the drawing tool rail and inspector while keeping the Board, TV button, navigation, mini-map, Undo and Save available. Exiting restores the preexisting desktop inspector visibility. Clean Mode does not alter lesson data.
9. **Keyboard navigation**: `G` Fit All, `M` toggle map, `0` return home, `C` toggle Clean Mode. Existing `F` draw frame, `P` pan, `Alt+←/→` previous/next frames, and pen shortcuts remain intact. Shortcuts do not run while typing in an input/select/textarea.
10. **Responsive studio styling**: V7 frame deck, minimap, zoom bar and inspector frame cards honor Ivory, Midnight Slate and Classroom Canvas. Touch targets, iPad scroll, Android pan and `prefers-reduced-motion` are explicitly styled. The mini-map needs no external image SDK, JS canvas dependency or cloud service.

## Teaching workflow

- Start a lesson in the existing **Brian Teaching Board**. Open the Frames tab and create spatial sections as in V6.
- Use **Board Map** at the lower-right corner to see where you are on the infinite canvas; drag it to relocate the Board view without moving any existing objects.
- Press **G** or use the Fit icon beside zoom to frame your entire lesson; tap **Home** to reset. Press **M** to hide/show the map if it obscures a drawing.
- Tap a frame on the numbered deck. Use the Frames tab's arrow/duplicate icons to change teaching sequence without disrupting page objects.
- Enter **Clean** in the top header to remove secondary editing controls while presenting to pupils. The toolbar can be restored with the same button.
- TV Display remains local **same-device BroadcastChannel**. Pointer position and sanitized world viewport are shared; teacher-only text and activities remain excluded. No multi-device pairing has been added.

## Technical / safety

- Added pure spatial helpers in `boardSpatial.js`: `spatialObjectBounds`, `unionBoardBounds`, `boardOverviewBounds`, `fitBoardContent`, `reorderBoardFrame` and `duplicateBoardFrame`. Frame operations are immutable.
- Added `BoardNavigator.jsx` and `BoardNavigator.css`. Source object geometry is scanned with `useMemo` and is not recalculated on every camera movement.
- Existing owner-scoped IndexedDB lessons, manually requested cloud snapshots, PDF slide generation and JSON backups are unchanged. Newly reordered/duplicated frames are part of the existing lesson's private frame data.
- Build pipeline adds `test-brian-board-spatial-v7.mjs` to the prior Foundation, Phase 2, Drawing, Interactive Lab, Visual V5, Spatial V6, Sync Doctor and Focus regression gates.
- No AI functionality and no paid services or licensing changes; no migrations to Supabase.
- **Bounded viewport**: very widely separated content may not all become legible at once; Fit All prioritizes spatial orientation rather than guaranteed readable text at extreme zoom-outs.
- Manual signed-in classroom QA is recommended for long Apple Pencil strokes, iPad landscape vs portrait, Android Chrome touch handling, and second-window TV display. Automated build/test success does not certify physical devices.

## Test evidence

The Vercel Production deployment is only declared ready after its exact final commit is confirmed `READY` and the build's test chain succeeds.
