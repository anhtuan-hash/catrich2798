import fs from 'node:fs';

const adapter = fs.readFileSync('src/utils/workScheduleDatabaseCompatibility.js', 'utf8');
const wrapper = fs.readFileSync('src/components/GlobalWorkScheduleCompatibleCenter.jsx', 'utf8');
const navigation = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');

const checks = [
  ['schedule rows use existing task storage type', adapter.includes("const SAFE_WORK_HUB_TYPE = 'task'")],
  ['schedule metadata remains identifiable', adapter.includes('schedule_event: true')],
  ['schedule query is redirected to metadata', adapter.includes("target.contains('metadata', { schedule_event: true })")],
  ['insert/update/upsert payloads are rewritten', adapter.includes("property === 'insert' || property === 'update' || property === 'upsert'")],
  ['compatibility wrapper subscribes to runtime', wrapper.includes('useRuntimeCore') && wrapper.includes('ensureWorkScheduleDatabaseCompatibility')],
  ['navigation mounts compatible center', navigation.includes('GlobalWorkScheduleCompatibleCenter')],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
if (failed.length) process.exit(1);
