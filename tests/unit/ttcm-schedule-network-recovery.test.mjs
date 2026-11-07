import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildScheduleImportPlan } from '../../src/utils/workScheduleImportPlan.js';
import { loadExistingItems, isScheduleImportLeader } from '../../serverless-handlers/work-schedule-import.js';
import { SCHEDULE_IMPORT_BATCH_SIZE, previewScheduleImport, submitScheduleImportBatch } from '../../src/utils/scheduleImportTransport.mjs';

const fingerprint = '2026-11-09T09:00|hop to chuyen mon|phong 201';
const row = {
  title: 'Họp tổ chuyên môn', description: '', startAt: '2026-11-09T02:00:00.000Z',
  endAt: '2026-11-09T03:00:00.000Z', location: 'Phòng 201', ownerText: 'TTCM',
  priority: 'normal', visibility: 'department', sourceRow: 2, fingerprint,
};
const legacy = {
  id: 'legacy-1', title: row.title, description: '', item_type: 'task', status: 'assigned',
  priority: 'normal', visibility: 'department', due_at: row.startAt,
  source_module: 'work-schedule-import-v1168',
  metadata: {
    schedule_event: true, schedule_import_id: 'old-import',
    schedule_source_file: 'lich-tuan.csv', schedule_source_row: 2,
    schedule_start_at: row.startAt, schedule_end_at: row.endAt,
    schedule_location: row.location, schedule_owner_text: row.ownerText,
    schedule_fingerprint: fingerprint,
  },
};
function fakeDb(rows) {
  const calls = [];
  const table = (conditions = []) => ({
    select: () => table(conditions),
    eq: (key, value) => table([...conditions, { key, value }]),
    contains: (key, value) => table([...conditions, { key, value, contains: true }]),
    order: () => table(conditions),
    range: async (start, end) => {
      calls.push({ start, end });
      const matching = rows.filter((item) => conditions.every(({ key, value, contains }) =>
        contains
          ? Object.entries(value).every(([field, expected]) => item[key]?.[field] === expected)
          : item[key] === value));
      return { data: matching.slice(start, end + 1), error: null };
    },
  });
  return { db: { from: () => table() }, calls };
}

test('server checks legacy scheduled tasks and excludes ordinary tasks', async () => {
  const { db } = fakeDb([
    legacy,
    { ...legacy, id: 'normal-task', metadata: { schedule_event: false } },
    { ...legacy, id: 'new-schedule', item_type: 'schedule' },
  ]);
  const items = await loadExistingItems(db);
  assert.deepEqual(items.map((item) => item.id).sort(), ['legacy-1', 'new-schedule']);
  const plan = buildScheduleImportPlan({
    rows: [row], existingItems: items, fileName: 'lich-tuan.csv',
  });
  assert.equal(plan.create.length, 0, 'Retry must not duplicate an already-committed legacy row');
  assert.equal(plan.stats.unchanged, 1);
});

test('legacy scan is paginated, not capped at an arbitrary 1000 rows', async () => {
  const many = Array.from({ length: 501 }, (_, i) => ({
    ...legacy, id: `old-${i}`, metadata: { ...legacy.metadata, schedule_source_row: i + 2 },
  }));
  const { db, calls } = fakeDb(many);
  const items = await loadExistingItems(db);
  assert.equal(items.length, 501);
  assert.ok(calls.some((call) => call.start === 500), 'Second page must be queried');
});

test('server-side roles must require an explicitly approved leader', () => {
  assert.equal(isScheduleImportLeader({ role: 'admin', approved: true }), true);
  assert.equal(isScheduleImportLeader({ role: 'ttcm', approved: true }), true);
  assert.equal(isScheduleImportLeader({ role: 'admin' }), false);
  assert.equal(isScheduleImportLeader({ role: 'teacher', approved: true }), false);
});

test('read-only preview returns known fingerprints and never sends import mode', async () => {
  let calls = 0;
  const duplicates = await previewScheduleImport({
    accessToken: 'test-token', fileName: 'lich-tuan.csv', rows: [row],
    request: async (_, options) => {
      calls++;
      assert.equal(JSON.parse(options.body).mode, 'preview');
      return { ok: true, json: async () => ({ ok: true, mode: 'preview', duplicateFingerprints: [fingerprint] }) };
    },
  });
  assert.equal(calls, 1);
  assert.ok(duplicates.has(fingerprint));
});

test('single upload batch reports confirmed committed rows', async () => {
  const response = await submitScheduleImportBatch({
    accessToken: 'test-token', fileName: 'lich-tuan.csv', rows: [row],
    eventCandidateFingerprints: [fingerprint],
    request: async (_, options) => {
      const payload = JSON.parse(options.body);
      assert.equal(payload.source, 'ttcm-calendar');
      assert.deepEqual(payload.eventCandidateFingerprints, [fingerprint]);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      return { ok: true, status: 200, json: async () => ({
        ok: true, stats: { added: 1, updated: 0, unchanged: 0 },
        items: [legacy], createdItems: [legacy], updatedItems: [],
      }) };
    },
  });
  assert.equal(response.stats.added, 1);
  assert.equal(SCHEDULE_IMPORT_BATCH_SIZE, 20);
});

test('network failure is ambiguous and never automatically replays a write', async () => {
  let calls = 0;
  await assert.rejects(submitScheduleImportBatch({
    accessToken: 'test-token', fileName: 'lich-tuan.csv', rows: [row],
    request: async () => { calls++; throw new TypeError('Load failed'); },
  }), (error) => error.uncertainCommit === true && /kiểm tra lịch/i.test(error.message));
  assert.equal(calls, 1);
});

test('permission errors remain actionable; no silent fallback to direct writes', async () => {
  await assert.rejects(submitScheduleImportBatch({
    accessToken: 'test-token', fileName: 'lich-tuan.csv', rows: [row],
    request: async () => ({ ok: false, status: 403, json: async () => ({ ok: false, message: 'Không có quyền nhập lịch.' }) }),
  }), /Không có quyền nhập lịch/);
  await assert.rejects(submitScheduleImportBatch({
    accessToken: 'test-token', rows: Array(21).fill(row),
    request: () => { throw new Error('must not request'); },
  }), /20 dòng/);
});

test('TTCM UI no longer uses direct Supabase writes for uploaded calendars', () => {
  const source = readFileSync(new URL('../../src/components/GlobalWorkScheduleCenter.jsx', import.meta.url), 'utf8');
  const begin = source.indexOf('  async function importSchedule() {');
  const end = source.indexOf('  async function saveEditor(event)', begin);
  assert.ok(begin >= 0 && end > begin);
  const flow = source.slice(begin, end);
  assert.match(flow, /submitScheduleImportBatch\(/);
  assert.doesNotMatch(flow, /client\.from\('work_hub_items'\)\s*\.insert\(/);
  assert.match(source, /previewScheduleImport\(/);
  assert.doesNotMatch(source, /fetchServerScheduleFingerprints/);
});
