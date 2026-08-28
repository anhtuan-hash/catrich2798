import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  ATTENDANCE_LOCK_ERROR,
  ATTENDANCE_UNLOCK_ERROR,
  getAttendanceLockViolation,
  stripRetiredRestoreFields,
} from '../src/utils/homeroomProductionSafety.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function workspace(overrides = {}) {
  return {
    attendance: { '2026-08-28::day::': { s1: { status: 'present' } } },
    attendanceSessions: { '2026-08-28::day::': { note: 'Đã chốt' } },
    attendanceLocks: {
      '2026-08-28::day::': { locked: true, lockedAt: '2026-08-28T10:00:00.000Z', lockedBy: 'teacher' },
    },
    correctionRequests: [],
    ...overrides,
  };
}

{
  const previous = workspace();
  const next = workspace({
    attendance: { '2026-08-28::day::': { s1: { status: 'absent' } } },
  });
  const violation = getAttendanceLockViolation(previous, next);
  assert.equal(violation?.code, ATTENDANCE_LOCK_ERROR, 'Locked attendance data must be immutable.');
}

{
  const previous = workspace();
  const next = workspace({ attendanceLocks: {} });
  const violation = getAttendanceLockViolation(previous, next);
  assert.equal(violation?.code, ATTENDANCE_UNLOCK_ERROR, 'Unlocking must require a correction request.');
}

{
  const previous = workspace();
  const next = workspace({
    attendanceLocks: {},
    correctionRequests: [{
      id: 'correction-1',
      sessionKey: '2026-08-28::day::',
      reason: 'Sửa trạng thái theo minh chứng',
      status: 'pending',
    }],
  });
  assert.equal(getAttendanceLockViolation(previous, next), null, 'A reasoned correction request may unlock without editing data in the same mutation.');
}

{
  const previous = workspace();
  const next = workspace({
    attendanceLocks: {},
    attendance: { '2026-08-28::day::': { s1: { status: 'absent' } } },
    correctionRequests: [{
      id: 'correction-1',
      sessionKey: '2026-08-28::day::',
      reason: 'Sửa trạng thái theo minh chứng',
      status: 'approved',
    }],
  });
  const violation = getAttendanceLockViolation(previous, next);
  assert.equal(violation?.code, ATTENDANCE_LOCK_ERROR, 'Unlock and edit must be separate commits.');
}

{
  const restored = stripRetiredRestoreFields({
    id: '12-6',
    learning: { stale: true },
    learningTab: true,
    legacyLearning: ['old'],
    portalLegacy: { old: true },
    legacyPortal: { old: true },
    learningRecords: [{ id: 'compat-record' }],
  });
  assert.equal('learning' in restored, false);
  assert.equal('learningTab' in restored, false);
  assert.equal('legacyLearning' in restored, false);
  assert.equal('portalLegacy' in restored, false);
  assert.equal('legacyPortal' in restored, false);
  assert.deepEqual(restored.learningRecords, [{ id: 'compat-record' }], 'Compatibility learningRecords must remain until gradebook migration is verified.');
}

{
  const source = readFileSync(resolve(root, 'src/utils/homeroomClassWorkspaceStore.js'), 'utf8');
  assert.match(source, /PRIVACY_MODES\s*=\s*new Set\(\['balanced', 'cloud-only', 'device-only'\]\)/);
  assert.match(source, /mode === 'device-only'/, 'device-only must short-circuit cloud persistence.');
  assert.match(source, /privacyMode\(normalized\) === 'cloud-only'/, 'cloud-only must remove the local workspace payload.');
  assert.doesNotMatch(source, /\.upsert\(/, 'Whole-payload blind upsert must not return.');
  assert.match(source, /\.eq\('updated_at', expectedRevision\)/, 'Cloud writes must use optimistic concurrency.');
  assert.match(source, /getAttendanceLockViolation\(existing\.payload, prepared\)/, 'Cloud persistence must enforce attendance locks.');

  const whitelistMatch = source.match(/const SUBJECT_STUDENT_FIELDS = \[([\s\S]*?)\];/);
  assert.ok(whitelistMatch, 'Subject-student field whitelist must exist.');
  const whitelist = whitelistMatch[1];
  for (const forbidden of ['phone', 'parentName', 'parentPhone', 'parentEmail', 'address', 'portalPin']) {
    assert.equal(whitelist.includes(`'${forbidden}'`), false, `Subject roster must not persist ${forbidden}.`);
  }
}

console.log('Homeroom production-safety regression contract passed.');
