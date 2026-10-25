# BRIAN TEACHING BOARD — Interactive Lab: 10 approved classroom activities

Implementation scope: the existing Brian Teaching Board in the ESL Brian Vite application, October 25, 2026. No AI provider, no new Studio, no Supabase schema change and no alterations to Brian Focus / persistent YouTube.

## Activity library
The **Bài tập / Activities** panel retains the original Matching, Ordering and Sorting modules and adds these ten teacher-authored, playable activities:

| Mode | Teacher input format | What pupils do | Scoring |
|---|---|---|---|
| Hotspot Explorer | `Label \\| X% \\| Y%` per target | Tap the picture where the named object appears | Within 8 percentage units = 10 points |
| Drag & Label | `Label \\| X% \\| Y%` | Drag, or select a tile and tap its numbered target; wrong choices return to the tray | Correct locked positions = 10 points |
| Cloze Snap | One `[[answer]]` per sentence; optional `DISTRACTORS: ...` | Drag or tap word choices to complete gaps | Exact match, 10 points |
| Error Detective | A sentence with `[[wrong=>correct]]` | Touch incorrect words and choose the correction | Correct detection + fix, 10 points |
| Evidence Hunter | `PASSAGE:` paragraph, then `Question \\| Answer \\| Evidence \\| Wrong option` | Select the first/last evidence words, then the answer | Both evidence and answer, 10 points |
| Four Corners Challenge | `Question \\| A \\| B \\| C \\| D \\| letter` | Choose a team, then A/B/C/D; lock all team answers together | +10 per team with the correct answer |
| Flashcard Duel | `Front \\| Back` | Teams answer aloud; teacher manually judges | Correct verdict = +10 |
| Mystery Reveal | Optional first `MYSTERY: final answer`, then `Question \\| Answer` | Answer to uncover one of 16 image tiles; guess picture for bonus | Correct = +10, final picture guess = +20 |
| Stress Tap | `syl/la/bles \\| stressed syllable number` | Tap the stressed syllable | Correct syllable = +10 |
| Concept Connection | `Source \\| relation \\| target` | Select source, relationship and target to form a valid connection | Correct triple = +10 |

The panel includes **Load editable example** for each module; images can be added for Hotspot, Drag & Label and Mystery Reveal, and image-based targets can be calibrated on the preview canvas. Maximum uploaded image: 1 MB JPEG, PNG or WebP. Image can also be absent, in which case a real coordinate plane is used.

The activity stage is a separate view *within the current Board portal*. It uses teacher-configured content and React event handlers, not placeholder mockups. Pointer and touch-compatible alternatives are provided for drag-and-drop; answering, scoring, resets and next/previous questions run locally.

## Common classroom features
- Teacher selects 2–8 teams and starts a 30-second, 1-minute or 2-minute game timer. Team score and challenge navigation remain local to the active stage.
- Teacher can restart the game. Team answers can be locked together in Four Corners. Flashcard Duel is explicitly **teacher judged**, rather than pretending that speech is machine-graded.
- **Student Preview** and same-device local TV show student-safe prompts, the numbered anonymous image targets, answer *options without mappings*, the current question number, published team scores, countdown and teacher-triggered image reveals.
- Teacher answer mappings, configured evidence spans, word stress indices, correct Four Corners letters, flashcard backs and the Mystery final solution do **not** enter public TV or PDF payloads. As with every teacher-operated display, use the app’s Student Preview / TV Display window—not mirroring the private teacher screen—when withholding the answer key.
- Activity definitions (including correct answers) are saved owner-privately in the existing lesson's IndexedDB draft. Offline JSON backup preserves authored activities and their images. **Game answers and scoreboards are session-local, not published to student/gradebook records**.
- Student PDF export with worksheet option renders printable prompts, neutral word banks and images **without private answer mappings**. Live interactions themselves do not function in PDF.
- No new user data is sent to Supabase for scoring; Cloud Backup continues as an explicitly requested teacher operation and size limitations for existing cloud snapshots remain.

## QA and remaining known limits
- The application build now requires `scripts/test-brian-board-interactive-lab.mjs` in addition to the Foundation/Phase 2/Phase 3/Drawing v4 tests. This validates all ten models, correct and incorrect answers, ownership isolation via lessons, published TV allowlists, hidden-page behavior and PDF worksheet creation.
- Existing same-machine BroadcastChannel second-window projection remains; TV or student devices on different machines need a separately authenticated presentation service before remote connections are possible.
- Classroom touch tests should be performed on iPad, Android and a teacher-connected TV. HTML drag/drop can vary on iOS, so **tap label then tap destination** remains the fallback.
- A 1 MB raster image or a very large batch of embedded images may exceed the existing manual cloud backup 300 KB limit; teacher-local drafts and the 25 MB private JSON workflow are distinct.
- Timer and team scores are session-state controls, not synchronized between independent user devices or saved to a gradebook.
- Error Detective uses selectable word spans; proofing errors should use a short, explicit marked segment rather than ambiguous punctuation-only differences.
