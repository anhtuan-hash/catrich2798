# Student Support Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, non-AI Student Support Center at `#/student-support` that composes existing Attendance, Gradebook, Homeroom, teaching-assignment, and notification data into a deterministic support workflow for alerts, human review, support cases, follow-up, reporting, and audit.

**Architecture:** Student Support is a new bounded domain under `src/studentSupport/`. Existing modules remain the source of truth for attendance, grades, class membership, teacher assignments, and parent-contact facts. Student Support owns only deterministic rules, alerts, support cases, actions, notes, teacher observations, support-specific family-contact logs, and immutable case events. The cross-module student key is the existing `student_ref`/student code identity already used by Homeroom; no new independent student master table is introduced.

**Tech Stack:** React 18, Vite, Supabase/PostgreSQL + RLS, existing Brian permission framework, existing notification event bus, Node `node:test`, Playwright, browser-side PDF/Excel export libraries already present in the repo.

**Spec:** `docs/superpowers/specs/2026-09-15-student-support-center-design.md`

## Global Constraints

- Student Support must not call any AI/LLM endpoint, model, embedding service, semantic classifier, or AI helper.
- All alerts must come from deterministic rules with visible evidence and formulas.
- Teachers remain the final decision-makers for opening, updating, resolving, and closing cases.
- Do not duplicate Attendance, Gradebook, Homeroom, or teaching-assignment records into Student Support-owned tables.
- Reuse `student_ref`, existing class/workspace identifiers, existing account ids, and existing teaching-assignment checks.
- Subject teachers may only see students/classes they are assigned to teach; GVCN may only manage their own homeroom scope; Admin/authorized management may see broader scope according to role/permission.
- RLS must enforce note visibility; React-only hiding is insufficient.
- Do not expose internal alerts, private notes, or internal case metadata to the Homeroom Portal in V1.
- Do not automatically send sensitive messages to students or families in V1.
- Archive-first deletion is required; permanent deletion follows existing governance/approval patterns.
- Desktop, tablet, and mobile layouts must remain usable; no wide-table-only critical workflow.
- Existing app-visibility controls and `route:student-support` permission must govern access.
- All new Student Support code must pass the repo's no-AI audit.

---

## File Structure

### New files

- `src/studentSupport/studentSupportConstants.js` — statuses, observation types, visibility scopes, default rule codes.
- `src/studentSupport/studentSupportIdentity.js` — normalize `student_ref`, student code, class/workspace context, and deep-link query parsing.
- `src/studentSupport/studentSupportRules.js` — pure deterministic rule evaluation and deduplication keys.
- `src/studentSupport/studentSupportApi.js` — Supabase CRUD/query facade for alerts, cases, actions, notes, observations, family contacts, rules, and case events.
- `src/studentSupport/studentSupportSources.js` — read-only adapters for Homeroom, Gradebook, Attendance, and teaching assignments.
- `src/studentSupport/studentSupportNotifications.js` — fixed-template notification event creation.
- `src/studentSupport/studentSupportExports.js` — report projection and PDF/Excel export helpers.
- `src/pages/StudentSupportCenter.jsx` — page shell, tabs, routing/query state, loading/error states.
- `src/pages/StudentSupportCenter.css` — responsive layout.
- `src/components/studentSupport/StudentSupportOverview.jsx` — overview cards and due work.
- `src/components/studentSupport/StudentSupportAlertQueue.jsx` — alert work queue and filters.
- `src/components/studentSupport/StudentSupportStudentProfile.jsx` — Student 360 read view.
- `src/components/studentSupport/StudentSupportCases.jsx` — case list/detail, lifecycle and actions.
- `src/components/studentSupport/StudentSupportObservationForm.jsx` — subject/GVCN observation form.
- `src/components/studentSupport/StudentSupportRuleSettings.jsx` — Admin deterministic-rule configuration UI.
- `src/components/studentSupport/StudentSupportReports.jsx` — aggregate reporting UI.
- `supabase/migrations/20260915090000_student_support_core.sql` — tables, constraints, indexes, timestamp trigger wiring.
- `supabase/migrations/20260915091000_student_support_rls.sql` — RLS policies, grants, scoped helper views/RPCs where necessary.
- `supabase/migrations/20260915092000_student_support_seed_rules.sql` — deterministic default rules only.
- `tests/unit/student-support-rules.test.mjs` — deterministic rule unit tests.
- `tests/unit/student-support-identity.test.mjs` — identity/query normalization tests.
- `tests/unit/student-support-api.test.mjs` — API payload and transition validation tests with a fake Supabase client.
- `tests/e2e/student-support-center.spec.js` — route, responsive, permission, alert/case workflow UI tests.
- `scripts/verify-student-support.mjs` — static contract verifier for route, permission, no-AI, and schema file presence.

### Existing files to modify

- `src/main.jsx` — lazy page import, `student-support` route, design profile, render branch.
- `src/data/apps.js` — launcher card for Student Support Center.
- `src/utils/permissions.js` — `route:student-support` permission id/item.
- `src/utils/supabase.js` — Student Support read projection/TTL entries.
- `src/pages/HomeroomWorkspace.jsx` or a focused Homeroom child component — deep link to Student Support for a selected student.
- `src/pages/GradebookStudio.jsx` or `src/components/gradebook/GradebookWorkspace.jsx` — deep link for a selected roster student.
- `src/components/GlobalCompactNavigation.jsx` only if a Student Support-specific notification target needs normalization; otherwise use the existing `bes-global-notification` event without modifying this file.
- `scripts/audit-no-ai.mjs` — explicitly scan/guard Student Support source paths.
- `package.json` — add Student Support verification scripts.

