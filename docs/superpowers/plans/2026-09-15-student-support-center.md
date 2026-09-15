# Student Support Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, non-AI Student Support Center at `#/student-support` that composes existing Attendance, Gradebook, Homeroom, teaching-assignment, and notification data into a deterministic support workflow for alerts, human review, support cases, follow-up, reporting, and audit.

**Architecture:** Student Support is a new domain under `src/studentSupport/`. Attendance, grades, class membership, teacher assignments, and existing family-contact facts remain owned by their current modules; Student Support stores only rules, alerts, cases, actions, notes, teacher observations, support-specific family contacts, and immutable case events. The durable cross-module identity is existing `student_ref` when present, otherwise the existing student code normalized as `code:<value>`; a new student master table is explicitly forbidden.

**Tech Stack:** React 18, Vite, Supabase/PostgreSQL + RLS, existing Brian permission framework, existing `bes-global-notification` event bus, Node `node:test`, Playwright, existing browser-side export libraries.

**Spec:** `docs/superpowers/specs/2026-09-15-student-support-center-design.md`

## Global Constraints

- No AI/LLM/model/embedding/semantic-classifier call is allowed anywhere in Student Support.
- Alerts must come only from deterministic rules with visible evidence and formulas.
- Teachers make every case-opening, follow-up, resolution, and closure decision.
- Attendance, Gradebook, Homeroom, teaching assignments, and existing parent-contact data are read-only sources for this feature.
- Subject teachers may access only assigned classes; GVCN may manage only owned homeroom workspaces; Admin may access all; Department Head may access only workspaces whose owners are teachers in `department_teacher_sync` rows where `department_head_id = auth.uid()`.
- RLS, not React filtering, enforces access and note visibility.
- Student/family portal users have no Student Support access in V1.
- No automatic family/student messaging in V1.
- Archive-first deletion is mandatory; hard deletion is Admin-governed through existing `deleted_items` governance.
- Desktop/mobile/tablet workflows must not require horizontal scrolling for critical actions.
- Route permission is `route:student-support`; existing app visibility remains active.
- Student Support code must pass `scripts/audit-no-ai.mjs` and its dedicated verifier.

---

## File Map

### Create

- `src/studentSupport/studentSupportConstants.js`
- `src/studentSupport/studentSupportIdentity.js`
- `src/studentSupport/studentSupportRules.js`
- `src/studentSupport/studentSupportApi.js`
- `src/studentSupport/studentSupportSources.js`
- `src/studentSupport/studentSupportNotifications.js`
- `src/studentSupport/studentSupportExports.js`
- `src/pages/StudentSupportCenter.jsx`
- `src/pages/StudentSupportCenter.css`
- `src/components/studentSupport/StudentSupportOverview.jsx`
- `src/components/studentSupport/StudentSupportAlertQueue.jsx`
- `src/components/studentSupport/StudentSupportStudentProfile.jsx`
- `src/components/studentSupport/StudentSupportCases.jsx`
- `src/components/studentSupport/StudentSupportObservationForm.jsx`
- `src/components/studentSupport/StudentSupportRuleSettings.jsx`
- `src/components/studentSupport/StudentSupportReports.jsx`
- `supabase/migrations/20260915090000_student_support_core.sql`
- `supabase/migrations/20260915091000_student_support_rls.sql`
- `supabase/migrations/20260915092000_student_support_seed_rules.sql`
- `supabase/migrations/20260915093000_student_support_archive_governance.sql`
- `tests/unit/student-support-rules.test.mjs`
- `tests/unit/student-support-identity.test.mjs`
- `tests/unit/student-support-api.test.mjs`
- `tests/e2e/student-support-center.spec.js`
- `scripts/verify-student-support.mjs`

### Modify

- `src/main.jsx`
- `src/data/apps.js`
- `src/utils/permissions.js`
- `src/utils/supabase.js`
- `src/components/homeroom/HomeroomCoreTabs.jsx`
- `src/components/gradebook/GradebookWorkspace.jsx`
- `scripts/audit-no-ai.mjs`
- `package.json`

---

### Task 1: Create the Student Support database schema

