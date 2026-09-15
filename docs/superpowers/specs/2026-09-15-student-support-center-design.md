# Student Support Center — Design Specification

Date: 2026-09-15
Status: Approved for implementation planning
Route: `#/student-support`
Product name: **Student Support Center / Trung tâm Hỗ trợ Học sinh**

## 1. Purpose

Student Support Center is a school-facing support workflow that consolidates objective student information from existing Brian English Studio modules and helps teachers manage follow-up actions in one place.

The system must not diagnose students, infer psychology, assign behavioral risk labels, or make autonomous decisions. It only surfaces rule-based signals from factual school data and records human decisions and follow-up work.

The core workflow is:

`Attendance / Gradebook / Homeroom / Teacher observations -> deterministic rules -> alert -> teacher review -> support case -> actions -> follow-up -> closure`

## 2. Non-AI requirement

This feature must be implemented without AI or machine-learning services.

Prohibited in V1:

- AI-generated risk scores.
- AI-generated psychological, behavioral, or personality assessments.
- AI-generated comments or intervention plans.
- AI predictions of academic failure or dropout.
- AI-generated parent messages.
- AI-assisted automatic case opening or closing.
- LLM calls, embeddings, semantic classifiers, external AI APIs, or model-based inference anywhere in the Student Support flow.

Allowed logic is limited to deterministic SQL/JavaScript calculations, explicit configuration, fixed thresholds, date calculations, counts, averages, trend formulas, filters, sorting, and user-entered decisions.

## 3. Design principles

### 3.1 Single source of truth

Student Support must read existing facts from their owning modules instead of copying them into new support tables.

- Attendance owns attendance records.
- Gradebook owns grades and assessment scores.
- Homeroom/class management owns class membership and GVCN relationships.
- Existing account/assignment data owns teacher identity and teaching assignments.
- Student Support owns only alerts, cases, support actions, support notes, teacher observations, family-contact logs, support rules, and support-event history.

### 3.2 Human decision authority

An alert is only a signal that a teacher should review. The system never concludes that a student is “at risk”, “problematic”, “weak”, “bad”, or psychologically impaired.

Only an authorized human user may:

- decide that an alert needs support action;
- open a case;
- select a support goal;
- assign actions;
- decide whether improvement has occurred;
- continue monitoring;
- close a case.

### 3.3 Neutral language

User-facing status language should remain factual and neutral.

Preferred statuses:

`NEW -> REVIEWING -> ACTIVE -> FOLLOW_UP -> RESOLVED -> CLOSED`

Vietnamese labels:

`Mới -> Đang xem xét -> Đang hỗ trợ -> Theo dõi lại -> Đã cải thiện -> Đã đóng`

An additional terminal review state may be `NO_ACTION_REQUIRED / Không cần hỗ trợ`.

## 4. User roles and access

Student Support uses the existing Brian permission framework and adds a new permission id:

`route:student-support`

### Admin

- View all permitted school data.
- Configure global support rules.
- Manage Student Support permissions.
- View audit history.
- Archive/restore support records.
- Approve permanent deletion where deletion governance requires approval.

### Department head / authorized management account

- View students within configured organizational scope.
- View aggregate reporting within scope.
- Review overdue/open cases when permission is granted.
- No automatic access to private teacher-only notes unless explicitly authorized by policy.

### Homeroom teacher (GVCN)

- View students in assigned homeroom classes.
- View integrated attendance and grade summaries for those students.
- Review alerts.
- Open/manage support cases.
- Create actions, follow-up dates, and family-contact entries.
- Record outcomes and close cases.

### Subject teacher

- View only students/classes linked to current teaching assignments.
- View subject-relevant information required for support workflow.
- Create teacher observations.
- Submit observations to the GVCN.
- View responses/status where permitted.
- Must not automatically gain access to private family-contact history or unrelated confidential notes.

### Student and family portal users

No direct access to Student Support Center in V1.

Future portal integration must expose only content explicitly published by an authorized teacher and must not expose internal alerts, private notes, or internal case metadata.

## 5. Main navigation structure

The Student Support Center page has eight logical sections.

### 5.1 Overview

Purpose: give the current user a concise workload/status view.

Suggested summary cards:

- Students currently monitored.
- New alerts.
- Active support cases.
- Cases waiting for follow-up.
- Resolved/improved cases.
- Closed cases.

