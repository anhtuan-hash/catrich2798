# Brian Teaching Board — Phase 4: ten pen and canvas upgrades

Updated October 25, 2026. Implemented directly in `src/components/BrianBoard/` within the existing ESL Brian; existing Focus/YouTube and Supabase modules are untouched.

## Features delivered
1. **Four pen presets** in the ink ribbon: Fine (01), Classic (02), pressure fountain (03), Soft Marker (04). Presets select default thickness; the existing thickness slider remains editable.
2. **Curved stroke smoothing**: a stored `smoothed` attribute renders a consistent vector path, with single-dot taps still supported. Legacy ink remains readable.
3. **Pressure-sensitive fountain pen**: browser Pointer Events pressure samples are included in the private stroke model. Segments have varying widths; a non-pressure mouse uses a normal fallback. Individual strokes are capped at 4,000 sampled points and the variable-width renderer at 300 segments for UI safety.
4. **Ink-only eraser** next to existing whole-object eraser: only touches vector strokes. Shape, image and text objects are untouched.
5. **Arrow tool**: draw an arrow by dragging; drawing displays a live vector preview.
6. **Triangle tool**: draw an outlined or filled triangle with live vector preview.
7. **Shape fill palette**: None, Soft Yellow, Soft Mint and Soft Blue, persisted on each shape and included in student-safe projection and exported PDFs.
8. **Magnetic 25-unit grid**: snap shapes and placed objects using the grid toggle. Freehand ink deliberately stays unsnapped. Hold Shift to constrain rectangles/ellipses/triangles to equal sides, or lines/arrows to 45-degree angles.
9. **Dotted-paper background**: a fourth background, alongside plain/grid/lines, saved with the lesson and visible in exported PDF and local TV.
10. **Object selection quick actions**: select an object, then duplicate or delete using the floating on-canvas controls. Duplicates get their own ID and an offset. Page-lock rules apply.

**Bonus:** Clear only the vector ink on the active page after explicit confirmation; it uses the normal Undo/Redo history and does not remove typed text, activity questions, PDF/image backgrounds or geometry.

## Interaction workflow
- Open **Brian Board**, select the pen toolbar at the bottom, and tap 01/02/03/04 for pen styles.
- Use the left-hand drawing tools for ink-only erase, arrow and triangle.
- When a shape tool is active, choose a fill from the palette. Toggle the grid icon to snap its endpoints.
- Use the Design panel to switch between plain, grid, lines and dots.
- Use Select to tap an existing object and choose Duplicate/Delete on the floating action strip.
- Use Clear Ink to remove pen strokes from just the current editable page, confirming first. Click Undo if needed.

## Privacy and compatibility
- Student TV and student PDFs continue to use `sanitizeStudentPage`; teacher-only content and hidden pages remain excluded. New shape/fill/ink properties are explicitly allowlisted with bounded pressure samples.
- All new drawings are stored in the same owner-scoped lesson pages; there are no schema/database migrations, AI integration, cross-account sharing, or live remote publishing changes.
- Printed PDFs remain flattened raster pages; SVG inputs remain vector on the Board. PDF and same-device TV renderer each support new stroke and geometry formats.
- Pressure responsiveness depends on stylus/browser hardware; devices without real pressure samples use the .5 fallback. The app does not claim full palm-rejection certification.
- Existing Brian Focus background YouTube, in-app permissions, Scorebook and cloud backups were not modified in this phase.

## QA and acceptance
The Vercel build chain includes `node scripts/test-brian-board-drawing-v4.mjs` in addition to Foundation and Phase 2/3 regression suites. Drawing tests cover presets, smooth paths, pressure, bounds, 45-degree angle constraints, shape geometry, lesson restore, student projection privacy, and TV/PDF source integration.

**Manual signed-in classroom QA still required**: Apple Pencil/stylus pressure, rapid freehand writing, object selection/duplication on touchscreen, Android scrolling, direct import/export of complex PDF lesson pages, HDMI second-screen visual matching and 25 MB owner-private JSON backups. A successful Vercel build alone does not prove these device behaviors.
