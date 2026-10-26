# ESL Brian — Schedule → TTCM / English THPT Event Drafts
**Date:** 2026-10-26 · **Status:** Implementation specification · **Principle:** No AI, no metered external API.

## 1. Purpose
One CSV/XLSX upload populates the existing work calendar and recognizes event candidates relevant to **TTCM** and **Tổ Tiếng Anh THPT**. The system creates admin-reviewable **drafts**, never publishes announcements automatically. Event Manager remains the sole publication surface.

## 2. Reused architecture
- UI: `GlobalWorkScheduleCenter.jsx` (existing import preview; leader role includes department_head/admin).
- Parser: `workScheduleImport.js` (existing CSV/XLSX importer); new provenance fields `timeKnown`, `endTimeKnown`.
- Detection: `scheduleEventDetection.mjs`; pure synchronous Vietnamese normalization and role-based rules, no AI.
- Storage of candidate: existing `work_hub_items.metadata.schedule_event_detection`, with fingerprint, reason, confidence, category, status.
- Admin staging: `scheduleEventDrafts.js`, reusing `saveEventDraft` and existing `bes_events` RLS. No new database table.
- Admin review: `EventManagerPage.jsx`, showing pending candidates and action to generate drafts.
- Publication: unchanged `bes_publish_event` admin-only RPC, which authorizes recipients and starts display period. Draft creation never inserts `bes_event_recipients`.

## 3. Acceptance behavior
1. User with department_head/admin role uploads UTF-8 CSV or XLSX using the existing work schedule page.
2. Existing table preview shows all valid/duplicate/invalid rows.
3. Additional default-enabled checkbox enables targeted detection; each candidate has an independent selectable checkbox.
4. Match strong explicit `TTCM`, `TT-TPCM`, `Tổ TA THPT`, `Tổ AV THPT`, `Tổ Tiếng Anh THPT`, including context in responsible persons, participants, title and description.
5. Match English demonstration lessons when both the English subject and a THPT class/grade (10, 11, 12) are explicit; exclude junior high school.
6. Upload stores matching candidates as `pending` metadata on scheduled items. For an admin upload only, eligible candidates are converted automatically to draft events. For TTCM upload, they remain queued for admin action.
7. Admin sees pending candidates in Event Manager, may select individual or all.
8. Draft requires explicit start date/time. If missing, `needsTimeReview` must remain true and admin must correct the schedule item first. The calendar's legacy 08:00 fallback is **not a source-provided meeting time**.
9. When end time is missing but start time explicit, draft uses a provisional 60-minute duration and puts a prominent disclosure in the draft description, for admin correction.
10. Draft staging queries existing events with the same exact title and event timestamp before insertion; linked source metadata stores resulting draft ID. Repeat uploads are skipped by the existing schedule fingerprint.
11. Admin must inspect poster, schedule, location and audience, then explicitly publish via the existing RPC. No recipient is targeted at detection/staging.
12. Error handling is partial: the common calendar import survives failures in event draft creation; a warning is shown, not a false success.
13. Nothing changes the existing Focus, Board, Dashboard presentation or notification rules.
14. CSV/XLSX are supported; PDF is **not** supported by the existing importer. A separate PDF extraction feature would need explicit work.

## 4. Data contract
A schedule item retains its existing `item_type='schedule'`, `due_at`, `metadata.schedule_fingerprint`. New metadata:
- `schedule_has_explicit_time: boolean`
- `schedule_has_explicit_end_time: boolean`
- `schedule_event_detection: { fingerprint, audience, reason, confidence, category, timeKnown, needsTimeReview, approvalStatus:'pending' | 'draft_created', sourceRow }`
- `schedule_event_draft_id: uuid` after association.

Do not infer users from names. Admin continues to select recipients through Event Manager. System-wide mandatory admin/TTCM recipients remain governed by existing rules when (and only when) publication is approved.

## 5. Roles and security
- Teacher: may view permitted schedule; cannot import or create event drafts.
- TTCM / department_head: can upload a weekly plan; creates only pending suggestions via the existing schedule table permissions.
- Admin: can upload, auto-generate drafts, inspect queue, adjust and publish.
- Supabase RLS `bes_events_admin_manage` protects draft writes; `bes_publish_event` RPC protects publication. No service key on the client.
- A rule match never substitutes for an auth or RLS check.

## 6. Technical edge cases
- Missing time: do not convert to `bes_events`; retain queue and user-facing explanation.
- Ambiguous subject grade or THCS: do not auto-mark it as English THPT without explicit evidence.
- Mixed responsibility (all TTCM): match TTCM without assuming it belongs to a specific English teacher.
- Duplicate source data in the same file or on repeated imports: existing `scheduleFingerprint` skips.
- Already existing identical title/start: reuse existing draft instead of making another.
- Overlapping imports: title/start deduplication is best-effort at application layer; strict atomic cross-session uniqueness would require a new database uniqueness constraint.
- User-side local time: importer's existing local-time interpretation is retained. Review before publishing, especially if author/importer timezones differ.
- Partial failure of post-import staging: calendar remains imported and shows a warning.

## 7. Manual UAT
- Login as TTCM; upload week 15 CSV; confirm queue count and no popup/publication.
- Login as admin; verify candidates present; create draft for timed rows; inspect `bes_events.status='draft'`.
- Verify no `bes_event_recipients` records created until publication.
- Re-upload same file; confirm no duplicate work entries/events.
- Fix an un-timed source row in the calendar; create its draft afterward.
- Verify a THCS English demonstration lesson is not selected by the English THPT matcher.
- Verify non-admin cannot directly write `bes_events`.
- Run `node scripts/test-schedule-event-detection.mjs` and the existing `npm run build`.

## 8. No-cost constraint
Pure browser-side matching and existing Supabase tables, policies and existing Vercel Git integration; no AI API, OCR, SMS, paid database extensions or background scheduler. Existing hosting/database plan limits still apply.
