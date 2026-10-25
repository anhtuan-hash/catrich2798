# Brian Sync Doctor — End-to-end roadmap status (2026-10-25)

## Shipped and verified
- v1.1 deterministic diagnostic comparison and read-only scan.
- v1.2 independent review approval and server audit with RLS.
- v1.3 one-student backend read-only preflight.
- v1.4 private gradebook snapshots with 48-hour expiry and in-memory restore rehearsal.
- Stage 6 automatic metadata-only daily monitor: \`bes_sync_monitor_runs\` (no student names, identities or scores), \`bes_internal.bes_sync_run_health_monitor()\` and \`cron.job\` \`bes_sync_monitor_daily_v2\`, responsive bilingual Monitoring tab. Scheduled daily at 04:00 UTC.
- First monitor snapshot produced aggregated possible associations for 2026-2027; counts are hints, **not verified student errors**.

## Developed but intentionally NOT enabled
- Stage 4B: two-person execution authorization and atomic, one-student-only gradebook link append, keeping prior score structures untouched.
- Stage 4C: two-person rollback consent, exact private snapshot recovery with post-write row revision and checksum equality.
- Migration: \`20261025130000_sync_doctor_safe_repair_rollback.sql\`.
- Explicit migration end-of-file revokes \`EXECUTE\` from authenticated for:
  - \`bes_sync_authorize_transition(uuid,text)\`
  - \`bes_sync_execute_one_student(uuid)\`
  - \`bes_sync_restore_single_link(uuid)\`
- Database privilege inspection confirmed all 3 were inaccessible to authenticated and anon as of deployment.

## Why the gate remains closed
An attempted end-to-end write/recovery SQL test with **synthetic records** in the Production-connected database was blocked by the runtime safety gate. No attempt was made to circumvent it. The user specifically requested thorough safe completion, but it would be unsafe and misleading to enable real academic record mutations without a validated positive/negative write-and-recovery test on an isolated environment.

## Required acceptance before unlocking
1. Isolated non-production staging database with anonymized synthetic fixtures and administrator authorization.
2. Test all four transitions: separate execution authorization, repair exactly one student, separate rollback consent, conditional exact restoration.
3. Test duplicate identity/code, unauthorized role, concurrent update, repeat execution/rollback, expired/corrupt backup, and academic score key preservation.
4. Test both accounts signed into real UI, including mobile Safari and Android scrolling and form operation.
5. Independent RLS/SECURITY DEFINER audit; confirm approved users cannot access private snapshot rows.
6. Only then ship a second, explicit migration granting these three functions to authenticated; do not change the client into optimistic repair mode.

## Security caveats
- Internal snapshot data is private at the database API layer, not separately application-level encrypted.
- Snapshots expire in 48 hours and are physically removed by a daily cron job.
- Existing review approval is not execution authorization.
- Metadata cron monitoring is not a guarantee that all student records are synchronized.
- Android/Safari visual tests and cross-account Production interaction are still pending.

## Operational dashboard
Browser: https://esl-brian.vercel.app/#/tool/sync-doctor
Tab: \`Giám sát / Monitoring\`.
