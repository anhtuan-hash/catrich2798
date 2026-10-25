# Brian Teaching Board — Phase 3: ten classroom upgrades
Implemented on `main` in `src/components/BrianBoard` (2026-10-25).

## Ten changes delivered
1. **Private JSON export:** Library → Download private JSON. Includes teacher-only text, answers, imported images and page drafts. Not an export for students. Max 25 MB.
2. **Private JSON restore:** Library → Restore JSON as new lesson. Requires `brian-board-private-backup/v1` schema, owner match and a confirm dialog; never overwrites the active lesson. Any unsaved active draft must be saved first.
3. **Lesson duplication:** Library → Duplicate current lesson or duplicate another local library entry. New lesson/page/object/activity IDs, history reset and owner-private IndexedDB save.
4. **Library search:** Filter owner-private lessons by title. Does not query Supabase or another user's storage.
5. **Edit existing activity:** Activities → Edit, modify title/instructions/type/answer lines and Save. Preserves activity ID, original creation time, publishing and teacher-only visibility flags. Locked pages cannot be edited.
6. **Duplicate existing activity:** Activities → Duplicate; new ID, editable private copy; it begins unpublished and may be deliberately published afterward. Cap 24 per page.
7. **Activity ordering:** Activities → Up/Down. Changes saved sequence of activities on the current lesson page; no answer key is sent to TV.
8. **Hide every activity on a page:** Activities → Hide all with confirmation. Honors page lock; TV, Student Preview and student PDF exclude unpublished exercises. Individual publishing toggles remain available.
9. **Quick classroom timers:** Classroom → 3/5/10 minute presets and a conspicuous time-up state. Custom duration/pause/reset retained. Timer is local and not synced to remote viewers.
10. **No-repeat random picker:** Classroom → Pick without repeats; tracked until everyone in the current entered list has been selected; explicit restart. Selection state is local session state and not saved to Supabase.

**Additional utility:** Rename team labels and reset all team scores with confirmation. These remain local in-memory classroom controls, not a grading or roster write.

## Safety and scope
- The Board is still part of ESL Brian. No new routes, separate Studio, AI, Supabase migrations, remote-TV pairing or auth privileges have been introduced.
- Brian Focus's component, persistent YouTube iframe, user management, student rosters and Scorebook are unchanged.
- Only user-private IndexedDB holds working drafts. The JSON backup must be handled as **confidential teacher material**: it is not encrypted by the app and can include private answers.
- JSON restore explicitly requires the same owner ID; it rejects invalid format, cross-owner backups, oversize payloads and unsupported page count. Import creates a new local draft rather than overwriting existing work.
- The same-machine TV viewer uses the existing `boardStudentPayload` allowlist. Teacher-only activities remain unpublishable via the eye button, and copied activities are unpublished.
- A duplicated *page* also refreshes activity IDs so that opening a different page does not accidentally retain stale activity selection.
- No class roster or student personal data is automatically imported; the random picker operates only on names deliberately pasted into the local session.
- Cloud backup continues to be **manual**, owner-RLS-protected and limited to 300 KB; rich PDF/image-heavy drafts are better moved via the private JSON workflow, up to its separate 25 MB cap.
- The browser's same-device presentation capability is not an authenticated different-device live broadcast.

## QA
- `scripts/test-brian-board-foundation.mjs` and `scripts/test-brian-board-phase2.mjs` remain build gates.
- `scripts/test-brian-board-upgrades.mjs` is mandatory in `npm run build`; tests owner isolation, backup format, restore-as-new, unique IDs, immutable activity edits, hidden-TV filtering, no-repeat names and UI integration guards.
- Continue signed-in acceptance on macOS desktop, iPad, iPhone and Android; Vercel build READY does not prove tap gestures, PDF uploads, file picker focus or TV pairing in the actual classroom.

## Manual teacher acceptance (recommended)
1. Open the current lesson; create an activity, edit it, duplicate it, move it, hide all, and confirm Student Preview/TV do not show the hidden content.
2. Add teacher-only flashcard notes, export JSON, restore as a new lesson on the same teacher account, then confirm the original is untouched and private notes remain in the teacher draft only.
3. Search the library, open another lesson and duplicate it, and verify separate page IDs and persistence after close/reopen.
4. Enter five names, draw until exhausted without repeats, reset, and confirm picks resume.
5. Try timers 3, 5, 10 minutes; pause and restart; rename and score two teams without writing to shared gradebooks.
