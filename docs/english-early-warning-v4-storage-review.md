# BRIAN English Early Warning V4: School-approval storage gate

**Status:** proposed SQL, **not** a Supabase migration. It is intentionally not deployed.

1. Obtain documented authorization for the research project, appropriate privacy notices, retention and deletion procedures, and secure storage location for the separate pseudonym-to-student mapping.
2. Verify server-side `public.bes_has_any_class_assignment(text)` returns true only for the current authenticated teacher's assigned class; test with accounts from two different teaching teams.
3. Create a timestamped migration with `supabase migration new <name>` from an authorized working copy. Copy the reviewed SQL from `supabase/review/english_early_warning_v4_ddl.sql`.
4. Apply to **staging only**; evaluate anonymous, teacher A, teacher B, reassigned teacher, and admin access. Ensure anonymous never receives rows, teacher A cannot read or mutate teacher B's class, a teacher lacking an active assignment cannot insert/update, and owner can export/delete existing records.
5. Run database advisors and RLS/security scans, then obtain a second review before applying to production.
6. Only after all approvals, explicitly configure `VITE_BES_ENGLISH_EW_CLOUD_SYNC=true` in the intended environment; never add service-role credentials to browser code.
7. The app has **no background cloud saving**; the teacher must choose a verified class and confirm school authorization every session.

### What cloud snapshots contain
The snapshot contains coded IDs (P001…), scores, rule version 0.1, teacher decision **codes**, and structured weekly events (week, target skill, task counts, checkpoint score, dates). It does not contain teacher narrative notes, student names, original student codes, phone numbers, home addresses or student ID crosswalks.

### Local-only workflow available immediately
Teachers can import coded CSV, confirm support need, log eight weeks, export coded evidence, aggregate report and journal CSV. Browser refresh clears the data. No fabricated student scores are included.

### Research caveats
Eight weeks is a planned intervention cycle, not proof of efficacy. Descriptive changes cannot establish causality without a suitable experimental/quasi-experimental design and careful attention to baseline comparability. A/B form equivalence and thresholds remain unvalidated.

### Suggested test commands
```bash
node scripts/test-english-early-warning.mjs
node scripts/test-english-intervention-v4.mjs
node scripts/test-english-cloud-snapshot-v4.mjs
npm run build
```
