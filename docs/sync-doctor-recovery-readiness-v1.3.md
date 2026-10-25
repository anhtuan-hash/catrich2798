# Brian Sync Doctor v1.3 — Recovery Readiness Gate

Status: read-only execution preflight. **No student data repair, backup, or rollback RPC is present.**

## Workflow

1. An authorized Admin/TTCM runs a scoped scan.
2. A reviewable finding is sent to the database via \`bes_sync_submit_review\`. It stores a SHA-256 case hash and source revisions, not student names or scores.
3. A **different** authorized reviewer can approve **review only** through \`bes_sync_decide_review\`.
4. In the Review & Audit tab, click **Kiểm tra an toàn** on an approved \`STUDENT_NOT_LINKED\` request scoped to one gradebook/homeroom workspace.
5. Backend \`bes_sync_preview_review(uuid)\` recomputes the SHA-256 case hash from the authoritative roster and checks exactly one matching active student, no code collision, an absent destination record, and unchanged canonical/workspace timestamps.
6. Backend returns counts and a one-way fingerprint. No names, student IDs, student payloads, grades, or full backups leave the server.

## Safety invariants

- Authenticated plus approved administrator/department head, enforced **inside the RPC** using \`profiles\`, not mutable user metadata.
- Anonymous invocation forbidden. The UI cannot choose a requester, approve itself, or bypass server status.
- The record must already be \`approved_for_review\`; this is **not** authorization to write student records.
- Source revisions must still match; any changed revision produces \`stale\`.
- An ambiguous hash, duplicate student code, already-matched student, inactive student, oversized cohort, or unsupported JSON shape blocks the preview.
- The RPC is declared \`STABLE\` and has no academic-data insert/update/delete statements.
- \`backupCreated=false\`, \`rollbackAvailable=false\`, \`canExecute=false\` are explicit until a separately reviewed secure restore system is implemented.
- The preview is a *moment-in-time* result; actual execution would require new locks, a new approval, atomic encrypted/private backups, and recovery QA.

## Verification

- Supabase RLS/EXECUTE checked for the new function: \`authenticated\` can invoke, \`anon\` cannot. Function independently checks the caller is approved Admin/TTCM.
- Transactional synthetic test using two admin roles and a teacher: unauthorized call fails; independently approved candidate returns a read-only preview; intentionally old revision returns \`stale\`.
- Tests are rolled back; request and event counts verified unchanged.
- Vercel build gate executes \`scripts/test-sync-doctor-preflight.mjs\` and all existing Sync Doctor tests.

## Explicitly not completed

- No true external browser login test with two account sessions.
- No persistent backup snapshot, no rollback handler, no single-student repair execution.
- No assurance every deployed user's Supabase RLS scope contains all school classes.
- Preflight results do not prove there is an academic-data error; teachers must first corroborate against the originating app.

## Next security milestone before enabling data writes

Design an internal-only versioned backup with strict encryption/retention and test automatic reversal in a transaction on non-production fixtures. Implement a single-entity, idempotent, one-shot mutation whose approver differs from its requester; revalidate identity and revisions under row locks; verify no grade or historical ID links change; require rollback testing and a separate release gate.