**Files:**
- Create: `supabase/migrations/20260915090000_student_support_core.sql`

**Interfaces:**
- Produces eight tables: `student_support_rules`, `student_support_alerts`, `student_support_cases`, `student_support_actions`, `student_support_notes`, `student_support_teacher_observations`, `student_support_family_contacts`, `student_support_case_events`.

- [ ] **Step 1: Run the pre-migration failing inventory query**

```sql
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'student_support_rules','student_support_alerts','student_support_cases','student_support_actions',
    'student_support_notes','student_support_teacher_observations','student_support_family_contacts','student_support_case_events'
  );
```

Expected before migration: fewer than 8 rows.

- [ ] **Step 2: Create the tables with explicit constraints**

Use `student_ref text not null`, `homeroom_workspace_id text not null`, and existing user UUIDs. Case status:

```sql
check (status in ('NEW','REVIEWING','ACTIVE','FOLLOW_UP','RESOLVED','CLOSED','NO_ACTION_REQUIRED'))
```

Alert status:

```sql
check (status in ('NEW','REVIEWING','LINKED_TO_CASE','NO_ACTION_REQUIRED','RESOLVED','ARCHIVED'))
```

Action status:

```sql
check (status in ('TODO','IN_PROGRESS','DONE','CANCELLED'))
```

Note visibility:

```sql
check (visibility_scope in ('PRIVATE','HOMEROOM','TEACHING_TEAM','MANAGEMENT'))
```

Teacher observations store `source_class_name`, `source_workspace_id`, `teacher_id`, `subject_name`, `observation_type`, `observation_date`, `period_label`, `body`, `submitted_to_homeroom`, `follow_up_requested`, and `visibility_scope`.

- [ ] **Step 3: Add indexes and duplicate-alert protection**

```sql
create unique index student_support_alerts_active_dedupe_idx
on public.student_support_alerts(dedupe_key)
where archived_at is null and status in ('NEW','REVIEWING','LINKED_TO_CASE');

create index student_support_cases_workspace_idx
on public.student_support_cases(homeroom_workspace_id,status,updated_at desc);

create index student_support_actions_due_idx
on public.student_support_actions(assigned_to,due_at)
where status not in ('DONE','CANCELLED');
```

- [ ] **Step 4: Apply on a Supabase development branch and re-run inventory**

Expected: exactly 8 tables.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260915090000_student_support_core.sql
git commit -m "feat: add student support data model"
```

---

### Task 2: Enforce RLS and role/class scope

**Files:**
- Create: `supabase/migrations/20260915091000_student_support_rls.sql`

**Interfaces:**
- Consumes: `public.is_admin()`, `public.bes_v1099_current_role(auth.uid())`, `public.bes_has_any_class_assignment(text)`, `bes_homeroom_workspaces.owner_id`, `department_teacher_sync`.

- [ ] **Step 1: Run the pre-migration policy query**

```sql
select tablename,policyname,cmd
from pg_policies
where schemaname='public' and tablename like 'student_support_%';
```

Expected: incomplete/no policy set.

- [ ] **Step 2: Enable RLS on all eight tables**

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

- [ ] **Step 3: Implement the exact homeroom/admin/department-head scope predicate**

For rows containing `homeroom_workspace_id`, access is true when any branch matches:

```sql
public.is_admin()
or exists (
  select 1 from public.bes_homeroom_workspaces w
  where w.workspace_id = homeroom_workspace_id
    and w.owner_id = auth.uid()
    and w.archived_at is null
)
or exists (
  select 1
  from public.bes_homeroom_workspaces w
  join public.department_teacher_sync d on d.teacher_id = w.owner_id
  where w.workspace_id = homeroom_workspace_id
    and d.department_head_id = auth.uid()
    and w.archived_at is null
)
```

- [ ] **Step 4: Implement subject-teacher observation scope**

Insert requires:

```sql
teacher_id = auth.uid()
and public.bes_has_any_class_assignment(source_class_name)
```

Observation author may read own rows. Owning GVCN/Admin/Department Head may read submitted rows in scope.

- [ ] **Step 5: Enforce note visibility in RLS**

`PRIVATE`: author/Admin only. `HOMEROOM`: author + owning GVCN + Admin. `TEACHING_TEAM`: author + owning GVCN + assigned subject teacher + Admin. `MANAGEMENT`: author + owning GVCN + matching Department Head + Admin.

- [ ] **Step 6: Make case events append-only**

Create select/insert policies only; no update/delete policies.

- [ ] **Step 7: Verify outsider teacher denial and run Supabase security advisors**

Expected: an unassigned teacher reads zero rows for another class; no new missing-RLS findings.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260915091000_student_support_rls.sql
git commit -m "feat: secure student support with RLS"
```