Additional panels:

- Needs attention today.
- Follow-up due soon.
- Overdue items.
- Recent support activity.

No AI summaries are generated; text is assembled from stored event data and fixed labels.

### 5.2 Students needing review

Primary work queue for alerts.

Each row/card should show:

- Student name.
- Class.
- Alert source/type.
- Factual trigger summary.
- Created date.
- Current review state.
- Assigned/owning teacher where applicable.

Filters:

- Grade.
- Class.
- Homeroom teacher.
- Subject teacher.
- Alert type.
- Case status.
- Date range.
- Overdue only.

### 5.3 Student 360 profile

Student-centered read view that composes existing source data without duplicating it.

Tabs/sections:

- General information.
- Attendance.
- Academic results.
- Teacher observations.
- Open alerts.
- Support cases.
- Support timeline.

General information may include student id, name, class, grade, school year, homeroom teacher, enrollment status, and allowed parent/contact fields.

### 5.4 Support cases

Case list for authorized users.

Each case includes:

- Student.
- Case category.
- Opening reason.
- Goal.
- Owner.
- Open date.
- Follow-up date.
- Status.
- Linked alerts.
- Action completion summary.

Case categories V1:

- Attendance.
- Academic progress.
- Learning-task completion.
- Classroom routine/discipline using factual school records only.
- Family coordination.
- Learning support.
- Other.

No psychological-diagnosis category is provided.

### 5.5 Teacher observations

Structured entry for subject teachers and homeroom teachers.

Fields:

- Student.
- Class.
- Subject where applicable.
- Date.
- Period/session where applicable.
- Observation type.
- Factual note.
- Visibility/scope.
- Submit to GVCN toggle.
- Request follow-up toggle.

Default observation types:

- Did not complete assigned work.
- Did not prepare required materials.
- Did not complete class task.
- Late arrival.
- Absence observation.
- Positive progress.
- Good participation.
- Helped peers.
- Other factual observation.

### 5.6 Support plan and actions

A support case may contain multiple actions.

Action fields:

- Title/action type.
- Description.
- Responsible user.
- Due date.
- Completion status.
- Completion date.
- Outcome note.

Default statuses:

`TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`.

A case may set a review/follow-up date independent of action deadlines.

### 5.7 Alert rules

Admin-configurable deterministic rules.

Rule categories V1:

#### Attendance rules

Examples:

- Absence count >= N within X days.
- Unexcused absence count >= N within X days.
- Late count >= N within X days.

Initial suggested defaults, subject to school configuration:

- 3 absences in 14 days.
- 5 absences in 30 days.
- 3 late arrivals in 14 days.

#### Grade/progress rules

Examples:

- Average of latest N comparable scores is lower than previous N scores by threshold T.
- N consecutive scores below a configured threshold.
- Subject average decreased by at least T between two comparable windows.

All calculations must be explainable and display the exact formula/input window that triggered the alert.

#### Teacher-observation rules

Examples:

- At least N observations of the same selected type within X days.
- At least N submitted follow-up requests within X days.

#### Combined rules

Combined rules may be enabled only when every input is deterministic, e.g.:

- absence count >= 2 within 14 days AND grade average decrease >= 1.0.

The user-facing message must say “Có nhiều tín hiệu cần xem xét” or another neutral factual label; it must not infer the reason.

### 5.8 Reports

Reporting scopes:

- Class.
- Grade.
- Teacher scope where appropriate.
- Month.
- Semester.
- School year.

V1 outputs:

- On-screen report.
- PDF export.
- Excel export.

Aggregate reports include counts/statuses/categories but should not expose private note text by default.

## 6. Alert lifecycle and duplicate prevention

Alert statuses:

`NEW`, `REVIEWING`, `LINKED_TO_CASE`, `NO_ACTION_REQUIRED`, `RESOLVED`, `ARCHIVED`.

Duplicate prevention is required.

For a given rule/student/window, the system should update the existing active alert when the triggering metric changes instead of creating a new alert every day.

Example:

- Day 1: rule triggers at 3 absences/14 days -> create one alert.
- Day 2: metric becomes 4 absences/14 days -> update evidence/metric on the same active alert.
- After the alert is resolved or the evaluation window has materially reset, a later independent recurrence may create a new alert.

