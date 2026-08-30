# Brian Workflow API quick reference

```js
import {
  MetricCard,
  MetricGrid,
  TaskCard,
  NoticeCard,
  AttachmentCard,
  DeadlineBadge,
  StudentCard,
  ClassCard,
  ViolationCard,
  AttendanceState,
  StatusPill,
  ExportState,
  WorkflowState,
} from './components/ui/index.js';
```

All components are presentation-only contracts. Feature apps retain their existing data, permission, routing and mutation logic.