---

### Task 1: Create the Student Support database domain

**Files:**
- Create: `supabase/migrations/20260915090000_student_support_core.sql`
- Test: SQL verification executed against a Supabase development branch before production

**Interfaces:**
- Consumes: existing `auth.users`, `public.profiles`, `public.bes_homeroom_workspaces`, existing `student_ref` conventions.
- Produces: `student_support_rules`, `student_support_alerts`, `student_support_cases`, `student_support_actions`, `student_support_notes`, `student_support_teacher_observations`, `student_support_family_contacts`, `student_support_case_events`.

- [ ] **Step 1: Write a failing schema verification query before applying the migration**

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'student_support_rules',
    'student_support_alerts',
    'student_support_cases',
    'student_support_actions',
    'student_support_notes',
    'student_support_teacher_observations',
    'student_support_family_contacts',
    'student_support_case_events'
  );
```

Expected before migration: fewer than 8 rows.

- [ ] **Step 2: Create the core migration**

Use `student_ref text not null` as the durable cross-module student identifier because the current Homeroom tables already use `student_ref` across attendance, learning records, feedback, parent contacts, incidents, and portal data. Use `homeroom_workspace_id text` for the owning homeroom scope and `source_class_name text`/`source_workspace_id text` on subject-teacher observations.

Core table shape:

```sql
create table public.student_support_cases (
  id uuid primary key default gen_random_uuid(),
  student_ref text not null,
  homeroom_workspace_id text not null,
  school_year text not null default '',
  category text not null,
  title text not null,
  reason text not null default '',
  goal text not null default '',
  owner_id uuid not null references auth.users(id),
  status text not null default 'NEW'
    check (status in ('NEW','REVIEWING','ACTIVE','FOLLOW_UP','RESOLVED','CLOSED','NO_ACTION_REQUIRED')),
  follow_up_at timestamptz,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

Alerts must include `rule_id`, `rule_version`, `evidence jsonb`, `window_start`, `window_end`, `dedupe_key text`, `first_triggered_at`, and `last_evaluated_at`. Add a partial unique index preventing duplicate active alerts:

```sql
create unique index student_support_alerts_active_dedupe_idx
on public.student_support_alerts (dedupe_key)
where archived_at is null and status in ('NEW','REVIEWING','LINKED_TO_CASE');
```

Case events are append-oriented: no user-facing update/delete path.

- [ ] **Step 3: Add indexes for real query paths**

```sql
create index student_support_alerts_student_idx
  on public.student_support_alerts (student_ref, created_at desc);
create index student_support_cases_workspace_idx
  on public.student_support_cases (homeroom_workspace_id, status, updated_at desc);
create index student_support_actions_due_idx
  on public.student_support_actions (assigned_to, due_at)
  where status not in ('DONE','CANCELLED');
create index student_support_observations_student_idx
  on public.student_support_teacher_observations (student_ref, observation_date desc);
```

- [ ] **Step 4: Apply migration to a Supabase development branch and verify**

Run the schema verification query again.

Expected: exactly 8 table rows and the indexes above exist.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260915090000_student_support_core.sql
git commit -m "feat: add student support data model"
```

---

### Task 2: Enforce role/scope security with RLS

**Files:**
- Create: `supabase/migrations/20260915091000_student_support_rls.sql`
- Test: SQL role-policy verification on a Supabase development branch

**Interfaces:**
- Consumes: `public.is_admin()`, `public.bes_v1099_current_role(auth.uid())`, `public.bes_has_any_class_assignment(class_name)`, `bes_homeroom_workspaces.owner_id`, `auth.uid()`.
- Produces: RLS-protected CRUD contract for all Student Support tables.

- [ ] **Step 1: Write failing policy inventory query**

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename like 'student_support_%'
order by tablename, policyname;
```

Expected before migration: no complete policy set.

- [ ] **Step 2: Enable RLS on every Student Support table**

```sql
alter table public.student_support_rules enable row level security;
alter table public.student_support_alerts enable row level security;
alter table public.student_support_cases enable row level security;
alter table public.student_support_actions enable row level security;
alter table public.student_support_notes enable row level security;
alter table public.student_support_teacher_observations enable row level security;
alter table public.student_support_family_contacts enable row level security;
alter table public.student_support_case_events enable row level security;
```

- [ ] **Step 3: Implement workspace-scope read policies**

GVCN access is derived from workspace ownership:

```sql
exists (
  select 1
  from public.bes_homeroom_workspaces w
  where w.workspace_id = homeroom_workspace_id
    and w.owner_id = auth.uid()
    and w.archived_at is null
)
```

Admin access uses `public.is_admin()`.

Department-head access is allowed only for management-level aggregate/case data and must use normalized role checks plus the existing department/assignment scope; do not grant blanket `authenticated` access.

- [ ] **Step 4: Implement subject-teacher observation policies**

Allow an observation insert only when:

```sql
teacher_id = auth.uid()
and public.bes_has_any_class_assignment(source_class_name)
```

Allow the observation author to read their own observation; allow owning GVCN/Admin to read submitted observations for that homeroom. Do not let subject teachers read private family-contact entries or unrelated private notes.

- [ ] **Step 5: Enforce note visibility in SQL**

For `student_support_notes.visibility_scope`:

```sql
check (visibility_scope in ('PRIVATE','HOMEROOM','TEACHING_TEAM','MANAGEMENT'))
```

Policy behavior:

- `PRIVATE`: `author_id = auth.uid()` or Admin.
- `HOMEROOM`: author + owning homeroom teacher + Admin.
- `TEACHING_TEAM`: author + owning homeroom teacher + users with matching teaching assignment + Admin.
- `MANAGEMENT`: author + owning homeroom teacher + authorized department head + Admin.

- [ ] **Step 6: Protect immutable case events**

Grant select/insert under scope, but do not create update/delete policies for `student_support_case_events`.

- [ ] **Step 7: Verify anonymous/student denial and teacher-scope denial**

Use Supabase test users or `set local role authenticated` test fixtures and assert:

```sql
-- A teacher outside the class must see zero rows.
select count(*) from public.student_support_teacher_observations
where source_class_name = 'UNASSIGNED-CLASS';
```

Expected: `0` under an unassigned teacher session.

- [ ] **Step 8: Run Supabase security advisors**

Expected: no new missing-RLS/table exposure findings for Student Support tables.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260915091000_student_support_rls.sql
git commit -m "feat: secure student support with RLS"
```

---

### Task 3: Seed deterministic rules and implement the pure rule engine

**Files:**
- Create: `supabase/migrations/20260915092000_student_support_seed_rules.sql`
- Create: `src/studentSupport/studentSupportConstants.js`
- Create: `src/studentSupport/studentSupportRules.js`
- Create: `tests/unit/student-support-rules.test.mjs`

**Interfaces:**
- Produces: `evaluateRule(rule, facts, now)`, `makeAlertDedupeKey(rule, studentRef, windowStart, windowEnd)`, `evaluateRules(rules, factsByStudent, now)`.
- Rule result shape: `{ triggered, ruleId, ruleCode, evidence, windowStart, windowEnd, metric }`.

- [ ] **Step 1: Write failing rule tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRule, makeAlertDedupeKey } from '../../src/studentSupport/studentSupportRules.js';

test('absence rule triggers at configured threshold', () => {
  const rule = { id: 'r1', code: 'absence_14d', ruleType: 'attendance_count', config: { status: 'absent', threshold: 3, days: 14 } };
  const facts = { attendance: [
    { date: '2026-09-03', status: 'absent' },
    { date: '2026-09-08', status: 'absent' },
    { date: '2026-09-14', status: 'absent' },
  ] };
  const result = evaluateRule(rule, facts, new Date('2026-09-15T00:00:00Z'));
  assert.equal(result.triggered, true);
  assert.equal(result.metric, 3);
});

test('insufficient grade samples never trigger', () => {
  const rule = { id: 'r2', code: 'grade_drop', ruleType: 'grade_window_drop', config: { sampleSize: 3, delta: 1 } };
  const result = evaluateRule(rule, { grades: [{ score: 5 }] }, new Date('2026-09-15T00:00:00Z'));
  assert.equal(result.triggered, false);
  assert.equal(result.evidence.reason, 'insufficient_data');
});

test('dedupe key is stable for same rule/student/window', () => {
  assert.equal(
    makeAlertDedupeKey({ id: 'r1', version: 1 }, 'student-1', '2026-09-01', '2026-09-15'),
    makeAlertDedupeKey({ id: 'r1', version: 1 }, 'student-1', '2026-09-01', '2026-09-15'),
  );
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test tests/unit/student-support-rules.test.mjs
```

Expected: FAIL because rule module does not exist.

- [ ] **Step 3: Implement supported V1 rule types**

`studentSupportRules.js` must support exactly:

```js
export const STUDENT_SUPPORT_RULE_TYPES = Object.freeze([
  'attendance_count',
  'grade_window_drop',
  'consecutive_scores_below',
  'observation_count',
  'combined_all',
]);
```

No fuzzy matching, AI, or free-text interpretation.

- [ ] **Step 4: Seed initial disabled/configurable defaults**

Seed rules with stable codes:

```sql
insert into public.student_support_rules
(code, name, rule_type, enabled, scope, config, version)
values
('absence_3_in_14d', 'Vắng 3 buổi trong 14 ngày', 'attendance_count', true, 'school', '{"status":"absent","threshold":3,"days":14}'::jsonb, 1),
('absence_5_in_30d', 'Vắng 5 buổi trong 30 ngày', 'attendance_count', true, 'school', '{"status":"absent","threshold":5,"days":30}'::jsonb, 1),
('late_3_in_14d', 'Đi muộn 3 lần trong 14 ngày', 'attendance_count', true, 'school', '{"status":"late","threshold":3,"days":14}'::jsonb, 1),
('grade_drop_3v3_1point', 'Điểm TB 3 bài gần nhất giảm từ 1 điểm', 'grade_window_drop', false, 'school', '{"sampleSize":3,"delta":1}'::jsonb, 1),
('incomplete_3_in_14d', '3 ghi nhận chưa hoàn thành nhiệm vụ trong 14 ngày', 'observation_count', false, 'school', '{"observationType":"TASK_INCOMPLETE","threshold":3,"days":14}'::jsonb, 1)
on conflict (code) do nothing;
```

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260915092000_student_support_seed_rules.sql src/studentSupport/studentSupportConstants.js src/studentSupport/studentSupportRules.js tests/unit/student-support-rules.test.mjs
git commit -m "feat: add deterministic student support rules"
```

---

### Task 4: Implement identity normalization and source adapters

**Files:**
- Create: `src/studentSupport/studentSupportIdentity.js`
- Create: `src/studentSupport/studentSupportSources.js`
- Create: `tests/unit/student-support-identity.test.mjs`
- Modify: `src/utils/supabase.js`

**Interfaces:**
- Produces: `normalizeStudentRef(student)`, `parseStudentSupportHash(hash)`, `buildStudentSupportHash(input)`, `loadStudentSupportScope(user)`, `loadStudent360Facts({ user, studentRef, homeroomWorkspaceId, days })`.
- Consumes existing Homeroom and Gradebook store functions plus direct read-only Supabase queries.

- [ ] **Step 1: Write failing identity tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStudentRef, parseStudentSupportHash, buildStudentSupportHash } from '../../src/studentSupport/studentSupportIdentity.js';

test('student ref prefers existing id then code', () => {
  assert.equal(normalizeStudentRef({ studentRef: 'HS-1', code: '001' }), 'HS-1');
  assert.equal(normalizeStudentRef({ id: 'abc', code: '001' }), 'abc');
  assert.equal(normalizeStudentRef({ code: '001' }), 'code:001');
});

test('deep link round trips', () => {
  const hash = buildStudentSupportHash({ studentRef: 'HS-1', workspaceId: '12.6' });
  assert.deepEqual(parseStudentSupportHash(hash), { studentRef: 'HS-1', workspaceId: '12.6', tab: '' });
});
```

- [ ] **Step 2: Run test and verify failure**

```bash
node --test tests/unit/student-support-identity.test.mjs
```

- [ ] **Step 3: Implement identity rules**

Preference order:

```js
student.studentRef || student.student_ref || student.rosterStudentId || student.id || (student.code ? `code:${student.code}` : '')
```

Never generate a random id for an existing student. If no durable ref/code is available, the UI may display the student but must disable case creation and show `Thiếu mã định danh học sinh`.

- [ ] **Step 4: Implement read-only Student 360 sources**

`loadStudent360Facts()` returns:

```js
{
  student: { studentRef, code, fullName, className, workspaceId, schoolYear, grade },
  attendance: [{ date, status, sessionName, source }],
  grades: [{ date, score, subject, assessmentType, source }],
  observations: [],
  assignmentScope: { isHomeroomOwner, subjectClasses: [] },
}
```

Attendance source order:

1. `bes_homeroom_attendance` by `student_ref` for official homeroom facts.
2. supplemental/extra attendance reports only when their canonical student key/code resolves to the same student.

Grade source order:

1. `bes_homeroom_learning_records` by `student_ref`.
2. Gradebook workspace payload/read helper for subject-grade detail; do not write back.

- [ ] **Step 5: Add Student Support paths to Supabase read caching**

Add projections/TTL entries in `src/utils/supabase.js` for new tables, for example:

```js
['/rest/v1/student_support_alerts', 5 * 60 * 1000],
['/rest/v1/student_support_cases', 5 * 60 * 1000],
['/rest/v1/student_support_actions', 5 * 60 * 1000],
['/rest/v1/student_support_rules', 30 * 60 * 1000],
```

Keep alert/case TTL short because the app is collaborative.

- [ ] **Step 6: Run identity tests and existing smoke tests**

```bash
node --test tests/unit/student-support-identity.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/studentSupport/studentSupportIdentity.js src/studentSupport/studentSupportSources.js src/utils/supabase.js tests/unit/student-support-identity.test.mjs
git commit -m "feat: connect student support source data"
```

---

### Task 5: Implement the Student Support API and lifecycle validation

**Files:**
- Create: `src/studentSupport/studentSupportApi.js`
- Create: `tests/unit/student-support-api.test.mjs`

**Interfaces:**
- Produces:
  - `listSupportAlerts(filters)`
  - `upsertEvaluatedAlert(input)`
  - `reviewAlert(alertId, decision)`
  - `listSupportCases(filters)`
  - `createSupportCase(input)`
  - `transitionSupportCase(caseId, nextStatus, note)`
  - `createSupportAction(input)` / `updateSupportAction(id, patch)`
  - `createSupportNote(input)`
  - `createTeacherObservation(input)`
  - `createFamilyContact(input)`
  - `appendCaseEvent(input)`
  - `archiveSupportCase(caseId)`

- [ ] **Step 1: Write failing transition/API tests with a fake client**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionCase, validateObservationInput } from '../../src/studentSupport/studentSupportApi.js';

