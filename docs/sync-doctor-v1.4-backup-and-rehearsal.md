# Brian Sync Doctor v1.4 — Private Backup & Recovery Rehearsal

Scope: **recovery preparation only**. Never use this release as a way to repair student or gradebook data.

## Delivered

- Two security-definer RPCs: \`bes_sync_create_private_backup(uuid)\`, \`bes_sync_rehearse_private_restore(uuid)\`.
- Approval and ownership: caller must be an **approved Admin/TTCM**, the **original independent reviewer**, not the requester.
- Narrow scope: only previously approved \`STUDENT_NOT_LINKED\` gradebook requests, with a **single uniquely identified workspace**, stable source and canonical revisions, and a passing server-side single-student preflight.
- Database row lock and SHA-256 checksum prior to creating an exact private gradebook payload snapshot.
- Snapshot store: \`bes_internal.bes_sync_backup_snapshots\`, RLS with **no client policies** and no SELECT/INSERT/UPDATE/DELETE privileges for authenticated/anon.
- Snapshot TTL: **48 hours**; Supabase Cron runs daily to purge expired copies (actual removal may occur after expiry).
- In-memory recovery rehearsal: appends a **synthetic non-student marker** to a temporary JSONB value, removes it, and verifies checksum/full equality to the saved snapshot; the gradebook record is untouched.
- No snapshot contents, student names/IDs, grades, or PINs are returned to the browser. UI shows only status, expiry, and reason.

## Verified

- Transactional synthetic fixture (not actual students): blocked an ordinary teacher and the requester, allowed the independent reviewer, created one private snapshot, performed a reversible in-memory round-trip and verified academic payload unchanged.
- Test fixture and backup were rolled back in the same transaction; production database counts after test: 0 reviews, 0 backups, 0 audit events.
- Database privileges: authenticated cannot read the private backup table; anon cannot invoke recovery RPCs. Cron cleanup job is active.
- Built-in Supabase security advisor flags private table RLS without policy (intentional deny-all) and \`SECURITY DEFINER\` RPCs callable by \`authenticated\`; each RPC validates \`profiles\` role, approval, request status and distinct reviewers internally. Do not remove these checks.

## Explicitly NOT done

- No live student addition, deletion, merge or grade modification.
- No database-level restore of an updated gradebook, and no rollback API.
- No encrypted application-level key separate from PostgreSQL storage encryption.
- No validation with two real signed-in browser sessions.
- No Homeroom backup or restore (large/complex payloads need separate privacy and ownership review).
- No assurance that approval to review constitutes approval to execute.

## Before enabling repair

1. Store a second, **separate execution approval** from an authorized reviewer.
2. Implement an idempotent, one-student mutation with strict schema projection (\`rosterStudentId\`, \`id\`, legacy scores retained), exact-case hash, and one target workspace.
3. In one atomic transaction: lock request, canonical roster and gradebook rows; validate revisions and student's lifecycle; ensure backup exists and checksum matches; apply a single append; verify all pre-existing student rows and score maps unchanged; then commit.
4. Implement a conditional live rollback that is safe against concurrent changes, and test both positive and negative branches on synthetic data.
5. Repeat cross-account login verification, RLS tests, Android/Safari checks and Vercel Production gate.