---

### Task 3: Implement deterministic rule engine and seed rules

**Files:**
- Create: `src/studentSupport/studentSupportConstants.js`
- Create: `src/studentSupport/studentSupportRules.js`
- Create: `tests/unit/student-support-rules.test.mjs`
- Create: `supabase/migrations/20260915092000_student_support_seed_rules.sql`

**Interfaces:**
- Produces: `evaluateRule(rule,facts,now)`, `evaluateRules(rules,factsByStudent,now)`, `makeAlertDedupeKey(rule,studentRef,windowStart,windowEnd)`.

- [ ] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRule, makeAlertDedupeKey } from '../../src/studentSupport/studentSupportRules.js';

test('3 absences in 14 days triggers', () => {
  const rule={id:'r1',version:1,code:'absence_3_in_14d',ruleType:'attendance_count',config:{status:'absent',threshold:3,days:14}};
  const facts={attendance:[
    {date:'2026-09-03',status:'absent'},
    {date:'2026-09-08',status:'absent'},
    {date:'2026-09-14',status:'absent'},
  ]};
  assert.equal(evaluateRule(rule,facts,new Date('2026-09-15T00:00:00Z')).triggered,true);
});

test('insufficient grade samples cannot trigger', () => {
  const rule={id:'r2',version:1,code:'grade_drop',ruleType:'grade_window_drop',config:{sampleSize:3,delta:1}};
  const result=evaluateRule(rule,{grades:[{score:5}]},new Date('2026-09-15T00:00:00Z'));
  assert.equal(result.triggered,false);
  assert.equal(result.evidence.reason,'insufficient_data');
});
```

- [ ] **Step 2: Run test and confirm failure**

```bash
node --test tests/unit/student-support-rules.test.mjs
```

- [ ] **Step 3: Implement only these V1 rule types**

```js
export const STUDENT_SUPPORT_RULE_TYPES = Object.freeze([
  'attendance_count','grade_window_drop','consecutive_scores_below','observation_count','combined_all',
]);
```

No free-text interpretation is allowed.

- [ ] **Step 4: Seed fixed-code default rules**

Seed `absence_3_in_14d`, `absence_5_in_30d`, `late_3_in_14d`, disabled `grade_drop_3v3_1point`, and disabled `incomplete_3_in_14d` with JSON numeric configs.

- [ ] **Step 5: Run test and commit**

```bash
node --test tests/unit/student-support-rules.test.mjs
git add src/studentSupport supabase/migrations/20260915092000_student_support_seed_rules.sql tests/unit/student-support-rules.test.mjs
git commit -m "feat: add deterministic student support rules"
```

---

### Task 4: Normalize student identity and build read-only source adapters

**Files:**
- Create: `src/studentSupport/studentSupportIdentity.js`
- Create: `src/studentSupport/studentSupportSources.js`
- Create: `tests/unit/student-support-identity.test.mjs`
- Modify: `src/utils/supabase.js`

**Interfaces:**
- Produces: `normalizeStudentRef(student)`, `parseStudentSupportHash(hash)`, `buildStudentSupportHash(input)`, `loadStudentSupportScope(user)`, `loadStudent360Facts(input)`.

- [ ] **Step 1: Write failing identity tests**

```js
assert.equal(normalizeStudentRef({studentRef:'HS-1',code:'001'}),'HS-1');
assert.equal(normalizeStudentRef({code:'001'}),'code:001');
assert.equal(normalizeStudentRef({fullName:'No id'}),'');
```

Case creation is disabled when `normalizeStudentRef()` returns empty.

- [ ] **Step 2: Implement deep-link round trip**

```js
buildStudentSupportHash({studentRef:'HS-1',workspaceId:'12.6',tab:'student'})
// => #/student-support?student=HS-1&workspace=12.6&tab=student
```

- [ ] **Step 3: Implement Student 360 facts**

Return:

```js
{
  student:{studentRef,code,fullName,className,workspaceId,schoolYear,grade},
  attendance:[{date,status,sessionName,source}],
  grades:[{date,score,subject,assessmentType,source}],
  observations:[],
  assignmentScope:{isHomeroomOwner,subjectClasses:[]},
}
```

Official attendance comes from `bes_homeroom_attendance`; grades come from `bes_homeroom_learning_records` plus Gradebook read helpers. Supplemental attendance is included only when existing student code/canonical key matches the same identity.

- [ ] **Step 4: Add short Student Support read-cache TTLs**

Add 5-minute TTL for alerts/cases/actions and 30-minute TTL for rules in `src/utils/supabase.js`.

- [ ] **Step 5: Run tests and commit**

```bash
node --test tests/unit/student-support-identity.test.mjs
npm test
git add src/studentSupport/studentSupportIdentity.js src/studentSupport/studentSupportSources.js src/utils/supabase.js tests/unit/student-support-identity.test.mjs
git commit -m "feat: connect student support source data"
```

---

### Task 5: Implement workflow API and lifecycle validation

**Files:**
- Create: `src/studentSupport/studentSupportApi.js`
- Create: `tests/unit/student-support-api.test.mjs`

**Interfaces:**
- Produces: `listSupportAlerts`, `upsertEvaluatedAlert`, `reviewAlert`, `listSupportCases`, `createSupportCase`, `transitionSupportCase`, `createSupportAction`, `updateSupportAction`, `createSupportNote`, `createTeacherObservation`, `createFamilyContact`, `appendCaseEvent`, `archiveSupportCase`, `restoreSupportCase`.

- [ ] **Step 1: Write failing lifecycle tests**

```js
assert.equal(canTransitionCase('NEW','CLOSED'),false);
assert.equal(canTransitionCase('ACTIVE','FOLLOW_UP'),true);
assert.throws(()=>validateObservationInput({observationType:'TASK_INCOMPLETE'}),/student/i);
```

- [ ] **Step 2: Implement exact transitions**

```js
export const CASE_TRANSITIONS=Object.freeze({
  NEW:['REVIEWING','NO_ACTION_REQUIRED'],
  REVIEWING:['ACTIVE','NO_ACTION_REQUIRED'],
  ACTIVE:['FOLLOW_UP','RESOLVED'],
  FOLLOW_UP:['ACTIVE','RESOLVED'],
  RESOLVED:['CLOSED','ACTIVE'],
  CLOSED:[],
  NO_ACTION_REQUIRED:[],
});
```

Every case transition appends one immutable `student_support_case_events` row.

- [ ] **Step 3: Implement duplicate-safe alert upsert by `dedupe_key`**

A fourth absence updates the existing active 3-in-14 alert evidence; it does not insert a second active alert.

- [ ] **Step 4: Run tests and commit**

```bash
node --test tests/unit/student-support-api.test.mjs
git add src/studentSupport/studentSupportApi.js tests/unit/student-support-api.test.mjs
git commit -m "feat: add student support workflow API"
```

---

### Task 6: Register the route, permission, launcher, page stub, and no-AI verifier

**Files:**
- Create: `src/pages/StudentSupportCenter.jsx`
- Create: `src/pages/StudentSupportCenter.css`
- Create: `scripts/verify-student-support.mjs`
- Modify: `src/main.jsx`
- Modify: `src/data/apps.js`
- Modify: `src/utils/permissions.js`
- Modify: `scripts/audit-no-ai.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces `#/student-support`, `route:student-support`, launcher card, initial protected page shell.