test('case cannot jump from NEW directly to CLOSED', () => {
  assert.equal(canTransitionCase('NEW', 'CLOSED'), false);
});

test('case can move ACTIVE to FOLLOW_UP', () => {
  assert.equal(canTransitionCase('ACTIVE', 'FOLLOW_UP'), true);
});

test('observation requires factual type and student ref', () => {
  assert.throws(() => validateObservationInput({ observationType: 'TASK_INCOMPLETE' }), /student/i);
});
```

- [ ] **Step 2: Run and verify failure**

```bash
node --test tests/unit/student-support-api.test.mjs
```

- [ ] **Step 3: Implement explicit lifecycle transitions**

```js
export const CASE_TRANSITIONS = Object.freeze({
  NEW: ['REVIEWING', 'NO_ACTION_REQUIRED'],
  REVIEWING: ['ACTIVE', 'NO_ACTION_REQUIRED'],
  ACTIVE: ['FOLLOW_UP', 'RESOLVED'],
  FOLLOW_UP: ['ACTIVE', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'ACTIVE'],
  CLOSED: [],
  NO_ACTION_REQUIRED: [],
});
```

`transitionSupportCase` must update the case and append `student_support_case_events` in the same logical operation; if implemented through a Postgres RPC, make the RPC validate `auth.uid()` and preserve RLS scope.

- [ ] **Step 4: Implement duplicate-safe alert upsert**

Use `dedupe_key` and update factual evidence/metric on an active alert instead of inserting daily duplicates.

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/studentSupport/studentSupportApi.js tests/unit/student-support-api.test.mjs
git commit -m "feat: add student support workflow API"
```

