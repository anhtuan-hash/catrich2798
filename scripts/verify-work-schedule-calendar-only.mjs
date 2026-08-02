import fs from 'node:fs';

const adapter = fs.readFileSync('src/utils/workScheduleDatabaseCompatibility.js', 'utf8');
const center = fs.readFileSync('src/components/GlobalWorkScheduleCenter.jsx', 'utf8');
const workHub = fs.readFileSync('src/pages/WorkHub.jsx', 'utf8');

const checks = [
  ['schedule rows are stored without assignees', adapter.includes('assignee_ids: []')],
  ['schedule rows are stored without watchers', adapter.includes('watcher_ids: []')],
  ['schedule rows are explicitly calendar-only', adapter.includes('schedule_only: true')],
  ['assignment notifications are disabled', adapter.includes('notify_assignee: false') && adapter.includes('schedule_notify_all: false')],
  ['ordinary Work Hub reads exclude schedule rows', adapter.includes('filterScheduleRows(response, includeScheduleRows)')],
  ['schedule-specific reads still include schedule rows', adapter.includes('{ includeScheduleRows: true }')],
  ['Work Hub realtime ignores schedule rows', adapter.includes("filter?.table === 'work_hub_items'") && adapter.includes('if (isScheduleRow(realtimeRow(payload))) return;')],
  ['old cached task lists are cleaned', adapter.includes('cleanScheduleRowsFromWorkHubCache') && adapter.includes('WORK_HUB_CACHE_PREFIX')],
  ['calendar keeps its dedicated schedule marker', center.includes('schedule_event: true')],
  ['normal Work Hub assignments still require recipients', workHub.includes('Vui lòng chọn ít nhất một giáo viên nhận việc.')],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
if (failed.length) process.exit(1);
