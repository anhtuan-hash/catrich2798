# Brian Sync Doctor — Zero-cost acceptance plan (2026-10-25)

## Cost rule
- Do not create paid Supabase cloud branches/projects, additional Vercel projects, or metered browser services.
- Use the existing repository and currently configured CI/build checks.
- No student data copied to personal devices, third-party test websites, or mock-data generators.
- Never test data writes in Production, even wrapped in rollback transactions, without a separately approved safe staging process.

## Evidence at the time of implementation
- Three protected execution RPCs have **no EXECUTE privilege** for \`authenticated\` or \`anon\` roles:
  - \`bes_sync_authorize_transition(uuid,text)\`
  - \`bes_sync_execute_one_student(uuid)\`
  - \`bes_sync_restore_single_link(uuid)\`
- Vercel Production currently serving Sync Doctor read-only detection, review, approved backup rehearsal and aggregated monitoring.
- The latest monitoring sample is advisory, not proof of student data loss.
- An earlier attempt at Production-connected synthetic SQL E2E was blocked; **do not retry on Production**.

## Automated, cost-free regression
Run:
\`\`\`sh
npm run test:sync-doctor-offline
npm run test:sync-doctor-final
npm run test:sync-doctor-monitor
npm run build
\`\`\`
The new \`scripts/test-sync-doctor-offline-repair-model.mjs\` uses built-in Node.js only, with synthetic records and no network/database connections. It verifies separate requester/reviewer consent, a one-student append, exact preservation of legacy scores and non-student fields, idempotence, code/identity ambiguity, stale source detection, and blocking rollback after concurrent edits.

**Limit:** The offline model is not the actual PL/pgSQL implementation and does not validate SQL runtime privileges, transactions, or row locks. Never mistake its success for a staging database E2E pass.

## Local PostgreSQL test: no new cloud subscription
Supabase documentation permits free local development that does not consume cloud Supabase quotas:
https://supabase.com/docs/guides/local-development

The normal path uses the Supabase CLI and a Docker-compatible runtime (for example, locally installed Docker/Podman). Supabase also documents an experimental native runtime on some Linux/macOS machines, including Apple Silicon:
https://supabase.com/docs/guides/local-development/docker-and-native-runtimes

**Use only tools already installed and available at no extra charge.** Do not install a product that asks for payment. Do not \`supabase link\` or issue \`db push\` while conducting fixture tests. Always verify \`supabase --help\`, \`supabase start --help\`, current command versions, and the local database URL.

Create an isolated local project and generate an independent synthetic auth/profile/gradebook/canonical fixture, then run the actual SQL migration and execute test cases through psql or a local script. The fixture must not be linked to a hosted Supabase project. Drop the local test database afterward.

## Full acceptance matrix — pending isolated SQL E2E
1. Two authorized accounts A/B: A requests and separately authorizes execution; B reviews, creates backup, rehearses, executes. Teacher/non-admin fails.
2. A second execution and a same-user execution are rejected. Adding student N never modifies existing score keys or archived student rows.
3. Version mismatch, duplicate student identity/code, duplicate workspace scope and existing legacy alias block the mutation.
4. Backend uses one transaction, row-level locks, distinct hashes, one and only one updated workspace and append-only audit.
5. Rollback receives **another separate A consent** and B execution; pristine post-write checksum and version restore exactly the backup, with no concurrent edits.
6. After a concurrent grade/notes/student change, rollback refuses to overwrite legitimate work.
7. Expired, missing, changed or corrupted private backup blocks both repair and restore.
8. Verify the live browser UI with two distinct authorized sessions; check Arabic? No — supported languages are Vietnamese and English, and verify iPhone Safari and Android scrolling.
9. Re-run security advisors and confirm RLS on all Sync Doctor metadata tables, no client snapshot SELECT, and no anon privileges on definer RPCs.

## Release decision
**NOT APPROVED for real academic-data writes.** Even when the no-cost model test and Vercel build pass, maintain the database EXECUTE revokes for all three write/rollback RPCs. Only after an actual isolated PostgreSQL execution plus manual two-session QA may a separately reviewed release change the permissions. Until then the application remains fully useful for non-mutating diagnostics, planning, approval, private backup/rehearsal, and automated monitoring.

## Remaining dependencies
This agent runtime does not have a PostgreSQL binary, Docker-compatible engine, or an externally accessible isolated database. Therefore, actual isolated SQL E2E and physical Safari/Android user-session verification cannot be represented as completed in this run.
