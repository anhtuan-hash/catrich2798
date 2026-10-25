# Sync Doctor v1.8 — Active student counter protection

## Findings from read-only production inspection

On 2026-10-25, an aggregate-only SQL query for school year 2026–2027 inspected 53 gradebook workspaces. Three stored student counters did not match the number of active entries in their students arrays. This does NOT establish that any student or grade has been lost, and no student names or grades were fetched.

The daily Sync Doctor monitor now reports this as its own counter_mismatch_workspaces indicator. Existing historical rows have NULL for the new indicator, meaning unknown rather than zero. A fresh monitor run found 3 counter mismatches, alongside 63 potential missing associations in 3 workspaces; these metrics must not be conflated.

## Safety improvements

- Private backups now store original_student_count and post_student_count, as well as the payload, checksum and source revision.
- Backup is blocked when the students JSON value is not an array or the stored active-student counter does not match the active entries.
- Execution and rollback check the corresponding pinned counters before touching a gradebook workspace.
- A one-student append raises the active count by one without changing pre-existing student or grade records.
- Conditional rollback restores the original stored student_count, not the total length of the students array.
- Historical backups without original count metadata are not eligible for automatic execution.
- Affected workspaces must be reconciled manually; no auto-normalization of academic data occurs.
- All three write/authorization/rollback RPCs remain revoked for authenticated and anon users.

## Evidence and remaining gates

- Supabase migration applied and read-only verification confirmed metadata columns and EXECUTE revocations.
- New monitoring aggregate verified via Supabase read-only query; no academic rows were edited.
- CI runs new regressions for exact-counter storage/restoration and health monitoring.
- Local SQL fixture is expanded to test bad counters and conditional restoration, but was not executed here because PostgreSQL/Docker were not installed and network package downloads are unavailable.
- Real-account browser sessions, Android touch input and iOS Safari remain untested.

Cost rule: no paid Supabase branches/projects or browser-wallet services were created. Do not activate real academic repair until isolated SQL runtime and real-account QA have passed.