---

### Task 6: Register route, permission, launcher card, and no-AI guard

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/data/apps.js`
- Modify: `src/utils/permissions.js`
- Create: `scripts/verify-student-support.mjs`
- Modify: `scripts/audit-no-ai.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces route `#/student-support`, permission `route:student-support`, visibility id from existing app registry, build-time verification command.

- [ ] **Step 1: Write the static verifier first**

`verify-student-support.mjs` should read source files and fail unless all contracts exist:

```js
assert(main.includes("currentRoute === 'student-support'"));
assert(main.includes("'student-support'"));
assert(apps.includes("slug: 'student-support'"));
assert(permissions.includes("'student-support': 'route:student-support'"));
```

It must also fail if Student Support source imports `callAI`, references `/api/ai`, `openrouter`, embeddings, or known AI provider helpers.

- [ ] **Step 2: Run verifier and confirm failure**

```bash
node scripts/verify-student-support.mjs
```

Expected: FAIL.

- [ ] **Step 3: Add launcher card**

Add to `APPS`:

```js
{
  slug: 'student-support', route: 'student-support', icon: 'SS', tone: 'mint',
  group: 'School Management', groupVi: 'Hỗ trợ học sinh',
  title: 'Student Support Center', titleVi: 'Trung tâm Hỗ trợ Học sinh',
  desc: 'Review factual school signals, coordinate support actions and follow up student progress.',
  descVi: 'Tổng hợp tín hiệu thực tế, phối hợp hỗ trợ và theo dõi tiến trình học sinh.',
  status: 'Rule-based · Human-reviewed · No AI',
  statusVi: 'Theo quy tắc · Giáo viên duyệt · Không AI',
  api: true, featured: true,
}
```

