import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/utils/brianTeamEgressGuard.js', import.meta.url), 'utf8');
const required = [
  "table: 'work_hub_items'",
  "source.includes('loadRemote') && requested === 5_000",
  "source.includes('syncReverse')",
  "source.includes('loadTeacherItems')",
  'FALLBACK_INTERVAL = 15 * 60 * 1000',
  'guardedCallbacks.delete(entry)',
  "mode: realtimeChannel ? 'realtime-with-fallback' : 'fallback-only'",
];

const missing = required.filter((fragment) => !source.includes(fragment));
if (missing.length) {
  console.error('Brian Team egress guard v5 contract failed:', missing);
  process.exit(1);
}

console.log('Brian Team egress guard v5 contract passed.');
