# Brian Design System — Stage 4 Workflow Components

Stage 4 introduces the workflow layer that sits above generic UI primitives and shared layout composition.

## Purpose

These components describe Brian's recurring product concepts without owning business logic, persistence, permissions, exports or routing. Feature apps pass data/state/actions into them and keep their existing services and handlers.

## Public components

### Metrics
- `MetricCard`
- `MetricGrid`

Use for dashboard totals, weekly completion, attendance summaries and department/work metrics.

### Work & communication
- `TaskCard`
- `NoticeCard`
- `AttachmentCard`
- `DeadlineBadge`

`TaskCard` supports status, priority, assignee, deadline and action slots.

`NoticeCard` supports general/team/personal/feedback scopes, unread state, response-required state, attachments and action slots.

`AttachmentCard` separates the open-file control from download/secondary actions for valid keyboard semantics.

### Homeroom & student
- `StudentCard`
- `ClassCard`
- `ViolationCard`
- `AttendanceState`

These are presentation contracts only. They do not calculate conduct scores, attendance totals or violation rules.

### Workflow status & export
- `StatusPill`
- `ExportState`
- `WorkflowState`

`ExportState` supports `idle`, `loading`, `success` and `error`. It can display a real progress value but does not perform the export itself.

## Namespace

Workflow styles use `.bwf-*`.

- Stage 1 semantic tokens: `--brian-*`
- Stage 2 primitives: `.bui-*`
- Stage 3 shared composition: `.bui-*`
- Stage 4 workflow layer: `.bwf-*`

No historical feature selector is overridden by this stage.

## Semantic rules

### Status colour
Colour must communicate state, not decorate entire pages.

- success: completed/present/healthy
- warning: attention/soon/medium severity
- danger: blocked/overdue/absent/high severity/error
- info: active/in-progress/excused/personal communication
- neutral: default/inactive/unknown

Large card surfaces remain white or cool neutral.

### Motion
Workflow components add no looping, entrance or decorative animations.

### Actions
Components expose action slots instead of importing feature handlers. This keeps routing, permissions and mutation logic inside the owning app.

## Accessibility

- attachment open and download actions are separate controls;
- status is always expressed with text in addition to colour;
- export status uses `aria-live` and `aria-busy`;
- progress uses the Stage 2 progress primitive;
- images in `StudentCard` are decorative unless the owning feature provides additional accessible context elsewhere;
- action controls retain the Stage 2 focus contract.

## CI contract

`vite.ui-smoke.config.js` compiles `src/components/ui/index.js` as a standalone library entry.

`.github/workflows/brian-ui-smoke.yml` runs this smoke build on UI/token changes so unused/new components are still compiled before merge.

## Stage 5 migration guidance

Recommended migration order:

1. Brian main Hub/dashboard — `MetricCard`, `ClassCard`, workflow states.
2. Work Center — `TaskCard`, `DeadlineBadge`, `AttachmentCard`.
3. TTCM communication — `NoticeCard`, attachments, response states.
4. Homeroom — `StudentCard`, `AttendanceState`, `ViolationCard`, `ExportState`.
5. Weekly management and remaining feature apps.

During migration, preserve existing data fetching, permission checks, export handlers and route behavior. Replace presentation structure incrementally rather than rewriting feature logic.