- [ ] **Step 4: Add route permission**

In `ROUTE_PERMISSION_IDS`:

```js
'student-support': 'route:student-support',
```

Add a `CORE_PERMISSION_ITEMS` entry titled `Trung tâm Hỗ trợ Học sinh`.

- [ ] **Step 5: Add lazy route/render branch**

In `src/main.jsx`:

```js
const StudentSupportCenter = lazy(() => import('./pages/StudentSupportCenter.jsx'));
```

Add `'student-support'` to `ROUTES`, a design profile, and:

```jsx
{canAccessRoute && currentRoute === 'student-support' && currentUser && <StudentSupportCenter {...context} />}
```

- [ ] **Step 6: Extend no-AI audit**

Add Student Support-specific forbidden patterns and assert that no Student Support file imports removed/AI helpers.

- [ ] **Step 7: Add npm scripts**

```json
"test:student-support": "node --test tests/unit/student-support-*.test.mjs",
"verify:student-support": "node scripts/verify-student-support.mjs && npm run test:student-support && npm run test:v11.6.7"
```

- [ ] **Step 8: Run verifier**

```bash
npm run verify:student-support
```

Expected: PASS after page stub exists in Task 7.

- [ ] **Step 9: Commit**

```bash
git add src/main.jsx src/data/apps.js src/utils/permissions.js scripts/verify-student-support.mjs scripts/audit-no-ai.mjs package.json
git commit -m "feat: register student support center"
```

---

### Task 7: Build the page shell, overview, alert queue, and responsive layout

**Files:**
- Create: `src/pages/StudentSupportCenter.jsx`
- Create: `src/pages/StudentSupportCenter.css`
- Create: `src/components/studentSupport/StudentSupportOverview.jsx`
- Create: `src/components/studentSupport/StudentSupportAlertQueue.jsx`
- Create: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Consumes: `listSupportAlerts`, `listSupportCases`, query parser, current user.
- Produces tabs `overview`, `alerts`, `student`, `cases`, `observations`, `rules`, `reports`.

- [ ] **Step 1: Write failing Playwright route tests**

```js
import { test, expect } from '@playwright/test';

test('student support route renders protected shell', async ({ page }) => {
  await page.goto('/#/student-support');
  await expect(page.locator('main.student-support-center')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Trung tâm Hỗ trợ Học sinh/i })).toBeVisible();
});

test('mobile layout does not overflow horizontally', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/student-support');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
```

Use the existing authenticated E2E setup pattern from other protected-route tests; do not bypass permission checks in production code.

- [ ] **Step 2: Build page shell with explicit states**

The page must render:

```jsx
<StudentSupportOverview />
<StudentSupportAlertQueue />
```

with loading, empty, error, offline/fallback, and permission-denied states.

- [ ] **Step 3: Implement Overview cards**

Derive counts only from loaded rows:

```js
const summary = {
  monitored: uniqueStudentCount(activeCases),
  newAlerts: alerts.filter((a) => a.status === 'NEW').length,
  activeCases: cases.filter((c) => ['NEW','REVIEWING','ACTIVE'].includes(c.status)).length,
  followUp: cases.filter((c) => c.status === 'FOLLOW_UP').length,
  resolved: cases.filter((c) => c.status === 'RESOLVED').length,
  closed: cases.filter((c) => c.status === 'CLOSED').length,
};
```

- [ ] **Step 4: Implement alert filters**

Support grade/class/GVCN/type/status/date/overdue filtering. Filters operate after RLS-scoped loading; never fetch broader data client-side then hide it.

- [ ] **Step 5: Make tables collapse to cards on mobile**

Critical actions must remain reachable at 390px width without horizontal scrolling.

- [ ] **Step 6: Run focused E2E**