- [ ] **Step 1: Write verifier first and confirm it fails**

Verifier asserts:

```js
assert(main.includes("currentRoute === 'student-support'"));
assert(apps.includes("slug: 'student-support'"));
assert(permissions.includes("'student-support': 'route:student-support'"));
```

It also scans `src/studentSupport`, `src/components/studentSupport`, and `src/pages/StudentSupportCenter.jsx` for executable references to `callAI`, `/api/ai`, `openrouter`, embedding providers, or AI-provider imports.

- [ ] **Step 2: Add launcher card**

```js
{
  slug:'student-support',route:'student-support',icon:'SS',tone:'mint',
  group:'School Management',groupVi:'Hỗ trợ học sinh',
  title:'Student Support Center',titleVi:'Trung tâm Hỗ trợ Học sinh',
  desc:'Review factual school signals, coordinate support actions and follow up student progress.',
  descVi:'Tổng hợp tín hiệu thực tế, phối hợp hỗ trợ và theo dõi tiến trình học sinh.',
  status:'Rule-based · Human-reviewed · No AI',statusVi:'Theo quy tắc · Giáo viên duyệt · Không AI',
  api:true,featured:true,
}
```

- [ ] **Step 3: Add permission and route render**

Add:

```js
'student-support':'route:student-support'
```

