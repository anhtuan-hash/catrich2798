# Brian Sync Doctor — Zero-cost LOCAL PostgreSQL E2E

This is a **prepared, not yet executed** integration test for the real Phase 4B/4C PostgreSQL stored functions. It never connects to a Supabase Cloud project.

## Files

- 01_bootstrap.sql: synthetic role/profile/gradebook/review/backup tables.
- 02_e2e.sql: two-human consent, actual stored-function call, one-student repair, unchanged legacy scores, concurrent-edit rejection and exact rollback.
- scripts/sync-doctor-extract-local-functions.mjs: extracts six actual stored-function definitions, including final scope and row-count guards.
- scripts/test-sync-doctor-local-postgres.sh: loopback-only disposable Postgres DB plus automatic cleanup.
- scripts/test-sync-doctor-local-harness.mjs: CI structural verification, not an actual SQL test.

## Free prerequisites

A local PostgreSQL 16+ server with psql, createdb, dropdb and a sufficiently privileged local account; Node.js; and the existing Brian repo. No Supabase Cloud, API keys, hosted branch, paid product, or student data needed.

For macOS Apple Silicon when Homebrew is already installed:

    brew install postgresql@17
    brew services start postgresql@17
    PGHOST=127.0.0.1 PGPORT=5432 PGUSER="$(whoami)" npm run test:sync-doctor-sql-local

Depending on your PostgreSQL install, an initial local cluster or a different local user/port may be required. Never pass Production Supabase credentials.

Without local PostgreSQL, the command prints SKIP (not passed) and exits nonzero. The Node.js synthetic model and normal Vercel CI run without PostgreSQL.

## Local-only workflow

1. Check server version >= 16 on 127.0.0.1.
2. Extract the six original PL/pgSQL definitions, not a rewritten imitation.
3. Create a random disposable database named sync_doctor_fixture_*.
4. Load synthetic users, a synthetic class, synthetic students and synthetic grades.
5. Exercise authorization, backup, rehearsal, real database append, score-map integrity, anti-replay, competing edit guard and real database rollback.
6. Roll back synthetic transaction and drop the entire disposable database (including on failures).

The runner refuses remote PGHOST, PGSERVICE, PGHOSTADDR and DATABASE_URL. It uses the hard-coded loopback host.

## Acceptance limits

This checks the real PL/pgSQL on local synthetic fixtures **only after successfully running it**. It cannot establish that the real app browser permissions, Supabase network RLS, Production triggers, iOS Safari/Android scrolling, or two real accounts work correctly.

**Even a PASS cannot unlock Production writes by itself.** Keep all three restricted RPC EXECUTE permissions revoked. Obtain a separate independent security review plus real-account acceptance before enabling them.

Zero new cloud resources or subscriptions. Free local PostgreSQL uses existing laptop CPU/disk space.

Status at implementation: CI/structural scripts prepared; actual local PostgreSQL E2E has NOT run in this environment because Postgres executables/server are absent.