```bash
npm run build
npx playwright test tests/e2e/student-support-center.spec.js --project=chromium-desktop
npx playwright test tests/e2e/student-support-center.spec.js --project=mobile-chromium
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/StudentSupportCenter.jsx src/pages/StudentSupportCenter.css src/components/studentSupport tests/e2e/student-support-center.spec.js
git commit -m "feat: add student support dashboard and alert queue"
```

---

### Task 8: Build Student 360 and deep links from Homeroom/Gradebook

**Files:**
- Create: `src/components/studentSupport/StudentSupportStudentProfile.jsx`
- Modify: `src/pages/HomeroomWorkspace.jsx` or the smallest student-list child component that owns student row actions
- Modify: `src/components/gradebook/GradebookWorkspace.jsx` or the smallest roster child component that owns student row actions
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Consumes: `loadStudent360Facts`, `buildStudentSupportHash`.
- Produces deep links such as `#/student-support?student=HS-001&workspace=12.6&tab=student`.

- [ ] **Step 1: Add failing E2E for deep-link navigation**

Verify a Homeroom student action opens Student Support with the correct query params and Student 360 title.

- [ ] **Step 2: Build Student 360 sections**

Render only factual sections:

```text
Thông tin chung
Chuyên cần
Kết quả học tập
Ghi nhận giáo viên
Cảnh báo đang mở
Hồ sơ hỗ trợ
Dòng thời gian hỗ trợ
```

Attendance summary must show counts and exact recent rows. Grade trend must show formula labels such as `TB 3 bài gần nhất` vs `TB 3 bài trước`, never a predictive score.

- [ ] **Step 3: Add Homeroom deep link**

Use:

```js
window.location.hash = buildStudentSupportHash({
  studentRef: normalizeStudentRef(student),
  workspaceId,
  tab: 'student',
});
```

- [ ] **Step 4: Add Gradebook deep link**

Pass roster student identity and class/workspace id. If the roster student lacks a durable ref/code, open read-only Student Support with case creation disabled.

