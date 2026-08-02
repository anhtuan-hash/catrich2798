import fs from 'node:fs';

const adapter = fs.readFileSync('src/utils/workScheduleDatabaseCompatibility.js', 'utf8');
const center = fs.readFileSync('src/components/GlobalWorkScheduleCenter.jsx', 'utf8');
const workHub = fs.readFileSync('src/pages/WorkHub.jsx', 'utf8');

const checks = [
  ['schedule rows are explicitly calendar-only', adapter.includes('schedule_only: true')],
  ['teacher ids are retained only as calendar viewers', adapter.includes('schedule_viewer_ids: viewerIds') && adapter.includes("assignment_mode: 'calendar_visibility'")],
  ['assignment notifications are disabled', adapter.includes('notify_assignee: false')],
  ['shared schedule visibility remains enabled', adapter.includes('schedule_notify_all: true')],
  ['only the Work Hub task-list projection excludes schedule rows', adapter.includes('WORK_HUB_TASK_LIST_COLUMNS') && adapter.includes('context.taskListQuery && !context.includeScheduleRows')],
  ['schedule-specific reads still include schedule rows', adapter.includes('includeScheduleRows: true')],
  ['Work Hub realtime ignores schedule rows', adapter.includes("filter?.table === 'work_hub_items'") && adapter.includes('if (isScheduleRow(realtimeRow(payload))) return;')],
  ['old cached task lists are cleaned', adapter.includes('cleanScheduleRowsFromWorkHubCache') && adapter.includes('WORK_HUB_CACHE_PREFIX')],
  ['calendar keeps its dedicated schedule marker', center.includes('schedule_event: true')],
  ['normal Work Hub assignments still require recipients', workHub.includes('Vui lòng chọn ít nhất một giáo viên nhận việc.')],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
if (failed.length) process.exit(1);