Add a `CORE_PERMISSION_ITEMS` entry, lazy import, `ROUTES` item, design profile, and render branch.

- [ ] **Step 4: Create the minimal protected page stub**

```jsx
export default function StudentSupportCenter(){
  return <main className="student-support-center"><h1>Trung tâm Hỗ trợ Học sinh</h1></main>;
}
```

Task 7 expands this file rather than recreating it.

- [ ] **Step 5: Add npm scripts and run verifier**

```json
"test:student-support":"node --test tests/unit/student-support-*.test.mjs",
"verify:student-support":"node scripts/verify-student-support.mjs && npm run test:student-support && npm run test:v11.6.7"
```

Run:

```bash
node scripts/verify-student-support.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main.jsx src/data/apps.js src/utils/permissions.js src/pages/StudentSupportCenter.jsx src/pages/StudentSupportCenter.css scripts/verify-student-support.mjs scripts/audit-no-ai.mjs package.json
git commit -m "feat: register student support center"
```

---

### Task 7: Build Overview and alert work queue

**Files:**
- Modify: `src/pages/StudentSupportCenter.jsx`
- Modify: `src/pages/StudentSupportCenter.css`
- Create: `src/components/studentSupport/StudentSupportOverview.jsx`
- Create: `src/components/studentSupport/StudentSupportAlertQueue.jsx`
- Create: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Consumes API alert/case lists.
- Produces tabs `overview`, `alerts`, `student`, `cases`, `observations`, `rules`, `reports`.

- [ ] **Step 1: Write failing Playwright tests for protected route and 390px overflow**

```js
await page.goto('/#/student-support');
await expect(page.locator('main.student-support-center')).toBeVisible();
await expect(page.getByRole('heading',{name:/Trung tâm Hỗ trợ Học sinh/i})).toBeVisible();
```

At 390px, `document.documentElement.scrollWidth` must not exceed `clientWidth`.

- [ ] **Step 2: Implement explicit loading/error/empty states and summary counts**

Counts are calculated from scoped rows only: monitored students, new alerts, active cases, follow-up due, resolved, closed.

- [ ] **Step 3: Implement filters**

Grade, class, GVCN, subject teacher, alert type, case status, date range, overdue-only.

- [ ] **Step 4: Use responsive cards below tablet width**

Critical actions remain reachable without a wide table.

- [ ] **Step 5: Build and run desktop/mobile E2E**

```bash
npm run build
npx playwright test tests/e2e/student-support-center.spec.js --project=chromium-desktop
npx playwright test tests/e2e/student-support-center.spec.js --project=mobile-chromium
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/StudentSupportCenter.jsx src/pages/StudentSupportCenter.css src/components/studentSupport tests/e2e/student-support-center.spec.js
git commit -m "feat: add student support dashboard and alerts"
```

---

### Task 8: Build Student 360 and exact deep links from Homeroom/Gradebook

**Files:**
- Create: `src/components/studentSupport/StudentSupportStudentProfile.jsx`
- Modify: `src/components/homeroom/HomeroomCoreTabs.jsx`
- Modify: `src/components/gradebook/GradebookWorkspace.jsx`
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Consumes: `loadStudent360Facts`, `normalizeStudentRef`, `buildStudentSupportHash`.