- [ ] **Step 5: Run focused E2E on desktop/mobile**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/studentSupport/StudentSupportStudentProfile.jsx src/pages/HomeroomWorkspace.jsx src/components/gradebook/GradebookWorkspace.jsx tests/e2e/student-support-center.spec.js
git commit -m "feat: add student 360 support profile"
```

---

### Task 9: Add teacher observations and deterministic alert evaluation

**Files:**
- Create: `src/components/studentSupport/StudentSupportObservationForm.jsx`
- Modify: `src/studentSupport/studentSupportApi.js`
- Modify: `src/studentSupport/studentSupportRules.js`
- Modify: `src/pages/StudentSupportCenter.jsx`
- Modify: `tests/unit/student-support-rules.test.mjs`
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Produces teacher observations and `evaluateAndPersistStudentAlerts({ user, studentRef, workspaceId })`.

- [ ] **Step 1: Add failing observation-count test**

Three `TASK_INCOMPLETE` observations inside 14 days must trigger exactly one alert; a fourth observation must update evidence on the same active alert.

- [ ] **Step 2: Implement observation form with fixed types**

Use constant values only:

```js
'TASK_INCOMPLETE'
'MATERIAL_NOT_PREPARED'
'CLASS_TASK_INCOMPLETE'
'LATE_ARRIVAL'
'ABSENCE_OBSERVED'
'POSITIVE_PROGRESS'
'GOOD_PARTICIPATION'
'HELPED_PEERS'
'OTHER_FACTUAL'
```

Fields: student, class, subject, date, period, type, factual note, visibility, submit-to-GVCN, request-follow-up.

- [ ] **Step 3: Implement deterministic evaluation flow**

`evaluateAndPersistStudentAlerts` must:

1. Load enabled rule rows.
2. Load factual source data.
3. Run `evaluateRules` pure functions.
4. Call `upsertEvaluatedAlert` for triggered results.
5. Resolve/leave untouched non-triggered alerts according to explicit lifecycle rules; never auto-open a support case.

- [ ] **Step 4: Ensure no free-text rule interpretation**

Rule configuration JSON must be validated by `rule_type`; user-entered text never becomes executable logic.

- [ ] **Step 5: Run unit + E2E tests**

```bash
npm run test:student-support
npx playwright test tests/e2e/student-support-center.spec.js --project=chromium-desktop
```

- [ ] **Step 6: Commit**

```bash
git add src/components/studentSupport/StudentSupportObservationForm.jsx src/studentSupport/studentSupportApi.js src/studentSupport/studentSupportRules.js src/pages/StudentSupportCenter.jsx tests/unit/student-support-rules.test.mjs tests/e2e/student-support-center.spec.js
git commit -m "feat: add teacher observations and alert evaluation"
```

---

### Task 10: Build support cases, actions, notes, family contacts, and timeline

**Files:**
- Create: `src/components/studentSupport/StudentSupportCases.jsx`
- Modify: `src/pages/StudentSupportCenter.jsx`
- Modify: `src/studentSupport/studentSupportApi.js`
- Modify: `tests/unit/student-support-api.test.mjs`
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Consumes lifecycle API.
- Produces complete human-controlled support workflow.

- [ ] **Step 1: Add failing E2E workflow**

Workflow:

```text
NEW alert -> teacher reviews -> create case -> REVIEWING -> add action -> ACTIVE -> mark action DONE -> FOLLOW_UP -> teacher records RESOLVED -> CLOSED
```

Assert every status change is initiated by an explicit button and no automatic case transition occurs on page reload.

- [ ] **Step 2: Build case creation form**

Required fields:

```js
studentRef, homeroomWorkspaceId, category, title, reason, goal, ownerId, followUpAt
```

Categories are the spec-defined fixed categories; no psychological diagnosis option.

- [ ] **Step 3: Build action management**

Action statuses:

```js
['TODO','IN_PROGRESS','DONE','CANCELLED']
```

Display due/overdue state based on time, but do not auto-complete/cancel.

- [ ] **Step 4: Build note visibility selector**

Display exact choices `PRIVATE`, `HOMEROOM`, `TEACHING_TEAM`, `MANAGEMENT`; rely on RLS for enforcement.

- [ ] **Step 5: Build family-contact log**

Contact methods and statuses are fixed values from the spec. No send button, SMS API, Zalo API, email automation, or generated parent message in V1.

- [ ] **Step 6: Build immutable timeline**

Timeline reads `student_support_case_events` and related factual event timestamps; there is no edit/delete button for event rows.

- [ ] **Step 7: Run tests**

Expected: workflow passes and role-scoped RLS prevents unauthorized rows.

- [ ] **Step 8: Commit**

```bash
git add src/components/studentSupport/StudentSupportCases.jsx src/pages/StudentSupportCenter.jsx src/studentSupport/studentSupportApi.js tests/unit/student-support-api.test.mjs tests/e2e/student-support-center.spec.js
git commit -m "feat: add student support case management"
```

---

### Task 11: Add notifications, due/overdue behavior, and rule settings

**Files:**
- Create: `src/studentSupport/studentSupportNotifications.js`
- Create: `src/components/studentSupport/StudentSupportRuleSettings.jsx`
- Modify: `src/pages/StudentSupportCenter.jsx`
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Produces `emitStudentSupportNotification(input)` using the existing `bes-global-notification` event.

- [ ] **Step 1: Write notification payload unit assertion inside API/rule tests**

Expected payload:

```js
{
  title: 'Student Support',
  message: 'Hồ sơ Nguyễn Văn A đến hạn kiểm tra lại.',
  target: '#/student-support?case=<id>&tab=cases',
  category: 'work',
  source: 'student-support',
  priority: 'normal',
}
```

- [ ] **Step 2: Implement fixed-template notification helper**

```js
window.dispatchEvent(new CustomEvent('bes-global-notification', { detail: payload }));
```

Never compose content through AI or external services.

- [ ] **Step 3: Add deterministic due/overdue selectors**

Selectors:

```js
isActionOverdue(action, now)
isCaseFollowUpDue(caseItem, now)
isAlertReviewOverdue(alert, now, thresholdDays)
```

These change labels/notifications only; they do not mutate outcomes.

- [ ] **Step 4: Build Admin rule settings**

Admin can enable/disable rules and edit numeric thresholds/window lengths through validated inputs. Non-admin users receive read-only or no access according to permission.

- [ ] **Step 5: Run E2E notification/rule-settings tests**

Expected: template notification appears in existing notification center; non-admin cannot edit rule settings.

- [ ] **Step 6: Commit**

```bash
git add src/studentSupport/studentSupportNotifications.js src/components/studentSupport/StudentSupportRuleSettings.jsx src/pages/StudentSupportCenter.jsx tests/e2e/student-support-center.spec.js
git commit -m "feat: add support reminders and rule settings"
```

---

### Task 12: Add aggregate reporting and exports

**Files:**
- Create: `src/studentSupport/studentSupportExports.js`
- Create: `src/components/studentSupport/StudentSupportReports.jsx`
- Modify: `src/pages/StudentSupportCenter.jsx`
- Modify: `tests/unit/student-support-api.test.mjs`
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Produces `buildSupportReport(rows, filters)`, `exportSupportReportPdf(report)`, `exportSupportReportExcel(report)`.

- [ ] **Step 1: Add failing report projection test**

```js
assert.deepEqual(buildSupportReport([
  { className: '12.6', status: 'ACTIVE', category: 'attendance' },
  { className: '12.6', status: 'CLOSED', category: 'academic' },
], { className: '12.6' }).summary, {
  total: 2,
  active: 1,
  closed: 1,
});
```

Report output must not contain private note bodies unless explicitly requested by an authorized detailed-case export path; V1 aggregate export omits them.

- [ ] **Step 2: Build on-screen reports**

Filters: class, grade, GVCN, month, semester, school year, status, category.

- [ ] **Step 3: Implement PDF/Excel export using existing repo export dependencies/patterns**

Export includes title, period, filters, summary counts, class/status/category tables, generated-at timestamp, and product footer. Do not export private notes.

- [ ] **Step 4: Run tests**

Expected: no private note text in generated aggregate dataset; downloads are produced.

- [ ] **Step 5: Commit**

```bash
git add src/studentSupport/studentSupportExports.js src/components/studentSupport/StudentSupportReports.jsx src/pages/StudentSupportCenter.jsx tests/unit/student-support-api.test.mjs tests/e2e/student-support-center.spec.js
git commit -m "feat: add student support reporting"
```

---

### Task 13: Add archive-first governance and deletion protection

**Files:**
- Modify: `src/studentSupport/studentSupportApi.js`
- Modify: `src/components/studentSupport/StudentSupportCases.jsx`
- Add migration if required by the existing governance integration: `supabase/migrations/20260915093000_student_support_archive_governance.sql`
- Modify: `tests/unit/student-support-api.test.mjs`
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Produces archive/restore and permanent-delete-request flow; no direct teacher hard delete.

- [ ] **Step 1: Add failing test that teacher delete maps to archive**

Assert the public API exposes `archiveSupportCase` but no `deleteSupportCaseDirect` function.

- [ ] **Step 2: Implement archive behavior**

Set `archived_at`, append event `CASE_ARCHIVED`, hide from default lists, allow authorized restore.

- [ ] **Step 3: Integrate permanent deletion with existing governance pattern**

If `deleted_items`/Data Governance can represent Student Support entities directly, register `entity_type='student_support_case'`. Otherwise add a narrowly-scoped archive request table/RPC matching the attendance archive approval sequence.

Permanent delete must require Admin approval and remove dependent actions/notes/events only in the reviewed deletion path.

- [ ] **Step 4: Run archive/restore E2E**

Expected: teacher sees archive/restore where authorized; no ordinary hard-delete button.

- [ ] **Step 5: Commit**

```bash
git add src/studentSupport/studentSupportApi.js src/components/studentSupport/StudentSupportCases.jsx supabase/migrations tests/unit/student-support-api.test.mjs tests/e2e/student-support-center.spec.js
git commit -m "feat: add student support archive governance"
```

---

### Task 14: Final security, no-AI, regression, and rollout verification

**Files:**
- Modify: `scripts/verify-student-support.mjs`
- Modify: `tests/e2e/student-support-center.spec.js`
- Modify: `package.json` only if final verification script needs composition

**Interfaces:**
- Produces a release gate for Student Support.

- [ ] **Step 1: Extend static verifier for all prohibited AI paths**

Fail if any file under `src/studentSupport` or `src/components/studentSupport` contains/imports:

```text
callAI
/api/ai
openrouter
embedding
semantic classifier
AI Admin Assistant helper imports
```

The word `AI` is allowed only in user-facing statements such as `Không AI` and comments explaining prohibition; verifier should target executable imports/endpoints, not harmless copy.

- [ ] **Step 2: Verify RLS/security in development Supabase**

Run:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname='public' and tablename like 'student_support_%';
```

