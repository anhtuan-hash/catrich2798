import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/components/GlobalTtcmTeacherHistory.css', import.meta.url), 'utf8');

let passed = 0;
let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed += 1;
  } else {
    console.error(`[FAIL] ${message}`);
    failed += 1;
  }
}

check(
  css.includes('.ttcm-m3-shell:has(.ttcm-history-view)'),
  'scopes the TTCM hero treatment to the teacher-history workspace',
);
check(css.includes('--history-surface-blue'), 'defines the blue pastel KPI surface token');
check(css.includes('--history-surface-violet'), 'defines the violet pastel KPI surface token');
check(css.includes('--history-surface-mint'), 'defines the mint pastel KPI surface token');
check(css.includes('--history-surface-peach'), 'defines the peach pastel KPI surface token');
check(
  /\.ttcm-history-event-card\s*\{[^}]*background:/s.test(css),
  'renders each timeline event as a surfaced mini-card',
);
check(css.includes('--history-row-hover'), 'defines a softened file-table row hover treatment');
check(css.includes(':focus-visible'), 'keeps keyboard focus visibly styled');
check(css.includes('prefers-reduced-motion: reduce'), 'respects reduced-motion preferences');

console.log(`\nTTCM history visual refresh contract: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