- [ ] **Step 1: Add failing E2E for Homeroom student deep link**

The student row action must navigate to:

```text
#/student-support?student=<encoded-ref>&workspace=<encoded-workspace>&tab=student
```

- [ ] **Step 2: Build Student 360 sections**

General information, attendance, grades, teacher observations, open alerts, support cases, support timeline. Grade trend shows explicit comparison windows; no prediction/risk score.

- [ ] **Step 3: Add `Xem hồ sơ hỗ trợ` to `StudentsTab` in `HomeroomCoreTabs.jsx`**

Use existing `workspace.id` and the selected student identity.

- [ ] **Step 4: Add the same deep link to Gradebook roster actions in `GradebookWorkspace.jsx`**

Case creation is disabled if neither durable `student_ref` nor student code exists.

- [ ] **Step 5: Run E2E and commit**

```bash
npx playwright test tests/e2e/student-support-center.spec.js --project=chromium-desktop
git add src/components/studentSupport/StudentSupportStudentProfile.jsx src/components/homeroom/HomeroomCoreTabs.jsx src/components/gradebook/GradebookWorkspace.jsx tests/e2e/student-support-center.spec.js
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
- Produces `evaluateAndPersistStudentAlerts({user,studentRef,workspaceId})`.

- [ ] **Step 1: Add test: three `TASK_INCOMPLETE` observations in 14 days trigger one alert; fourth updates same alert**

- [ ] **Step 2: Implement fixed observation types**

```js
['TASK_INCOMPLETE','MATERIAL_NOT_PREPARED','CLASS_TASK_INCOMPLETE','LATE_ARRIVAL','ABSENCE_OBSERVED','POSITIVE_PROGRESS','GOOD_PARTICIPATION','HELPED_PEERS','OTHER_FACTUAL']
```

- [ ] **Step 3: Implement evaluation sequence**

```text
load enabled rules -> load factual sources -> pure evaluateRules -> upsert triggered alerts -> never open a case automatically
```

- [ ] **Step 4: Run unit/E2E and commit**

```bash
npm run test:student-support
npx playwright test tests/e2e/student-support-center.spec.js --project=chromium-desktop
git add src/components/studentSupport/StudentSupportObservationForm.jsx src/studentSupport src/pages/StudentSupportCenter.jsx tests
git commit -m "feat: add teacher observations and alert evaluation"
```

---

### Task 10: Build support cases, actions, notes, family-contact log, and timeline

**Files:**
- Create: `src/components/studentSupport/StudentSupportCases.jsx`
- Modify: `src/pages/StudentSupportCenter.jsx`
- Modify: `src/studentSupport/studentSupportApi.js`
- Modify: `tests/unit/student-support-api.test.mjs`
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Produces complete human-controlled workflow.

- [ ] **Step 1: Add failing E2E lifecycle**

```text
alert reviewed -> create case -> REVIEWING -> add action -> ACTIVE -> action DONE -> FOLLOW_UP -> teacher chooses RESOLVED -> teacher chooses CLOSED
```

Reloading the page must never advance status automatically.

- [ ] **Step 2: Build case form with fixed categories from the spec**

No psychological-diagnosis category.

- [ ] **Step 3: Build action management with `TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`**

Overdue is display-only and does not auto-transition.

- [ ] **Step 4: Build RLS-backed note visibility selector**

Exact choices: `PRIVATE`, `HOMEROOM`, `TEACHING_TEAM`, `MANAGEMENT`.

- [ ] **Step 5: Build family-contact log without send actions**

Phone, in-person, message, parent meeting, other; statuses completed/could-not-reach/responded/follow-up-required. Do not integrate SMS/Zalo/email sending.

- [ ] **Step 6: Build immutable case timeline**

No event edit/delete controls.

- [ ] **Step 7: Run tests and commit**

```bash
npm run test:student-support
npx playwright test tests/e2e/student-support-center.spec.js --project=chromium-desktop
git add src/components/studentSupport/StudentSupportCases.jsx src/pages/StudentSupportCenter.jsx src/studentSupport/studentSupportApi.js tests
git commit -m "feat: add student support case management"
```

---

### Task 11: Add fixed-template notifications, overdue selectors, and Admin rule settings

**Files:**
- Create: `src/studentSupport/studentSupportNotifications.js`
- Create: `src/components/studentSupport/StudentSupportRuleSettings.jsx`
- Modify: `src/pages/StudentSupportCenter.jsx`
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Produces `emitStudentSupportNotification(input)`, `isActionOverdue`, `isCaseFollowUpDue`, `isAlertReviewOverdue`.

- [ ] **Step 1: Implement notification helper using existing event bus**

```js
window.dispatchEvent(new CustomEvent('bes-global-notification',{detail:{
  title:'Student Support',message,target,category:'work',source:'student-support',priority:'normal'
}}));
```

Messages come from fixed templates only.

- [ ] **Step 2: Implement deterministic due/overdue functions**

They only affect labels/notifications, never student data or case outcomes.

- [ ] **Step 3: Build Admin numeric rule settings**

Admin can enable/disable and edit validated threshold/window numbers. Non-admin cannot edit.

- [ ] **Step 4: Run E2E and commit**

```bash
npx playwright test tests/e2e/student-support-center.spec.js --project=chromium-desktop
git add src/studentSupport/studentSupportNotifications.js src/components/studentSupport/StudentSupportRuleSettings.jsx src/pages/StudentSupportCenter.jsx tests/e2e/student-support-center.spec.js
git commit -m "feat: add support reminders and rule settings"
```

---

### Task 12: Add aggregate reports and PDF/Excel export

**Files:**
- Create: `src/studentSupport/studentSupportExports.js`
- Create: `src/components/studentSupport/StudentSupportReports.jsx`
- Modify: `src/pages/StudentSupportCenter.jsx`
- Modify: `tests/unit/student-support-api.test.mjs`
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Produces `buildSupportReport(rows,filters)`, `exportSupportReportPdf(report)`, `exportSupportReportExcel(report)`.

- [ ] **Step 1: Add failing projection test**

Two 12.6 cases (`ACTIVE`, `CLOSED`) must return `{total:2,active:1,closed:1}` and no private note body.

- [ ] **Step 2: Build report filters**

Class, grade, GVCN, month, semester, school year, status, category.

- [ ] **Step 3: Export aggregate datasets using existing repo export patterns**

Include title, period, filters, summary, grouped tables, generated timestamp, product footer. Omit private notes.

- [ ] **Step 4: Run tests and commit**

```bash
npm run test:student-support
git add src/studentSupport/studentSupportExports.js src/components/studentSupport/StudentSupportReports.jsx src/pages/StudentSupportCenter.jsx tests
git commit -m "feat: add student support reporting"
```

---

### Task 13: Integrate archive-first deletion with Data Governance

**Files:**
- Create: `supabase/migrations/20260915093000_student_support_archive_governance.sql`
- Modify: `src/studentSupport/studentSupportApi.js`
- Modify: `src/components/studentSupport/StudentSupportCases.jsx`
- Modify: `tests/unit/student-support-api.test.mjs`
- Modify: `tests/e2e/student-support-center.spec.js`

**Interfaces:**
- Reuses existing `deleted_items(id,entity_type,entity_id,title,source_module,deleted_by,payload,restore_payload,status,expires_at,...)`.

- [ ] **Step 1: Add test proving the public API exposes archive/restore but no ordinary hard-delete function**

- [ ] **Step 2: Implement archive transaction/RPC**

Archive sets `student_support_cases.archived_at`, writes event `CASE_ARCHIVED`, and inserts one `deleted_items` row:

```text
entity_type = student_support_case
entity_id = <case uuid as text>
source_module = student-support
status = trashed
payload = complete case/actions/notes/contact snapshot needed for governance review
restore_payload = identifiers/state required to restore
```

- [ ] **Step 3: Implement restore**

Restore clears `archived_at`, restores active status from snapshot, marks `deleted_items.status='restored'`, and appends `CASE_RESTORED`.

- [ ] **Step 4: Keep permanent deletion Admin-only through existing Data Governance**

No teacher-facing hard-delete button and no direct `delete from student_support_cases` call in React/API code.

- [ ] **Step 5: Run archive/restore tests and commit**

```bash
npm run test:student-support
npx playwright test tests/e2e/student-support-center.spec.js --project=chromium-desktop
git add supabase/migrations/20260915093000_student_support_archive_governance.sql src/studentSupport/studentSupportApi.js src/components/studentSupport/StudentSupportCases.jsx tests
git commit -m "feat: add student support archive governance"
```

---

### Task 14: Final no-AI, security, responsive, regression, and rollout gate

**Files:**
- Modify: `scripts/verify-student-support.mjs`
- Modify: `tests/e2e/student-support-center.spec.js`
- Modify: `package.json` if final script composition changes

**Interfaces:**
- Produces the release gate.

- [ ] **Step 1: Make verifier fail on executable AI dependencies**

Scan Student Support source for imports/endpoints containing `callAI`, `/api/ai`, `openrouter`, embedding-provider modules, or AI-provider helpers. The phrase `Không AI` in copy is allowed.

- [ ] **Step 2: Verify all Student Support tables have RLS**

```sql
select tablename,rowsecurity
from pg_tables
where schemaname='public' and tablename like 'student_support_%';
```

Expected: every row `true`.

- [ ] **Step 3: Run Supabase security/performance advisors**

Fix every new finding caused by Student Support before rollout.

- [ ] **Step 4: Run focused release checks**

```bash
npm run verify:student-support
npm run build
npx playwright test tests/e2e/student-support-center.spec.js --project=chromium-desktop
npx playwright test tests/e2e/student-support-center.spec.js --project=mobile-chromium
npx playwright test tests/e2e/student-support-center.spec.js --project=webkit-desktop
```

- [ ] **Step 5: Run repository regression checks**

```bash
npm test
npm run test:e2e:contracts
npm run audit:budget
npm run test:v11.6.7
```

- [ ] **Step 6: Deploy migrations in exact order**

```text
20260915090000_student_support_core.sql
20260915091000_student_support_rls.sql
20260915092000_student_support_seed_rules.sql
20260915093000_student_support_archive_governance.sql
```

Run read-only verification after each migration.

- [ ] **Step 7: Production smoke test**

Verify all of these facts:

```text
Admin opens #/student-support.
Unauthorized accounts receive AccessDenied.
GVCN sees only owned homeroom scope.
Department Head sees only teachers/classes in their department sync scope.
Subject teacher can submit observation only for an assigned class.
Student 360 reads Attendance/Gradebook without modifying them.
3 absences in 14 days create one explainable alert; a fourth updates that alert.
No alert automatically opens a case.
No case automatically changes outcome.
No family message sends automatically.
No AI/model/API request occurs from any Student Support screen.
Archive does not hard-delete immediately.
```

- [ ] **Step 8: Commit final gate**

```bash
git add scripts/verify-student-support.mjs tests/e2e/student-support-center.spec.js package.json
git commit -m "test: harden student support release gate"
```

---

## PR Sequence

1. **PR A — Data foundation:** Tasks 1–3.
2. **PR B — Sources + route + overview:** Tasks 4–7.
3. **PR C — Student workflow:** Tasks 8–11.
4. **PR D — Reporting + governance:** Tasks 12–13.
5. **PR E — Release hardening:** Task 14.

Each PR is independently reviewable and must not merge with failing focused tests.

## Definition of Done

- Route, launcher, app visibility, and `route:student-support` permission work.
- RLS enforces Admin/Department Head/GVCN/subject-teacher scope.
- Student 360 composes existing source data without copying source records.
- Rules are deterministic, explainable, and duplicate-safe.
- Alert review never auto-opens a case.
- Cases/actions/follow-up/notes/family-contact log/timeline work end to end.
- Private note visibility is enforced in Postgres.
- Student/family portal receives no internal Student Support data in V1.
- Aggregate exports omit private notes.
- Archive-first deletion uses existing `deleted_items` governance.
- `verify:student-support`, build, focused E2E, no-AI audit, smoke tests, and repository regression checks all pass.
- Production smoke confirms zero AI/model/API calls from Student Support usage.