Expected: `rowsecurity = true` for every Student Support table.

Run Supabase security and performance advisors and fix any new Student Support finding before rollout.

- [ ] **Step 3: Run focused verification**

```bash
npm run verify:student-support
npm run build
npx playwright test tests/e2e/student-support-center.spec.js --project=chromium-desktop
npx playwright test tests/e2e/student-support-center.spec.js --project=mobile-chromium
npx playwright test tests/e2e/student-support-center.spec.js --project=webkit-desktop
```

Expected: PASS.

- [ ] **Step 4: Run repository regression gates**

```bash
npm test
npm run test:e2e:contracts
npm run audit:budget
npm run test:v11.6.7
```

Expected: PASS with no regression to Homeroom, Gradebook, Attendance, app visibility, or permissions.

- [ ] **Step 5: Deploy migrations in controlled order**

Order:

```text
1. 20260915090000_student_support_core.sql
2. 20260915091000_student_support_rls.sql
3. 20260915092000_student_support_seed_rules.sql
4. optional archive-governance migration if Task 13 required it
```

After each production migration, run a read-only verification query before continuing.

- [ ] **Step 6: Deploy frontend behind normal permission/app visibility controls**

Initial production rollout:

```text
Admin: enabled
Department head: permission-controlled
GVCN/Teacher: permission-controlled
Student: denied
Family portal: denied
```

Do not seed hidden status automatically unless the product owner explicitly asks; the existing Hidden Apps Vault remains the control point.

- [ ] **Step 7: Production smoke verification**

Verify:

```text
Admin can open #/student-support.
Unauthorized user receives AccessDenied.
GVCN sees only own homeroom scope.
Subject teacher can submit observation only for assigned class.
Student 360 reads Attendance/Gradebook without modifying source data.
A 3-in-14 absence rule produces one explainable alert, not duplicates.
No case opens automatically.
No family message sends automatically.
No AI/API/model request occurs while using any Student Support screen.
Archive does not hard-delete immediately.
```

- [ ] **Step 8: Commit final verification changes**

```bash
git add scripts/verify-student-support.mjs tests/e2e/student-support-center.spec.js package.json
git commit -m "test: harden student support release gate"
```

---

## Recommended PR Sequence

1. **PR A — Data foundation:** Tasks 1–3. Schema, RLS, seed rules, rule unit tests.
2. **PR B — Route + sources:** Tasks 4–7. Identity/source adapters, API, route/permission, overview/alerts UI.
3. **PR C — Student workflow:** Tasks 8–11. Student 360, observations, alert evaluation, cases, notifications, rule settings.
4. **PR D — Reporting + governance:** Tasks 12–13. Reports/exports and archive-first governance.
5. **PR E — Release hardening:** Task 14. Full regression/security/no-AI verification and production rollout.

Each PR must be independently reviewable and must not merge if its focused tests fail.

## Definition of Done

Student Support Center is complete only when all of the following are true:

- `#/student-support` renders and is governed by `route:student-support` plus existing app visibility.
- Admin/GVCN/subject-teacher scopes are enforced by RLS, not only by UI filtering.
- Student 360 composes existing Attendance/Gradebook/Homeroom data without duplicating source records.
- Deterministic attendance/grade/observation rules show exact evidence and do not produce duplicate active alerts.
- Alert review never automatically opens a support case.
- Case lifecycle, support actions, follow-up, notes, family-contact log, and immutable timeline work end to end.
- Private note visibility is enforced by database policy.
- Family/student portal receives no internal Student Support data in V1.
- Aggregate reports omit private notes and export successfully.
- Archive-first deletion works and ordinary teachers cannot hard-delete cases.
- `npm run verify:student-support`, build, Student Support E2E across desktop/mobile, no-AI audit, smoke tests, and repository contract tests all pass.
- Production smoke testing confirms there are no AI/model/API calls from Student Support usage.
