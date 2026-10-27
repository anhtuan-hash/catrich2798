# BRIAN REPORTS — UNIFIED ENRICHMENT & REMEDIAL WORKSPACE
**SPEC v2.0 · 27/10/2026 · ESL Brian / TTCM & teachers**

## 1. Architecture / deployment
- Provide TWO first-level spaces inside Brian Team: **Báo cáo chuyên môn tháng** and **Bồi dưỡng & Phụ đạo**. Maintain current URL, account/session, existing database, existing app routing and authorization; do not create second Supabase project, GitHub repo or paid service.
- Monthly area retains four contextual tabs: My monthly report, TTCM department roll-up, monthly history, personnel management.
- Specialist area has two contextual tabs: TTCM management and my gifted/remedial reports. This removes the six mixed top-level tabs.
- Within Specialist TTCM management, show **one unified list** combining gifted and remedial reports; use teacher, month, status search/filters, not two large duplicate programme cards. Department summary and month/year analytics remain separate views, with an explicit gifted/remedial programme selector there.
- Keep links/data semantics unchanged for teachers and all existing assigned reports. Legacy class binding is available only as repair tool; normal smart dispatch auto-links instructor sessions.
- No AI in assignment, assessment, analytics or teacher data.

## 2. TTCM specialist navigation and interaction
1. A single hero matching Monthly Reports typography/width/tone.
2. An action bar with refresh and **Giao báo cáo**, using existing SmartAssignmentComposer and identity-validation RPC.
3. A horizontal navigation: **Báo cáo giáo viên / Tổng hợp tổ / Thống kê tháng**.
4. Teacher report management shows four KPI tiles (assigned, awaiting TTCM, confirmed, unfinished) for department, spanning both programmes.
5. **One teacher assignment table**, not distinct Gifted/Remedial tiles. Columns:
   - Select checkbox, teacher, programme badge, month, deadline, narrative progress, status, view.
   - Search teacher; filter month and status; CSV export only filtered records.
   - Buttons **Chọn tất cả / Bỏ chọn / Xóa đã chọn (N)** with selection count, disabled when none eligible.
   - "Select all" selects all **visible, revocable** assignments only. Reports with content, submitted/approved/revision or previously reviewed are never selected; mark them protected.
   - A selection of one row also supports the single-assignment revoke workflow.
   - Confirmation enumerates number and programme before deletion.
   - After success remove only IDs confirmed removed from local state, update nav timer; show skipped/errors from server.
6. Bulk revoke must not change attendance/class/teacher identity source.
7. Teacher "My reports" view retains own report cards, editor, auto-attendance, save-draft/submit and TTCM review.

## 3. TTCM roll-up & 12-month analytics parity
- Reuse existing LearningReportsManagerDashboard, its scoped Supabase backend, period selector, deadlines, event sync and submitted/approved/revision states. Expose programme selector **only in roll-up/month stats**, independent of combined management list.
- Monthly roll-up: reporting month, effective due date, countdown, Set/Clear deadline, KPIs (teachers, assignments, sessions, fractional teaching periods, present/absent/late, weighted attendance, submitted, approved, recommendations, outcomes), per-teacher row, CSV.
- Academic-year page: August–July cards, submitted/approved/draft/revision and rates, teaching activity bars, per-teacher aggregates, CSV. Never duplicate session IDs or award full class attendance to co-teachers.
- Native browser printing provides **Print / Save PDF** for analytics; responsive print styles. CSV is UTF-8 BOM and mitigates formula injection. Do not claim genuine XLSX without creating a tested workbook.
- Reviewing each professional teacher report remains an individual TTCM decision; no blind bulk approval.

## 4. Bulk revoke API
Supabase RPC: bes_bulk_revoke_learning_report_assignments(p_task_ids uuid[]) returns jsonb.
- Requires authenticated TTCM with can_manage_brian_team() and ownership verified by existing bes_revoke_learning_report_assignment per ID.
- Bound to 1–100 distinct IDs; input cannot contain NULL or duplicates.
- Reject mixed ownership before processing.
- Iterate through IDs with per-ID protected-item error handling, return removedCount/skippedCount/removed/skipped; protected items stay untouched.
- Existing single-item RPC enforces draft-only, no professional text, no submission/review or session journal. It deletes only selected task, selectively removes event recipient, cancels an empty event, records an audit row, retains attendance data, teacher mappings, approved snapshots.
- Back-to-back repeated actions are idempotent at UI (already missing IDs appear skipped).
- RLS unchanged for report data. RPC not executable by anonymous users. New migration only creates/replaces this tightly scoped RPC.

## 5. Roles and data
- TTCM: combined management, bulk revoke, Smart Assignment, month/year stats, teacher report review.
- Teacher: only own reports, save and submit, no bulk revoke/manage view.
- Department scoping derives from department_team_workspaces, auth.uid(), existing authorization guard. Never trust browser-supplied roles.
- Gifted/remedial content/field definitions remain established five narrative sections. Attendance source remains confirmed sessions for exact teacher, approved snapshots frozen.

## 6. Accessibility / UX / i18n
- Keyboard-operable native checkboxes/buttons; row view button separate from checkbox; selection count displayed. Protected checkbox disabled with explanation.
- Desktop wide table horizontal scrolling on narrow screens, tablet/mobile responsive; no overlay over Brian Focus/floating dock.
- Vietnamese and English via existing translation catalog and global audit. No changes to Focus/Board/permissions.
- Selected IDs automatically drop when filtered out, removed or ineligible.

## 7. QA and release
- Select all chooses only eligible visible records; clear empties selection; status/month/search filters work.
- Mixed batch: empty draft + filled draft + submitted; only empty draft revoked. Audit exists, attendance untouched.
- Wrong TTCM, teacher or anon cannot invoke bulk RPC.
- Shared event retains other recipients; final recipient cancels event.
- After revoke, nav countdown refreshes.
- TTCM portal has two primary groups + local navigation; monthly workflow unchanged.
- Verify roll-up, August–July analytics, teacher deduplication, JSX/ESM, bilingual audit, responsive CSS, CI and Vercel Preview. Merge only after dedicated tests pass.
- Never actually revoke existing production assignments during smoke tests; run SQL test in transaction with ROLLBACK.

## 8. Acceptance
1. TTCM sees one coherent specialist workspace rather than two large programme cards and a mixed six-tab portal.
2. One teacher with both types has two distinct assignments, each in same filterable table.
3. "Chọn tất cả" / "Xóa đã chọn" safely revoke only unused assignments.
4. Full specialist workflow: dispatch, deadlines, countdown, summary, academic-year trend, CSV, print/PDF via browser, teacher review, status.
5. Monthly Reports, original teacher records, Attendance, Focus and Board remain intact.
