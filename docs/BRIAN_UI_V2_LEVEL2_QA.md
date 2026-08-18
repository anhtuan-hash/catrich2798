# Brian Metro Next — Level 2 Tool Chrome Adapter QA

Branch: `ui-v2-shadow`

## Purpose

Level 2 changes the visible chrome and authoring surfaces around a V1 tool while preserving the existing engine, persistence and file workflows. A tool is not considered Level 2 merely because a stylesheet exists; it must satisfy the behavior contract below.

## Priority Level 2 tools

- `classroom-screen` — Brian Classroom Stage
- `knowledge-train` — Knowledge Train
- `crossword-trial` — Crossword Trial
- `flying-words` — Flying Words
- `exam-studio` — Exam Studio

## Shared visual contract

- Metro Next Tool Shell is the only outer back/navigation chrome.
- Duplicate V1 brand/back chrome is removed or visually subordinated.
- Tool action bars remain reachable and compact.
- Text inputs, selects and textareas use white/cool-neutral surfaces; no ivory/cream surfaces.
- Form controls and cards use the Metro Next density/radius language.
- No V2 adapter rule may hide an action required to save, import, export, play or finish a workflow.
- Tool runtime remains usable if the adapter fails; the `Mở V1` escape hatch must always remain available.

## Shared behavior contract

For every Level 2 tool:

1. Open from Apps/Games V2 using `#tool/<slug>`.
2. Runtime reaches `ready` state without route loop.
3. Existing localStorage/session state is visible inside the bridge.
4. Edit/author mode remains usable.
5. Save/persistence survives Tool Shell reload.
6. Import control can still open its file picker where supported.
7. Export/download still produces the existing V1 output where supported.
8. Internal modal/dialog controls remain operable.
9. Tool fullscreen and Tool Shell fullscreen do not permanently trap the user.
10. Back from Tool Shell returns to Apps or Games V2.
11. `Mở V1` opens the original route independently.
12. Browser refresh on the V2 tool route does not mutate the production V1 UI.

## Tool-specific checks

### Brian Classroom Stage

- Host duplicate header is hidden by the Level 2 adapter.
- Embedded `/classroom-screen/?embed=1` fills the runtime surface.
- Presentation/drawing/widget state continues to be owned by the existing Classroom Stage runtime.
- Camera/microphone/display-capture permission prompts are not blocked by the shell.

### Knowledge Train

- Edit and Play modes both render after the adapter is applied.
- Import JSON, Export JSON and Play actions remain reachable.
- Save draft persists to `brian-knowledge-train-draft-v1`.
- Track drag/drop, Check, score, sound and fullscreen remain functional.

### Crossword Trial

- Composer and game modes both render.
- Import/Export/Start remain reachable.
- Teacher/student mode switch remains reachable.
- Guess keyword, settings, guide, scores and result modals remain usable.
- Saved draft remains in `brian-crossword-trial-v1`.

### Flying Words

- Setup, Game and Results screens all render.
- Import, Export and reset controls remain reachable.
- Question Manager may still read/write the setup textarea.
- Timer, pause, sound, fullscreen and answer dock remain functional.
- Draft remains in `brian-flying-words-draft-v1`.

### Exam Studio

- Four-step workflow remains navigable.
- PDF/DOCX/TXT/Markdown input continues to use existing parsers.
- Automatic recognition and Preview remain functional.
- Question editing, duplicate/delete and output generation remain functional.
- Existing DOC/PDF/HTML/export actions continue to use the V1 engine.
- Draft/vault local persistence remains unchanged.

## Adapter rollback rule

If any behavior regression is found, set the tool back to `level: 1` in `src/ui/v2/toolBridgeRegistry.js` and remove/disable its adapter rule. Do not patch the production V1 tool to satisfy a V2-only styling issue.