Every alert must store or reconstruct:

- rule id/version;
- student id;
- calculation window;
- factual metric values;
- first triggered time;
- last evaluated time;
- current state.

## 7. Support-case lifecycle

Canonical states:

- `NEW`: case created but not yet reviewed in detail.
- `REVIEWING`: teacher is reviewing evidence and deciding actions.
- `ACTIVE`: one or more support actions are active.
- `FOLLOW_UP`: initial actions completed and follow-up evaluation is pending.
- `RESOLVED`: authorized teacher records improvement/resolution.
- `CLOSED`: workflow finalized.
- `NO_ACTION_REQUIRED`: review determined no support action is currently required.

Only authorized users may move a case between states. State changes create immutable event records.

## 8. Follow-up and outcomes

At follow-up date, the system surfaces the case as due. It does not automatically decide the outcome.

Teacher selects one of:

- Improved / resolved.
- Continue monitoring.
- Adjust support plan.
- Close case.
- No action required.

The selected outcome, note, user, and timestamp are saved in event history.

## 9. Family-contact log

V1 records contact events but does not automatically contact families.

Fields:

- Student/case.
- Date/time.
- Contact method.
- Contacted by.
- Contact status.
- Short factual summary.
- Follow-up needed.

Methods:

- Phone.
- In person.
- Message.
- Parent meeting.
- Other.

Statuses:

- Contact completed.
- Could not reach.
- Family responded.
- Follow-up required.

Automated sensitive messaging is out of scope.

## 10. Notes and visibility

Every support note has an explicit visibility classification.

Suggested V1 scopes:

- `PRIVATE`: creator only.
- `HOMEROOM`: authorized GVCN context.
- `TEACHING_TEAM`: authorized relevant teachers.
- `MANAGEMENT`: GVCN plus authorized management roles.

The database/RLS policy must enforce scope; hiding text only in React is insufficient.

## 11. Notifications

Student Support integrates with the existing notification center using deterministic events.

Examples:

- New attendance alert for assigned GVCN.
- New teacher observation submitted to GVCN.
- Support action due soon.
- Follow-up date reached.
- Case overdue.
- Teacher response/status changed.

Notification text is template-based and contains no AI-generated content.

No automatic notification should be sent directly to family/student users in V1.

## 12. Proposed data model

New Student Support-owned tables:

### `student_support_rules`

Stores deterministic rule configuration.

Key fields:

- id
- code
- name
- rule_type
- enabled
- scope
- config JSONB
- version
- created_by
- created_at
- updated_at

### `student_support_alerts`

- id
- student_id
- class_id
- school_year_id where available
- rule_id
- rule_version
- alert_type
- status
- evidence JSONB
- window_start
- window_end
- first_triggered_at
- last_evaluated_at
- assigned_to
- linked_case_id nullable
- created_at
- updated_at
- archived_at nullable

### `student_support_cases`

- id
- student_id
- class_id
- category
- title/reason
- goal
- owner_id
- status
- opened_at
- follow_up_at
- resolved_at nullable
- closed_at nullable
- created_by
- created_at
- updated_at
- archived_at nullable

### `student_support_actions`

- id
- case_id
- title
- description
- assigned_to
- status
- due_at
- completed_at
- outcome_note
- created_by
- created_at
- updated_at

### `student_support_notes`

- id
- case_id
- student_id
- author_id
- note_type
- body
- visibility_scope
- created_at
- updated_at
- archived_at nullable

### `student_support_teacher_observations`

- id
- student_id
- class_id
- subject_id/subject_name where available
- teacher_id
- observation_type
- observation_date
- period_label nullable
- body
- visibility_scope
- submitted_to_homeroom boolean
- follow_up_requested boolean
- created_at
- updated_at
- archived_at nullable

### `student_support_family_contacts`

- id
- case_id
- student_id
- contacted_by
- contact_method
- contact_status
- contacted_at
- summary
- follow_up_required
- created_at
- updated_at

### `student_support_case_events`

Append-oriented event history.

- id
- case_id
- student_id
- actor_id
- event_type
- from_status nullable
- to_status nullable
- metadata JSONB
- created_at

The implementation plan must verify canonical existing student/class/school-year identifiers before finalizing foreign keys. No duplicate identity system should be introduced.

## 13. Integration boundaries

### Attendance

Student Support reads attendance facts from the existing attendance domain. It must not modify attendance history from Student Support.

Student 360 shows selected ranges such as 14-day/30-day summaries plus recent event details.

### Gradebook

Student Support reads grade data from Gradebook sources. It does not edit grades.

Trend calculations must define comparable windows explicitly and cope with missing/insufficient scores by returning “insufficient data”, not an alert.

### Homeroom

Homeroom/class assignment determines GVCN access and primary class scope.

Student Support should provide deep links from relevant Homeroom student surfaces after the core route is stable.

### Teacher assignments

Subject-teacher visibility must derive from existing current teaching-assignment relationships wherever possible.

### Existing notifications

Use existing global notification/event mechanisms rather than introducing a second notification center.

### Data Governance

Archive/permanent-delete behavior should align with the existing archive-first governance pattern in the product.

## 14. Search and filters

Global Student Support search must support at least:

- student name;
- student code/id;
- class name.

Main filters include:

- grade;
- class;
- GVCN;
- subject teacher;
- alert type;
- case status;
- overdue state;
- date range.

Search results must respect authorization scope before filtering/rendering.

## 15. Overdue logic

Overdue calculations are deterministic.

Examples:

- Alert not reviewed after configurable number of days.
- Action due date passed while status is not DONE/CANCELLED.
- Case follow-up date passed without follow-up outcome.

Overdue status changes workflow presentation/notification only; it must not mutate the student’s underlying attendance, grade, or case outcome automatically.

## 16. Audit and history

Important mutations generate immutable audit/event records, including:

- alert reviewed;
- alert dismissed/no action required;
- case created;
- case status changed;
- support action created/assigned/completed;
- family contact logged;
- observation submitted;
- follow-up outcome recorded;
- record archived/restored;
- permanent deletion request/approval where supported.

Existing platform audit facilities should be reused when practical, with Student Support case events providing domain-specific history.

## 17. Deletion and retention

Normal users do not hard-delete Student Support records.

- Cases and related workflow records use archive-first behavior.
- Archived data can be restored by authorized users.
- Permanent deletion is Admin-governed and must follow the existing Data Governance/trash approval pattern.
- Domain event/audit history must be retained as required by the applicable governance path until permanent deletion is approved.

## 18. Error handling

- Missing source data produces an explicit “insufficient data” state, not a warning alert.
- Failure to load one source (for example Gradebook) should not erase successfully loaded Attendance/Student Support data; the UI shows a per-source warning.
- Mutations show clear retryable errors and must not optimistically claim success until the database confirms the write.
- Authorization failures show no sensitive row content.
- Rule configuration validation rejects unknown rule types and invalid numeric windows/thresholds.

## 19. Responsive UX

Desktop may use tables for dense work queues. Mobile must switch to stacked cards with primary actions visible without horizontal scrolling.

Student 360 and case detail should use compact tab/section navigation. Critical buttons must meet touch-target requirements already established by the platform accessibility controls.

## 20. Testing and acceptance

Required coverage:

- Unit tests for deterministic rule calculations, date windows, grade trend comparisons, duplicate prevention, case transitions, and overdue selectors.
- RLS tests for Admin, Department Head, GVCN, assigned subject teacher, unassigned teacher, student, and unauthenticated user.
- Integration tests for Attendance/Gradebook/Homeroom read composition.
- E2E tests for alert review -> case -> actions -> follow-up -> closure.
- Responsive E2E on desktop and mobile.
- Regression tests proving source Attendance/Gradebook rows are not modified by Student Support actions.
- Static verification that Student Support code contains no AI/model/API dependency.

## 21. V1 exclusions

The following are explicitly outside V1:

- AI or machine-learning analysis.
- Psychological or behavioral diagnosis.
- Autonomous case decisions.
- Predictive risk scoring.
- Direct student/family Student Support portal.
- Automated SMS/Zalo/email family messaging.
- Complex visual workflow designer.
- New independent student identity/master-data system.

## 22. Rollout sequence

1. Database schema + RLS + deterministic rules.
2. Route/permissions + Student 360 read path.
3. Alert queue + teacher observations.
4. Support cases/actions/follow-up.
5. Notifications + reporting/exports.
6. Archive/governance + final security/regression verification.

Production exposure remains permission-controlled and subject to the existing app-visibility system.
